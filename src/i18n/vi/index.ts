import type { Messages } from '../locale';
import { calendar } from './calendar';
import { errors, seed } from './data';
import { format } from './format';
import { goals } from './goals';
import { progress } from './progress';
import { reviews } from './reviews';
import { screens } from './screens';
import { settings } from './settings';
import { shell } from './shell';
import { tasks } from './tasks';
import { today } from './today';

/** Vietnamese copy, the default language. */
export const vi: Messages = { calendar, errors, format, goals, progress, reviews, screens, seed, settings, shell, tasks, today };
