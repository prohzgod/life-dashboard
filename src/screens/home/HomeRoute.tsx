import { useIsMobile } from '@/lib/useMediaQuery';
import { TodayPage } from '@/screens/today/TodayPage';
import { HomePage } from './HomePage';

/** "/" is the bento Home on phones and Today on larger screens. */
export function HomeRoute() {
  return useIsMobile() ? <HomePage /> : <TodayPage />;
}
