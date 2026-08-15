<script lang="ts">
  import { tick } from "svelte";

  import Settings from "./Settings.svelte";
  import { requestFor } from "./lib/byok";
  import { replyFor } from "./lib/engine";
  import { eraLines } from "./lib/era";
  import type {
    ByokConfig,
    Catalog,
    ChatMessage,
    EraPack,
    StoredConfig,
    TurnContext,
  } from "./lib/types";

  type Line = { kind: "user" | "max" | "ai"; text: string };

  const STORE = { config: "max4-byok", key: "max4-byok-key" };
  const SPINNER = ["|", "/", "-", "\\"];

  function restore(): ByokConfig | undefined {
    let stored: Partial<StoredConfig> = {};
    try {
      stored = JSON.parse(localStorage.getItem(STORE.config) ?? "") ?? {};
    } catch {
      stored = {};
    }
    const apiKey = sessionStorage.getItem(STORE.key);
    if (!apiKey || !stored.endpoint || !stored.model) return undefined;
    return { endpoint: stored.endpoint, model: stored.model, persona: stored.persona, apiKey };
  }

  let catalog = $state<Catalog>();
  let eraPack = $state<EraPack>();
  const restored = restore();
  let byok = $state<ByokConfig | undefined>(restored);
  // 키가 살아 있으면 켠 채로 시작한다.
  let byokEnabled = $state(Boolean(restored));
  let legacy = $state(false);
  let busy = $state(false);
  let thinking = $state(false);
  let frame = $state(0);
  let draft = $state("");
  let lines = $state<Line[]>([{ kind: "max", text: "[맥스] 안녕? 원본 대화 데이터로 실행 중이야." }]);

  const history: ChatMessage[] = [];

  let settings: Settings;
  let messagesEl = $state<HTMLDivElement>();
  let inputEl = $state<HTMLInputElement>();
  let dosEl = $state<HTMLDivElement>();
  let dos: { stop: () => void } | undefined;

  const cutoff = $derived(Number(byok?.persona));
  const status = $derived(
    !byokEnabled
      ? "원본 엔진"
      : !byok
        ? "BYOK · 설정 안 됨"
        : cutoff >= 1900
          ? `BYOK · 고증 ${cutoff}`
          : "BYOK · 표준",
  );

  // 회전 막대는 대기 중일 때만 돈다. 정리는 effect가 알아서 한다.
  $effect(() => {
    if (!thinking) return;
    const timer = setInterval(() => (frame += 1), 150);
    return () => clearInterval(timer);
  });

  $effect(() => {
    lines.length;
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  $effect(() => {
    inputEl?.focus();
  });

  $effect(() => {
    void (async () => {
      const [pjm, era] = await Promise.all([
        fetch("local/max4-pjm.json").then((response) => response.json()),
        fetch("data/era-1990s.json").then((response) => response.json()),
      ]);
      catalog = pjm as Catalog;
      eraPack = era as EraPack;
    })();
  });

  function push(kind: Line["kind"], text: string): void {
    // white-space: pre-wrap이라 LLM이 넣는 빈 줄이 그대로 문단 간격이 된다.
    lines = [...lines, { kind, text: text.replace(/\n{2,}/g, "\n") }];
  }

  function persist(config: ByokConfig): void {
    byok = config;
    byokEnabled = true;
    const { apiKey, ...rest } = config;
    localStorage.setItem(STORE.config, JSON.stringify(rest satisfies StoredConfig));
    sessionStorage.setItem(STORE.key, apiKey);
  }

  // 키가 없으면 요청을 못 보내므로 byok을 비운다.
  // 엔드포인트·모델·모드는 localStorage에 그대로 둔다.
  function forget(): void {
    byok = undefined;
    byokEnabled = false;
    sessionStorage.removeItem(STORE.key);
  }

  async function aiReply(context: TurnContext, turn: ChatMessage): Promise<void> {
    if (!byokEnabled) return;
    if (!byok) {
      settings.open();
      return;
    }
    thinking = true;
    try {
      const request = requestFor(byok, context);
      const response = await fetch(request.url, request.options);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "BYOK 요청 실패");
      const text: string | undefined = payload.choices?.[0]?.message?.content?.trim();
      if (text) {
        push("ai", `[맥스 · 확장] ${text}`);
        turn.content = `${turn.content}\n${text}`;
      }
    } catch (error) {
      push("ai", `BYOK 오류: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      thinking = false;
    }
  }

  async function send(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const text = draft.trim();
    if (!text || !catalog) return;
    draft = "";
    busy = true;
    push("user", `[당신] ${text}`);

    const original = replyFor(catalog, text);
    if (!(byokEnabled && byok)) push("max", `[맥스] ${original.text}`);
    const turn: ChatMessage = { role: "assistant", content: original.text };
    const era = cutoff >= 1900 && eraPack ? eraLines(eraPack, text, cutoff) : undefined;

    await aiReply(
      { input: text, originalReply: original.text, source: original.source, history, era },
      turn,
    );

    history.push({ role: "user", content: text }, turn);
    if (history.length > 40) history.splice(0, history.length - 40);
    busy = false;
    // 보내기 버튼을 눌렀으면 포커스가 버튼에 남는다. 입력창으로 되돌린다.
    await tick();
    inputEl?.focus();
  }

  async function startDos(): Promise<void> {
    legacy = true;
    await tick();
    if (dosEl) {
      dos = window.Dos(dosEl, {
        url: "local/max4.jsdos",
        autoStart: true,
        renderBackend: "canvas",
      });
    }
  }

  function stopDos(): void {
    legacy = false;
    dos?.stop();
    dos = undefined;
  }
</script>

<div class="monitor">
  <div class="crt">
    {#if !legacy}
      <main id="app">
        <header>
          <div class="titlebar">
            <span class="sysmenu" aria-hidden="true"></span>
            <h1>open-max4</h1>
            <span class="cap" aria-hidden="true"><b>▾</b><b>▴</b></span>
          </div>
          <div class="toolbar">
            <label class="chk"><input type="checkbox" bind:checked={byokEnabled} /> BYOK</label>
            <span class="sep" aria-hidden="true"></span>
            <button type="button" onclick={() => settings.open()}>BYOK 설정</button>
            <button type="button" onclick={startDos}>원본 DOS</button>
          </div>
        </header>

        <section class="screen" aria-label="MAX 대화 화면">
          <div id="messages" bind:this={messagesEl} aria-live="polite">
            {#each lines as line, index (index)}
              <p class="line {line.kind}">{line.text}</p>
            {/each}
            {#if thinking}
              <p class="line ai">[맥스] 생각중 {SPINNER[frame % SPINNER.length]}</p>
            {/if}
          </div>
          <form id="chat-form" onsubmit={send}>
            <input
              id="input"
              bind:this={inputEl}
              bind:value={draft}
              autocomplete="off"
              placeholder="할 말을 입력하세요"
              aria-label="대화 입력"
            />
            <button disabled={busy}>보내기</button>
          </form>
        </section>

        <footer class="statusbar">
          <div aria-live="polite">{status}</div>
          <div>비공식 복원판</div>
        </footer>
      </main>
    {:else}
      <button id="back" type="button" onclick={stopDos}>현대판으로</button>
      <div id="dos" bind:this={dosEl}></div>
    {/if}
  </div>
  <span class="brand" aria-hidden="true">MAX</span>
  <span class="model" aria-hidden="true">CRT-1994</span>
  <span class="led" aria-hidden="true"></span>
</div>

<Settings bind:this={settings} initial={byok} onsave={persist} onforget={forget} />
