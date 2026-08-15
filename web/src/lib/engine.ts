import type { Block, Catalog, CatalogFile, Reply } from "./types";

function fileOf(catalog: Catalog, name: string): CatalogFile {
  const file = catalog.files[name];
  if (!file) throw new Error(`카탈로그에 ${name}이(가) 없습니다`);
  return file;
}

function entriesOf(catalog: Catalog, name: string): string[] {
  return fileOf(catalog, name).blocks.flatMap((block) => block.entries);
}

function pick(items: string[], random: () => number): string {
  const chosen = items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  if (chosen === undefined) throw new Error("응답 풀이 비어 있습니다");
  return chosen;
}

export function replyFor(catalog: Catalog, input: string, random: () => number = Math.random): Reply {
  const self = entriesOf(catalog, "PJM.001").some((word) => input.includes(word));
  const keywords = fileOf(catalog, "PJM.013").blocks;
  const match = keywords.findIndex((block) => block.entries.some((word) => input.includes(word)));
  const source = self ? "PJM.011" : "PJM.012";
  // 키워드 블록 수와 응답 블록 수는 원본에서 54개로 같다. 어긋나면 폴백으로 흘린다.
  const group: Block | undefined = match >= 0 ? fileOf(catalog, source).blocks[match] : undefined;

  if (group) return { text: pick(group.entries, random), source };

  const fallback = self ? "PJM.031" : "PJM.032";
  return { text: pick(entriesOf(catalog, fallback), random), source: fallback };
}
