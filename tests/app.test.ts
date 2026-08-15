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

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("fetch", (url: string) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(url.includes("era") ? pack : catalog)) }),
  );
});

test("mounts the shell with the original engine selected", async () => {
  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(App, { target });
  await settled();

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
  await settled();

  const checkbox = target.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(checkbox);
  checkbox.click();
  await settled();

  assert.match(target.innerHTML, /BYOK · 설정 안 됨/);
  unmount(app);
});

test("keeps the composer focused and usable while a turn is in flight", async () => {
  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(App, { target });
  await settled();

  const input = target.querySelector<HTMLInputElement>("#input");
  const form = target.querySelector<HTMLFormElement>("#chat-form");
  assert.ok(input && form);

  // 마운트 직후 바로 칠 수 있어야 한다.
  assert.equal(document.activeElement, input);

  input.value = "안녕";
  input.dispatchEvent(new Event("input"));
  form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  // 전송 뒤에도 포커스가 남고, 입력창은 잠기지 않는다.
  assert.equal(document.activeElement, input);
  assert.equal(input.disabled, false);

  unmount(app);
});

test("the settings dialog can be typed into and closed from the title bar", async () => {
  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(App, { target });
  await settled();

  const dialog = document.querySelector("dialog");
  const key = document.querySelector<HTMLInputElement>('input[type="password"]');
  const close = document.querySelector<HTMLButtonElement>("dialog .sysmenu");
  assert.ok(dialog && key && close);

  // 크롬이 로그인 폼으로 오인하지 않도록 하는 힌트가 붙어 있어야 한다.
  assert.equal(key.getAttribute("autocomplete"), "new-password");

  target.querySelector<HTMLButtonElement>("button")?.click();
  key.value = "sk-test";
  key.dispatchEvent(new Event("input"));
  assert.equal(key.value, "sk-test");

  close.click();
  assert.equal(dialog.open, false);

  unmount(app);
});

test("clearing the key leaves the dialog open and the endpoint saved", async () => {
  localStorage.setItem(
    "max4-byok",
    JSON.stringify({ endpoint: "https://api.example.test/v1", model: "m", persona: "1994" }),
  );
  sessionStorage.setItem("max4-byok-key", "sk-test");

  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(App, { target });
  await settled();

  const dialog = document.querySelector("dialog");
  const key = document.querySelector<HTMLInputElement>('input[type="password"]');
  assert.ok(dialog && key);
  target.querySelector<HTMLButtonElement>("button")?.click();

  const forget = [...document.querySelectorAll<HTMLButtonElement>("dialog button")].find(
    (button) => button.textContent?.includes("키 지우기"),
  );
  assert.ok(forget);
  forget.click();
  await settled();

  assert.equal(key.value, "");
  assert.equal(sessionStorage.getItem("max4-byok-key"), null);
  assert.equal(dialog.open, true, "모달은 열려 있어야 한다");
  assert.ok(localStorage.getItem("max4-byok"), "엔드포인트·모델은 남아야 한다");

  unmount(app);
});

test("byok follows the key: on when saved or restored, off when cleared", async () => {
  localStorage.setItem(
    "max4-byok",
    JSON.stringify({ endpoint: "https://api.example.test/v1", model: "m", persona: "1994" }),
  );
  sessionStorage.setItem("max4-byok-key", "sk-test");

  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(App, { target });
  await settled();

  const checkbox = target.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(checkbox);
  assert.equal(checkbox.checked, true, "복원된 키가 있으면 켜져 있어야 한다");
  assert.match(target.innerHTML, /BYOK · 고증 1994/);

  const forget = [...document.querySelectorAll<HTMLButtonElement>("dialog button")].find(
    (button) => button.textContent?.includes("키 지우기"),
  );
  assert.ok(forget);
  forget.click();
  await settled();

  assert.equal(checkbox.checked, false, "키를 지우면 꺼져야 한다");
  assert.match(target.innerHTML, /원본 엔진/);

  unmount(app);
});

test("falls back to byok-only when the original data is not deployed", async () => {
  vi.stubGlobal("fetch", (url: string) =>
    url.includes("era")
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(pack)) })
      : Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error("404")) }),
  );

  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(App, { target });
  await settled();

  assert.match(target.innerHTML, /BYOK로만 얘기할 수 있어/);
  assert.match(target.innerHTML, /BYOK 필요/);
  assert.doesNotMatch(target.innerHTML, /원본 DOS/, "번들이 없으면 DOS 버튼도 없어야 한다");

  unmount(app);
});
