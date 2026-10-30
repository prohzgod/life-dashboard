import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { Button, Card, Segmented } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { clearBackgroundPhoto, getBackgroundPhoto, listBoardPhotos, setBackgroundFromBoard, setBackgroundPhoto } from '@/data';
import { useT } from '@/i18n';
import { useAttachmentUrl } from '@/screens/library/editor/useAttachmentUrl';
import { ACCENTS, BACKGROUNDS, showOwnPhoto, type Background } from '@/theme/appearance';
import type { ThemePreference } from '@/theme/theme';
import { useLook } from '@/theme/useAppearance';
import { useResolvedTheme } from '@/theme/useResolvedTheme';
import { useThemePreference } from '@/theme/useThemePreference';
import styles from './AppearanceSettings.module.css';

const modeIcons = { system: 'monitor', light: 'sun', dark: 'moon' } as const satisfies Record<ThemePreference, string>;

/** Settings › Appearance: background, accent, and light or dark. Everything saves as you pick it. */
export function AppearanceSettings() {
  const t = useT().settings.appearance;
  const [mode, setMode] = useThemePreference();
  const [look, setLook] = useLook();
  const theme = useResolvedTheme();
  const showing: Background = theme === 'dark' ? 'night' : look.background;

  const pickMode = (next: ThemePreference) => {
    setMode(next);
    // Night is always dark; asking for light brings back Dawn.
    if (next !== 'dark' && look.background === 'night') setLook({ ...look, background: 'dawn' });
  };
  const pickBackground = (background: Background) => {
    setLook({ ...look, background });
    // A light background only shows in light mode, so switch to it rather than seem to ignore you.
    if (background !== 'night' && theme === 'dark') setMode('light');
  };
  const modeOptions = (['system', 'light', 'dark'] as const).map((value) => ({ value, label: t[value], icon: <Icon name={modeIcons[value]} size={16} /> }));

  return (
    <div className={styles.grid}>
      <Card title={t.background}>
        <fieldset className={styles.group}>
          <legend className="visually-hidden">{t.background}</legend>
          <p className={styles.hint}>{t.backgroundHint}</p>
          <div className={styles.swatches}>
            {BACKGROUNDS.map((id) => (
              <label key={id} className={cx(styles.swatch, showing === id && styles.swatchOn)}>
                <input type="radio" name="background" className="visually-hidden" checked={showing === id} onChange={() => pickBackground(id)} />
                {/* The background itself, painted by tokens.css for this data-bg. */}
                <BackgroundPreview id={id} />
                <span className={styles.swatchName}>{t.backgrounds[id]}</span>
                <span className={styles.swatchHint}>{t.backgroundAbout[id]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {showing === 'photo' && <PhotoPicker />}
      </Card>

      <Card title={t.accent}>
        <fieldset className={styles.group}>
          <legend className="visually-hidden">{t.accent}</legend>
          <p className={styles.hint}>{t.accentHint}</p>
          <div className={styles.accents}>
            {ACCENTS.map((id) => (
              <label key={id} className={cx(styles.accent, look.accent === id && styles.swatchOn)}>
                <input type="radio" name="accent" className="visually-hidden" checked={look.accent === id} onChange={() => setLook({ ...look, accent: id })} />
                <span className={styles.accentChip} data-accent={id} aria-hidden="true">
                  Aa
                </span>
                <span className={styles.swatchName}>{t.accents[id]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card title={t.mode}>
        <div className={styles.row}>
          <p className={styles.hint}>{t.modeHint}</p>
          <Segmented label={t.mode} options={modeOptions} value={mode} onChange={pickMode} />
        </div>
      </Card>
    </div>
  );
}

function BackgroundPreview({ id }: { id: Background }) {
  const own = useLiveQuery(getBackgroundPhoto);
  const ownUrl = useMemo(() => (own ? URL.createObjectURL(own) : null), [own]);
  useEffect(() => () => void (ownUrl && URL.revokeObjectURL(ownUrl)), [ownUrl]);
  return (
    <span className={styles.preview} data-bg={id} data-theme={id === 'night' ? 'dark' : 'light'} aria-hidden="true">
      {id === 'photo' && ownUrl && <img src={ownUrl} alt="" className={styles.previewPhoto} />}
      <span className={styles.previewCard} />
    </span>
  );
}

function PhotoPicker() {
  const t = useT().settings.appearance;
  const own = useLiveQuery(getBackgroundPhoto);
  const board = useLiveQuery(listBoardPhotos);
  const [status, setStatus] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const use = async (blob: Blob | null) => {
    if (blob) await setBackgroundPhoto(blob);
    else await clearBackgroundPhoto();
    showOwnPhoto(blob);
    setStatus(blob ? t.own : t.sample);
  };

  return (
    <div className={styles.photo}>
      <div className={styles.text}>
        <span className={styles.label}>{t.photo}</span>
        <span className={styles.hint}>{t.photoHint}</span>
      </div>
      <div className={styles.actions}>
        <Button onClick={() => file.current?.click()}>
          <Icon name="image" size={16} />
          {t.upload}
        </Button>
        <Button onClick={() => setBrowsing((b) => !b)} aria-expanded={browsing}>
          {t.fromBoard}
        </Button>
        {own && <Button onClick={() => void use(null)}>{t.useSample}</Button>}
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="visually-hidden"
          tabIndex={-1}
          aria-label={t.upload}
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = '';
            if (!picked) return;
            if (!picked.type.startsWith('image/')) return setStatus(t.photoFailed);
            void use(picked);
          }}
        />
      </div>
      {browsing &&
        (board && board.length > 0 ? (
          <ul className={styles.board}>
            {board.map((p) => (
              <li key={p.attachmentId}>
                <BoardPhoto
                  attachmentId={p.attachmentId}
                  label={t.pickFromBoard(p.caption)}
                  onPick={async () => {
                    const blob = await setBackgroundFromBoard(p.attachmentId);
                    showOwnPhoto(blob);
                    setStatus(t.own);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>{t.boardEmpty}</p>
        ))}
      <p role="status" className={styles.hint}>
        {status}
      </p>
    </div>
  );
}

function BoardPhoto({ attachmentId, label, onPick }: { attachmentId: string; label: string; onPick: () => void }) {
  const src = useAttachmentUrl(`attachment://${attachmentId}`, true);
  return (
    <button type="button" className={styles.boardPhoto} aria-label={label} onClick={onPick}>
      {src && <img src={src} alt="" />}
    </button>
  );
}
