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
        { key: 'id_number', label: 'NRIC / FIN (optional)', optional: true, hint: 'Shown only to admins and in the Excel file, not on the payslip.' },
        { key: 'date_of_birth', label: 'Date of birth', date: true, optional: true, hint: 'Needed for CPF: the rate depends on age.' },
        { key: 'join_date', label: 'Date joined', date: true, optional: true },
        { key: 'basic_salary', label: 'Basic salary per month (SGD)', num: true },
        { key: 'fixed_allowance', label: 'Fixed allowance per month (SGD)', num: true, optional: true },
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

const EDIT: [string, string][] = [
  ['other_allowance', 'Other allowance'],
  ['ot_hours', 'OT hours'],
  ['bonus', 'Bonus'],
  ['unpaid_leave', 'Unpaid leave'],
  ['other_deduction', 'Other deduction'],
];

function Month() {
  const [period, setPeriod] = useState(thisMonth());
  const [items, setItems] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');
  const [company, setCompany] = useState<Row>({});
  const load = useCallback(() => {
    setMsg('');
    api<{ items: Row[] }>(`/admin/payroll?period=${period}`, { auth: true }).then((d) => setItems(d.items)).catch((e: Error) => setMsg(e.message));
  }, [period]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api<Row>('/admin/settings', { auth: true }).then(setCompany).catch(() => undefined); }, []);

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
        <button type="button" className="btn ghost" onClick={fromAttendance} disabled={!items.length}>Take OT and unpaid leave from attendance</button>
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
                <tr><th>Employee</th><th>Basic + fixed</th>{EDIT.map(([, l]) => <th key={l}>{l}</th>)}<th>Gross</th><th>CPF employee / employer</th><th>Net pay</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const locked = r.status === 'paid';
                  return (
                    <tr key={r.id} className={locked ? 'paid' : ''}>
                      <td><strong>{r.employee_name}</strong><small>{passName(r.pass_type)}</small>{r.note && <small className="warn">{r.note}</small>}</td>
                      <td>${$(Number(r.basic_salary) + Number(r.fixed_allowance))}{Number(r.ot_pay) > 0 && <small>OT ${$(r.ot_pay)} @ ${$(r.ot_rate)}/h</small>}</td>
                      {EDIT.map(([k, l]) => (
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
                        <button type="button" className="btn ghost" onClick={() => payslip(r, company, period)}>Payslip</button>
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
          <p className="pay-hint">CPF uses the CPF Board rates from 1 January 2026 for Singapore Citizens and PRs from the 3rd year (Ordinary Wage ceiling $8,000). For PRs in their 1st or 2nd year, enter the CPF from the CPF contribution calculator. Check bonuses (Additional Wages) with the CPF calculator before paying. SDL and levy are paid by the company and are not deducted from salary.</p>
        </>
      )}
    </>
  );
}

// Itemised payslip (MOM): employer, employee, period, payment date and mode, basic, allowances, OT hours and pay,
// other additional payments, itemised deductions, net pay, and CPF.
function payslip(r: Row, company: Row, period: string) {
  const w = window.open('', '_blank', 'width=760,height=900');
  if (!w) return alert('Allow pop-ups for this site to open the payslip.');
  const line = (label: string, v: unknown, cls = '') => `<tr class="${cls}"><td>${esc(label)}</td><td class="n">${$(v)}</td></tr>`;
  const allowances = Number(r.fixed_allowance) + Number(r.other_allowance);
  const hasCpf = !['WP', 'SPASS', 'EP'].includes(r.pass_type);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${esc(r.employee_name)} ${esc(period)}</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;color:#10343a;max-width:680px;margin:24px auto;padding:0 16px}
h1{font-size:20px;margin:0}h2{font-size:15px;margin:22px 0 6px;border-bottom:2px solid #f2b705;padding-bottom:4px}
.top{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.muted{color:#5b7276}
table{width:100%;border-collapse:collapse}td{padding:5px 0;border-bottom:1px solid #e3eae8}td.n{text-align:right;white-space:nowrap}
.total td{font-weight:700;border-top:2px solid #10343a}.net td{font-size:17px;font-weight:800}
.meta td:first-child{color:#5b7276;width:42%}
button{margin-top:20px;padding:8px 16px;font:inherit;cursor:pointer}@media print{button{display:none}}
</style></head><body>
<div class="top"><div><h1>${esc(company.company_name || 'Company')}</h1><div class="muted">${esc(company.address || '')}${company.uen ? ` · UEN ${esc(company.uen)}` : ''}</div></div>
<div><strong>PAYSLIP</strong><div class="muted">${esc(monthName(period))}</div></div></div>
<h2>Employee</h2><table class="meta">
<tr><td>Name</td><td>${esc(r.employee_name)}</td></tr>
${r.designation ? `<tr><td>Designation</td><td>${esc(r.designation)}</td></tr>` : ''}
<tr><td>Salary period</td><td>${esc(monthName(period))}</td></tr>
<tr><td>Date of payment</td><td>${esc(r.paid_on || 'Not paid yet')}</td></tr>
<tr><td>Mode of payment</td><td>${esc(r.payment_mode || '—')}</td></tr></table>
<h2>Earnings (SGD)</h2><table>
${line('Basic salary', r.basic_salary)}
${allowances ? line('Allowances', allowances) : ''}
${Number(r.ot_hours) ? line(`Overtime: ${r.ot_hours} hours at $${$(r.ot_rate)}/hour (${monthName(period)})`, r.ot_pay) : ''}
${Number(r.bonus) ? line('Other additional payments (bonus)', r.bonus) : ''}
${Number(r.unpaid_leave) ? line(`Less: unpaid leave${Number(r.unpaid_days) ? ` (${Number(r.unpaid_days)} day(s))` : ''}`, -Number(r.unpaid_leave)) : ''}
${line('Gross pay', r.gross_pay, 'total')}</table>
<h2>Deductions (SGD)</h2><table>
${hasCpf ? line('Employee CPF contribution', r.cpf_employee) : ''}
${Number(r.other_deduction) ? line(`Other deduction${r.deduction_note ? `: ${r.deduction_note}` : ''}`, r.other_deduction) : ''}
${line('Total deductions', Number(r.cpf_employee) + Number(r.other_deduction), 'total')}</table>
<table><tr class="net"><td>Net pay</td><td class="n">$${$(r.net_pay)}</td></tr></table>
${hasCpf ? `<h2>Employer contributions (not deducted)</h2><table>${line('Employer CPF contribution', r.cpf_employer)}</table>` : ''}
<button onclick="print()">Print / Save as PDF</button>
</body></html>`);
  w.document.close();
}
