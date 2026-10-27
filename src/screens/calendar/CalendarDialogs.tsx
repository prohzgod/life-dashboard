import { areas as AREA_COLORS, type Area } from '@design/tokens';
import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { clockLabel, minutesOfDay, parseClock } from '@/domain/calendar';
import { addDays, toDay, type Day } from '@/domain/days';
import {
  createEvent,
  deleteEvent,
  IcsError,
  importIcs,
  refreshFromUrl,
  refreshIcs,
  removeCalendar,
  scheduleTask,
  subscribeToCalendar,
  tasksRepo,
  toggleTask,
  unscheduleTask,
  updateCalendar,
  updateEvent,
  type Calendar,
  type CalendarEvent,
  type ImportResult,
  type Task,
} from '@/data';
import { Button, Segmented } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { formatDayShort, formatMinutes, timeAgo } from '@/lib/format';
import { timeText } from './items';
import styles from './Calendar.module.css';

const COLOR_NAMES: Record<Area, string> = { health: 'Green', career: 'Blue', finance: 'Amber', family: 'Rose', growth: 'Violet', home: 'Teal', fun: 'Gold' };

function ColorField({ value, onChange }: { value: Area; onChange: (c: Area) => void }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>Color</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as Area)}>
        {AREA_COLORS.map((c) => (
          <option key={c} value={c}>
            {COLOR_NAMES[c]}
          </option>
        ))}
      </select>
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return text ? (
    <p className={styles.formError} role="alert">
      {text}
    </p>
  ) : null;
}

// ---- Events ----

export type EventDraft = { day: Day; startMin: number };

type EventDialogProps = {
  open: boolean;
  onClose: () => void;
  /** An existing event; otherwise a new one from the draft. */
  event?: CalendarEvent & { calendar: Calendar };
  draft?: EventDraft;
  calendars: Calendar[];
};

export function EventDialog({ open, onClose, event, draft, calendars }: EventDialogProps) {
  const title = event ? (event.readOnly ? event.title : 'Edit event') : 'New event';
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {open && (event?.readOnly ? <EventDetails event={event} /> : <EventForm key={event?.id ?? `${draft?.day}-${draft?.startMin}`} event={event} draft={draft} calendars={calendars} onDone={onClose} />)}
    </Dialog>
  );
}

function eventWhen(event: CalendarEvent): string {
  if (event.allDay) {
    const last = addDays(event.end > event.start ? event.end : addDays(event.start, 1), -1);
    return last === event.start ? `${formatDayShort(event.start)}, all day` : `${formatDayShort(event.start)} to ${formatDayShort(last)}, all day`;
  }
  const start = new Date(event.start);
  const end = new Date(event.end);
  const sameDay = toDay(start) === toDay(end);
  return sameDay
    ? `${formatDayShort(toDay(start))}, ${timeText(minutesOfDay(start), minutesOfDay(end) || 1440)}`
    : `${formatDayShort(toDay(start))} ${clockLabel(minutesOfDay(start))} to ${formatDayShort(toDay(end))} ${clockLabel(minutesOfDay(end))}`;
}

function EventDetails({ event }: { event: CalendarEvent & { calendar: Calendar } }) {
  return (
    <div className={styles.details}>
      <p className={styles.detailsWhen}>{eventWhen(event)}</p>
      {event.location && <p>{event.location}</p>}
      {event.notes && <p className={styles.detailsNotes}>{event.notes}</p>}
      <p className={styles.quiet}>
        From {event.calendar.name}. Imported calendars are read-only here: change this event where it came from, then refresh.
      </p>
    </div>
  );
}

