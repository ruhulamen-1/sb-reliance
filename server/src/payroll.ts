// Singapore payroll arithmetic: overtime, CPF and SDL. Pure functions (no DB) so they can be tested.
//
// CPF: rates and wage bands from 1 January 2026 for Singapore Citizens and PRs from their 3rd year
// (CPF Board rate table). Ordinary Wage ceiling $8,000 a month, Additional Wage ceiling $102,000 a year
// less the year's Ordinary Wages. PRs in their 1st or 2nd year have graduated rates: their CPF is
// entered by hand. Work Permit, S Pass and Employment Pass holders do not pay CPF.
// Rounding (CPF Board): total to the nearest dollar, employee share rounded down, employer = total - employee.
//
// SDL (Skills Development Levy): 0.25% of total wages, at least $2 and at most $11.25, for every employee.
// Overtime (Employment Act): 1.5 x hourly basic rate, hourly basic rate = 12 x monthly basic / (52 x 44);
// for daily-rated workers, daily rate / normal hours a day.
// Work on a rest day (Sunday) or public holiday: 2 days' basic pay a day (daily rate, or monthly basic / working days).

export const PASS_TYPES: Record<string, string> = {
  SC: 'Singapore Citizen',
  PR3: 'PR (3rd year onwards)',
  PR12: 'PR (1st / 2nd year) – CPF entered by hand',
  WP: 'Work Permit',
  SPASS: 'S Pass',
  EP: 'Employment Pass',
};
export const CPF_AUTO = new Set(['SC', 'PR3']);
export const OW_CEILING = 8000;
export const ANNUAL_CEILING = 102000;

// [employer %, employee %] by age band
const RATES: [number, number, number][] = [
  // [up to age (exclusive), employer, employee]
  [55, 17, 20],
  [60, 16, 18],
  [65, 12.5, 12.5],
  [70, 9, 7.5],
  [Infinity, 7.5, 5],
];

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Age used for CPF in a pay month: new rates apply from the month AFTER the birthday,
 *  so this is the age reached by the last day of the previous month. */
export function cpfAge(dob: string, period: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || '');
  const p = /^(\d{4})-(\d{2})$/.exec(period || '');
  if (!d || !p) return null;
  // last day of previous month
  const py = Number(p[1]), pm = Number(p[2]);
  const end = new Date(Date.UTC(py, pm - 1, 0));
  let age = end.getUTCFullYear() - Number(d[1]);
  const bm = Number(d[2]), bd = Number(d[3]);
  if (end.getUTCMonth() + 1 < bm || (end.getUTCMonth() + 1 === bm && end.getUTCDate() < bd)) age--;
  return age;
}

export function cpfRates(age: number): { employer: number; employee: number } {
  const row = RATES.find(([upTo]) => age < upTo)!;
  return { employer: row[1], employee: row[2] };
}

/** CPF for one month. ow = ordinary wages, aw = additional wages (bonus), awCeiling = room left this year. */
export function cpf(ow: number, aw: number, age: number, awCeiling = ANNUAL_CEILING): { total: number; employee: number; employer: number } {
  const { employer: er, employee: ee } = cpfRates(age);
  const tw = ow + aw;
  let total: number, employee: number;
  if (tw <= 50) return { total: 0, employee: 0, employer: 0 };
  if (tw <= 500) {
    total = (er / 100) * tw;
    employee = 0;
  } else if (tw <= 750) {
    const phase = ((ee * 3) / 100) * (tw - 500); // e.g. 0.6 x (TW - 500) for ages 55 and below
    total = (er / 100) * tw + phase;
    employee = phase;
  } else {
    const owc = Math.min(ow, OW_CEILING);
    const awc = Math.max(0, Math.min(aw, awCeiling));
    total = ((er + ee) / 100) * (owc + awc);
    employee = (ee / 100) * (owc + awc);
  }
  const totalR = Math.round(total + 1e-9);
  const employeeR = Math.min(Math.floor(employee + 1e-9), totalR);
  return { total: totalR, employee: employeeR, employer: totalR - employeeR };
}

export function sdl(totalWages: number): number {
  if (totalWages <= 0) return 0;
  return r2(Math.min(11.25, Math.max(2, totalWages * 0.0025)));
}

