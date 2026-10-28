/**
 * Reading the editor's documents (BlockNote JSON) without depending on BlockNote:
 * plain text for search, and the [[page]] links and @mentions inside.
 */

type InlineLike = { type?: string; text?: string; props?: Record<string, unknown>; content?: unknown };
type BlockLike = { type?: string; props?: Record<string, unknown>; content?: unknown; children?: unknown };

export type DocLink = { toType: 'node' | 'goal'; toId: string };

function inlineItems(content: unknown): InlineLike[] {
  if (Array.isArray(content)) return content as InlineLike[];
  // Tables keep rows of cells of inline content.
  if (content && typeof content === 'object' && Array.isArray((content as { rows?: unknown }).rows)) {
    return ((content as { rows: Array<{ cells?: unknown[] }> }).rows ?? []).flatMap((row) =>
      (row.cells ?? []).flatMap((cell) => inlineItems(Array.isArray(cell) ? cell : (cell as { content?: unknown })?.content)),
    );
  }
  return [];
}

function walk(blocks: unknown, visit: (block: BlockLike) => void) {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks as BlockLike[]) {
    visit(block);
    walk(block.children, visit);
  }
}

function inlineText(item: InlineLike): string {
  if (typeof item.text === 'string') return item.text;
  if (item.type === 'pageLink' || item.type === 'goalMention') return String(item.props?.title ?? '');
  if (item.type === 'link') return inlineItems(item.content).map(inlineText).join('');
  return '';
}

/** All the words in a document, one line per block, for full-text search. */
export function blocksToText(blocks: unknown): string {
  const lines: string[] = [];
  walk(blocks, (block) => {
    const text = inlineItems(block.content).map(inlineText).join('');
    const caption = typeof block.props?.caption === 'string' ? block.props.caption : '';
    const line = [text, caption].filter(Boolean).join(' ');
    if (line.trim()) lines.push(line.trim());
  });
  return lines.join('\n');
}

/** Distinct [[page]] links and @goal mentions in a document. */
export function blocksToLinks(blocks: unknown): DocLink[] {
  const found = new Map<string, DocLink>();
  walk(blocks, (block) => {
    for (const item of inlineItems(block.content)) {
      const id = item.props?.id;
      if (typeof id !== 'string' || !id) continue;
      if (item.type === 'pageLink') found.set(`node:${id}`, { toType: 'node', toId: id });
      if (item.type === 'goalMention') found.set(`goal:${id}`, { toType: 'goal', toId: id });
    }
  });
  return [...found.values()];
}

/** Attachment ids a document refers to (images and galleries store `attachment://<id>`). */
export function blocksToAttachmentIds(blocks: unknown): string[] {
  const ids = new Set<string>();
  const scan = (value: unknown) => {
    if (typeof value === 'string') for (const m of value.matchAll(/attachment:\/\/([0-9A-Z]{26})/g)) ids.add(m[1]!);
  };
  walk(blocks, (block) => Object.values(block.props ?? {}).forEach(scan));
  return [...ids];
}

/** The first checklist in a document, labelled by the heading above it: "Before we go, 1 of 3". */
export function checklistProgress(blocks: unknown): { label: string | null; done: number; total: number } | null {
  if (!Array.isArray(blocks)) return null;
  let heading: string | null = null;
  let found: { label: string | null; done: number; total: number } | null = null;
  for (const block of blocks as BlockLike[]) {
    if (block.type === 'heading') {
      if (found) break;
      heading = inlineItems(block.content).map(inlineText).join('').trim() || null;
    } else if (block.type === 'checkListItem') {
      found ??= { label: heading, done: 0, total: 0 };
      found.total++;
      if (block.props?.checked) found.done++;
    } else if (found) {
      break;
    }
  }
  return found;
}
