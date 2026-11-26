/**
 * DOC_PAGES_PLAN §4.9: docs inside docs ("pages"), as a tree. Pure (no React): the sidebar's Pages tab, the library's
 * unfolding rows, the move dialog and previous/next all read the same shape.
 */

export interface TreeDoc {
  _id: string;
  parentId?: string | null;
  title: string;
  position?: number;
}

export interface TreeRow<T extends TreeDoc> {
  node: T;
  /** 0 = a root row. */
  depth: number;
  /** How many pages it holds (in these nodes). */
  kids: number;
}

const byPlace = (a: TreeDoc, b: TreeDoc) => (a.position ?? 0) - (b.position ?? 0) || a._id.localeCompare(b._id);

/** Each doc's pages, in order (siblings by position, then id). */
export function childrenOf<T extends TreeDoc>(nodes: readonly T[]): Map<string | null, T[]> {
  const kids = new Map<string | null, T[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const list = kids.get(key);
    if (list) list.push(n);
    else kids.set(key, [n]);
  }
  for (const list of kids.values()) list.sort(byPlace);
  return kids;
}

/** The docs above one, root first (only those among `nodes`). */
export function pathOf<T extends TreeDoc>(nodes: readonly T[], id: string): T[] {
  const byId = new Map(nodes.map((n) => [n._id, n]));
  const out: T[] = [];
  const seen = new Set<string>([id]);
  let at = byId.get(id)?.parentId ?? null;
  while (at && !seen.has(at) && byId.has(at)) {
    seen.add(at);
    out.unshift(byId.get(at)!);
    at = byId.get(at)!.parentId ?? null;
  }
  return out;
}

/** The pages beside one (itself included), in order. */
export function siblingsOf<T extends TreeDoc>(nodes: readonly T[], id: string): T[] {
  const me = nodes.find((n) => n._id === id);
  if (!me) return [];
  return nodes.filter((n) => (n.parentId ?? null) === (me.parentId ?? null)).sort(byPlace);
}

/** The page before and after one among its siblings (a page with a parent only). */
export function prevNext<T extends TreeDoc>(nodes: readonly T[], id: string): { prev: T | null; next: T | null } {
  const me = nodes.find((n) => n._id === id);
  if (!me?.parentId) return { prev: null, next: null };
  const sibs = siblingsOf(nodes, id);
  const i = sibs.findIndex((n) => n._id === id);
  return { prev: sibs[i - 1] ?? null, next: sibs[i + 1] ?? null };
}

/** Everything inside a doc (its ids), at any depth. */
export function insideOf<T extends TreeDoc>(nodes: readonly T[], id: string): Set<string> {
  const kids = childrenOf(nodes);
  const out = new Set<string>();
  const walk = (at: string) => {
    for (const k of kids.get(at) ?? []) {
      if (out.has(k._id) || k._id === id) continue;
      out.add(k._id);
      walk(k._id);
    }
  };
  walk(id);
  return out;
}

/** The roots among these docs: no parent, or a parent not among them (gone, in the trash, not theirs to open). */
export function rootsOf<T extends TreeDoc>(nodes: readonly T[]): T[] {
  const ids = new Set(nodes.map((n) => n._id));
  return nodes.filter((n) => !n.parentId || !ids.has(n.parentId));
}

/**
 * The rows to draw: each root, then (when it is open) its pages, depth-first. `roots` keeps the caller's order for the
 * top level; pages go by position.
 */
export function visibleRows<T extends TreeDoc>(nodes: readonly T[], roots: readonly T[], open: ReadonlySet<string>): TreeRow<T>[] {
  const kids = childrenOf(nodes);
  const rows: TreeRow<T>[] = [];
  const seen = new Set<string>();
  const walk = (n: T, depth: number) => {
    if (seen.has(n._id) || depth > 64) return;
    seen.add(n._id);
    const mine = kids.get(n._id) ?? [];
    rows.push({ node: n, depth, kids: mine.length });
    if (open.has(n._id)) for (const k of mine) walk(k, depth + 1);
  };
  for (const r of roots) walk(r, 0);
  return rows;
}
