import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Crud } from './Admin';
import Attendance from './Attendance';

// Admin > Payroll: employees and the monthly salary run (OT, allowances, CPF, SDL), payslips and a CSV for Excel.
// All arithmetic is done on the server (server/src/payroll.ts); this page only edits inputs and shows results.

type Row = Record<string, any>;
const PASS: [string, string][] = [
  ['WP', 'Work Permit'],
  ['SPASS', 'S Pass'],
  ['EP', 'Employment Pass'],
  ['SC', 'Singapore Citizen'],
  ['PR3', 'PR (3rd year onwards)'],
  ['PR12', 'PR (1st / 2nd year) – CPF entered by hand'],
];
const passName = (p: string) => PASS.find(([v]) => v === p)?.[1] || p;
const $ = (v: unknown) => Number(v || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthName = (p: string) => new Date(`${p}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default function Payroll() {
  const [view, setView] = useState<'month' | 'att' | 'staff'>('month');
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Payroll">
        <button role="tab" aria-selected={view === 'month'} className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Monthly payroll</button>
        <button role="tab" aria-selected={view === 'att'} className={view === 'att' ? 'on' : ''} onClick={() => setView('att')}>Attendance</button>
        <button role="tab" aria-selected={view === 'staff'} className={view === 'staff' ? 'on' : ''} onClick={() => setView('staff')}>Employees</button>
      </div>
      {view === 'staff' ? <Employees /> : view === 'att' ? <Attendance /> : <Month />}
    </>
  );
}

function Employees() {
  return (
    <>
      <p className="pay-hint">Add each employee once. Their basic salary, fixed allowance and levy are copied into every new month; you can still change the month's figures. Date of birth is needed for CPF (Singapore Citizens and PRs). Employees with salary records cannot be deleted; set them to inactive.</p>
      <Crud table="employees" fields={[
        { key: 'name', label: 'Name (as on NRIC / work pass)' },
        { key: 'designation', label: 'Designation', optional: true },
        { key: 'pass_type', label: 'Citizenship / pass', options: PASS },
        { key: 'id_number', label: 'NRIC / FIN (optional)', optional: true, hint: 'Shown on the payslip (IC No / FIN No) and in the Excel file.' },
        { key: 'date_of_birth', label: 'Date of birth', date: true, optional: true, hint: 'Needed for CPF: the rate depends on age.' },
        { key: 'join_date', label: 'Date joined', date: true, optional: true },
        { key: 'pay_basis', label: 'Pay basis', options: [['daily', 'Daily rate (days worked x rate)'], ['monthly', 'Monthly salary']] },
        { key: 'daily_rate', label: 'Daily rate (SGD) – daily-rated workers', num: true, optional: true, hint: 'Basic = days worked x daily rate. Sunday / public holiday worked = 2 x daily rate. OT rate = daily rate / normal hours x 1.5.' },
        { key: 'basic_salary', label: 'Basic salary per month (SGD) – monthly-rated staff', num: true, optional: true },
        { key: 'transport', label: 'Transport allowance per month (SGD)', num: true, optional: true },
        { key: 'fixed_allowance', label: 'Other fixed allowance per month (SGD)', num: true, optional: true },
        { key: 'ot_rate', label: 'OT rate per hour (optional)', num: true, optional: true, hint: 'Empty or 0 = Employment Act rate: 1.5 x basic hourly rate (12 x basic / 52 / 44).' },
        { key: 'monthly_levy', label: 'Foreign worker levy per month (optional)', num: true, optional: true, hint: 'Paid by the company to MOM, never deducted from salary. Only used for the company cost total.' },
        { key: 'bank_name', label: 'Bank (optional)', optional: true },
        { key: 'bank_account', label: 'Bank account (optional)', optional: true },
        { key: 'active', label: 'Status', options: [['1', 'Active'], ['0', 'Inactive (left)']] },
        { key: 'notes', label: 'Notes (optional)', area: true, optional: true },
      ]} />
    </>
  );
}

// [field, column heading, shown for: 'daily' | 'monthly' | both]
const EDIT: [string, string, ('daily' | 'monthly')?][] = [
  ['work_days', 'Days', 'daily'],
  ['rest_days', 'Sunday / PH days'],
  ['ot_hours', 'OT hours'],
  ['transport', 'Transport'],
  ['other_allowance', 'Allowance'],
  ['bonus', 'Bonus'],
  ['unpaid_leave', 'Unpaid leave', 'monthly'],
  ['loan', 'Loan'],
  ['advance', 'Advance'],
  ['other_deduction', 'Other deduction'],
];
const basisOf = (r: Row) => (r.pay_basis === 'daily' ? 'daily' : 'monthly');

function Month() {
  const [period, setPeriod] = useState(thisMonth());
  const [items, setItems] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');
  const [company, setCompany] = useState<Row>({});
  const [slip, setSlip] = useState<Row>({});
  const load = useCallback(() => {
    setMsg('');
    api<{ items: Row[] }>(`/admin/payroll?period=${period}`, { auth: true }).then((d) => setItems(d.items)).catch((e: Error) => setMsg(e.message));
  }, [period]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api<Row>('/admin/settings', { auth: true }).then(setCompany).catch(() => undefined); }, []);
  useEffect(() => { api<Row>('/admin/payroll-config', { auth: true }).then(setSlip).catch(() => undefined); }, []);

  const edit = (id: number, patch: Row) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  async function save(r: Row) {
    try {
      const out = await api<Row>(`/admin/payroll/${r.id}`, { method: 'PUT', auth: true, body: r });
      edit(r.id, out);
    } catch (e) { setMsg((e as Error).message); load(); }
  }
  async function generate() {
    try {
      const d = await api<{ added: number; items: Row[] }>('/admin/payroll/generate', { method: 'POST', auth: true, body: { period } });
      setItems(d.items);
      setMsg(d.added ? `Added ${d.added} employee(s) to ${monthName(period)}.` : 'Every active employee is already in this month.');
    } catch (e) { setMsg((e as Error).message); }
  }
  async function fromAttendance() {
    try {
      const d = await api<{ updated: number; paid: number; none: number; items: Row[] }>('/admin/payroll/from-attendance', { method: 'POST', auth: true, body: { period } });
      setItems(d.items);
      setMsg([`OT hours and unpaid leave updated for ${d.updated} employee(s).`, d.none ? `${d.none} had no attendance this month and were left as they were.` : '', d.paid ? `${d.paid} already paid, not changed.` : ''].filter(Boolean).join(' '));
    } catch (e) { setMsg((e as Error).message); }
  }
  async function setPaid(r: Row, paid: boolean) {
    let body: Row = { paid };
    if (paid) {
      const on = prompt('Payment date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
      if (!on) return;
      const mode = prompt('Payment mode (e.g. Bank transfer, PayNow, Cash, Cheque)', 'Bank transfer') || 'Bank transfer';
      body = { paid, paid_on: on, payment_mode: mode };
    }
    try { edit(r.id, await api<Row>(`/admin/payroll/${r.id}/status`, { method: 'POST', auth: true, body })); } catch (e) { setMsg((e as Error).message); }
  }
  async function remove(r: Row) {
    if (!confirm(`Remove ${r.employee_name} from ${monthName(period)}?`)) return;
    try { await api(`/admin/payroll/${r.id}`, { method: 'DELETE', auth: true }); load(); } catch (e) { setMsg((e as Error).message); }
  }
  async function download() {
    try {
      const res = await fetch(`/api/admin/payroll/export?period=${period}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Download failed');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `payroll-${period}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setMsg((e as Error).message); }
  }

  const sum = (k: string) => items.reduce((t, r) => t + Number(r[k] || 0), 0);
  const cost = sum('gross_pay') + sum('cpf_employer') + sum('sdl') + sum('levy');

  return (
    <>
      <div className="card pay-bar">
        <label>Month<input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} /></label>
        <button type="button" className="btn" onClick={generate}>Add active employees to this month</button>
        <button type="button" className="btn ghost" onClick={fromAttendance} disabled={!items.length}>Take days, OT and leave from attendance</button>
        <button type="button" className="btn ghost" onClick={download} disabled={!items.length}>Download Excel (CSV)</button>
      </div>
      {msg && <p className="ok" role="status">{msg}</p>}
      {!items.length && <p>No salaries for {monthName(period)} yet. Add employees under "Employees", then press "Add active employees to this month".</p>}

      {items.length > 0 && (
        <>
          <div className="pay-totals">
            <div><small>Gross pay</small><strong>${$(sum('gross_pay'))}</strong></div>
            <div><small>Net pay to employees</small><strong>${$(sum('net_pay'))}</strong></div>
            <div><small>CPF (employee + employer)</small><strong>${$(sum('cpf_employee') + sum('cpf_employer'))}</strong></div>
            <div><small>SDL</small><strong>${$(sum('sdl'))}</strong></div>
            <div><small>Levy</small><strong>${$(sum('levy'))}</strong></div>
            <div><small>Total company cost</small><strong>${$(cost)}</strong></div>
          </div>
          <div className="pay-scroll">
            <table className="pay-table">
              <thead>
                <tr><th>Employee</th><th>Basic</th>{EDIT.map(([, l]) => <th key={l}>{l}</th>)}<th>Gross</th><th>CPF employee / employer</th><th>Net pay</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const locked = r.status === 'paid';
                  return (
                    <tr key={r.id} className={locked ? 'paid' : ''}>
                      <td><strong>{r.employee_name}</strong><small>{passName(r.pass_type)}</small>{r.note && <small className="warn">{r.note}</small>}</td>
                      <td>
                        ${$(r.basic_salary)}
                        {basisOf(r) === 'daily' ? <small>{Number(r.work_days)} day(s) x ${$(r.daily_rate)}</small> : <small>Monthly</small>}
                        {Number(r.fixed_allowance) > 0 && <small>+ fixed allowance ${$(r.fixed_allowance)}</small>}
                        {Number(r.rest_pay) > 0 && <small>Sunday/PH ${$(r.rest_pay)}</small>}
                        {Number(r.ot_pay) > 0 && <small>OT ${$(r.ot_pay)} @ ${$(r.ot_rate)}/h</small>}
                      </td>
                      {EDIT.map(([k, l, only]) => only && only !== basisOf(r) ? <td key={k}><small>—</small></td> : (
                        <td key={k}>
                          <input type="number" min={0} step="any" aria-label={`${l}, ${r.employee_name}`} disabled={locked} value={r[k] ?? ''}
                            onChange={(e) => edit(r.id, { [k]: e.target.value })} onBlur={() => save(r)} />
                          {k === 'unpaid_leave' && Number(r.unpaid_days) > 0 && <small>{Number(r.unpaid_days)} day(s)</small>}
                          {k === 'other_deduction' && Number(r.other_deduction) > 0 && (
                            <input type="text" placeholder="What for?" aria-label={`Deduction note, ${r.employee_name}`} disabled={locked} value={r.deduction_note ?? ''}
                              onChange={(e) => edit(r.id, { deduction_note: e.target.value })} onBlur={() => save(r)} />
                          )}
                        </td>
                      ))}
                      <td>${$(r.gross_pay)}</td>
                      <td>
                        {r.pass_type === 'PR12' || Number(r.cpf_manual) ? (
                          <span className="cpf-manual">
                            <input type="number" min={0} step="any" aria-label={`CPF employee, ${r.employee_name}`} disabled={locked} value={r.cpf_employee ?? ''} onChange={(e) => edit(r.id, { cpf_employee: e.target.value, cpf_manual: 1 })} onBlur={() => save(r)} />
                            <input type="number" min={0} step="any" aria-label={`CPF employer, ${r.employee_name}`} disabled={locked} value={r.cpf_employer ?? ''} onChange={(e) => edit(r.id, { cpf_employer: e.target.value, cpf_manual: 1 })} onBlur={() => save(r)} />
                          </span>
                        ) : ['WP', 'SPASS', 'EP'].includes(r.pass_type) ? <small>No CPF</small> : <>${$(r.cpf_employee)} / ${$(r.cpf_employer)}</>}
                      </td>
                      <td><strong>${$(r.net_pay)}</strong></td>
                      <td>{locked ? <span className="paid-tag">Paid {r.paid_on}</span> : <span className="draft-tag">Draft</span>}</td>
                      <td className="pay-actions">
                        <button type="button" className="btn ghost" onClick={() => payslip(r, company, slip, period)}>Payslip</button>
                        {locked
                          ? <button type="button" className="btn ghost" onClick={() => setPaid(r, false)}>Mark unpaid</button>
                          : <><button type="button" className="btn" onClick={() => setPaid(r, true)}>Mark paid</button><button type="button" className="btn ghost" onClick={() => remove(r)}>Remove</button></>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <SlipHeader company={company} slip={slip} setSlip={setSlip} />
          <p className="pay-hint">Daily-rated workers: basic = days x daily rate, Sunday / public holiday worked = 2 x daily rate, OT = daily rate / normal hours x 1.5 (all filled from Attendance). CPF uses the CPF Board rates from 1 January 2026 for Singapore Citizens and PRs from the 3rd year (Ordinary Wage ceiling $8,000). For PRs in their 1st or 2nd year, enter the CPF from the CPF contribution calculator. Check bonuses (Additional Wages) with the CPF calculator before paying. SDL and levy are paid by the company and are not deducted from salary.</p>
        </>
      )}
    </>
  );
}

// Payslip in the company's own layout (SALARY PAY SLIP: earnings left, deductions right, signature and payment date),
// keeping what MOM asks for on an itemised payslip: employer, employee, period, payment date and mode, basic pay,
// allowances, OT hours, period and pay, other payments, itemised deductions, net pay, and CPF.
function payslip(r: Row, company: Row, slip: Row, period: string) {
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) return alert('Allow pop-ups for this site to open the payslip.');
  const [y, m] = period.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const mon = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[m - 1];
  const logo = company.logo ? new URL(company.logo, location.origin).href : `${location.origin}/icon-512.png`;
  const address = slip.slip_address || company.address || '';
  const phone = slip.slip_phone || company.phone || '';
  const email = slip.slip_email || (/example\.com$/i.test(company.email || '') ? '' : company.email) || '';
  const hasCpf = !['WP', 'SPASS', 'EP'].includes(r.pass_type);
  const n = (v: unknown) => Number(v || 0);
  const $ = (v: unknown) => n(v).toFixed(2); // plain 1550.00, as on the company's payslip
  const qty = (v: unknown, unit: string) => (n(v) ? `${n(v)} ${unit}` : '');
  const allowance = n(r.fixed_allowance) + n(r.other_allowance);

  const earn: [string, string, number][] = [
    ['Basic Salary', r.pay_basis === 'daily' ? qty(r.work_days, 'Day') : '', n(r.basic_salary)],
    ['Sunday/PH', qty(r.rest_days, 'Day'), n(r.rest_pay)],
    ['Transport', '', n(r.transport)],
    ['OT', qty(r.ot_hours, 'Hours'), n(r.ot_pay)],
    ['Allowance', '', allowance],
  ];
  if (n(r.bonus)) earn.push(['Bonus', '', n(r.bonus)]);
  if (n(r.unpaid_leave)) earn.push(['Less: unpaid leave', qty(r.unpaid_days, 'Day'), -n(r.unpaid_leave)]);
  const ded: [string, number][] = [];
  if (hasCpf) ded.push(['CPF (employee)', n(r.cpf_employee)]);
  ded.push(['Loan', n(r.loan)], ['Advance', n(r.advance)], [`Other${r.deduction_note ? ` (${r.deduction_note})` : ''}`, n(r.other_deduction)]);
  const totalDed = ded.reduce((t, [, v]) => t + v, 0);
  const rows = Math.max(earn.length, ded.length);
  const body = Array.from({ length: rows }, (_, i) => {
    const e = earn[i], d = ded[i];
    return `<tr>
      <td>${e ? esc(e[0]) : ''}</td><td class="q">${e ? esc(e[1]) : ''}</td><td class="c">${e ? '$' : ''}</td><td class="n">${e ? $(e[2]) : ''}</td>
      <td class="l">${d ? esc(d[0]) : ''}</td><td class="c">${d ? '$' : ''}</td><td class="n r">${d ? $(d[1]) : ''}</td></tr>`;
  }).join('');

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payslip_${esc(String(r.employee_name).replace(/\s+/g, '_'))}_${esc(mon)}${y}</title>
<style>
@page{size:A4;margin:16mm}
*{box-sizing:border-box}
body{font:13px/1.35 Arial,Helvetica,sans-serif;color:#000;max-width:740px;margin:20px auto;padding:0 18px}
.head{display:flex;align-items:center;gap:18px;padding-bottom:12px;border-bottom:2px solid #000}
.head img{width:72px;height:72px;object-fit:contain}
.head .co{flex:1;text-align:center}
.head h1{font-size:20px;margin:0 0 4px}.head div div{font-size:13px}
h2{text-align:center;font-size:14px;text-decoration:underline;margin:22px 0 16px}
.meta{border-collapse:collapse;margin-bottom:22px}.meta td{padding:2px 0}
.meta td:first-child{width:200px}.meta td:nth-child(2){width:100px}.meta td:last-child{text-decoration:underline}
.meta .name{font-weight:700;font-style:italic}
table.pay{width:100%;border-collapse:collapse;border:2px solid #000}
.pay th{background:#e6e6e6;font-style:italic;border-bottom:2px solid #000;padding:3px}
.pay th+th,.pay td.l{border-left:2px solid #000}
.pay td{padding:3px 4px;vertical-align:top}
.pay tbody tr:first-child td{padding-top:16px}.pay tbody tr:last-child td{padding-bottom:16px}
.pay .q{text-align:right;width:80px}.pay .c{width:28px;text-align:center}.pay .n{text-align:right;width:84px}
.pay tfoot td{border-top:1px solid #000}.pay tfoot tr.g td{border-top:1px solid #000;font-weight:700}
.pay tfoot td.lbl{font-weight:400}
.cpf{font-size:12px;margin-top:8px}
.sign{display:flex;justify-content:space-between;gap:40px;margin-top:120px}
.sign div{flex:0 0 42%;text-align:center}.sign .line{border-top:1px solid #000;padding-top:16px;min-height:20px}
.sign .val{min-height:18px}
button{margin-top:28px;padding:8px 16px;font:inherit;cursor:pointer}@media print{button{display:none}body{margin:0}}
</style></head><body>
<div class="head"><img src="${esc(logo)}" alt=""><div class="co"><h1>${esc(String(company.company_name || 'Company').toUpperCase())}</h1>
${address ? `<div>${esc(String(address).toUpperCase())}</div>` : ''}
<div>${phone ? `HP: ${esc(phone)}` : ''}${phone && email ? '&nbsp; ' : ''}${email ? `E-mail:${esc(email)}` : ''}</div></div><div style="width:72px"></div></div>
<h2>SALARY PAY SLIP</h2>
<table class="meta">
<tr><td>Name Of Worker</td><td>:</td><td class="name">${esc(String(r.employee_name).toUpperCase())}</td></tr>
<tr><td>IC No/Fin No</td><td>:</td><td>${esc(r.id_number || '')}</td></tr>
<tr><td>Occupation</td><td>:</td><td>${esc(r.designation || '')}</td></tr>
<tr><td>Payslip For</td><td>:</td><td>01-${last} ${esc(mon)} ${y}</td></tr>
<tr><td>Mode Of Payment</td><td>:</td><td>${esc(r.payment_mode || 'Bank Transfer')}</td></tr>
</table>
<table class="pay">
<thead><tr><th colspan="4">Earnings</th><th colspan="3">Deductions</th></tr></thead>
<tbody>${body}</tbody>
<tfoot>
<tr><td class="lbl">Total Earnings</td><td></td><td class="c">$</td><td class="n">${$(r.gross_pay)}</td><td class="l">Total Deductions</td><td class="c">$</td><td class="n">${$(totalDed)}</td></tr>
<tr class="g"><td class="lbl">Gross Pay</td><td></td><td class="c">$</td><td class="n">${$(r.gross_pay)}</td><td class="l lbl">NET Pay</td><td class="c">$</td><td class="n">${$(r.net_pay)}</td></tr>
</tfoot></table>
${hasCpf ? `<div class="cpf">Employer CPF contribution (paid by the company, not deducted): $${$(r.cpf_employer)}</div>` : ''}
<div class="sign"><div><div class="val"></div><div class="line">Signature of The Employee</div></div>
<div><div class="val">${esc(r.paid_on ? new Date(`${r.paid_on}T00:00:00`).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '')}</div><div class="line">Date Of Payment</div></div></div>
<button onclick="print()">Print / Save as PDF</button>
</body></html>`);
  w.document.close();
}

// Address, phone and email printed at the top of the payslip (the website's are used while these are empty)
function SlipHeader({ company, slip, setSlip }: { company: Row; slip: Row; setSlip: (s: Row) => void }) {
  const [msg, setMsg] = useState('');
  async function save() {
    try { setSlip(await api<Row>('/admin/payroll-config', { method: 'PUT', auth: true, body: slip })); setMsg('Saved.'); } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <details className="card att-rules">
      <summary>Payslip header</summary>
      <div className="pay-bar">
        <label>Address<input value={slip.slip_address || ''} placeholder={company.address} onChange={(e) => setSlip({ ...slip, slip_address: e.target.value })} /></label>
        <label>Phone (HP)<input value={slip.slip_phone || ''} placeholder={company.phone} onChange={(e) => setSlip({ ...slip, slip_phone: e.target.value })} /></label>
        <label>Email<input type="email" value={slip.slip_email || ''} placeholder={company.email} onChange={(e) => setSlip({ ...slip, slip_email: e.target.value })} /></label>
        <button type="button" className="btn" onClick={save}>Save</button>
        {msg && <span role="status">{msg}</span>}
      </div>
      <p className="pay-hint">Leave a box empty to use the website's details (Admin → Settings). The company name and logo come from Settings too.</p>
    </details>
  );
}
