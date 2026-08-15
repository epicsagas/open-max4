<script lang="ts">
  import { untrack } from "svelte";

  import type { ByokConfig } from "./lib/types";

  let {
    initial,
    onsave,
    onforget,
  }: {
    initial?: ByokConfig;
    onsave: (config: ByokConfig) => void;
    onforget: () => void;
  } = $props();

  // 폼은 열릴 때의 초기값만 받아 두고, 이후에는 자체 상태로 편집한다.
  const seed = untrack(() => initial);
  let dialog = $state<HTMLDialogElement>();
  let endpoint = $state(seed?.endpoint ?? "https://api.openai.com/v1");
  let model = $state(seed?.model ?? "");
  let persona = $state(seed?.persona ?? "standard");
  let apiKey = $state(seed?.apiKey ?? "");

  export function open(): void {
    dialog?.showModal();
  }

  function save(event: SubmitEvent): void {
    event.preventDefault();
    onsave({ endpoint: endpoint.trim(), model: model.trim(), persona, apiKey });
    dialog?.close();
  }

  function close(): void {
    dialog?.close();
  }

  // 키만 비운다. 엔드포인트·모델·모드는 남기고 모달도 열어 둔다.
  function forget(): void {
    apiKey = "";
    onforget();
  }
</script>

<dialog bind:this={dialog}>
  <form method="dialog" onsubmit={save}>
    <div class="titlebar">
      <button type="button" class="sysmenu" onclick={close} aria-label="설정 창 닫기"></button>
      <h2>OpenAI 호환 BYOK</h2>
    </div>
    <div class="dlg-body">
      <label>엔드포인트 <input bind:value={endpoint} required /></label>
      <label>모델 <input bind:value={model} placeholder="gpt-4.1-mini" required /></label>
      <label>
        모드
        <select bind:value={persona}>
          <option value="standard">표준 — 맥스 말투만</option>
          <option value="1994">고증 1994 — 원본 출시 시점</option>
          <option value="1997">고증 1997 — IMF 직전</option>
          <option value="1999">고증 1999 — 세기말</option>
        </select>
      </label>
      <label>
        API 키
        <input
          bind:value={apiKey}
          type="password"
          name="byok-key"
          autocomplete="new-password"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          required
        />
      </label>
      <small>
        키는 이 탭의 sessionStorage에 저장되어 탭을 닫으면 지워집니다. 단 탭 복원(Cmd+Shift+T)이나
        세션 복구로 되살아날 수 있으니, 확실히 지우려면 <b>키 지우기</b>를 누르세요. 엔드포인트·모델은
        이 브라우저에 계속 남습니다.
      </small>
    </div>
    <div class="dlg-buttons">
      <button>이 설정으로 사용</button>
      <button type="button" onclick={forget}>키 지우기</button>
    </div>
  </form>
</dialog>

<style>
  .sysmenu {
    padding: 0;
    min-width: 0;
    box-shadow: none;
    cursor: pointer;
  }
  .sysmenu:active {
    border-color: #fff #000 #000 #fff;
    padding: 0;
  }
</style>
