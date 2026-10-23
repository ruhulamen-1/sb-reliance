import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import type { Me } from '../perm';

export type { Me };
type Account = { id: number; email: string; name: string; role: 'owner' | 'staff'; modules: string[]; active: boolean };

/** The sections an account can be given, with the Admin tab each one opens. */
export const MODULES: [string, string, string][] = [
  ['overview', 'Overview', 'Quote numbers and revenue'],
  ['quotes', 'Quotes', 'Customer requests, amounts and notes'],
  ['services', 'Services', 'Service pages'],
  ['blog', 'Blog', 'Articles'],
  ['gallery', 'Gallery', 'Projects and photos'],
  ['team', 'Team', 'People on the About page'],
  ['testimonials', 'Testimonials', 'Reviews'],
  ['payroll', 'Payroll', 'Choose each payroll job below'],
  ['redirects', 'Redirects', 'Old page addresses'],
  ['qr', 'QR page', 'The business card page'],
  ['settings', 'Settings', 'Company details, Google, Telegram alerts (private keys)'],
];

/** Payroll, one job at a time. Ticking a "change" job also gives its "see" job. */
export const PAY_OPS: [string, string, string][] = [
  ['pay.staff.view', 'Employees: see the list', 'Names, NRIC / FIN, pass, salary and bank details'],
  ['pay.staff.edit', 'Employees: add, change, import, delete', ''],
  ['pay.att.view', 'Attendance: see', 'Daily entry, one employee and month sheet'],
  ['pay.att.edit', 'Attendance: mark and change', 'Status, times, OT, "Mark the rest Present"'],
  ['pay.month.view', 'Monthly payroll: see salaries and payslips', 'Every salary of the month, open and print payslips'],
  ['pay.month.edit', 'Monthly payroll: prepare the month', 'Add employees to the month, take from attendance, change days, OT, allowances, deductions, remove'],
  ['pay.paid', 'Mark salaries Paid / Unpaid', 'A paid month is locked'],
  ['pay.export', 'Download Excel (CSV)', 'The whole month as a file'],
  ['pay.config', 'Payroll rules and payslip header', 'Work week, normal hours, break; address on the payslip'],
];
const PAY_KEYS = PAY_OPS.map(([k]) => k);
const NEEDS: Record<string, string> = {
  'pay.staff.edit': 'pay.staff.view', 'pay.att.edit': 'pay.att.view',
  'pay.month.edit': 'pay.month.view', 'pay.paid': 'pay.month.view', 'pay.export': 'pay.month.view',
};
// an account saved with the old single "Payroll" box has every payroll job
const expand = (mods: string[]) => (mods.includes('payroll') ? [...mods.filter((m) => m !== 'payroll' && !PAY_KEYS.includes(m)), ...PAY_KEYS] : mods);

const EMPTY = { email: '', name: '', password: '', role: 'staff' as 'owner' | 'staff', modules: [] as string[], active: true };

