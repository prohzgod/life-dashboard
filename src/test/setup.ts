import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { setLocale } from '@/i18n/locale';

// The app defaults to Vietnamese; tests read the English copy unless they switch.
setLocale('en');
beforeEach(() => setLocale('en'));
afterEach(() => cleanup());

// jsdom has no layout, so scrolling is a no-op. (Data tests run in the node environment, without a window.)
if (typeof window !== 'undefined') window.scrollTo = () => {};
