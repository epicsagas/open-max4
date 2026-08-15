// 고증 팩에서 이번 턴에 필요한 줄만 골라낸다.
// 팩 전체를 프롬프트에 넣으면 매 턴 수천 토큰이 나가므로, 컷오프 연도로 거르고
// 입력 키워드로 매칭한 것만 보낸다.
export function eraLines(pack, input, cutoff, limit = 6) {
  const inRange = (fact) => fact.year <= cutoff;

  const matched = pack.facts
    .filter(inRange)
    .filter((fact) => fact.keywords.some((word) => input.includes(word)));

  // 물가처럼 값이 갱신되는 계열은 컷오프 이하 최신 1건만 남긴다.
  const groups = new Map();
  const picked = [];
  for (const fact of matched) {
    if (!fact.group) {
      picked.push(fact);
      continue;
    }
    const prev = groups.get(fact.group);
    if (!prev || fact.year > prev.year) groups.set(fact.group, fact);
  }
  picked.push(...groups.values());
  picked.sort((a, b) => a.year - b.year);

  return {
    always: pack.always.filter(inRange).map((fact) => fact.text),
    facts: picked.slice(-limit).map((fact) => fact.text),
  };
}