function EventForm({ event, draft, calendars, onDone }: { event?: CalendarEvent; draft?: EventDraft; calendars: Calendar[]; onDone: () => void }) {
  const id = useId();
  const local = calendars.filter((c) => !c.readOnly);
  const startDate = event ? (event.allDay ? event.start : toDay(new Date(event.start))) : (draft?.day ?? toDay(new Date()));
  const startMin = event && !event.allDay ? minutesOfDay(new Date(event.start)) : (draft?.startMin ?? 9 * 60);
  const endMin = event && !event.allDay ? minutesOfDay(new Date(event.end)) || 1440 : Math.min(1440, startMin + 60);
  const [form, setForm] = useState({
    title: event?.title ?? '',
    calendarId: event?.calendarId ?? local[0]?.id ?? '',
    day: startDate,
    endDay: event?.allDay ? addDays(event.end > event.start ? event.end : addDays(event.start, 1), -1) : startDate,
    allDay: event?.allDay ?? false,
    start: clockLabel(startMin),
    end: clockLabel(endMin === 1440 ? 1439 : endMin),
    location: event?.location ?? '',
    notes: event?.notes ?? '',
  });
  const [error, setError] = useState('');
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Give the event a name.');
    let start: string;
    let end: string;
    if (form.allDay) {
      if (form.endDay < form.day) return setError('The last day comes before the first.');
      start = form.day;
      end = addDays(form.endDay, 1);
    } else {
      const s = parseClock(form.start);
      const f = parseClock(form.end);
      if (s === null || f === null) return setError('Use times like 09:30.');
      start = new Date(`${form.day}T${form.start}:00`).toISOString();
      // An end before the start runs past midnight.
      end = new Date(`${f <= s ? addDays(form.day, 1) : form.day}T${form.end}:00`).toISOString();
    }
    const input = { title: form.title, calendarId: form.calendarId, start, end, allDay: form.allDay, location: form.location.trim(), notes: form.notes.trim() };
    if (event) await updateEvent(event.id, input);
    else await createEvent(input);
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor={`${id}-title`}>Event</label>
        <input id={`${id}-title`} data-autofocus autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Lunch with Linh" />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={`${id}-day`}>{form.allDay ? 'First day' : 'Day'}</label>
          <input id={`${id}-day`} type="date" value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value, endDay: f.endDay < e.target.value ? e.target.value : f.endDay }))} />
        </div>
        {form.allDay ? (
          <div className={styles.field}>
            <label htmlFor={`${id}-end-day`}>Last day</label>
            <input id={`${id}-end-day`} type="date" value={form.endDay} onChange={(e) => set('endDay', e.target.value)} />
          </div>
        ) : (
          <>
            <div className={styles.field}>
              <label htmlFor={`${id}-start`}>Starts</label>
              <input id={`${id}-start`} type="time" step={300} value={form.start} onChange={(e) => set('start', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${id}-end`}>Ends</label>
              <input id={`${id}-end`} type="time" step={300} value={form.end} onChange={(e) => set('end', e.target.value)} />
            </div>
          </>
        )}
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={form.allDay} onChange={(e) => set('allDay', e.target.checked)} />
        All day
      </label>
      {local.length > 1 && (
        <div className={styles.field}>
          <label htmlFor={`${id}-calendar`}>Calendar</label>
          <select id={`${id}-calendar`} value={form.calendarId} onChange={(e) => set('calendarId', e.target.value)}>
            {local.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor={`${id}-where`}>Where</label>
        <input id={`${id}-where`} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Optional" />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-notes`}>Notes</label>
        <textarea id={`${id}-notes`} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {event && (
          <Button
            variant="quiet"
            className={styles.dangerButton}
            onClick={async () => {
              await deleteEvent(event.id);
              onDone();
            }}
          >
            Delete event
          </Button>
        )}
        <span className={styles.spacer} />
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          {event ? 'Save' : 'Add event'}
        </Button>
      </div>
    </form>
  );
}

// ---- Time blocks ----

const LENGTHS = [15, 30, 45, 60, 90, 120, 180];

/** A task's place on the calendar: set its day, time and length, mark it done, or take it off. */
export function BlockDialog({ open, onClose, task, draft, today }: { open: boolean; onClose: () => void; task?: Task; draft?: EventDraft; today: Day }) {
  return (
    <Dialog open={open} onClose={onClose} title={task?.time ? 'Time block' : 'Put on the calendar'}>
      {open && task && <BlockForm key={task.id} task={task} draft={draft} today={today} onDone={onClose} />}
    </Dialog>
  );
}

function BlockForm({ task, draft, today, onDone }: { task: Task; draft?: EventDraft; today: Day; onDone: () => void }) {
  const id = useId();
  const [day, setDay] = useState(draft?.day ?? task.doOn ?? today);
  const [time, setTime] = useState(draft ? clockLabel(draft.startMin) : (task.time ?? '09:00'));
  const [length, setLength] = useState(task.estimateMin ?? 30);
  const [error, setError] = useState('');
  const scheduled = Boolean(task.time);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (parseClock(time) === null) return setError('Use a time like 09:30.');
    await scheduleTask(task.id, day, time);
    if (length !== task.estimateMin) await tasksRepo.update(task.id, { estimateMin: length });
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.blockTitle}>{task.title}</p>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={`${id}-day`}>Day</label>
          <input id={`${id}-day`} type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-time`}>Starts</label>
          <input id={`${id}-time`} data-autofocus type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-length`}>For</label>
          <select id={`${id}-length`} value={length} onChange={(e) => setLength(Number(e.target.value))}>
            {[...new Set([...LENGTHS, length])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
          </select>
        </div>
      </div>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {scheduled && (
          <>
            <Button
              variant="quiet"
              onClick={async () => {
                await toggleTask(task, today);
                onDone();
              }}
            >
              {task.status === 'done' ? 'Not done yet' : 'Mark as done'}
            </Button>
            <Button
              variant="quiet"
              onClick={async () => {
                await unscheduleTask(task.id);
                onDone();
              }}
            >
              Take off the calendar
            </Button>
          </>
        )}
        <Link to={`/tasks/${task.id}`} className={styles.textLink}>
          Open task
        </Link>
        <span className={styles.spacer} />
        <Button type="submit" variant="primary">
          {scheduled ? 'Save' : 'Put on calendar'}
        </Button>
      </div>
    </form>
  );
}

