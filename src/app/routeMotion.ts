type To = string | { pathname?: string; search?: string };

/** What a location shows. `task` only opens a panel over the same view, so it doesn't count. */
function viewOf(url: URL): string {
  const params = new URLSearchParams(url.search);
  params.delete('task');
  return `${url.pathname}?${params}`;
}

/** Whether going to `to` from `current` changes what's on screen, and so is worth a crossfade. */
export function changesView(current: string, to: To): boolean {
  const target = typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}`;
  const from = new URL(current);
  return viewOf(new URL(target, from)) !== viewOf(from);
}
