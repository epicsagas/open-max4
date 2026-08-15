const entries = (catalog, name) => catalog.files[name].blocks.flatMap((block) => block.entries);

const pick = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];

export function replyFor(catalog, input, random = Math.random) {
  const self = entries(catalog, "PJM.001").some((word) => input.includes(word));
  const keywords = catalog.files["PJM.013"].blocks;
  const match = keywords.findIndex((block) => block.entries.some((word) => input.includes(word)));
  const source = self ? "PJM.011" : "PJM.012";

  if (match >= 0) {
    return { text: pick(catalog.files[source].blocks[match].entries, random), source };
  }

  const fallback = self ? "PJM.031" : "PJM.032";
  return { text: pick(entries(catalog, fallback), random), source: fallback };
}
