import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { screens } from '@/app/screens';
import { Icon, type IconName } from '../icons/Icon';
import { Dialog } from '../ui/Dialog';
import styles from './CommandPalette.module.css';

type Destination = { label: string; path: string; icon: IconName };

const destinations: Destination[] = [
  ...Object.values(screens).map((s) => ({ label: s.navLabel, path: s.path, icon: s.icon })),
  { label: 'Settings', path: '/settings', icon: 'settings' },
  { label: 'Appearance', path: '/settings/appearance', icon: 'sun' },
];

type CommandPaletteProps = { open: boolean; onClose: () => void };

/** ⌘K: jump to any screen. Searching your own notes and tasks joins it once they exist. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Search or jump to">
      {open && <PaletteBody onClose={onClose} />}
    </Dialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? destinations.filter((d) => d.label.toLowerCase().includes(q)) : destinations;
  }, [query]);

  function go(destination: Destination | undefined) {
    if (!destination) return;
    navigate(destination.path);
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[active]);
    }
  }

  const activeId = results[active] ? `palette-option-${active}` : undefined;

  return (
    <div className={styles.palette}>
      <input
        autoFocus
        data-autofocus
        className={styles.input}
        placeholder="Type a screen name…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-results"
        aria-activedescendant={activeId}
        aria-label="Search screens"
      />
      {results.length ? (
        <ul id="palette-results" role="listbox" aria-label="Screens" className={styles.list}>
          {results.map((d, index) => (
            <li
              key={d.path}
              id={`palette-option-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? `${styles.option} ${styles.optionActive}` : styles.option}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(d)}
            >
              <Icon name={d.icon} />
              {d.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No screen called “{query}”. Searching your notes and tasks comes later.</p>
      )}
    </div>
  );
}
