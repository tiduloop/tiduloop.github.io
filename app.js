// Minimalist interactive character inspector preview for tiduloop.github.io
(function () {
  "use strict";

  const SAMPLE_CHARS = {
    清: {
      pinyin: "qīng",
      decomp: "⿰ 氵 青 (Water radical + phonetic carrier 青)",
      role: "Phono-semantic compound (形声字) — water that is clear",
    },
    想: {
      pinyin: "xiǎng",
      decomp: "⿱ 相 心 (Sound carrier 相 + semantic heart 心)",
      role: "Phono-semantic compound (形声字) — to think / yearn with the heart",
    },
    照: {
      pinyin: "zhào",
      decomp: "⿱ 昭 灬 (Sound carrier 昭 + fire radical 灬)",
      role: "Phono-semantic compound (形声字) — to shine / illuminate by fire",
    },
    休: {
      pinyin: "xiū",
      decomp: "⿰ 亻 木 (Person 亻 resting against a tree 木)",
      role: "Ideographic compound (会意字) — person leaning on tree to rest",
    },
    明: {
      pinyin: "míng",
      decomp: "⿰ 日 月 (Sun 日 + Moon 月)",
      role: "Ideographic compound (会意字) — bright light from celestial luminaries",
    },
    问: {
      pinyin: "wèn",
      decomp: "⿵ 门 口 (Door 门 + Mouth 口)",
      role: "Phono-semantic compound (形声字) — to inquire through a doorway",
    },
    森: {
      pinyin: "sēn",
      decomp: "⿱ 木 林 (Tree 木 + Forest 林)",
      role: "Repeating cluster (同字重叠) — forest composed of multiple trees",
    },
    可: {
      pinyin: "kě",
      decomp: "⿻ 丁 口 (Nail/stem 丁 + Mouth 口)",
      role: "Commuting stem — approving with speech / capability",
    },
  };

  const input = document.getElementById("char-input");
  const btn = document.getElementById("lookup-btn");
  const glyphDisplay = document.getElementById("glyph-display");
  const pinyinDisplay = document.getElementById("pinyin-display");
  const decompDisplay = document.getElementById("decomp-display");
  const roleDisplay = document.getElementById("role-display");

  function inspectChar(ch) {
    if (!ch) return;
    glyphDisplay.textContent = ch;

    const data = SAMPLE_CHARS[ch];
    if (data) {
      pinyinDisplay.textContent = data.pinyin;
      decompDisplay.textContent = data.decomp;
      roleDisplay.textContent = data.role;
    } else {
      pinyinDisplay.textContent = "—";
      decompDisplay.textContent = "Component analysis available in full HanziTopology tool";
      roleDisplay.textContent = "Topological node";
    }
  }

  btn.addEventListener("click", () => {
    inspectChar(input.value.trim());
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      inspectChar(input.value.trim());
    }
  });

  input.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (val.length === 1) {
      inspectChar(val);
    }
  });
})();
