import { Icon } from '@/components/icons/Icon';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Segmented } from '@/components/ui';
import { useT } from '@/i18n';
import { presetIds, presets, type PresetId } from '@design/themes';
import { applyPalette, previewSeeds, type CustomPalette, type PaletteChoice } from '@/theme/palette';
import type { ThemePreference } from '@/theme/theme';
import { usePalette } from '@/theme/usePalette';
import { useResolvedTheme } from '@/theme/useResolvedTheme';
import { useThemePreference } from '@/theme/useThemePreference';
import { cx } from '@/components/ui/cx';
import styles from './AppearanceSettings.module.css';

const themeIcons = { light: 'sun', dark: 'moon', system: 'monitor' } as const satisfies Record<ThemePreference, string>;

export function AppearanceSettings() {
  const t = useT().settings.appearance;
  const [theme, setTheme] = useThemePreference();
  const themeOptions = (['light', 'dark', 'system'] as const).map((value) => ({ value, label: t[value], icon: <Icon name={themeIcons[value]} size={16} /> }));

  return (
    <div className={styles.grid}>
      <Card title={t.theme}>
        <div className={styles.row}>
          <div className={styles.text}>
            <span id="theme-label" className={styles.label}>
              {t.colorTheme}
            </span>
            <span className={styles.hint}>{t.hint}</span>
          </div>
          <Segmented label={t.colorTheme} options={themeOptions} value={theme} onChange={setTheme} />
        </div>
      </Card>
      <PaletteCard />
    </div>
  );
}

/**
 * Pick a colour theme, or make your own from three colours. Presets save as you pick them; your
 * own theme previews as you change it and is kept only when you press Save.
 */
function PaletteCard() {
  const t = useT().settings.appearance;
  const [saved, save] = usePalette();
  const mode = useResolvedTheme();
  const [draft, setDraft] = useState<CustomPalette | null>(null);
  const [status, setStatus] = useState('');
  const editing = draft ?? (saved.id === 'custom' ? saved : null);
  const showing: PaletteChoice = draft ?? saved;
  // Your own theme starts from the last one you saved, else from the theme showing now.
  const base = saved.id === 'custom' ? null : presets[saved.id][mode];
  const starter: CustomPalette = saved.id === 'custom' ? saved : { id: 'custom', background: base!.paper, main: base!.field, mark: base!.mark };
  const changed = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);

  // A draft shows on the whole app while you edit; leaving without saving puts the saved theme back.
  const latest = useRef({ draft, saved });
  useEffect(() => {
    latest.current = { draft, saved };
    if (draft) applyPalette(draft);
  }, [draft, saved]);
  useEffect(() => () => void (latest.current.draft && applyPalette(latest.current.saved)), []);

  const edit = (patch: Partial<CustomPalette>) => {
    setStatus('');
    setDraft({ ...(editing ?? starter), ...patch });
  };
  const options: Array<{ id: PresetId | 'custom'; pick: () => void }> = [
    ...presetIds.map((id) => ({
      id,
      pick: () => {
        setDraft(null);
        setStatus('');
        save({ id });
      },
    })),
    { id: 'custom' as const, pick: () => edit({}) },
  ];

  return (
    <Card title={t.palette}>
      <fieldset className={styles.palettes}>
        <legend className={styles.label}>{t.paletteLabel}</legend>
        <p className={styles.hint}>{t.paletteHint}</p>
        <div className={styles.swatchGrid}>
          {options.map((o) => {
            const seeds = previewSeeds(o.id === 'custom' ? (editing ?? starter) : { id: o.id }, mode);
            return (
              <label key={o.id} className={cx(styles.swatch, showing.id === o.id && styles.swatchOn)}>
                <input type="radio" name="palette" className="visually-hidden" checked={showing.id === o.id} onChange={o.pick} />
                {/* A tiny page in the theme's own colours: paper, a card, a field and the mark. */}
                <span className={styles.preview} style={{ background: seeds.paper }} aria-hidden="true">
                  <span className={styles.previewCard} style={{ background: seeds.surface }}>
                    <span className={styles.previewLine} style={{ background: seeds.ink }} />
                    <span className={styles.previewLineShort} style={{ background: seeds.ink }} />
                  </span>
                  <span className={styles.previewField} style={{ background: seeds.field }} />
                  <span className={styles.previewMark} style={{ background: seeds.mark }} />
                </span>
                <span className={styles.swatchName}>{t.names[o.id]}</span>
                <span className={styles.hint}>{t.about[o.id]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {editing && (
        <div className={styles.custom}>
          <ColorField label={t.background} value={editing.background} onChange={(background) => edit({ background })} />
          <ColorField label={t.main} hint={t.mainHint} value={editing.main} onChange={(main) => edit({ main })} />
          <ColorField label={t.mark} hint={t.markHint} value={editing.mark} onChange={(mark) => edit({ mark })} />
          <p className={styles.hint}>{t.customHint}</p>
          <div className={styles.customActions}>
            <span role="status" className={styles.hint}>
              {status || (changed ? t.unsaved : '')}
            </span>
            {draft && (
              <Button
                onClick={() => {
                  setDraft(null);
                  applyPalette(saved);
                }}
              >
                {t.cancel}
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!changed}
              onClick={() => {
                save(draft!);
                setDraft(null);
                setStatus(t.savedTheme);
              }}
            >
              {t.save}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={styles.colorField}>
      <input type="color" className={styles.colorInput} value={value.toLowerCase()} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      <span className={styles.colorValue}>{value}</span>
    </label>
  );
}
