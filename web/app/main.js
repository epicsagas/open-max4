import { requestFor } from "./byok.js";
import { replyFor } from "./engine.js";
import { eraLines } from "./era.js";

const messages = document.querySelector("#messages");
const input = document.querySelector("#input");
const byokEnabled = document.querySelector("#byok-enabled");
const dialog = document.querySelector("#settings-dialog");
const endpointEl = document.querySelector("#endpoint");
const modelEl = document.querySelector("#model");
const apiKeyEl = document.querySelector("#api-key");
const personaEl = document.querySelector("#persona");
const statusEl = document.querySelector("#status");
const STORE = { config: "max4-byok", key: "max4-byok-key" };
let catalog;
let eraPack;
let byok;

let stored = {};
try { stored = JSON.parse(localStorage.getItem(STORE.config)) || {}; } catch {}
if (stored.endpoint) endpointEl.value = stored.endpoint;
if (stored.model) modelEl.value = stored.model;
if (stored.persona) personaEl.value = stored.persona;
const storedKey = sessionStorage.getItem(STORE.key);
if (storedKey && stored.endpoint && stored.model) {
  apiKeyEl.value = storedKey;
  byok = { ...stored, apiKey: storedKey };
}

function addLine(text, kind) {
  const line = document.createElement("p");
  line.className = `line ${kind}`;
  // white-space: pre-wrap이라 LLM이 넣는 빈 줄이 그대로 문단 간격이 된다.
  line.textContent = text.replace(/\n{2,}/g, "\n");
  messages.append(line);
  messages.scrollTop = messages.scrollHeight;
  return line;
}

// 90년대 도스 프로그램이 쓰던 회전 막대. 응답 오면 줄째로 걷어낸다.
const SPINNER = ["|", "/", "-", "\\"];

function startPending() {
  const line = addLine(`[맥스] 생각중 ${SPINNER[0]}`, "ai");
  let frame = 0;
  const timer = setInterval(() => {
    frame += 1;
    line.textContent = `[맥스] 생각중 ${SPINNER[frame % SPINNER.length]}`;
  }, 150);
  return () => {
    clearInterval(timer);
    line.remove();
  };
}

function updateStatus() {
  if (!byokEnabled.checked) return void (statusEl.textContent = "원본 엔진");
  if (!byok) return void (statusEl.textContent = "BYOK · 설정 안 됨");
  const year = Number(byok.persona);
  statusEl.textContent = year >= 1900 ? `BYOK · 고증 ${year}` : "BYOK · 표준";
}

byokEnabled.addEventListener("change", updateStatus);

const history = [];

async function aiReply(context, turn) {
  if (!byokEnabled.checked) return;
  if (!byok) {
    dialog.showModal();
    return;
  }
  const stopPending = startPending();
  try {
    const request = requestFor(byok, context);
    const response = await fetch(request.url, request.options);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || "BYOK 요청 실패");
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (text) {
      addLine(`[맥스 · 확장] ${text}`, "ai");
      turn.content = `${turn.content}\n${text}`;
    }
  } catch (error) {
    addLine(`BYOK 오류: ${error.message}`, "ai");
  } finally {
    stopPending();
  }
}

const form = document.querySelector("#chat-form");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || !catalog) return;
  input.value = "";
  form.querySelector("button").disabled = true;
  input.disabled = true;
  addLine(`[당신] ${text}`, "user");
  const original = replyFor(catalog, text);
  if (!(byokEnabled.checked && byok)) addLine(`[맥스] ${original.text}`, "max");
  const turn = { role: "assistant", content: original.text };
  const cutoff = Number(byok?.persona);
  const era = cutoff >= 1900 ? eraLines(eraPack, text, cutoff) : undefined;
  await aiReply(
    { input: text, originalReply: original.text, source: original.source, history, era },
    turn,
  );
  history.push({ role: "user", content: text }, turn);
  if (history.length > 40) history.splice(0, history.length - 40);
  form.querySelector("button").disabled = false;
  input.disabled = false;
  input.focus();
});

document.querySelector("#settings").addEventListener("click", () => dialog.showModal());
document.querySelector("#settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  byok = {
    endpoint: endpointEl.value.trim(),
    model: modelEl.value.trim(),
    persona: personaEl.value,
    apiKey: apiKeyEl.value,
  };
  localStorage.setItem(
    STORE.config,
    JSON.stringify({ endpoint: byok.endpoint, model: byok.model, persona: byok.persona }),
  );
  sessionStorage.setItem(STORE.key, byok.apiKey);
  updateStatus();
  dialog.close();
});

document.querySelector("#forget").addEventListener("click", () => {
  byok = undefined;
  apiKeyEl.value = "";
  sessionStorage.removeItem(STORE.key);
  localStorage.removeItem(STORE.config);
  updateStatus();
  dialog.close();
});

let dos;
document.querySelector("#legacy").addEventListener("click", () => {
  document.body.classList.add("legacy");
  dos = window.Dos(document.querySelector("#dos"), {
    url: "local/max4.jsdos", autoStart: true, renderBackend: "canvas",
  });
});

document.querySelector("#back").addEventListener("click", () => {
  document.body.classList.remove("legacy");
  dos?.stop();
  input.focus();
});

[catalog, eraPack] = await Promise.all(
  ["local/max4-pjm.json", "data/era-1990s.json"].map((url) =>
    fetch(url).then((response) => response.json()),
  ),
);
addLine("[맥스] 안녕? 원본 대화 데이터로 실행 중이야.", "max");
updateStatus();
input.focus();
