import assert from "node:assert/strict";
import test from "node:test";

import { replyFor } from "../web/app/engine.js";

const catalog = {
  files: {
    "PJM.001": { blocks: [{ entries: ["나"] }] },
    "PJM.002": { blocks: [{ entries: ["너"] }] },
    "PJM.011": { blocks: [{ entries: ["내 얘기"] }] },
    "PJM.012": { blocks: [{ entries: ["네 얘기"] }] },
    "PJM.013": { blocks: [{ entries: ["안녕"] }] },
    "PJM.031": { blocks: [{ entries: ["기본 답변"] }] },
    "PJM.032": { blocks: [{ entries: ["상대 기본 답변"] }] },
  },
};

test("uses the original matching response group without changing its data", () => {
  assert.deepEqual(replyFor(catalog, "나 안녕", () => 0), {
    text: "내 얘기",
    source: "PJM.011",
  });
});

test("uses the original fallback pool when no word matches", () => {
  assert.deepEqual(replyFor(catalog, "무작위 문장", () => 0), {
    text: "상대 기본 답변",
    source: "PJM.032",
  });
});
