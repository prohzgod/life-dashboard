const urls = new WeakMap<Blob, string>();

/**
 * An object URL for a Blob. One URL per Blob, cached for the page's life: they're small
 * (thumbnails) and revoking on unmount would break the same image shown elsewhere.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  if (!blob) return null;
  let url = urls.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    urls.set(blob, url);
  }
  return url;
}
