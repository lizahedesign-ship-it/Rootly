// Shared date utilities used by useTasks, useSummary, and any future hooks.

// Returns ISO weekday 1 (Mon) – 7 (Sun)
export function isoWeekday(date: Date): number {
  const d = date.getDay(); // 0=Sun … 6=Sat
  return d === 0 ? 7 : d;
}

// Format a Date as YYYY-MM-DD in the device's local timezone
export function formatDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Today as YYYY-MM-DD in local timezone
export function todayString(): string {
  return formatDateString(new Date());
}

// Minimum task shape required to call isScheduledOnDate
export interface SchedulableTask {
  frequency:   'daily' | 'weekdays' | 'weekends' | 'custom';
  custom_days: number[] | null;
  created_at:  string; // ISO timestamp from Supabase
}

// Returns true if the task was created on/before `date` and is scheduled for that day.
// All date comparisons use local timezone to match the device's calendar.
export function isScheduledOnDate(task: SchedulableTask, date: Date): boolean {
  // Compare creation date in local timezone so UTC midnight shifts don't cause off-by-one.
  const createdStr = formatDateString(new Date(task.created_at));
  const targetStr  = formatDateString(date);
  if (createdStr > targetStr) return false;

  const dow = isoWeekday(date);
  switch (task.frequency) {
    case 'daily':    return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'weekends': return dow === 6 || dow === 7;
    case 'custom':   return (task.custom_days ?? []).includes(dow);
  }
}

// Return a new Date that is `n` days after `date`
export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Monday (ISO) of the week containing `date`, at local midnight
export function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (isoWeekday(d) - 1));
  return d;
}

// First day of the month containing `date`, at local midnight
export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Last day of the month containing `date`, at local midnight
export function monthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// January 1 of `date`'s year, at local midnight
export function yearStart(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

// December 31 of `date`'s year, at local midnight
export function yearEnd(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}
