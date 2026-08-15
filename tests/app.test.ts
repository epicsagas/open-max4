// @vitest-environment happy-dom
import assert from "node:assert/strict";
import { mount, unmount } from "svelte";
import { beforeEach, test, vi } from "vitest";

import App from "../web/src/App.svelte";

const pack = JSON.stringify({
  note: "test",
  source: "test",
  always: [{ year: 1990, text: "공중전화를 쓴다." }],
  facts: [{ year: 1994, keywords: ["노래"], text: "김건모 〈핑계〉가 인기다." }],
});
const catalog = JSON.stringify({
  format: "max4-pjm-v1",
  files: Object.fromEntries(
    ["PJM.001", "PJM.002", "PJM.011", "PJM.012", "PJM.013", "PJM.031", "PJM.032"].map((name) => [
      name,
      { sha256: "test", blocks: [{ entries: ["안녕"] }] },
    ]),
  ),
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("fetch", (url: string) =>
    Promise.resolve({ json: () => Promise.resolve(JSON.parse(url.includes("era") ? pack : catalog)) }),
  );
});

test("mounts the shell with the original engine selected", () => {
  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(App, { target });

  assert.match(target.innerHTML, /open-max4/);
  assert.match(target.innerHTML, /원본 엔진/);
  assert.match(target.innerHTML, /비공식 복원판/);
  assert.match(target.innerHTML, /원본 대화 데이터로 실행 중이야/);

  unmount(app);
});

test("switches the status line when byok is enabled without a key", async () => {
  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(App, { target });

  const checkbox = target.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(checkbox);
  checkbox.click();
  await Promise.resolve();

  assert.match(target.innerHTML, /BYOK · 설정 안 됨/);
  unmount(app);
});
