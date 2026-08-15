import assert from "node:assert/strict";
import { test } from "vitest";

import { replyFor } from "../web/src/lib/engine";
import type { Catalog } from "../web/src/lib/types";

const file = (entries: string[]) => ({ sha256: "test", blocks: [{ entries }] });

const catalog: Catalog = {
  format: "max4-pjm-v1",
  files: {
    "PJM.001": file(["나"]),
    "PJM.002": file(["너"]),
    "PJM.011": file(["내 얘기"]),
    "PJM.012": file(["네 얘기"]),
    "PJM.013": file(["안녕"]),
    "PJM.031": file(["기본 답변"]),
    "PJM.032": file(["상대 기본 답변"]),
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
