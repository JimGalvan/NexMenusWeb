/**
 * Weekly opening hours. The backend stores them as one free-text
 * `operatingHours` string; the editor writes it in a fixed format
 * ("Mon-Fri 9:00 AM - 10:00 PM; Sat 10:00 AM - 11:00 PM; Sun Closed") that
 * these helpers turn back into per-day rows. Hand-typed or AI-written hours may
 * not parse, so callers must fall back to showing the raw text.
 */

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface HoursRow {
  key: DayKey;
  day: string;
  shortDay: string;
  closed: boolean;
  openTime: string;
  closeTime: string;
}

/** One line of the storefront's hours panel: days that share the same hours. */
export interface HoursGroup {
  days: string;
  hours: string;
  closed: boolean;
}

export const DEFAULT_HOURS: HoursRow[] = [
  { key: 'mon', day: 'Monday', shortDay: 'Mon', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'tue', day: 'Tuesday', shortDay: 'Tue', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'wed', day: 'Wednesday', shortDay: 'Wed', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'thu', day: 'Thursday', shortDay: 'Thu', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'fri', day: 'Friday', shortDay: 'Fri', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'sat', day: 'Saturday', shortDay: 'Sat', closed: false, openTime: '10:00', closeTime: '23:00' },
  { key: 'sun', day: 'Sunday', shortDay: 'Sun', closed: true, openTime: '09:00', closeTime: '22:00' },
];

export function cloneHours(rows: HoursRow[]): HoursRow[] {
  return rows.map(row => ({ ...row }));
}

export function formatOperatingHours(rows: HoursRow[]): string {
  return groupHours(rows)
    .map(group => {
      const day = group.start.key === group.end.key ? group.start.shortDay : group.start.shortDay + '-' + group.end.shortDay;
      return day + ' ' + group.text;
    })
    .join('; ');
}

/** Runs of consecutive days with the same hours, in week order. */
export function groupHours(rows: HoursRow[]): { start: HoursRow; end: HoursRow; text: string }[] {
  const groups: { start: HoursRow; end: HoursRow; text: string }[] = [];
  for (const row of rows) {
    const text = row.closed ? 'Closed' : formatTime(row.openTime) + ' - ' + formatTime(row.closeTime);
    const last = groups.at(-1);
    if (last?.text === text) last.end = row;
    else groups.push({ start: row, end: row, text });
  }
  return groups;
}

/**
 * Diner-facing summary: every day with the same hours shares a line, even when
 * the days aren't next to each other ("Mon, Thu, Sun"), so an irregular week
 * stays short. Open lines come in week order; closed days go last.
 */
export function weeklyHoursGroups(rows: HoursRow[]): HoursGroup[] {
  const byHours = new Map<string, HoursRow[]>();
  for (const row of rows) {
    const hours = row.closed ? 'Closed' : compactTimeRange(row.openTime, row.closeTime);
    byHours.set(hours, [...(byHours.get(hours) ?? []), row]);
  }
  const groups = [...byHours].map(([hours, days]) => ({ days: dayListLabel(days, rows), hours, closed: hours === 'Closed' }));
  return [...groups.filter(group => !group.closed), ...groups.filter(group => group.closed)];
}

export function formatTime(time: string): string {
  const [hourRaw, minuteRaw = '00'] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function parseOperatingHours(text: string): HoursRow[] | null {
  const rows = cloneHours(DEFAULT_HOURS).map(row => ({ ...row, closed: true }));
  const parts = text.split(/[;\n]+/).map(part => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  for (const part of parts) {
    const match = /^(Every day|[A-Za-z]{3}(?:-[A-Za-z]{3})?)\s+(.+)$/i.exec(part);
    if (!match) return null;

    const dayIndexes = indexesForDayLabel(match[1]);
    if (!dayIndexes.length) return null;

    const hoursText = match[2].trim();
    const closed = /^Closed$/i.test(hoursText);
    const timeMatch = /^(.+?)\s*-\s*(.+)$/.exec(hoursText);
    if (!closed && !timeMatch) return null;

    for (const index of dayIndexes) {
      rows[index].closed = closed;
      if (timeMatch) {
        rows[index].openTime = parseTime(timeMatch[1]) ?? rows[index].openTime;
        rows[index].closeTime = parseTime(timeMatch[2]) ?? rows[index].closeTime;
      }
    }
  }

  return rows;
}

function indexesForDayLabel(label: string): number[] {
  if (/^Every day$/i.test(label)) return DEFAULT_HOURS.map((_, index) => index);
  const shortDays = DEFAULT_HOURS.map(row => row.shortDay.toLowerCase());
  const [start, end] = label.toLowerCase().split('-');
  const startIndex = shortDays.indexOf(start);
  const endIndex = end ? shortDays.indexOf(end) : startIndex;
  if (startIndex < 0 || endIndex < startIndex) return [];
  return Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => startIndex + offset);
}

function parseTime(value: string): string | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  const suffix = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** "3 – 10 PM", "5 PM – 12 AM", "11:30 AM – 2 PM": minutes only when not :00. */
function compactTimeRange(openTime: string, closeTime: string): string {
  const open = compactTime(openTime);
  const close = compactTime(closeTime);
  if (!open || !close) return formatTime(openTime) + ' – ' + formatTime(closeTime);
  return open.suffix === close.suffix
    ? `${open.time} – ${close.time} ${close.suffix}`
    : `${open.time} ${open.suffix} – ${close.time} ${close.suffix}`;
}

function compactTime(time: string): { time: string; suffix: string } | null {
  const [hour, minute = 0] = time.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const displayHour = hour % 12 || 12;
  return { time: minute ? `${displayHour}:${String(minute).padStart(2, '0')}` : String(displayHour), suffix: hour >= 12 ? 'PM' : 'AM' };
}

/** "Every day", "Mon – Fri", "Mon, Thu, Sun", "Mon – Wed, Sat". */
function dayListLabel(days: HoursRow[], week: HoursRow[]): string {
  if (days.length === week.length) return 'Every day';
  const runs: HoursRow[][] = [];
  for (const day of days) {
    const run = runs.at(-1);
    if (run && week.indexOf(day) === week.indexOf(run.at(-1)!) + 1) run.push(day);
    else runs.push([day]);
  }
  return runs.map(run => (run.length > 1 ? `${run[0].shortDay} – ${run.at(-1)!.shortDay}` : run[0].shortDay)).join(', ');
}
