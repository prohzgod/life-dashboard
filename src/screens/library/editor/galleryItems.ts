export type GalleryItem = { url: string; caption: string };

export const galleryConfig = { type: 'gallery', propSchema: { items: { default: '[]' } }, content: 'none' } as const;
export type GalleryConfig = typeof galleryConfig;

/** Gallery items are stored as JSON in a block prop; anything malformed is dropped. */
export function parseGalleryItems(json: string): GalleryItem[] {
  try {
    const items: unknown = JSON.parse(json);
    return Array.isArray(items)
      ? items.filter((i): i is GalleryItem => typeof i?.url === 'string').map((i) => ({ url: i.url, caption: String(i.caption ?? '') }))
      : [];
  } catch {
    return [];
  }
}
