import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styles from './AppShell.module.css';
import { CommandPalette } from './CommandPalette';
import { QuickCapture } from './QuickCapture';
import { Sidebar } from './Sidebar';

type Overlay = 'search' | 'capture' | null;

export function AppShell() {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === 'k') {
        event.preventDefault();
        setOverlay('search');
      } else if (key === 'n') {
        event.preventDefault();
        setOverlay('capture');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Each screen starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const close = () => setOverlay(null);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <Sidebar onSearch={() => setOverlay('search')} onCapture={() => setOverlay('capture')} />
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <CommandPalette open={overlay === 'search'} onClose={close} />
      <QuickCapture open={overlay === 'capture'} onClose={close} />
    </div>
  );
}
