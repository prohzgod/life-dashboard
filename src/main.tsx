import '@fontsource/radio-canada/400.css';
import '@fontsource/radio-canada/500.css';
import '@fontsource/radio-canada/600.css';
import '@fontsource/radio-canada/700.css';
import '@fontsource/radio-canada-big/400.css';
import '@fontsource/radio-canada-big/700.css';
import '@design/tokens.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { initData } from './data';
import { router } from './app/router';
import { registerServiceWorker } from './app/registerServiceWorker';
import { StorageError } from './app/StorageError';
import { applyLocale, readLocale } from './i18n';
import { LocaleRoot } from './app/LocaleRoot';
import { applyThemePreference, readThemePreference } from './theme/theme';

applyThemePreference(readThemePreference());
applyLocale(readLocale());
registerServiceWorker();

const root = createRoot(document.getElementById('root')!);

// Open the database (and seed a first launch) before the first render, so screens never see an empty space.
initData().then(
  () =>
    root.render(
      <StrictMode>
        <LocaleRoot>
          <RouterProvider router={router} />
        </LocaleRoot>
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error('Could not open local storage', error);
    root.render(<StorageError />);
  },
);
