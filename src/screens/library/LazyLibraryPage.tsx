import { lazy, Suspense } from 'react';

// The Library carries the editor, the biggest part of the app, so it loads on first visit (and is precached for offline).
const LibraryPage = lazy(() => import('./LibraryPage').then((m) => ({ default: m.LibraryPage })));

export function LazyLibraryPage({ mode }: { mode: 'home' | 'day' | 'node' | 'trash' | 'photos' }) {
  return (
    <Suspense fallback={null}>
      <LibraryPage mode={mode} />
    </Suspense>
  );
}