export function otHourlyRate(basic: number): number {
  return r2(((12 * basic) / (52 * 44)) * 1.5);
}

export interface PayInput {
  pass_type: string;
  date_of_birth?: string | null;
  /** 'monthly' = fixed monthly basic; 'daily' = daily rate x days worked */
  pay_basis?: string;
  basic_salary: number; // monthly basic (monthly-rated)
  daily_rate?: number;
  work_days?: number; // paid days (daily-rated)
  rest_days?: number; // Sundays / public holidays worked, paid double
  transport?: number;
  loan?: number;
  advance?: number;
  /** working days in the month, for the monthly-rated day rate */
  month_days?: number;
  /** normal hours a day, for the daily-rated OT rate */
  day_hours?: number;
  fixed_allowance: number;
  other_allowance: number;
  ot_hours: number;
  ot_rate?: number | null; // per hour; empty = Employment Act 1.5x
  bonus: number;
  unpaid_leave: number;
  other_deduction: number;
  levy: number;
  cpf_manual?: boolean;
  cpf_employee?: number;
  cpf_employer?: number;
  /** Ordinary Wages already subject to CPF this calendar year, before this month */
  ow_ytd?: number;
}

export interface PayResult {
  basic_pay: number; rest_pay: number;
  ot_rate: number; ot_pay: number; ordinary_wages: number; gross_pay: number;
  cpf_employee: number; cpf_employer: number; cpf_manual: boolean; sdl: number; levy: number; net_pay: number;
  note: string;
}

export function computePay(i: PayInput, period: string): PayResult {
  const daily = i.pay_basis === 'daily';
  const basic = daily ? r2((i.daily_rate || 0) * (i.work_days || 0)) : i.basic_salary;
  const dayRate = daily ? i.daily_rate || 0 : i.basic_salary / (i.month_days || 26);
  const restPay = r2(dayRate * 2 * (i.rest_days || 0));
  const otRate = i.ot_rate && i.ot_rate > 0 ? r2(i.ot_rate)
    : daily ? r2(((i.daily_rate || 0) / (i.day_hours || 8)) * 1.5) : otHourlyRate(i.basic_salary);
  const otPay = r2(otRate * (i.ot_hours || 0));
  const ow = r2(Math.max(0, basic + restPay + (i.transport || 0) + i.fixed_allowance + i.other_allowance + otPay - i.unpaid_leave));
  const gross = r2(ow + i.bonus);
  const notes: string[] = [];
  let cpfEe = 0, cpfEr = 0, manual = false;
  if (CPF_AUTO.has(i.pass_type) && !i.cpf_manual) {
    const age = cpfAge(i.date_of_birth || '', period);
    if (age === null) {
      notes.push('Add the date of birth to calculate CPF');
    } else {
      // Additional Wage ceiling: $102,000 less this year's Ordinary Wages (estimated for the rest of the year)
      const month = Number(period.slice(5, 7));
      const owYear = (i.ow_ytd || 0) + Math.min(ow, OW_CEILING) * (13 - month);
      const c = cpf(ow, i.bonus, age, Math.max(0, ANNUAL_CEILING - owYear));
      cpfEe = c.employee; cpfEr = c.employer;
      if (i.bonus > 0) notes.push('Bonus included: check the CPF on bonus with the CPF Board calculator');
    }
  } else if (i.pass_type === 'PR12' || i.cpf_manual) {
    manual = true;
    cpfEe = r2(i.cpf_employee || 0); cpfEr = r2(i.cpf_employer || 0);
    if (!cpfEe && !cpfEr && i.pass_type !== 'WP' && i.pass_type !== 'SPASS' && i.pass_type !== 'EP') notes.push('Enter CPF by hand (PR 1st/2nd year rates)');
  }
  const net = r2(gross - cpfEe - i.other_deduction - (i.loan || 0) - (i.advance || 0));
  return { basic_pay: r2(basic), rest_pay: restPay, ot_rate: otRate, ot_pay: otPay, ordinary_wages: ow, gross_pay: gross, cpf_employee: cpfEe, cpf_employer: cpfEr, cpf_manual: manual, sdl: sdl(gross), levy: r2(i.levy || 0), net_pay: net, note: notes.join('; ') };
}
