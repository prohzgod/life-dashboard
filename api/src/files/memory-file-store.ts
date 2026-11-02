import type { FileStore } from './file-store';

/** Stands in for R2 in tests and e2e. The URLs point back at this API's /api/test-files route. */
export class MemoryFileStore implements FileStore {
  readonly bytes = new Map<string, { body: Buffer; mime: string }>();
  readonly calls: { mode: 'put' | 'get'; key: string }[] = [];

  async presignPut(key: string) {
    this.calls.push({ mode: 'put', key });
    return `/api/test-files?key=${encodeURIComponent(key)}`;
  }

  async presignGet(key: string) {
    this.calls.push({ mode: 'get', key });
    return `/api/test-files?key=${encodeURIComponent(key)}`;
  }
}
