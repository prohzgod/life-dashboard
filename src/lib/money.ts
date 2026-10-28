/** Money on screen. Amounts are cents; the currency is the one chosen in Finance. */

const formats = new Map<string, Intl.NumberFormat>();

function format(currency: string, cents: boolean, locale?: string): Intl.NumberFormat {
  const key = `${locale}|${currency}|${cents}`;
  let f = formats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: 'currency', currency, ...(cents ? {} : { maximumFractionDigits: 0, minimumFractionDigits: 0 }) });
    formats.set(key, f);
  }
  return f;
}

type Options = {
  /** Show "+" for money coming in; "−" always shows for money going out. */
  signed?: boolean;
  /** Round to whole units ("$2,140"), as totals are shown. */
  whole?: boolean;
  locale?: string;
};

/** 213800 → "$2,138.00"; with whole, "$2,138"; with signed, "+$2,138.00" or "−$38.40". */
export function formatMoney(cents: number, currency: string, { signed = false, whole = false, locale }: Options = {}): string {
  const text = format(currency, !whole, locale).format(Math.abs(cents) / 100);
  if (cents < 0) return `−${text}`;
  return signed && cents > 0 ? `+${text}` : text;
}

/** What hidden amounts show instead. */
export const HIDDEN_MONEY = '••••••';

/** The currency this device most likely uses, from its locale; dollars when unsure. */
export function defaultCurrency(): string {
  const region = (typeof navigator !== 'undefined' ? navigator.language : 'en-US').split('-')[1]?.toUpperCase();
  const byRegion: Record<string, string> = { US: 'USD', GB: 'GBP', AU: 'AUD', NZ: 'NZD', CA: 'CAD', VN: 'VND', JP: 'JPY', IN: 'INR', SG: 'SGD', CH: 'CHF' };
  const euro = ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'GR'];
  if (region && euro.includes(region)) return 'EUR';
  return (region && byRegion[region]) || 'USD';
}

/** The symbol a currency uses ("$", "€"), to recognise money goals by their unit. */
export function currencySymbol(currency: string, locale?: string): string {
  return format(currency, false, locale).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency;
}
