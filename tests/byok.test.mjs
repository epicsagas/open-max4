import assert from "node:assert/strict";
import test from "node:test";

import { requestFor } from "../web/app/byok.js";

test("builds an OpenAI-compatible request with immutable original context", () => {
  const request = requestFor(
    { endpoint: "https://api.example.test/v1", apiKey: "secret", model: "model-a" },
    { input: "안녕", originalReply: "반가워", source: "PJM.011" },
  );

  assert.equal(request.url, "https://api.example.test/v1/chat/completions");
  assert.equal(request.options.headers.Authorization, "Bearer secret");
  assert.match(request.options.body, /원본 응답: 반가워/);
  assert.match(request.options.body, /반복하지 말고/);
});

test("sends recent conversation history before the user turn", () => {
  const history = [
    { role: "user", content: "옛날이야기" },
    { role: "assistant", content: "응, 뭐 궁금한데?" },
  ];
  const request = requestFor(
    { endpoint: "http://localhost:9/v1", apiKey: "k", model: "m" },
    { input: "너는?", history },
  );

  const messages = JSON.parse(request.options.body).messages;
  assert.equal(messages.length, 4);
  assert.deepEqual(messages[1], history[0]);
  assert.deepEqual(messages[2], history[1]);
  assert.equal(messages.at(-1).role, "user");
  assert.equal(messages.at(-1).content, "너는?");
});

test("rejects an insecure non-local endpoint", () => {
  assert.throws(
    () => requestFor({ endpoint: "http://example.test", apiKey: "x", model: "m" }, {}),
    /HTTPS or localhost/,
  );
});

test("a year persona adds the knowledge cutoff guardrail, standard does not", () => {
  const config = { endpoint: "https://api.example.test/v1", apiKey: "k", model: "m" };
  const systemOf = (c) => JSON.parse(requestFor(c, { input: "안녕" }).options.body).messages[0].content;

  assert.match(systemOf({ ...config, persona: "1994" }), /1995년 이후의 사건/);
  assert.match(systemOf({ ...config, persona: "1997" }), /1998년 이후의 사건/);
  assert.match(systemOf({ ...config, persona: "1994" }), /언어모델·챗봇이라고 부르지 않습니다/);
  assert.doesNotMatch(systemOf(config), /이후의 사건/);
  assert.match(systemOf(config), /맥스입니다/);
});

test("a non-year persona falls back to standard instead of building a bogus cutoff", () => {
  for (const persona of ["standard", "", undefined, "bogus"]) {
    const request = requestFor(
      { endpoint: "https://api.example.test/v1", apiKey: "k", model: "m", persona },
      { input: "안녕" },
    );
    const system = JSON.parse(request.options.body).messages[0].content;
    assert.match(system, /맥스입니다/);
    assert.doesNotMatch(system, /이후의 사건/);
  }
});

test("era lines land in the system prompt and stay labelled as reference", () => {
  const request = requestFor(
    { endpoint: "https://api.example.test/v1", apiKey: "k", model: "m", persona: "1994" },
    { input: "삐삐", era: { always: ["삐삐로 연락한다."], facts: ["삐삐 가입자가 늘고 있다."] } },
  );
  const system = JSON.parse(request.options.body).messages[0].content;
  assert.match(system, /- 삐삐로 연락한다\./);
  assert.match(system, /- 삐삐 가입자가 늘고 있다\./);
  assert.match(system, /묻지 않은 내용을 늘어놓지 말고/);
});

test("the real-person guardrail is present in every mode", () => {
  const base = { endpoint: "https://api.example.test/v1", apiKey: "k", model: "m" };
  for (const persona of ["standard", "1994", "1997", "1999", undefined]) {
    const request = requestFor({ ...base, persona }, { input: "박찬호 어때?" });
    const system = JSON.parse(request.options.body).messages[0].content;
    assert.match(system, /실존 인물/, `persona=${persona}`);
    assert.match(system, /비방·모욕·조롱하지 않습니다/, `persona=${persona}`);
    assert.match(system, /지어내면 안 됩니다/, `persona=${persona}`);
  }
});
