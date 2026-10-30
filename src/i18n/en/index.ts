import { calendar } from './calendar';
import { errors, seed } from './data';
import { format } from './format';
import { goals } from './goals';
import { home } from './home';
import { library } from './library';
import { progress } from './progress';
import { reviews } from './reviews';
import { screens } from './screens';
import { settings } from './settings';
import { shell } from './shell';
import { tasks } from './tasks';
import { today } from './today';

/** English copy. The source of truth for the shape every other language must match. */
export const en = { calendar, errors, format, goals, home, library, progress, reviews, screens, seed, settings, shell, tasks, today };
