// Attendance rules used by Admin > Payroll > Attendance and the monthly salary run.

export const ATT_STATUS: Record<string, string> = {
  P: 'Present',
  A: 'Absent (unpaid)',
  UL: 'Unpaid leave',
  HL: 'Half day unpaid',
  AL: 'Annual leave (paid)',
  MC: 'Sick leave / MC (paid)',
  PH: 'Public holiday',
  RW: 'Worked on Sunday / PH (double pay)',
  OFF: 'Rest day / off',
};
/** Days of salary lost for each status (monthly-rated) */
export const UNPAID_DAYS: Record<string, number> = { A: 1, UL: 1, HL: 0.5 };
/** Paid days for each status (daily-rated). Sundays worked are counted as rest days instead. */
export const PAID_DAYS: Record<string, number> = { P: 1, HL: 0.5, AL: 1, MC: 1, PH: 1 };
const isSunday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0;

/** Days worked/paid, Sunday-PH days worked, unpaid days and OT hours from a month's attendance */
export function tally(rows: { work_date: string; status: string; ot_hours: unknown }[]) {
  const t = { paid_days: 0, rest_days: 0, unpaid_days: 0, ot_hours: 0 };
  for (const a of rows) {
    if (a.status === 'RW' || (a.status === 'P' && isSunday(a.work_date))) t.rest_days++;
    else t.paid_days += PAID_DAYS[a.status] || 0;
    t.unpaid_days += UNPAID_DAYS[a.status] || 0;
    t.ot_hours += Number(a.ot_hours || 0);
  }
  t.ot_hours = Math.round(t.ot_hours * 100) / 100;
  return t;
}

export interface PayrollConfig {
  /** Work days a week: '6' (Mon–Sat), '5.5' (Mon–Fri + half Sat) or '5' (Mon–Fri) */
  week: '6' | '5.5' | '5';
  /** Normal hours a day before OT starts */
  day_hours: number;
  /** Unpaid break a day, taken off the in/out times */
  break_hours: number;
  /** Payslip header; empty = the website's address, phone and email */
  slip_address: string;
  slip_phone: string;
  slip_email: string;
}

export function readConfig(json?: string | null): PayrollConfig {
  let d: Record<string, unknown> = {};
  try { d = JSON.parse(json || '{}') || {}; } catch { /* keep defaults */ }
  const num = (v: unknown, def: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : def;
  };
  const week = ['6', '5.5', '5'].includes(String(d.week)) ? (String(d.week) as PayrollConfig['week']) : '6';
  const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  return {
    week, day_hours: num(d.day_hours, 8, 12) || 8, break_hours: num(d.break_hours, 1, 4),
    slip_address: str(d.slip_address, 200), slip_phone: str(d.slip_phone, 40), slip_email: str(d.slip_email, 120),
  };
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
  if ((status !== 'P' && status !== 'RW') || !timeIn || !timeOut) return 0;
  let worked = mins(timeOut) - mins(timeIn);
  if (worked <= 0) worked += 24 * 60; // night shift past midnight
  const ot = worked / 60 - cfg.break_hours - cfg.day_hours;
  return ot > 0 ? Math.floor(ot * 2) / 2 : 0;
}
