import { ancestors, buildTree, canMove, descendantIds, dropIndexWithoutSelf, sortKeyAt, type TreeNodeLike } from './library';

const node = (id: string, parentId: string | null, sortKey: string, over: Partial<TreeNodeLike> = {}): TreeNodeLike => ({
  id,
  parentId,
  sortKey,
  kind: 'page',
  isSystem: false,
  systemKey: null,
  ...over,
});

const nodes = [
  node('journal', null, 'a0', { kind: 'folder', isSystem: true, systemKey: 'journal' }),
  node('y2026', 'journal', 'a0', { kind: 'folder', isSystem: true, systemKey: 'journal:2026' }),
  node('oct', 'y2026', 'a0', { kind: 'folder', isSystem: true, systemKey: 'journal:2026-10' }),
  node('day', 'oct', 'a0', { isSystem: true, systemKey: 'journal:2026-10-27' }),
  node('projects', null, 'a1', { kind: 'folder', isSystem: true, systemKey: 'projects' }),
  node('japan', 'projects', 'a1'),
  node('budget', 'japan', 'a2'),
  node('itinerary', 'japan', 'a1'),
  node('orphan', 'gone', 'a5'),
];

describe('buildTree', () => {
  it('nests and orders by sortKey, with orphans at the top level', () => {
    const tree = buildTree(nodes);
    expect(tree.map((n) => n.id)).toEqual(['journal', 'projects', 'orphan']);
    expect(tree[1]!.children[0]!.children.map((n) => n.id)).toEqual(['itinerary', 'budget']);
  });
});

describe('family lines', () => {
  it('finds descendants and ancestors', () => {
    expect(descendantIds(nodes, 'projects').sort()).toEqual(['budget', 'itinerary', 'japan']);
    expect(ancestors(nodes, 'budget').map((n) => n.id)).toEqual(['projects', 'japan']);
    expect(ancestors(nodes, 'journal')).toEqual([]);
  });
});

describe('canMove', () => {
  const find = (id: string) => nodes.find((n) => n.id === id)!;

  it('allows ordinary moves', () => {
    expect(canMove(nodes, find('budget'), null)).toEqual({ ok: true });
    expect(canMove(nodes, find('budget'), 'itinerary')).toEqual({ ok: true });
  });

  it('refuses moving built-ins, into itself, or into the Journal’s own folders', () => {
    expect(canMove(nodes, find('projects'), null).ok).toBe(false);
    expect(canMove(nodes, find('japan'), 'budget').ok).toBe(false);
    expect(canMove(nodes, find('japan'), 'japan').ok).toBe(false);
    expect(canMove(nodes, find('budget'), 'oct').ok).toBe(false);
    expect(canMove(nodes, find('budget'), 'missing').ok).toBe(false);
  });

  it('lets a page go under a journal day', () => {
    expect(canMove(nodes, find('budget'), 'day')).toEqual({ ok: true });
  });
});

describe('sortKeyAt', () => {
  const siblings = [{ sortKey: 'a1' }, { sortKey: 'a3' }, { sortKey: 'a5' }];

  it('places between neighbours, first, or last', () => {
    const middle = sortKeyAt(siblings, 1);
    expect(middle > 'a1' && middle < 'a3').toBe(true);
    expect(sortKeyAt(siblings, 0) < 'a1').toBe(true);
    expect(sortKeyAt(siblings, 3) > 'a5').toBe(true);
    expect(sortKeyAt(siblings, 99) > 'a5').toBe(true);
    expect(sortKeyAt([], 0)).toBe('a0');
  });

  it('copes with duplicate keys', () => {
    expect(sortKeyAt([{ sortKey: 'a1' }, { sortKey: 'a1' }], 1) > 'a1').toBe(true);
  });
});

describe('dropIndexWithoutSelf', () => {
  it('shifts down-moves within the same list, and leaves others alone', () => {
    expect(dropIndexWithoutSelf(['a', 'b', 'c', 'd'], 'a', 3)).toBe(2); // a between c and d
    expect(dropIndexWithoutSelf(['a', 'b', 'c', 'd'], 'd', 1)).toBe(1); // d between a and b
    expect(dropIndexWithoutSelf(['a', 'b'], 'x', 1)).toBe(1); // from another folder
  });
});
