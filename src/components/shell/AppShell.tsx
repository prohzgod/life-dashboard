import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { mobileChrome } from '@/app/mobileChrome';
import { useAutoSync } from '@/data';
import { SyncNotice } from '@/screens/settings/SyncSettings';
import { useT } from '@/i18n';
import { useIsMobile } from '@/lib/useMediaQuery';
import { Icon } from '../icons/Icon';
import styles from './AppShell.module.css';
import { CommandPalette } from './CommandPalette';
import { LockGate } from './LockGate';
import { MobileCapture } from './MobileCapture';
import { QuickCapture } from './QuickCapture';
import { TabBar } from './TabBar';
import { TopNav } from './TopNav';
import { useReminders } from './useReminders';
import { ShellActionsContext } from './shellActions';

type Overlay = 'search' | 'capture' | null;

export function AppShell() {
  useReminders();
  useAutoSync();
  return (
    <LockGate>
      <Shell />
    </LockGate>
  );
}

function Shell() {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const { pathname, search } = useLocation();
  const isMobile = useIsMobile();
  const t = useT();

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
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  const close = () => setOverlay(null);
  const actions = useMemo(() => ({ openCapture: () => setOverlay('capture'), openSearch: () => setOverlay('search') }), []);

  if (isMobile) {
    const chrome = mobileChrome(pathname, search);
    return (
      <div className={chrome.hideTabBar ? styles.mobile : `${styles.mobile} ${styles.withTabBar}`}>
        <a href="#main" className={styles.skip}>
          {t.shell.skipToContent}
        </a>
        <main id="main" className={styles.mobileMain} tabIndex={-1}>
          <SyncNotice />
          {chrome.back && (
            <Link to={chrome.back.to} className={styles.back} aria-label={t.shell.backTo(chrome.back.label)}>
              <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
              {chrome.back.label}
            </Link>
          )}
          <ShellActionsContext.Provider value={actions}>
            <Outlet />
          </ShellActionsContext.Provider>
        </main>
        {!chrome.hideTabBar && <TabBar active={chrome.tab} onCapture={() => setOverlay('capture')} />}
        <CommandPalette open={overlay === 'search'} onClose={close} />
        <MobileCapture open={overlay === 'capture'} onClose={close} />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        {t.shell.skipToContent}
      </a>
      <TopNav onSearch={() => setOverlay('search')} />
      <main id="main" className={styles.main} tabIndex={-1}>
        <ShellActionsContext.Provider value={actions}>
          <Outlet />
        </ShellActionsContext.Provider>
      </main>
      <CommandPalette open={overlay === 'search'} onClose={close} />
      <QuickCapture open={overlay === 'capture'} onClose={close} />
    </div>
  );
}
