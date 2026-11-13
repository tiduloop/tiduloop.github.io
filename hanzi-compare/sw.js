// HanziCompare Offline PWA & Auto-Update Service Worker
// BUILD_STAMP is updated automatically by install.sh on every deployment so installed apps
// detect and activate updates in the background without ever needing re-installation.
const BUILD_STAMP = "4443b6cd81ae";
const CACHE_PREFIX = "hanzi-compare-";
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_STAMP}`;

const CORE_SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.svg",
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./static-data/home-bootstrap.json",
];

const BACKGROUND_DATA_ASSETS = [
  "./static-data/topology-chars.json",
  "./static-data/topology-words-core.json",
  "./static-data/topology-words-ext.json",
];

const NUM_STROKE_SHARDS = 64;

function shouldSaveData() {
  try {
    const conn = self.navigator && self.navigator.connection;
    return Boolean(conn && conn.saveData);
  } catch {
    return false;
  }
}

async function warmOfflineDatasets() {
  if (shouldSaveData()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    // 1. Warm core character & word topology files first
    for (const rel of BACKGROUND_DATA_ASSETS) {
      const req = new Request(rel, { cache: "reload" });
      const existing = await cache.match(req);
      if (!existing) {
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            await cache.put(req, res);
          }
        } catch {
          return; // Offline or transient error — stop background warm gracefully
        }
      }
    }

    // 2. Gently warm the 64 stroke shards in small sequential batches of 4 for 100% offline stroke diffs
    for (let base = 0; base < NUM_STROKE_SHARDS; base += 4) {
      const batch = [];
      for (let i = base; i < Math.min(NUM_STROKE_SHARDS, base + 4); i++) {
        const hex = i.toString(16).padStart(2, "0");
        const rel = `./static-data/strokes/shard-${hex}.json`;
        batch.push(
          (async () => {
            const req = new Request(rel);
            const hit = await cache.match(req);
            if (!hit) {
              const res = await fetch(req);
              if (res && res.ok) {
                await cache.put(req, res);
              }
            }
          })()
        );
      }
      await Promise.all(batch);
    }
  } catch {
    // Ignore background warm errors when offline
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        CORE_SHELL_ASSETS.map(async (url) => {
          try {
            const res = await fetch(new Request(url, { cache: "reload" }));
            if (res && res.ok) {
              await cache.put(url, res);
            }
          } catch {
            // Allow install to succeed even on flaky connections
          }
        })
      );
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Start non-blocking background warm so full offline dataset is cached shortly after launch
      warmOfflineDatasets();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js")) return;

  // 1. HTML Navigation: Network-first with fast timeout -> Offline shell fallback
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2500);
          const netRes = await fetch(request, { signal: ctrl.signal });
          clearTimeout(timer);
          if (netRes && netRes.ok) {
            cache.put("./index.html", netRes.clone()).catch(() => {});
            return netRes;
          }
        } catch {
          // Network unavailable or timed out -> serve cached app shell
        }
        return (
          (await cache.match(request, { ignoreSearch: true })) ||
          (await cache.match("./index.html")) ||
          (await cache.match("./")) ||
          Response.error()
        );
      })()
    );
    return;
  }

  // 2. Content-hashed Vite JS/CSS bundles (/assets/*): Cache-first (immutable hashes)
  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const netRes = await fetch(request);
        if (netRes && netRes.ok) {
          cache.put(request, netRes.clone()).catch(() => {});
        }
        return netRes;
      })()
    );
    return;
  }

  // 3. Static topology JSON shards, manifest & icons: Stale-while-revalidate within active BUILD_STAMP
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((netRes) => {
          if (netRes && netRes.ok) {
            cache.put(request, netRes.clone()).catch(() => {});
          }
          return netRes;
        })
        .catch(() => null);

      if (cached) {
        return cached;
      }
      const netRes = await networkFetch;
      return netRes || Response.error();
    })()
  );
});