function MyPassword() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/me/password', { method: 'PUT', auth: true, body: { current, password } });
      setCurrent(''); setPassword('');
      setMsg({ ok: true, text: 'Password changed. Use the new one next time you sign in.' });
    } catch (x) { setMsg({ ok: false, text: (x as Error).message }); }
  }
  return (
    <form className="form card" onSubmit={submit}>
      <strong className="full">Change my password</strong>
      <label>Current password<input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
      <label>New password<small>At least 8 characters</small><input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {msg && <p className={`full ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.text}</p>}
      <div className="full"><button className="btn">Change password</button></div>
    </form>
  );
}

function AccountForm({ start, me, onDone, onCancel }: { start: Account | null; me: Me; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState(start ? { ...start, modules: expand(start.modules), password: '' } : EMPTY);
  const [err, setErr] = useState('');
  const toggle = (m: string) => {
    const on = !f.modules.includes(m);
    let next = on ? [...f.modules, m] : f.modules.filter((x) => x !== m);
    // a job that works on a list needs that list: ticking it ticks the "see" job, untick "see" and it goes too
    if (on && NEEDS[m]) next = [...new Set([...next, NEEDS[m]])];
    if (!on) next = next.filter((x) => NEEDS[x] !== m);
    setF({ ...f, modules: next });
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api(start ? `/admin/users/${start.id}` : '/admin/users', { method: start ? 'PUT' : 'POST', auth: true, body: f });
      onDone();
    } catch (x) { setErr((x as Error).message); }
  }
  const self = start?.id === me.id;
  return (
    <form className="form card" onSubmit={submit}>
      <strong className="full">{start ? `Edit ${start.name || start.email}` : 'New account'}</strong>
      <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Rahim (office)" /></label>
      <label>Email (used to sign in)<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>{start ? 'New password (optional)' : 'Password'}<small>{start ? 'Leave empty to keep the current password.' : 'At least 8 characters. Give it to the person yourself; they can change it later.'}</small>
        <input type="text" autoComplete="new-password" required={!start} minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </label>
      <label>Account type
        <select value={f.role} disabled={self} onChange={(e) => setF({ ...f, role: e.target.value as 'owner' | 'staff' })}>
          <option value="staff">Staff: only the sections ticked below</option>
          <option value="owner">Owner: everything, and can manage accounts</option>
        </select>
      </label>
      {f.role === 'staff' && (
        <fieldset className="full acc-mods">
          <legend>Sections this account can open</legend>
          <div className="row gap">
            <button type="button" className="btn ghost" onClick={() => setF({ ...f, modules: [...MODULES.map(([k]) => k).filter((k) => k !== 'payroll'), ...PAY_KEYS] })}>Tick all</button>
            <button type="button" className="btn ghost" onClick={() => setF({ ...f, modules: [] })}>Clear</button>
          </div>
          {MODULES.filter(([k]) => k !== 'payroll').map(([k, label, hint]) => (
            <label key={k} className="acc-check">
              <input type="checkbox" checked={f.modules.includes(k)} onChange={() => toggle(k)} />
              <span><b>{label}</b><small>{hint}</small></span>
            </label>
          ))}
          <div className="acc-pay">
            <div className="row gap acc-pay-head">
              <b>Payroll</b><small>Personal data and salaries: give only what the person needs.</small>
              <button type="button" className="btn ghost" onClick={() => setF({ ...f, modules: [...new Set([...f.modules, ...PAY_KEYS])] })}>All payroll</button>
              <button type="button" className="btn ghost" onClick={() => setF({ ...f, modules: f.modules.filter((m) => !PAY_KEYS.includes(m)) })}>No payroll</button>
            </div>
            {PAY_OPS.map(([k, label, hint]) => (
              <label key={k} className="acc-check">
                <input type="checkbox" checked={f.modules.includes(k)} onChange={() => toggle(k)} />
                <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!self && (
        <label className="full acc-check">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span><b>Account is on</b><small>Switch off to stop this person signing in, without deleting the account. Takes effect straight away.</small></span>
        </label>
      )}
      {err && <p className="full err">{err}</p>}
      <div className="full row gap">
        <button className="btn">{start ? 'Save changes' : 'Create account'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** Admin > Accounts: everyone can change their own password; the owner also adds accounts and chooses their sections. */
export default function AdminUsers({ me }: { me: Me }) {
  const [list, setList] = useState<Account[] | null>(null);
  const [edit, setEdit] = useState<Account | 'new' | null>(null);
  const [msg, setMsg] = useState('');
  const load = () => api<Account[]>('/admin/users', { auth: true }).then(setList).catch((e: Error) => setMsg(e.message));
  useEffect(() => { if (me.role === 'owner') load(); }, [me.role]);
  async function remove(a: Account) {
    if (!confirm(`Delete the account ${a.email}? This person can no longer sign in.`)) return;
    try { await api(`/admin/users/${a.id}`, { method: 'DELETE', auth: true }); load(); } catch (x) { setMsg((x as Error).message); }
  }
  // "Blog · QR page · Payroll: Employees: see the list, …"
  const summary = (mods: string[]) => {
    const all = expand(mods);
    const pay = PAY_OPS.filter(([k]) => all.includes(k)).map(([, l]) => l);
    const rest = MODULES.filter(([k]) => k !== 'payroll' && all.includes(k)).map(([, l]) => l);
    return [...rest, ...(pay.length === PAY_OPS.length ? ['Payroll (all)'] : pay.length ? [`Payroll (${pay.join('; ')})`] : [])].join(' · ');
  };
  return (
    <>
      <div className="card acc-me">
        <strong>Signed in as {me.name || me.email}</strong>
        <p>{me.role === 'owner' ? 'Owner: you can open every section and manage accounts.' : `You can open: ${summary(me.modules) || 'no sections yet. Ask the owner.'}`}</p>
      </div>
      <MyPassword />
      {me.role === 'owner' && (
        <>
          <div className="row gap acc-head">
            <h2>People who can sign in</h2>
            {!edit && <button className="btn" onClick={() => setEdit('new')}>Add account</button>}
          </div>
          {msg && <p className="err">{msg}</p>}
          {edit && <AccountForm start={edit === 'new' ? null : edit} me={me} onCancel={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
          {!list ? <p>Loading…</p> : (
            <div className="acc-list">
              {list.map((a) => (
                <div key={a.id} className={`card acc-row${a.active ? '' : ' off'}`}>
                  <div>
                    <span><strong>{a.name || a.email}</strong>{a.id === me.id && <span className="tag">You</span>}{!a.active && <span className="tag">Switched off</span>}</span>
                    <small>{a.email}</small>
                    <small>{a.role === 'owner' ? 'Owner: all sections' : summary(a.modules) || 'No sections yet'}</small>
                  </div>
                  <div className="row gap">
                    <button className="btn ghost" onClick={() => { setEdit(a); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                    {a.id !== me.id && <button className="btn ghost" onClick={() => remove(a)}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
