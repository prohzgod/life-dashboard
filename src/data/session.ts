let currentSpaceId: string | null = null;

/** The space new records go into and lists read from. Set once the database is ready. */
export function getCurrentSpaceId(): string {
  if (!currentSpaceId) throw new Error('The database is not ready yet: call initData() first.');
  return currentSpaceId;
}

export function setCurrentSpaceId(id: string | null) {
  currentSpaceId = id;
}
