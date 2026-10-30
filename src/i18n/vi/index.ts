import type { Messages } from '../locale';
import { calendar } from './calendar';
import { format } from './format';
import { screens } from './screens';
import { settings } from './settings';
import { shell } from './shell';
import { tasks } from './tasks';
import { today } from './today';

/** Vietnamese copy, the default language. */
export const vi: Messages = { calendar, format, screens, settings, shell, tasks, today };
