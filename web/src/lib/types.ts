/** 원본에서 추출한 응답 카탈로그 (`tools/extract_max4_data.py` 산출물). */
export type Catalog = {
  format: string;
  files: Record<string, CatalogFile>;
};

export type CatalogFile = {
  sha256: string;
  blocks: Block[];
};

export type Block = {
  entries: string[];
};

/** 원본 엔진이 고른 한 턴의 응답. */
export type Reply = {
  text: string;
  source: string;
};

/** 1990년대 고증 팩 (`web/public/data/era-1990s.json`). */
export type EraPack = {
  note: string;
  source: string;
  always: EraAlways[];
  facts: EraFact[];
};

export type EraAlways = {
  year: number;
  text: string;
};

export type EraFact = {
  year: number;
  keywords: string[];
  text: string;
  /** 물가처럼 값이 갱신되는 계열. 컷오프 이하 최신 1건만 쓴다. */
  group?: string;
};

/** 이번 턴에 프롬프트로 나갈 고증 줄. */
export type EraLines = {
  always: string[];
  facts: string[];
};

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/**
 * BYOK 설정. `persona`는 `"standard"`이거나 컷오프 연도 문자열("1994" 등)이다.
 * 연도면 고증 모드로 동작하고, 그 밖의 값이면 표준 말투만 잡는다.
 */
export type ByokConfig = {
  endpoint: string;
  model: string;
  persona?: string;
  apiKey: string;
};

/** 저장 대상에서 apiKey를 뺀 형태. 키는 sessionStorage로만 간다. */
export type StoredConfig = Omit<ByokConfig, "apiKey">;

export type TurnContext = {
  input: string;
  originalReply?: string;
  source?: string;
  history?: ChatMessage[];
  era?: EraLines;
};

export type ChatRequest = {
  url: string;
  /** fetch에 그대로 넘기지만, body가 항상 문자열임을 타입으로 고정한다. */
  options: { method: string; headers: Record<string, string>; body: string };
};

/** OpenAI 호환 응답에서 실제로 읽는 부분만. */
export type CompletionResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};
