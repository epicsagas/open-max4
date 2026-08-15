import type { ByokConfig, ChatMessage, ChatRequest, TurnContext } from "./types";

function completionUrl(endpoint: string): string {
  const url = new URL(endpoint);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) {
    throw new Error("BYOK endpoint must use HTTPS or localhost");
  }
  url.pathname = `${url.pathname.replace(/\/$/, "")}/chat/completions`;
  return url.toString();
}

const BASE = [
  "당신은 1994년 한국 도스용 대화 프로그램 MAX의 맥스입니다.",
  "사용자와 친구처럼 반말 구어체로 대화하며, 한두 문장으로 짧게 답합니다.",
];

/** persona가 연도면 그 해까지만 아는 고증 모드, 아니면 말투만 잡는 표준 모드. */
export function personaLines(persona?: string): string[] {
  const year = Number(persona);
  if (!(year >= 1900)) return BASE;
  return [
    ...BASE,
    `지금은 ${year}년이고, 당신이 아는 세상은 ${year}년까지입니다.`,
    `${year + 1}년 이후의 사건·인물·기술·제품·작품·유행어는 전혀 모릅니다. 아는 척하거나 설명하지 마세요.`,
    "모르는 것을 물으면 처음 듣는다는 듯 짧게 되묻고 화제를 돌리세요. 지식의 한계를 해명하는 기계적인 말투는 쓰지 마세요.",
    "인터넷 밈·현대 신조어·영어 약어·이모지를 쓰지 않고, 당시 구어체 어휘만 씁니다.",
    "자신을 AI·인공지능·언어모델·챗봇이라고 부르지 않습니다. 그냥 프로그램 맥스입니다.",
  ];
}

function block(title: string, lines?: string[]): string[] {
  return lines?.length ? ["", title, ...lines.map((line) => `- ${line}`)] : [];
}

// 고증 팩에는 실존 인물 실명이 들어 있다. 모드와 무관하게 항상 붙인다.
const SAFETY = [
  "",
  "실존 인물을 언급할 때는 위 배경에 주어진 범위를 넘지 마세요. 배경에 없는 경력·발언·사건을 지어내면 안 됩니다.",
  "실존 인물의 사생활, 범죄 혐의, 질병, 성적 내용, 가족 관계를 만들어내거나 비방·모욕·조롱하지 않습니다.",
  "확실하지 않으면 아는 척하지 말고, 맥스답게 모른다고 하거나 화제를 돌리세요.",
];

export function requestFor(config: ByokConfig, context: TurnContext): ChatRequest {
  if (!config.apiKey || !config.model) throw new Error("API key and model are required");
  const original = context.originalReply || "(원본 응답 없음)";
  const system = [
    ...personaLines(config.persona),
    ...block("당신이 사는 시대의 일상:", context.era?.always),
    ...block("이번 대화에 관련된 당시 사실:", context.era?.facts),
    ...(context.era
      ? ["", "위 배경은 참고용입니다. 묻지 않은 내용을 늘어놓지 말고 필요할 때만 자연스럽게 쓰세요.", ""]
      : []),
    "이번 턴 원본 엔진 응답은 맥스의 말투 참고용입니다.",
    `원본 데이터 출처: ${context.source || "없음"}`,
    `원본 응답: ${original}`,
    "원본 응답을 그대로 반복하지 말고, 지금까지 대화 흐름에 맞게 자연스럽게 답하세요.",
    ...SAFETY,
  ].join("\n");

  const history: ChatMessage[] = (context.history ?? [])
    .slice(-10)
    .map(({ role, content }) => ({ role, content }));

  return {
    url: completionUrl(config.endpoint),
    options: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: system },
          ...history,
          { role: "user", content: context.input },
        ],
      }),
    },
  };
}
