import { generateKeyBetween } from 'fractional-indexing';

export type TreeNodeLike = {
  id: string;
  parentId: string | null;
  sortKey: string;
  kind: 'folder' | 'page' | 'image' | 'file' | 'gallery';
  isSystem: boolean;
  systemKey: string | null;
};

export type TreeItem<T extends TreeNodeLike> = T & { children: Array<TreeItem<T>> };

const bySortKey = (a: TreeNodeLike, b: TreeNodeLike) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : a.id.localeCompare(b.id));

/** Nests nodes under their parents, siblings in sortKey order. Orphans (parent gone) go to the top level. */
export function buildTree<T extends TreeNodeLike>(nodes: readonly T[]): Array<TreeItem<T>> {
  const items = new Map<string, TreeItem<T>>(nodes.map((n) => [n.id, { ...n, children: [] }]));
  const roots: Array<TreeItem<T>> = [];
  for (const item of items.values()) {
    const parent = item.parentId ? items.get(item.parentId) : undefined;
    (parent ? parent.children : roots).push(item);
  }
  const sort = (list: Array<TreeItem<T>>) => {
    list.sort(bySortKey);
    list.forEach((child) => sort(child.children));
  };
  sort(roots);
  return roots;
}

/** Every node below `id`, at any depth. */
export function descendantIds(nodes: readonly TreeNodeLike[], id: string): string[] {
  const out: string[] = [];
  const walk = (parentId: string) => {
    for (const n of nodes) {
      if (n.parentId === parentId) {
        out.push(n.id);
        walk(n.id);
      }
    }
  };
  walk(id);
  return out;
}

/** Ancestors from the top level down to the node's parent. */
export function ancestors<T extends TreeNodeLike>(nodes: readonly T[], id: string): T[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: T[] = [];
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    out.unshift(parent);
    current = parent;
  }
  return out;
}

/** The Journal and its year/month/day nodes are filed automatically. */
export function isJournalManaged(node: Pick<TreeNodeLike, 'systemKey'> | undefined): boolean {
  return !!node?.systemKey && (node.systemKey === 'journal' || node.systemKey.startsWith('journal:'));
}

export type MoveCheck = { ok: true } | { ok: false; reason: string };

/** Whether `node` may be moved under `newParentId` (null = top level). */
export function canMove(nodes: readonly TreeNodeLike[], node: TreeNodeLike, newParentId: string | null): MoveCheck {
  if (node.isSystem) return { ok: false, reason: 'Built-in folders stay where they are.' };
  if (newParentId === node.id || (newParentId && descendantIds(nodes, node.id).includes(newParentId))) {
    return { ok: false, reason: 'A page can’t go inside itself.' };
  }
  const parent = newParentId ? nodes.find((n) => n.id === newParentId) : undefined;
  if (newParentId && !parent) return { ok: false, reason: 'That folder no longer exists.' };
  if (parent && (parent.kind === 'image' || parent.kind === 'file')) return { ok: false, reason: 'Images and files can’t hold pages.' };
  if (parent && isJournalManaged(parent) && parent.systemKey !== null && !/^journal:\d{4}-\d{2}-\d{2}$/.test(parent.systemKey)) {
    return { ok: false, reason: 'The Journal files its days by itself.' };
  }
  return { ok: true };
}

/**
 * The sortKey that places a node at `index` among its new siblings (in their current order,
 * without the node itself). Only the moved row changes.
 */
export function sortKeyAt(siblings: ReadonlyArray<{ sortKey: string }>, index: number): string {
  const sorted = [...siblings].sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  const i = Math.max(0, Math.min(index, sorted.length));
  const before = sorted[i - 1]?.sortKey ?? null;
  const after = sorted[i]?.sortKey ?? null;
  // Equal neighbours (from an old import) can't have a key between them; go just after the earlier one.
  if (before !== null && after !== null && before >= after) return generateKeyBetween(before, null);
  return generateKeyBetween(before, after);
}

/**
 * Drag-and-drop libraries report the drop index counting the dragged item where it still is.
 * This turns it into an index among the siblings without it.
 */
export function dropIndexWithoutSelf(siblingIds: readonly string[], selfId: string, index: number): number {
  const from = siblingIds.indexOf(selfId);
  return from !== -1 && from < index ? index - 1 : index;
}
