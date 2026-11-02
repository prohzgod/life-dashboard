import '@fontsource/be-vietnam-pro/300.css';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@design/tokens.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { getBackgroundPhoto, initData } from './data';
import { router } from './app/router';
import { preloadScreens } from './app/preloadScreens';
import { registerServiceWorker } from './app/registerServiceWorker';
import { StorageError } from './app/StorageError';
import { applyLocale, readLocale } from './i18n';
import { LocaleRoot } from './app/LocaleRoot';
import { applyAppearance, followSystemAppearance, showOwnPhoto } from './theme/appearance';
import { AppBackground } from './app/AppBackground';

applyAppearance();
followSystemAppearance();
applyLocale(readLocale());
registerServiceWorker();

const root = createRoot(document.getElementById('root')!);

// Open the database (and seed a first launch) before the first render, so screens never see an empty space.
initData().then(
  async () => {
    showOwnPhoto(await getBackgroundPhoto().catch(() => null));
    root.render(
      <StrictMode>
        <AppBackground />
        <LocaleRoot>
          <RouterProvider router={router} />
        </LocaleRoot>
      </StrictMode>,
    );
    preloadScreens();
  },
  (error: unknown) => {
    console.error('Could not open local storage', error);
    root.render(
      <>
        <AppBackground />
        <StorageError />
      </>,
    );
  },
);
