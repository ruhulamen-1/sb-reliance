import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useRemembered } from '../remember';
import { useCan } from '../perm';

// Admin > Payroll > Attendance: daily entry (status, in/out, OT) and a month sheet.
// "Take from attendance" in Monthly payroll turns it into OT hours and unpaid leave.

type Row = Record<string, any>;
export const STATUS: [string, string][] = [
  ['P', 'Present'],
  ['A', 'Absent (unpaid)'],
  ['UL', 'Unpaid leave'],
  ['HL', 'Half day unpaid'],
  ['AL', 'Annual leave (paid)'],
  ['MC', 'Sick leave / MC (paid)'],
  ['PH', 'Public holiday'],
  ['RW', 'Worked on Sunday / PH (double pay)'],
  ['OFF', 'Rest day / off'],
];
const UNPAID: Record<string, number> = { A: 1, UL: 1, HL: 0.5 };
// "3.00" from the database -> 3, and 0 -> empty, so the OT box shows only real overtime
const tidy = (r: Row): Row => ({ ...r, ot_hours: Number(r.ot_hours) || '' });
const WORK = ['P', 'RW']; // statuses with working hours
const isSun = (d: string) => new Date(`${d}T00:00:00`).getDay() === 0;
const today = () => new Date().toISOString().slice(0, 10);
const shift = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dayName = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const monthName = (p: string) => new Date(`${p}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });

export default function Attendance() {
  const [mode, setMode] = useRemembered<'day' | 'person' | 'month'>('att.mode', 'day');
  const [date, setDate] = useRemembered('att.date', today());
  const [person, setPerson] = useRemembered<number>('att.person', 0);
  return (
    <>
      <div className="row gap att-modes">
        <button type="button" className={mode === 'day' ? 'btn' : 'btn ghost'} onClick={() => setMode('day')}>Daily entry</button>
        <button type="button" className={mode === 'person' ? 'btn' : 'btn ghost'} onClick={() => setMode('person')}>One employee, full month</button>
        <button type="button" className={mode === 'month' ? 'btn' : 'btn ghost'} onClick={() => setMode('month')}>Month sheet</button>
      </div>
      {mode === 'day' && <Day date={date} setDate={setDate} />}
      {mode === 'person' && <Person period={date.slice(0, 7)} setPeriod={(p) => setDate(`${p}-01`)} person={person} setPerson={setPerson} />}
      {mode === 'month' && (
        <MonthSheet period={date.slice(0, 7)} setPeriod={(p) => setDate(`${p}-01`)}
          openDay={(d) => { setDate(d); setMode('day'); }} openPerson={(id) => { setPerson(id); setMode('person'); }} />
      )}
      <Rules />
    </>
  );
}

function Day({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const canEdit = useCan()('pay.att.edit');
  const [emps, setEmps] = useState<Row[]>([]);
  const [recs, setRecs] = useState<Record<number, Row>>({});
  const [locked, setLocked] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const saved = useRef<Record<number, Row>>({}); // last values from the server, so a blur without a change saves nothing
  const load = useCallback(() => {
    setMsg('');
    api<{ employees: Row[]; records: Row[]; locked: number[] }>(`/admin/attendance?date=${date}`, { auth: true })
      .then((d) => { setEmps(d.employees); saved.current = Object.fromEntries(d.records.map((r) => [r.employee_id, tidy(r)])); setRecs(saved.current); setLocked(d.locked); })
      .catch((e: Error) => setMsg(e.message));
  }, [date]);
  useEffect(() => { load(); }, [load]);

  const edit = (id: number, patch: Row) => setRecs((x) => ({ ...x, [id]: { ...(x[id] || { employee_id: id, work_date: date }), ...patch } }));
  async function save(id: number, patch: Row = {}) {
    const r: Row = { ...(recs[id] || {}), ...patch, employee_id: id, work_date: date };
    if (!('status' in patch) && !r.status) r.status = 'P'; // typing a time or OT first means Present
    try {
      const out = await api<Row | null>('/admin/attendance', { method: 'PUT', auth: true, body: r });
      saved.current = { ...saved.current };
      if (out) saved.current[id] = tidy(out); else delete saved.current[id];
      // Take back only what this save changed, so typing in the next box of the row is not wiped out
      setRecs((x) => {
        const n = { ...x };
        if (!out) { delete n[id]; return n; }
        const fresh = tidy(out);
        const keep: Row = { ...(x[id] || {}), id: fresh.id, status: x[id]?.status || fresh.status };
        for (const k of ['status', ...Object.keys(patch)]) if (k in fresh && (k !== 'status' || 'status' in patch)) keep[k] = fresh[k];
        n[id] = keep;
        return n;
      });
    } catch (e) { setMsg((e as Error).message); load(); }
  }
  async function fill(status: string) {
    try {
      const d = await api<{ added: number }>('/admin/attendance/fill', { method: 'POST', auth: true, body: { date, status } });
      setMsg(d.added ? `${d.added} employee(s) marked ${STATUS.find(([v]) => v === status)?.[1]}.` : 'Everyone already has an entry for this day.');
      load();
    } catch (e) { setMsg((e as Error).message); }
  }

  const count = (s: string) => Object.values(recs).filter((r) => r.status === s).length;
  const missing = emps.filter((e) => e.active && !recs[e.id]).length;

  return (
    <>
      <div className="card pay-bar">
        <label>Date<input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        <button type="button" className="btn ghost" onClick={() => setDate(shift(date, -1))} aria-label="Previous day">‹ Prev</button>
        <button type="button" className="btn ghost" onClick={() => setDate(shift(date, 1))} aria-label="Next day">Next ›</button>
        {canEdit && <>
          <button type="button" className="btn" onClick={() => fill('P')} disabled={!missing}>Mark the rest Present</button>
          <button type="button" className="btn ghost" onClick={() => fill('PH')} disabled={!missing}>Public holiday for all</button>
          <button type="button" className="btn ghost" onClick={() => fill('OFF')} disabled={!missing}>Rest day for all</button>
        </>}
      </div>
      <p className="att-day"><strong>{dayName(date)}</strong> · Present {count('P')} · Absent / unpaid {count('A') + count('UL') + count('HL')} · Leave {count('AL') + count('MC')}{missing ? ` · ${missing} not entered` : ''}</p>
      {msg && <p className="ok" role="status">{msg}</p>}
      {!emps.length && <p>No active employees. Add them under "Employees".</p>}
      {emps.length > 0 && (
        <div className="pay-scroll">
          <table className="pay-table att-table mcards">
            <thead><tr><th>Employee</th><th>Status</th><th>Time in</th><th>Time out</th><th>OT hours</th><th>Note</th></tr></thead>
            <tbody>
              {emps.map((e) => {
                const r = recs[e.id] || {};
                const off = locked.includes(e.id) || !canEdit;
                const who = e.name;
                return (
                  <tr key={e.id} className={locked.includes(e.id) ? 'paid' : !r.status ? 'att-empty' : ''}>
                    <td className="full mhead"><strong>{e.name}</strong><small>{e.designation || ''}{locked.includes(e.id) ? ' · salary paid, locked' : ''}</small></td>
                    <td className="full" data-label="Status">
                      <select aria-label={`Status, ${who}`} disabled={off} value={r.status || ''} className={`att-s att-${r.status || 'none'}`}
                        onChange={(ev) => { const status = ev.target.value; edit(e.id, { status }); save(e.id, { status, ot_hours: WORK.includes(status) ? r.ot_hours ?? '' : 0 }); }}>
                        <option value="">— not entered —</option>
                        {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    {(['time_in', 'time_out'] as const).map((k) => (
                      <td key={k} data-label={k === 'time_in' ? 'Time in' : 'Time out'}>
                        <input type="time" aria-label={`${k === 'time_in' ? 'Time in' : 'Time out'}, ${who}`} disabled={off} value={r[k] || ''}
                          onChange={(ev) => edit(e.id, { [k]: ev.target.value })}
                          onBlur={(ev) => { if (ev.target.value !== (saved.current[e.id]?.[k] || '')) save(e.id, { [k]: ev.target.value, ot_hours: '' }); }} />
                      </td>
                    ))}
                    <td data-label="OT hours">
                      <input type="number" min={0} max={24} step="0.5" aria-label={`OT hours, ${who}`} disabled={off} value={r.ot_hours ?? ''} placeholder="0"
                        onChange={(ev) => edit(e.id, { ot_hours: ev.target.value })} onBlur={(ev) => { if (Number(ev.target.value || 0) !== Number(saved.current[e.id]?.ot_hours || 0)) save(e.id, { ot_hours: ev.target.value || 0 }); }} />
                    </td>
                    <td data-label="Note">
                      <input type="text" maxLength={120} aria-label={`Note, ${who}`} disabled={off} value={r.note || ''}
                        onChange={(ev) => edit(e.id, { note: ev.target.value })} onBlur={(ev) => { if (r.status && ev.target.value !== (saved.current[e.id]?.note || '')) save(e.id); }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="pay-hint">Choose a status for each employee; it saves straight away. Times are optional: with Time in and Time out, OT is worked out as the hours after the break and the normal day (see "Attendance rules" below), rounded down to the half hour. You can type the OT hours yourself instead. Work on a rest day or public holiday: mark Present and enter the hours as OT, or pay it as an allowance in the month.</p>
    </>
  );
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Same rule as the server (server/src/attendance.ts), to preview OT before saving */
function previewOt(d: Row, cfg: Row) {
  if (!WORK.includes(d.status) || !d.time_in || !d.time_out) return 0;
  let worked = mins(d.time_out) - mins(d.time_in);
  if (worked <= 0) worked += 24 * 60;
  const ot = worked / 60 - Number(cfg.break_hours) - Number(cfg.day_hours);
  return ot > 0 ? Math.floor(ot * 2) / 2 : 0;
}

// One employee, every day of the month on one page, saved together with "Save month"
function Person({ period, setPeriod, person, setPerson }: { period: string; setPeriod: (p: string) => void; person: number; setPerson: (id: number) => void }) {
  const canEdit = useCan()('pay.att.edit');
  const [emps, setEmps] = useState<Row[]>([]);
  const [days, setDays] = useState<Row[]>([]);
  const [paidLock, setLocked] = useState(false);
  const locked = paidLock || !canEdit; // inputs off: salary paid, or this account may only look
  const [cfg, setCfg] = useState<Row>({ week: '6', day_hours: 8, break_hours: 1 });
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [tin, setTin] = useState('08:00');
  const [tout, setTout] = useState('17:00');

  useEffect(() => {
    api<{ employees: Row[] }>(`/admin/attendance/month?period=${period}`, { auth: true })
      .then((d) => { setEmps(d.employees); if (!person && d.employees[0]) setPerson(d.employees[0].id); })
      .catch((e: Error) => setMsg(e.message));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const blank = useCallback((records: Row[]) => {
    const [y, m] = period.split('-').map(Number);
    const by = new Map(records.map((r) => [r.work_date, r]));
    return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => {
      const work_date = `${period}-${String(i + 1).padStart(2, '0')}`;
      const r = by.get(work_date);
      return { work_date, status: r?.status || '', time_in: r?.time_in || '', time_out: r?.time_out || '', ot_hours: r ? Number(r.ot_hours) || '' : '', note: r?.note || '' };
    });
  }, [period]);

  const load = useCallback(() => {
    if (!person) return;
    setMsg('');
    api<{ records: Row[]; locked: boolean; config: Row }>(`/admin/attendance/employee?employee_id=${person}&period=${period}`, { auth: true })
      .then((d) => { setDays(blank(d.records)); setLocked(d.locked); setCfg(d.config); setDirty(false); })
      .catch((e: Error) => setMsg(e.message));
  }, [person, period, blank]);
  useEffect(() => { load(); }, [load]);

  const wd = (d: string) => new Date(`${d}T00:00:00`).getDay(); // 0 = Sunday
  const set = (i: number, patch: Row) => { setDays((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x))); setDirty(true); };
  const each = (f: (d: Row) => Row | null) => { setDays((xs) => xs.map((x) => f(x) || x)); setDirty(true); };
  // Present on working days, rest day on Sundays (and on Saturdays for a 5-day week)
  const usual = (d: string) => (wd(d) === 0 || (wd(d) === 6 && cfg.week === '5') ? 'OFF' : 'P');
  const fillEmpty = () => each((d) => (d.status ? null : { ...d, status: usual(d.work_date) }));
  const fillAll = () => { if (confirm('Replace every day of the month with Present / Rest day?')) each((d) => ({ ...d, status: usual(d.work_date), time_in: '', time_out: '', ot_hours: '', note: '' })); };
  const sameTimes = () => each((d) => (WORK.includes(d.status) ? { ...d, time_in: tin, time_out: tout, ot_hours: '' } : null));
  const clearAll = () => { if (confirm('Clear the whole month for this employee? (Saved only when you press Save month)')) each((d) => ({ ...d, status: '', time_in: '', time_out: '', ot_hours: '', note: '' })); };

  async function saveMonth() {
    try {
      const d = await api<{ saved: number; cleared: number; records: Row[] }>('/admin/attendance/employee', { method: 'PUT', auth: true, body: { employee_id: person, period, days } });
      setDays(blank(d.records)); setDirty(false);
      setMsg(`Saved ${d.saved} day(s) for ${emps.find((e) => e.id === person)?.name || 'the employee'}.`);
    } catch (e) { setMsg((e as Error).message); }
  }
  function pick(id: number) {
    if (dirty && !confirm('You have changes that are not saved. Leave without saving?')) return;
    setPerson(id);
  }

  const ot = (d: Row) => (d.ot_hours === '' ? previewOt(d, cfg) : Number(d.ot_hours));
  const tot = { P: 0, rest: 0, unpaid: 0, leave: 0, ot: 0, empty: 0 };
  for (const d of days) {
    if (d.status === 'RW' || (d.status === 'P' && isSun(d.work_date))) tot.rest++;
    else if (d.status === 'P') tot.P++;
    if (d.status === 'AL' || d.status === 'MC') tot.leave++;
    if (!d.status) tot.empty++;
    tot.unpaid += UNPAID[d.status] || 0;
    tot.ot += ot(d) || 0;
  }
  const saveBtn = canEdit && <button type="button" className="btn" onClick={saveMonth} disabled={locked || !dirty}>{dirty ? 'Save month' : 'Saved'}</button>;

  return (
    <>
      <div className="card pay-bar">
        <label>Employee
          <select value={person || ''} onChange={(e) => pick(Number(e.target.value))}>
            {emps.map((e) => <option key={e.id} value={e.id}>{e.name}{e.active ? '' : ' (inactive)'}</option>)}
          </select>
        </label>
        <label>Month<input type="month" value={period} onChange={(e) => e.target.value && (!dirty || confirm('Leave without saving?')) && setPeriod(e.target.value)} /></label>
        {saveBtn}
      </div>
      {paidLock && <p className="err">The salary for {monthName(period)} is marked paid, so this month is locked. Mark it unpaid in Monthly payroll to change it.</p>}
      {!locked && (
        <div className="card pay-bar att-quick">
          <button type="button" className="btn ghost" onClick={fillEmpty} disabled={!tot.empty}>Fill empty days: Present, Sundays rest day</button>
          <button type="button" className="btn ghost" onClick={fillAll}>Reset whole month to Present</button>
          <label>Time in<input type="time" value={tin} onChange={(e) => setTin(e.target.value)} /></label>
          <label>Time out<input type="time" value={tout} onChange={(e) => setTout(e.target.value)} /></label>
          <button type="button" className="btn ghost" onClick={sameTimes} disabled={!tot.P}>Use these times on all Present days</button>
          <button type="button" className="btn ghost" onClick={clearAll}>Clear month</button>
        </div>
      )}
      <p className="att-day"><strong>{monthName(period)}</strong> · Present {tot.P} · Sunday/PH worked {tot.rest} · Unpaid days {tot.unpaid} · Paid leave {tot.leave} · OT {tot.ot} h{tot.empty ? ` · ${tot.empty} day(s) not entered` : ''}{dirty && <strong className="att-dirty"> · Not saved yet</strong>}</p>
      {msg && <p className="ok" role="status">{msg}</p>}
      <div className="pay-scroll">
        <table className="pay-table att-table mcards">
          <thead><tr><th>Date</th><th>Status</th><th>Time in</th><th>Time out</th><th>OT hours</th><th>Note</th></tr></thead>
          <tbody>
            {days.map((d, i) => {
              const label = dayName(d.work_date);
              return (
                <tr key={d.work_date} className={wd(d.work_date) === 0 ? 'att-sun' : !d.status ? 'att-empty' : ''}>
                  <td className="mhead m-date"><strong>{Number(d.work_date.slice(8))}</strong> <small>{new Date(`${d.work_date}T00:00:00`).toLocaleDateString('en-SG', { weekday: 'short' })}</small></td>
                  <td data-label="Status">
                    <select aria-label={`Status, ${label}`} disabled={locked} value={d.status} className={`att-s att-${d.status || 'none'}`}
                      onChange={(e) => set(i, { status: e.target.value, ...(WORK.includes(e.target.value) ? {} : { time_in: '', time_out: '', ot_hours: '' }) })}>
                      <option value="">— not entered —</option>
                      {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td data-label="Time in"><input type="time" aria-label={`Time in, ${label}`} disabled={locked || !WORK.includes(d.status)} value={d.time_in} onChange={(e) => set(i, { time_in: e.target.value, ot_hours: '' })} /></td>
                  <td data-label="Time out"><input type="time" aria-label={`Time out, ${label}`} disabled={locked || !WORK.includes(d.status)} value={d.time_out} onChange={(e) => set(i, { time_out: e.target.value, ot_hours: '' })} /></td>
                  <td data-label="OT hours"><input type="number" min={0} max={24} step="0.5" aria-label={`OT hours, ${label}`} disabled={locked || !WORK.includes(d.status)} value={d.ot_hours}
                    placeholder={previewOt(d, cfg) ? String(previewOt(d, cfg)) : '0'} onChange={(e) => set(i, { ot_hours: e.target.value })} /></td>
                  <td data-label="Note"><input type="text" maxLength={120} aria-label={`Note, ${label}`} disabled={locked || !d.status} value={d.note} onChange={(e) => set(i, { note: e.target.value })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="row gap att-save">{saveBtn}</p>
      {canEdit && <p className="pay-hint">Fill the month in a few clicks: "Fill empty days" marks working days Present and Sundays as rest days, then change the days the employee was absent or on leave. Give the usual times once and press "Use these times on all Present days" to work out OT from them, or type the OT hours on the days with overtime. Nothing is saved until you press "Save month".</p>}
    </>
  );
}

function MonthSheet({ period, setPeriod, openDay, openPerson }: { period: string; setPeriod: (p: string) => void; openDay: (d: string) => void; openPerson: (id: number) => void }) {
  const [data, setData] = useState<{ employees: Row[]; records: Row[]; working_days: number } | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setMsg('');
    api<{ employees: Row[]; records: Row[]; working_days: number }>(`/admin/attendance/month?period=${period}`, { auth: true })
      .then(setData).catch((e: Error) => setMsg(e.message));
  }, [period]);

  const [y, m] = period.split('-').map(Number);
  const days = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${period}-${String(i + 1).padStart(2, '0')}`);
  const at = new Map((data?.records || []).map((r) => [`${r.employee_id}|${r.work_date}`, r]));

  return (
    <>
      <div className="card pay-bar">
        <label>Month<input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} /></label>
        {data && <span>{monthName(period)}: {data.working_days} working days (for the unpaid-day rate)</span>}
      </div>
      {msg && <p className="ok" role="status">{msg}</p>}
      {data && (
        <div className="pay-scroll">
          <table className="att-sheet">
            <thead>
              <tr>
                <th>Employee</th>
                {days.map((d) => {
                  const wd = new Date(`${d}T00:00:00`).getDay();
                  return <th key={d} className={wd === 0 ? 'sun' : ''}><button type="button" onClick={() => openDay(d)} title={`Open ${dayName(d)}`}>{Number(d.slice(8))}<small>{'SMTWTFS'[wd]}</small></button></th>;
                })}
                <th>Present</th><th>Sun/PH worked</th><th>Unpaid days</th><th>Paid leave</th><th>OT hours</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e) => {
                let present = 0, rest = 0, unpaid = 0, leave = 0, ot = 0;
                return (
                  <tr key={e.id}>
                    <td><button type="button" className="linkish" onClick={() => openPerson(e.id)} title="Enter this employee's whole month">{e.name}</button></td>
                    {days.map((d) => {
                      const r = at.get(`${e.id}|${d}`);
                      if (r) {
                        if (r.status === 'RW' || (r.status === 'P' && isSun(d))) rest++;
                        else if (r.status === 'P') present++;
                        if (r.status === 'AL' || r.status === 'MC') leave++;
                        unpaid += UNPAID[r.status] || 0;
                        ot += Number(r.ot_hours || 0);
                      }
                      return <td key={d} className={r ? `att-${r.status}` : ''} title={r ? `${STATUS.find(([v]) => v === r.status)?.[1]}${Number(r.ot_hours) ? `, OT ${r.ot_hours} h` : ''}` : 'Not entered'}>{r ? r.status : '·'}{r && Number(r.ot_hours) > 0 && <sup>+{Number(r.ot_hours)}</sup>}</td>;
                    })}
                    <td>{present}</td><td>{rest}</td><td>{unpaid}</td><td>{leave}</td><td>{ot}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="pay-hint">P Present · A Absent · UL Unpaid leave · HL Half day unpaid · AL Annual leave · MC Sick leave · PH Public holiday · OFF Rest day · RW Worked on Sunday / PH (paid double; Present on a Sunday counts the same). Small number = OT hours. Click a date to edit that day, or a name to enter that employee's whole month. When the month is done, go to "Monthly payroll" and press "Take days, OT and leave from attendance".</p>
    </>
  );
}

export function Rules() {
  const canConfig = useCan()('pay.config');
  const [cfg, setCfg] = useState<Row | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api<Row>('/admin/payroll-config', { auth: true }).then(setCfg).catch(() => undefined); }, []);
  if (!cfg) return null;
  async function save() {
    try { setCfg(await api<Row>('/admin/payroll-config', { method: 'PUT', auth: true, body: cfg })); setMsg('Saved.'); } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <details className="card att-rules">
      <summary>Attendance rules</summary>
      <div className="pay-bar">
        <label>Work week
          <select disabled={!canConfig} value={cfg.week} onChange={(e) => setCfg({ ...cfg, week: e.target.value })}>
            <option value="6">6 days (Mon–Sat)</option>
            <option value="5.5">5½ days (Mon–Fri + half Sat)</option>
            <option value="5">5 days (Mon–Fri)</option>
          </select>
        </label>
        <label>Normal hours a day<input disabled={!canConfig} type="number" min={1} max={12} step="0.5" value={cfg.day_hours} onChange={(e) => setCfg({ ...cfg, day_hours: e.target.value })} /></label>
        <label>Unpaid break (hours)<input disabled={!canConfig} type="number" min={0} max={4} step="0.25" value={cfg.break_hours} onChange={(e) => setCfg({ ...cfg, break_hours: e.target.value })} /></label>
        {canConfig && <button type="button" className="btn" onClick={save}>Save rules</button>}
        {msg && <span role="status">{msg}</span>}
      </div>
      <p className="pay-hint">Unpaid day deduction (MOM rule for days not worked) = (basic + fixed allowance) ÷ working days in the month × unpaid days. Working days count Monday–Saturday for a 6-day week (Saturday as half for 5½ days); Sundays are rest days. Absent and Unpaid leave count 1 day, Half day unpaid 0.5. Paid leave, MC and public holidays are not deducted.</p>
    </details>
  );
}
