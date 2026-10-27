export type SearchDoc = { id: string; title: string; text: string };
export type SearchHit = { id: string; title: string; snippet: string; score: number };

/** Lower-case and strip accents, so "Café" matches "cafe". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Every word of the query must appear in the title or text. Title hits rank first,
 * then more matches; the snippet is the text around the first match.
 */
export function searchDocs(docs: readonly SearchDoc[], query: string, limit = 50): SearchHit[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const title = normalize(doc.title);
    const text = normalize(doc.text);
    if (!terms.every((t) => title.includes(t) || text.includes(t))) continue;
    let score = 0;
    for (const t of terms) {
      if (title.startsWith(t)) score += 6;
      else if (title.includes(t)) score += 4;
      score += Math.min(3, text.split(t).length - 1);
    }
    hits.push({ id: doc.id, title: doc.title, snippet: snippet(doc.text, text, terms), score });
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

function snippet(original: string, normalized: string, terms: string[], radius = 60): string {
  const at = Math.min(...terms.map((t) => normalized.indexOf(t)).filter((i) => i >= 0));
  if (!Number.isFinite(at)) return original.slice(0, radius * 2).replace(/\s+/g, ' ').trim();
  const start = Math.max(0, at - radius);
  const end = Math.min(original.length, at + radius);
  const body = original.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${body}${end < original.length ? '…' : ''}`;
}
