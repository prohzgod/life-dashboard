import { screens, type ScreenKey } from '@/app/screens';
import { EmptyState } from '@/components/shell/EmptyState';
import { PageHeader } from '@/components/shell/PageHeader';
import { formatDayLong } from '@/lib/format';
import { toDay } from '@/domain/days';

/** A screen that isn't built yet: its real title and a designed empty state. */
export function ScreenPage({ screen: key }: { screen: ScreenKey }) {
  const screen = screens[key];
  const eyebrow = key === 'today' ? formatDayLong(toDay(new Date())) : undefined;

  return (
    <>
      <PageHeader title={screen.title} eyebrow={eyebrow} />
      <EmptyState icon={screen.icon} heading={screen.empty.heading} body={screen.empty.body} />
    </>
  );
}