// ---- Calendars ----

export function AddCalendarDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (result: ImportResult) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Add a calendar">
      {open && (
        <AddCalendarForm
          onDone={(result) => {
            onClose();
            if (result) onAdded(result);
          }}
        />
      )}
    </Dialog>
  );
}

function AddCalendarForm({ onDone }: { onDone: (result?: ImportResult) => void }) {
  const id = useId();
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState<Area>('career');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'file' && !file) return setError('Choose a .ics file first.');
    if (mode === 'link' && !/^(https?|webcals?):\/\//i.test(url.trim())) return setError('Paste the calendar’s address, starting with https:// or webcal://.');
    setBusy(true);
    try {
      const result = mode === 'file' ? await importIcs(await file!.text(), { name, fallbackName: file!.name.replace(/\.ics$/i, ''), color }) : await subscribeToCalendar(url, { name, fallbackName: 'Subscribed calendar', color });
      onDone(result);
    } catch (err) {
      setError(err instanceof IcsError ? err.message : 'That calendar couldn’t be read.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.quiet}>Imported calendars are read-only and stay on this device. Export one from Google Calendar, iCloud or Outlook as a .ics file, or paste its address.</p>
      <Segmented
        label="How to add it"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'file', label: 'From a file' },
          { value: 'link', label: 'From a link' },
        ]}
      />
      {mode === 'file' ? (
        <div className={styles.field}>
          <label htmlFor={`${id}-file`}>Calendar file</label>
          <input id={`${id}-file`} type="file" accept=".ics,text/calendar" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      ) : (
        <div className={styles.field}>
          <label htmlFor={`${id}-url`}>Calendar address</label>
          <input id={`${id}-url`} type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://calendar.google.com/…/basic.ics" />
        </div>
      )}
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={`${id}-name`}>Name</label>
          <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Taken from the calendar" />
        </div>
        <ColorField value={color} onChange={setColor} />
      </div>
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        <Button onClick={() => onDone()}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Reading…' : 'Add calendar'}
        </Button>
      </div>
    </form>
  );
}

export function CalendarSettingsDialog({ calendar, onClose, onMessage }: { calendar: Calendar | null; onClose: () => void; onMessage: (text: string) => void }) {
  return (
    <Dialog open={Boolean(calendar)} onClose={onClose} title={calendar ? calendar.name : 'Calendar'}>
      {calendar && <CalendarSettingsForm key={calendar.id} calendar={calendar} onDone={onClose} onMessage={onMessage} />}
    </Dialog>
  );
}

function CalendarSettingsForm({ calendar, onDone, onMessage }: { calendar: Calendar; onDone: () => void; onMessage: (text: string) => void }) {
  const id = useId();
  const [name, setName] = useState(calendar.name);
  const [color, setColor] = useState<Area>(calendar.color);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh(file?: File) {
    setError('');
    setBusy(true);
    try {
      const result = file ? await refreshIcs(calendar.id, await file.text()) : await refreshFromUrl(calendar.id);
      onMessage(`${calendar.name} is up to date: ${result.added} added, ${result.updated} changed, ${result.removed} removed.`);
      onDone();
    } catch (err) {
      setError(err instanceof IcsError ? err.message : 'That calendar couldn’t be read.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        await updateCalendar(calendar.id, { name: name.trim() || calendar.name, color });
        onDone();
      }}
    >
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={`${id}-name`}>Name</label>
          <input id={`${id}-name`} data-autofocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <ColorField value={color} onChange={setColor} />
      </div>
      {calendar.source === 'ics' && (
        <div className={styles.syncBox}>
          <p className={styles.quiet}>{calendar.lastSyncedAt ? `Last read ${timeAgo(calendar.lastSyncedAt)}.` : 'Not read yet.'}</p>
          {calendar.url ? (
            <Button size="sm" disabled={busy} onClick={() => refresh()}>
              {busy ? 'Refreshing…' : 'Refresh now'}
            </Button>
          ) : (
            <div className={styles.field}>
              <label htmlFor={`${id}-file`}>Update from a newer file</label>
              <input id={`${id}-file`} type="file" accept=".ics,text/calendar" disabled={busy} onChange={(e) => e.target.files?.[0] && refresh(e.target.files[0])} />
            </div>
          )}
        </div>
      )}
      <ErrorLine text={error} />
      <div className={styles.formActions}>
        {calendar.source === 'ics' &&
          (confirming ? (
            <Button
              variant="quiet"
              className={styles.dangerButton}
              onClick={async () => {
                await removeCalendar(calendar.id);
                onMessage(`Removed ${calendar.name}.`);
                onDone();
              }}
            >
              Remove it and its events
            </Button>
          ) : (
            <Button variant="quiet" onClick={() => setConfirming(true)}>
              Remove calendar
            </Button>
          ))}
        <span className={styles.spacer} />
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}
