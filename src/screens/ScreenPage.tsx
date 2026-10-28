import { screens, type ScreenKey } from '@/app/screens';
import { EmptyState } from '@/components/shell/EmptyState';
import { PageHeader } from '@/components/shell/PageHeader';

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** A screen that isn't built yet: its real title and a designed empty state. */
export function ScreenPage({ screen: key }: { screen: ScreenKey }) {
  const screen = screens[key];
  const eyebrow = key === 'today' ? dateFormat.format(new Date()).replace(/,? (\d)/, ', $1') : undefined;

  return (
    <>
      <PageHeader title={screen.title} eyebrow={eyebrow} />
      <EmptyState icon={screen.icon} heading={screen.empty.heading} body={screen.empty.body} />
    </>
  );
}
