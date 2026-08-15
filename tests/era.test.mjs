import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { eraLines } from "../web/app/era.js";

const pack = JSON.parse(readFileSync(new URL("../web/data/era-1990s.json", import.meta.url)));

test("keeps only facts the persona could already know", () => {
  const early = eraLines(pack, "IMF 때문에 힘들어", 1994);
  const late = eraLines(pack, "IMF 때문에 힘들어", 1998);

  assert.equal(early.facts.length, 0);
  assert.ok(late.facts.some((line) => line.includes("구제금융")));
  assert.ok(early.always.every((line) => !line.includes("PC방")));
  assert.ok(late.always.some((line) => line.includes("PC방")));
});

test("matches on keywords in the user input", () => {
  assert.ok(eraLines(pack, "삐삐 있어?", 1997).facts.some((line) => line.includes("삐삐")));
  assert.deepEqual(eraLines(pack, "ㅁㄴㅇㄹ", 1997).facts, []);
});

test("a price series collapses to the newest entry at or below the cutoff", () => {
  const at1995 = eraLines(pack, "버스 요금 얼마야", 1995).facts.filter((l) => l.includes("버스"));
  const at1998 = eraLines(pack, "버스 요금 얼마야", 1998).facts.filter((l) => l.includes("버스"));

  assert.equal(at1995.length, 1);
  assert.match(at1995[0], /320원/);
  assert.equal(at1998.length, 1);
  assert.match(at1998[0], /500원/);
});

test("caps how many facts a single turn can inject", () => {
  const wide = eraLines(pack, "경제 물가 사고 통신 노래 학교 컴퓨터 전화", 1999, 3);
  assert.ok(wide.facts.length <= 3);
});
