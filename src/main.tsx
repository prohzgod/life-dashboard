import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import '@fontsource/jost/600.css';
import '@fontsource/jost/700.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@design/tokens.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { initData } from './data';
import { router } from './app/router';
import { registerServiceWorker } from './app/registerServiceWorker';
import { StorageError } from './app/StorageError';
import { applyThemePreference, readThemePreference } from './theme/theme';

applyThemePreference(readThemePreference());
registerServiceWorker();

const root = createRoot(document.getElementById('root')!);

// Open the database (and seed a first launch) before the first render, so screens never see an empty space.
initData().then(
  () =>
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error('Could not open local storage', error);
    root.render(<StorageError />);
  },
);
