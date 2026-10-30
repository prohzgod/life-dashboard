import { Icon } from '@/components/icons/Icon';
import { Card, Segmented } from '@/components/ui';
import { useT } from '@/i18n';
import { presetIds, presets, type PresetId } from '@design/themes';
import { customSeeds, type PaletteChoice } from '@/theme/palette';
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

/** Pick a colour theme, or make your own from three colours. */
function PaletteCard() {
  const t = useT().settings.appearance;
  const [choice, setChoice] = usePalette();
  const mode = useResolvedTheme();
  // Starting colours for your own theme: the last ones you picked, else the theme showing now.
  const base = presets[choice.id === 'custom' ? 'grid' : choice.id][mode];
  const custom = choice.id === 'custom' ? choice : { id: 'custom' as const, background: base.paper, main: base.field, mark: base.mark };
  const customPreview = customSeeds(custom)[mode];
  const options: Array<{ id: PresetId | 'custom'; seeds: typeof base; pick: PaletteChoice }> = [
    ...presetIds.map((id) => ({ id, seeds: presets[id][mode], pick: { id } })),
    { id: 'custom', seeds: customPreview, pick: custom },
  ];

  return (
    <Card title={t.palette}>
      <fieldset className={styles.palettes}>
        <legend className={styles.label}>{t.paletteLabel}</legend>
        <p className={styles.hint}>{t.paletteHint}</p>
        <div className={styles.swatchGrid}>
          {options.map((o) => (
            <label key={o.id} className={cx(styles.swatch, choice.id === o.id && styles.swatchOn)}>
              <input type="radio" name="palette" className="visually-hidden" checked={choice.id === o.id} onChange={() => setChoice(o.pick)} />
              {/* A tiny page in the theme's own colours: paper, a card, a field and the mark. */}
              <span className={styles.preview} style={{ background: o.seeds.paper }} aria-hidden="true">
                <span className={styles.previewCard} style={{ background: o.seeds.surface }}>
                  <span className={styles.previewLine} style={{ background: o.seeds.ink }} />
                  <span className={styles.previewLineShort} style={{ background: o.seeds.ink }} />
                </span>
                <span className={styles.previewField} style={{ background: o.seeds.field }} />
                <span className={styles.previewMark} style={{ background: o.seeds.mark }} />
              </span>
              <span className={styles.swatchName}>{t.names[o.id]}</span>
              <span className={styles.hint}>{t.about[o.id]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {choice.id === 'custom' && (
        <div className={styles.custom}>
          <ColorField label={t.background} value={choice.background} onChange={(background) => setChoice({ ...choice, background })} />
          <ColorField label={t.main} hint={t.mainHint} value={choice.main} onChange={(main) => setChoice({ ...choice, main })} />
          <ColorField label={t.mark} hint={t.markHint} value={choice.mark} onChange={(mark) => setChoice({ ...choice, mark })} />
          <p className={styles.hint}>{t.customHint}</p>
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
