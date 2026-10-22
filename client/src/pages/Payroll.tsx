import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import { api } from '../api';
import { useRemembered } from '../remember';
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
  const [view, setView] = useRemembered<'month' | 'att' | 'staff'>('pay.view', 'month');
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

// CSV for Admin > Payroll > Employees > Import: the first row holds column names (name, id_number, pass_type, ...)
const EMP_KEYS = ['name', 'id_number', 'pass_type', 'date_of_birth', 'designation', 'join_date', 'pay_basis', 'basic_salary', 'daily_rate', 'transport', 'fixed_allowance', 'ot_rate', 'monthly_levy', 'bank_name', 'bank_account', 'active', 'notes'];
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((x) => x.trim()));
}
// 15/07/2028 (as MOM and CPF write dates) -> 2028-07-15
const isoDay = (v: string) => { const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v.trim(); };

function ImportEmployees({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function pick(file?: File) {
    setMsg(''); setRows([]);
    if (!file) return;
    const table = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
    const head = (table.shift() || []).map((h) => h.trim().toLowerCase());
    const unknown = head.filter((h) => h && !EMP_KEYS.includes(h));
    if (!head.includes('name')) return setMsg('The first row must have column names, including "name".');
    const list = table.map((r) => Object.fromEntries(head.map((h, i) => [h, /date/.test(h) ? isoDay(r[i] || '') : (r[i] || '').trim()]).filter(([h]) => EMP_KEYS.includes(h))));
    setRows(list.filter((r) => r.name));
    if (unknown.length) setMsg(`These columns are not used: ${unknown.join(', ')}`);
  }
  async function send() {
    setBusy(true);
    try {
      const r = await api<{ added: number; updated: number; skipped: string[] }>('/admin/employees/import', { method: 'POST', auth: true, body: { rows } });
      setMsg(`Done: ${r.added} added, ${r.updated} updated${r.skipped.length ? `, ${r.skipped.length} skipped` : ''}.`);
      setRows([]);
      onDone();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <details className="card emp-import">
      <summary>Import employees from a file (CSV / Excel)</summary>
      <p className="pay-hint">Save the Excel sheet as CSV. The first row holds the column names: {EMP_KEYS.join(', ')}. Only "name" is required. Dates can be 15/07/2028 or 2028-07-15. pass_type is WP, SPASS, EP, SC, PR3 or PR12; pay_basis is daily or monthly. An employee who is already in the list (same NRIC / FIN, or the same name when there is none) is updated, not added twice, and only the filled columns change.</p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      {rows.length > 0 && (
        <>
          <div className="att-scroll"><table className="att-table emp-preview">
            <thead><tr><th>#</th><th>Name</th><th>Pass</th><th>NRIC / FIN</th><th>Pay</th><th>Levy</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.name}</td><td>{passName(r.pass_type || 'WP')}</td><td>{r.id_number || '–'}</td><td>{r.pay_basis === 'daily' ? `${r.daily_rate || 0}/day` : r.basic_salary ? `${r.basic_salary}/month` : '–'}</td><td>{r.monthly_levy || '–'}</td></tr>)}</tbody>
          </table></div>
          <button type="button" className="btn" disabled={busy} onClick={send}>{busy ? 'Importing…' : `Import ${rows.length} employees`}</button>
        </>
      )}
      {msg && <p className={/^Done/.test(msg) ? 'ok' : 'err'}>{msg}</p>}
    </details>
  );
}

// [field, heading, kind, width] for the employee sheet
type Col = [string, string, 'text' | 'num' | 'date' | 'pass' | 'basis' | 'active', number];
const EMP_SHEET: Col[] = [
  ['name', 'Name (as on NRIC / pass)', 'text', 220],
  ['designation', 'Designation', 'text', 140],
  ['pass_type', 'Citizenship / pass', 'pass', 150],
  ['id_number', 'NRIC / FIN', 'text', 110],
  ['date_of_birth', 'Date of birth', 'date', 140],
  ['join_date', 'Date joined', 'date', 140],
  ['pay_basis', 'Pay basis', 'basis', 100],
  ['daily_rate', 'Daily rate', 'num', 90],
  ['basic_salary', 'Basic / month', 'num', 100],
  ['transport', 'Transport', 'num', 90],
  ['fixed_allowance', 'Allowance', 'num', 90],
  ['ot_rate', 'OT rate / h', 'num', 90],
  ['monthly_levy', 'Levy / month', 'num', 100],
  ['bank_name', 'Bank', 'text', 110],
  ['bank_account', 'Account no.', 'text', 130],
  ['active', 'Status', 'active', 100],
  ['notes', 'Notes', 'text', 320],
];

// shown on each employee card on a phone; the rest open with "Edit all details"
const EMP_KEY = ['name', 'pass_type', 'pay_basis', 'daily_rate', 'basic_salary', 'active'];

function Employees() {
  const [ver, setVer] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState<Record<number, string>>({});
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<number | null>(null); // phones: the employee whose full details are shown
  const load = useCallback(() => {
    api<Row[]>('/admin/employees', { auth: true }).then((d) => { setRows(d); setSaved(Object.fromEntries(d.map((r) => [r.id, JSON.stringify(r)]))); }).catch((e: Error) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load, ver]);

  const edit = (id: number, patch: Row) => setRows((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  // a row is saved when you leave a cell, only if something in it changed
  async function save(id: number) {
    const r = rows.find((x) => x.id === id);
    if (!r || saved[id] === JSON.stringify(r)) return;
    if (!String(r.name || '').trim()) { setMsg('Every employee needs a name.'); return; }
    try {
      await api(`/admin/employees/${id}`, { method: 'PUT', auth: true, body: r });
      setSaved((s) => ({ ...s, [id]: JSON.stringify(r) }));
      setMsg('');
    } catch (e) { setMsg((e as Error).message); }
  }
  async function addRow() {
    const name = prompt('Name of the new employee (as on NRIC / work pass)');
    if (!name?.trim()) return;
    try { await api('/admin/employees', { method: 'POST', auth: true, body: { name: name.trim(), pass_type: 'WP', pay_basis: 'daily', active: 1 } }); load(); } catch (e) { setMsg((e as Error).message); }
  }
  async function remove(r: Row) {
    if (!confirm(`Delete ${r.name}? Their attendance and unpaid salary lines go too. (Employees who were paid cannot be deleted: set them to Inactive.)`)) return;
    try { await api(`/admin/employees/${r.id}`, { method: 'DELETE', auth: true }); load(); } catch (e) { setMsg((e as Error).message); }
  }

  const needle = q.trim().toLowerCase();
  const shown = needle ? rows.filter((r) => [r.name, r.id_number, r.designation, r.notes, passName(r.pass_type)].some((v) => String(v || '').toLowerCase().includes(needle))) : rows;
  const active = rows.filter((r) => Number(r.active) === 1);
  const total = (k: string) => shown.reduce((t, r) => t + Number(r[k] || 0), 0);

  const cell = (r: Row, [k, label, kind]: Col) => {
    const common = { 'data-col': k, 'aria-label': `${label}, ${r.name || 'new employee'}`, onBlur: () => save(r.id) };
    if (kind === 'pass') return <select {...common} value={r.pass_type || 'WP'} onChange={(e) => edit(r.id, { pass_type: e.target.value })}>{PASS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
    if (kind === 'basis') return <select {...common} value={r.pay_basis === 'daily' ? 'daily' : 'monthly'} onChange={(e) => edit(r.id, { pay_basis: e.target.value })}><option value="daily">Daily</option><option value="monthly">Monthly</option></select>;
    if (kind === 'active') return <select {...common} value={Number(r.active) === 1 ? '1' : '0'} onChange={(e) => edit(r.id, { active: Number(e.target.value) })}><option value="1">Active</option><option value="0">Inactive</option></select>;
    if (kind === 'date') return <input {...common} type="date" value={String(r[k] || '').slice(0, 10)} onChange={(e) => edit(r.id, { [k]: e.target.value || null })} />;
    if (kind === 'num') return <input {...common} type="number" min={0} step="any" value={r[k] == null || Number(r[k]) === 0 ? '' : r[k]} placeholder="0" onChange={(e) => edit(r.id, { [k]: e.target.value })} />;
    return <input {...common} type="text" value={r[k] ?? ''} onChange={(e) => edit(r.id, { [k]: e.target.value })} />;
  };

  return (
    <>
      <ImportEmployees onDone={() => setVer((v) => v + 1)} />
      <div className="sheet-bar">
        <button type="button" className="btn" onClick={addRow}>+ Add employee</button>
        <label className="sheet-search"><span className="sr-only">Search employees</span><input type="search" placeholder="Search name, NRIC / FIN, notes…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <span className="sheet-count">{active.length} active · {rows.length - active.length} inactive</span>
      </div>
      {msg && <p className="err" role="alert">{msg}</p>}
      <div className="pay-scroll sheet-wrap">
        <table className="sheet emp-sheet mcards" onKeyDown={enterDown}>
          <thead>
            <tr><th className="rn" aria-label="Row" />{EMP_SHEET.map(([k, l, kind, w], i) => <th key={k} className={`${kind === 'num' ? 'num' : ''}${i === 0 ? ' stick' : ''}`} style={{ minWidth: w }}>{l}</th>)}<th aria-label="Delete" /></tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.id} className={`${Number(r.active) === 1 ? '' : 'inactive'}${open === r.id ? ' open' : ''}`}>
                <td className="rn">{i + 1}</td>
                {EMP_SHEET.map((c, j) => (
                  <td key={c[0]} data-label={c[1]} className={`cell${c[2] === 'num' ? ' num' : ''}${j === 0 ? ' stick full' : ''}${EMP_KEY.includes(c[0]) ? ' m-key' : ''}`}>{cell(r, c)}</td>
                ))}
                <td className="sheet-del full">
                  <button type="button" className="m-only m-more" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide details ▴' : 'Edit all details ▾'}</button>
                  <button type="button" aria-label={`Delete ${r.name}`} title="Delete" onClick={() => remove(r)}>✕<span className="m-only"> Delete</span></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td className="rn" /><td colSpan={EMP_SHEET.length + 1} className="sheet-empty">{rows.length ? 'No employee matches the search.' : 'No employees yet. Press "+ Add employee" or import a file.'}</td></tr>}
          </tbody>
          {shown.length > 0 && (
            <tfoot>
              <tr>
                <td className="rn" />
                {EMP_SHEET.map(([k, label, kind], j) => <td key={k} data-label={label} className={`${kind === 'num' ? 'num' : ''}${j === 0 ? ' stick full' : ''}${['name', 'basic_salary', 'transport', 'fixed_allowance', 'monthly_levy'].includes(k) ? '' : ' m-hide'}`}>{j === 0 ? <strong>Total ({shown.length})</strong> : kind === 'num' && ['basic_salary', 'transport', 'fixed_allowance', 'monthly_levy'].includes(k) ? `$${$(total(k))}` : ''}</td>)}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="pay-hint">Click a cell to change it; it saves when you leave the cell. Enter moves down, Tab moves right. Date of birth is needed for CPF (Singapore Citizens and PRs). OT rate empty = Employment Act rate. Levy is paid by the company, never deducted from salary. Employees with paid salary records cannot be deleted: set them to Inactive.</p>
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

/** Enter in a cell goes to the same column one row down (Shift+Enter one row up), as in Excel / Google Sheets. */
function enterDown(e: React.KeyboardEvent<HTMLTableElement>) {
  const el = e.target as HTMLElement;
  const col = el.dataset?.col;
  if (e.key !== 'Enter' || !col || el.tagName === 'TEXTAREA') return;
  e.preventDefault();
  const rows = [...e.currentTarget.querySelectorAll('tbody tr')];
  const at = rows.findIndex((r) => r.contains(el));
  for (let i = at + (e.shiftKey ? -1 : 1); i >= 0 && i < rows.length; i += e.shiftKey ? -1 : 1) {
    const next = rows[i].querySelector<HTMLElement>(`[data-col="${col}"]:not([disabled])`);
    if (next) { next.focus(); if (next instanceof HTMLInputElement) next.select(); return; }
  }
  el.blur();
}

function Month() {
  const [period, setPeriod] = useRemembered('pay.period', thisMonth());
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
          <div className="pay-scroll sheet-wrap">
            <table className="pay-table sheet mcards pay-month" onKeyDown={enterDown}>
              <thead>
                <tr><th className="rn" aria-label="Row" /><th className="stick">Employee</th><th>Basic</th>{EDIT.map(([, l]) => <th key={l} className="num">{l}</th>)}<th className="num">Gross</th><th className="num">CPF employee / employer</th><th className="num">Net pay</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {items.map((r, i) => {
                  const locked = r.status === 'paid';
                  return (
                    <tr key={r.id} className={locked ? 'paid' : ''}>
                      <td className="rn">{i + 1}</td>
                      <td className="stick full mhead"><strong>{r.employee_name}</strong><small>{passName(r.pass_type)}</small>{r.note && <small className="warn">{r.note}</small>}</td>
                      <td data-label="Basic">
                        ${$(r.basic_salary)}
                        {basisOf(r) === 'daily' ? <small>{Number(r.work_days)} day(s) x ${$(r.daily_rate)}</small> : <small>Monthly</small>}
                        {Number(r.fixed_allowance) > 0 && <small>+ fixed allowance ${$(r.fixed_allowance)}</small>}
                        {Number(r.rest_pay) > 0 && <small>Sunday/PH ${$(r.rest_pay)}</small>}
                        {Number(r.ot_pay) > 0 && <small>OT ${$(r.ot_pay)} @ ${$(r.ot_rate)}/h</small>}
                      </td>
                      {EDIT.map(([k, l, only]) => only && only !== basisOf(r) ? <td key={k} className="num na m-hide"><small>—</small></td> : (
                        <td key={k} className="num cell" data-label={l}>
                          <input type="number" min={0} step="any" data-col={k} aria-label={`${l}, ${r.employee_name}`} disabled={locked} value={r[k] ?? ''}
                            onChange={(e) => edit(r.id, { [k]: e.target.value })} onBlur={() => save(r)} />
                          {k === 'unpaid_leave' && Number(r.unpaid_days) > 0 && <small>{Number(r.unpaid_days)} day(s)</small>}
                          {k === 'other_deduction' && Number(r.other_deduction) > 0 && (
                            <input type="text" placeholder="What for?" aria-label={`Deduction note, ${r.employee_name}`} disabled={locked} value={r.deduction_note ?? ''}
                              onChange={(e) => edit(r.id, { deduction_note: e.target.value })} onBlur={() => save(r)} />
                          )}
                        </td>
                      ))}
                      <td className="num" data-label="Gross">${$(r.gross_pay)}</td>
                      <td className="num" data-label="CPF employee / employer">
                        {r.pass_type === 'PR12' || Number(r.cpf_manual) ? (
                          <span className="cpf-manual">
                            <input type="number" min={0} step="any" aria-label={`CPF employee, ${r.employee_name}`} disabled={locked} value={r.cpf_employee ?? ''} onChange={(e) => edit(r.id, { cpf_employee: e.target.value, cpf_manual: 1 })} onBlur={() => save(r)} />
                            <input type="number" min={0} step="any" aria-label={`CPF employer, ${r.employee_name}`} disabled={locked} value={r.cpf_employer ?? ''} onChange={(e) => edit(r.id, { cpf_employer: e.target.value, cpf_manual: 1 })} onBlur={() => save(r)} />
                          </span>
                        ) : ['WP', 'SPASS', 'EP'].includes(r.pass_type) ? <small>No CPF</small> : <>${$(r.cpf_employee)} / ${$(r.cpf_employer)}</>}
                      </td>
                      <td className="num m-net" data-label="Net pay"><strong>${$(r.net_pay)}</strong></td>
                      <td data-label="Status">{locked ? <span className="paid-tag">Paid {r.paid_on}</span> : <span className="draft-tag">Draft</span>}</td>
                      <td className="pay-actions full">
                        <button type="button" className="btn ghost" onClick={() => payslip(r, company, slip, period)}>Payslip</button>
                        {locked
                          ? <button type="button" className="btn ghost" onClick={() => setPaid(r, false)}>Mark unpaid</button>
                          : <><button type="button" className="btn" onClick={() => setPaid(r, true)}>Mark paid</button><button type="button" className="btn ghost" onClick={() => remove(r)}>Remove</button></>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="rn" />
                  <td className="stick full mhead"><strong>Total ({items.length})</strong></td>
                  <td className="num" data-label="Basic">${$(sum('basic_salary'))}</td>
                  {EDIT.map(([k, l]) => <td key={k} className="num" data-label={l}>{['work_days', 'rest_days', 'ot_hours'].includes(k) ? sum(k).toLocaleString('en-SG') : `$${$(sum(k))}`}</td>)}
                  <td className="num" data-label="Gross">${$(sum('gross_pay'))}</td>
                  <td className="num" data-label="CPF employee / employer">${$(sum('cpf_employee'))} / ${$(sum('cpf_employer'))}</td>
                  <td className="num m-net" data-label="Net pay"><strong>${$(sum('net_pay'))}</strong></td>
                  <td colSpan={2} className="m-hide" />
                </tr>
              </tfoot>
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
