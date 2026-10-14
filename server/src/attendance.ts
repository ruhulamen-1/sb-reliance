// Attendance rules used by Admin > Payroll > Attendance and the monthly salary run.

export const ATT_STATUS: Record<string, string> = {
  P: 'Present',
  A: 'Absent (unpaid)',
  UL: 'Unpaid leave',
  HL: 'Half day unpaid',
  AL: 'Annual leave (paid)',
  MC: 'Sick leave / MC (paid)',
  PH: 'Public holiday',
  OFF: 'Rest day / off',
};
/** Days of salary lost for each status */
export const UNPAID_DAYS: Record<string, number> = { A: 1, UL: 1, HL: 0.5 };

export interface PayrollConfig {
  /** Work days a week: '6' (Mon–Sat), '5.5' (Mon–Fri + half Sat) or '5' (Mon–Fri) */
  week: '6' | '5.5' | '5';
  /** Normal hours a day before OT starts */
  day_hours: number;
  /** Unpaid break a day, taken off the in/out times */
  break_hours: number;
}

export function readConfig(json?: string | null): PayrollConfig {
  let d: Record<string, unknown> = {};
  try { d = JSON.parse(json || '{}') || {}; } catch { /* keep defaults */ }
  const num = (v: unknown, def: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : def;
  };
  const week = ['6', '5.5', '5'].includes(String(d.week)) ? (String(d.week) as PayrollConfig['week']) : '6';
  return { week, day_hours: num(d.day_hours, 8, 12) || 8, break_hours: num(d.break_hours, 1, 4) };
}

/** Working days in the month (MOM incomplete-month rule), public holidays not taken off */
export function workingDays(period: string, week: PayrollConfig['week']) {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let n = 0;
  for (let d = 1; d <= last; d++) {
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
    if (wd === 0) continue;
    if (wd === 6) n += week === '6' ? 1 : week === '5.5' ? 0.5 : 0;
    else n += 1;
  }
  return n;
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** OT hours from the in/out times, rounded down to the half hour. Only for a day marked Present. */
export function autoOt(status: string, timeIn: string | null, timeOut: string | null, cfg: PayrollConfig) {
  if (status !== 'P' || !timeIn || !timeOut) return 0;
  let worked = mins(timeOut) - mins(timeIn);
  if (worked <= 0) worked += 24 * 60; // night shift past midnight
  const ot = worked / 60 - cfg.break_hours - cfg.day_hours;
  return ot > 0 ? Math.floor(ot * 2) / 2 : 0;
}
