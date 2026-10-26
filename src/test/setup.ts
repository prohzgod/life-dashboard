import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// jsdom has no layout, so scrolling is a no-op. (Data tests run in the node environment, without a window.)
if (typeof window !== 'undefined') window.scrollTo = () => {};
