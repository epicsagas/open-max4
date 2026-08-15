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
  line.textContent = text;
  messages.append(line);
  messages.scrollTop = messages.scrollHeight;
}

const history = [];

async function aiReply(context, turn) {
  if (!byokEnabled.checked) return;
  if (!byok) {
    dialog.showModal();
    return;
  }
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
  }
}

document.querySelector("#chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || !catalog) return;
  input.value = "";
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
  dialog.close();
});

document.querySelector("#forget").addEventListener("click", () => {
  byok = undefined;
  apiKeyEl.value = "";
  sessionStorage.removeItem(STORE.key);
  localStorage.removeItem(STORE.config);
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
input.focus();
