import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Payroll from './Payroll';

type Row = Record<string, any>;
const STATUSES = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'];

async function toDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Could not read the file'));
    r.readAsDataURL(file);
  });
  if (file.type === 'image/gif' || file.size < 300_000) return raw;
  // shrink photos to max 1600px WebP so pages load fast on phones
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const webp = c.toDataURL('image/webp', 0.82);
  // very old browsers cannot write WebP and return PNG instead; fall back to JPEG / PNG then
  return webp.startsWith('data:image/webp') ? webp : c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function pick(file?: File) {
    if (!file) return;
    setErr('');
    setBusy(true);
    try {
      const data = await toDataUrl(file);
      const { url } = await api<{ url: string }>('/admin/upload', { method: 'POST', auth: true, body: { data } });
      onChange(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="full imgfield">
      <span>{label}</span>
      {value && <img src={value} alt="" className="thumb" />}
      <div className="row gap">
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => pick(e.target.files?.[0])} />
        {value && <button type="button" className="btn ghost" onClick={() => onChange('')}>Remove image</button>}
      </div>
      {busy && <small>Uploading…</small>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const { token } = await api<{ token: string }>('/auth/login', { method: 'POST', body: { email, password } });
      localStorage.setItem('token', token);
      onDone();
    } catch (x) {
      setErr((x as Error).message);
    }
  }
  return (
    <form className="login card" onSubmit={submit}>
      <h2>Admin sign in</h2>
      <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {err && <p className="err">{err}</p>}
      <button className="btn">Sign in</button>
    </form>
  );
}

function Overview() {
  const [s, setS] = useState<{ byStatus: { status: string; count: number }[]; revenue: number } | null>(null);
  useEffect(() => { api('/admin/stats', { auth: true }).then(setS).catch(() => undefined); }, []);
  if (!s) return <p>Loading…</p>;
  const n = (st: string) => s.byStatus.find((x) => x.status === st)?.count ?? 0;
  return (
    <div className="grid3 stats">
      {STATUSES.map((st) => (<div key={st} className="card"><small>{st}</small><strong>{n(st)}</strong></div>))}
      <div className="card"><small>Completed revenue (SGD)</small><strong>{s.revenue.toLocaleString()}</strong></div>
    </div>
  );
}

function Quotes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('');
  const load = useCallback(() => api<Row[]>(`/admin/quotes${filter ? `?status=${filter}` : ''}`, { auth: true }).then(setRows), [filter]);
  useEffect(() => { load().catch(() => undefined); }, [load]);

  async function save(r: Row, patch: Row) {
    const next = { ...r, ...patch };
    await api(`/admin/quotes/${r.id}`, { method: 'PATCH', auth: true, body: { status: next.status, quoted_amount: next.quoted_amount === '' ? null : next.quoted_amount, notes: next.notes } });
    load();
  }
  const edit = (id: number, patch: Row) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <>
      <div className="row gap">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {rows.length === 0 && <p>No quote requests yet.</p>}
      {rows.map((r) => {
        const addons: string[] = Array.isArray(r.addons) ? r.addons : [];
        return (
          <div key={r.id} className="card qrow">
            <div>
              <h3>{r.name} <small>{new Date(r.created_at).toLocaleString('en-SG')}</small></h3>
              <p><a href={`https://wa.me/${String(r.whatsapp).replace(/\D/g, '')}`}>{r.whatsapp}</a>{r.email && <> · <a href={`mailto:${r.email}`}>{r.email}</a></>}{r.address !== '-' && ` · ${r.address}`}</p>
              <p>{r.house_type === '-' ? r.service_type : `${r.house_type} · ${r.service_type}`}{addons.length ? ` · ${addons.join(', ')}` : ''}</p>
              {r.preferred_date && <p>Preferred: {String(r.preferred_date).slice(0, 10)}</p>}
              {r.message && <p>“{r.message}”</p>}
            </div>
            <div className="qctl">
              <select value={r.status} onChange={(e) => save(r, { status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              <input type="number" placeholder="Quoted amount" value={r.quoted_amount ?? ''} onChange={(e) => edit(r.id, { quoted_amount: e.target.value })} onBlur={() => save(r, {})} />
              <textarea rows={2} placeholder="Internal notes" value={r.notes ?? ''} onChange={(e) => edit(r.id, { notes: e.target.value })} onBlur={() => save(r, {})} />
              <button className="btn ghost" onClick={async () => { if (confirm('Delete this request?')) { try { await api(`/admin/quotes/${r.id}`, { method: 'DELETE', auth: true }); load(); } catch (x) { alert((x as Error).message); } } }}>Delete</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

type CrudField = { key: string; label: string; area?: boolean; num?: boolean; image?: boolean; required?: boolean; optional?: boolean; hint?: string; options?: [string, string][]; date?: boolean };
// Testimonials: the /review link to send customers after a job
function ReviewLink() {
  const url = `${location.origin}/review`;
  const [copied, setCopied] = useState(false);
  const msg = `Hi, thank you for choosing us. Could you take a minute to tell us how the job went? ${url}`;
  return (
    <div className="card review-link">
      <strong>Ask a customer for a review</strong>
      <p>Send this link after a job. New reviews arrive here as "Waiting for approval"; edit one and choose "Yes, show it" to put it on the website.</p>
      <code>{url}</code>
      <div className="row gap">
        <button type="button" className="btn" onClick={() => { navigator.clipboard?.writeText(msg).then(() => setCopied(true)).catch(() => undefined); }}>{copied ? 'Copied' : 'Copy message'}</button>
        <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
      </div>
    </div>
  );
}

export function Crud({ table, fields }: { table: string; fields: CrudField[] }) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, f.options ? f.options[0][0] : f.num ? 0 : '']));
  const textKey = fields.find((f, i) => i > 0 && !f.image)?.key;
  const [rows, setRows] = useState<Row[]>([]);
  const [addForm, setAddForm] = useState<Row>(blank);
  const [editForm, setEditForm] = useState<Row>(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [addErr, setAddErr] = useState('');
  const [editErr, setEditErr] = useState('');
  const dlg = useRef<HTMLDialogElement>(null);
  const load = useCallback(() => api<Row[]>(`/admin/${table}`, { auth: true }).then(setRows), [table]);
  useEffect(() => { load().catch(() => undefined); }, [load]);

  async function save(e: FormEvent, isEdit: boolean) {
    e.preventDefault();
    const form = isEdit ? editForm : addForm;
    const setErr = isEdit ? setEditErr : setAddErr;
    setErr('');
    const missing = fields.find((f) => f.image && f.required && !form[f.key]);
    if (missing) return setErr(`Please upload: ${missing.label}`);
    try {
      await api(isEdit ? `/admin/${table}/${editId}` : `/admin/${table}`, { method: isEdit ? 'PUT' : 'POST', auth: true, body: form });
      if (isEdit) dlg.current?.close(); else setAddForm(blank);
      load();
    } catch (x) { setErr((x as Error).message); }
  }

  // "Add" form stays at the top; "Edit" opens the same fields in a popup, so the page never scrolls or jumps
  const renderForm = (isEdit: boolean) => {
    const form = isEdit ? editForm : addForm;
    const setForm = isEdit ? setEditForm : setAddForm;
    const err = isEdit ? editErr : addErr;
    return (
      <form className="form card" onSubmit={(e) => save(e, isEdit)}>
        {isEdit && <h3 className="full">Edit</h3>}
        {fields.map((f) => f.image ? (
          <ImageField key={f.key} label={f.label} value={form[f.key] ?? ''} onChange={(v) => setForm({ ...form, [f.key]: v })} />
        ) : (
          <label key={f.key} className={f.area ? 'full' : ''}>{f.label}
            {f.hint && <small>{f.hint}</small>}
            {f.area
              ? <textarea rows={4} required={!f.optional} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              : f.options
                ? <select value={String(form[f.key] ?? f.options[0][0])} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                : <input required={!f.optional} type={f.num ? 'number' : f.date ? 'date' : 'text'} step={f.num ? 'any' : undefined} min={f.num ? 0 : undefined} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: f.num ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })} />}
          </label>
        ))}
        {err && <p className="err full">{err}</p>}
        <div className="row gap full">
          <button className="btn">{isEdit ? 'Save changes' : 'Add'}</button>
          {isEdit && <button type="button" className="btn ghost" onClick={() => dlg.current?.close()}>Cancel</button>}
        </div>
      </form>
    );
  };

  return (
    <>
      {renderForm(false)}
      <dialog ref={dlg} className="modal" aria-label="Edit" onClose={() => { setEditId(null); setEditForm(blank); setEditErr(''); }}
        onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        {editId !== null && renderForm(true)}
      </dialog>
      {rows.map((r) => (
        <div key={r.id} className="card row between">
          <div className="row gap crud-main">{r.image_url && <img src={r.image_url} alt="" className="thumb" />}<div><strong>{r[fields[0].key]}</strong>{r.status && r.status !== 'approved' && <span className={`tag ${r.status}`}>{r.status === 'pending' ? 'Waiting for approval' : 'Hidden'}</span>}{textKey && <p>{String(r[textKey] ?? '').slice(0, 120)}</p>}</div></div>
          <div className="row gap crud-actions">
            <button className="btn ghost" onClick={() => { setEditId(r.id); setEditForm(Object.fromEntries(fields.map((f) => [f.key, r[f.key]]))); dlg.current?.showModal(); }}>Edit</button>
            <button className="btn ghost" onClick={async () => { if (confirm(table === 'employees' ? 'Delete this employee? Their attendance and unpaid payroll lines are deleted too.' : 'Delete?')) { try { await api(`/admin/${table}/${r.id}`, { method: 'DELETE', auth: true }); load(); } catch (x) { alert((x as Error).message); } } }}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}

const SETTING_FIELDS: { key: string; label: string; area?: boolean; hint?: string; image?: boolean }[] = [
  { key: 'brand', label: 'Brand name (header)' },
  { key: 'logo', label: 'Logo (optional, replaces the default logo; square or transparent PNG works best)', image: true },
  { key: 'company_name', label: 'Company name (footer, page title)' },
  { key: 'phone', label: 'Phone (shown on site)' },
  { key: 'whatsapp', label: 'WhatsApp number (digits only, with country code)', hint: 'e.g. 6585334478' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'site_url', label: 'Website address (optional, e.g. https://sbreliance.com)', hint: 'Your own domain exactly as visitors type it, with https://. Used for Google, WhatsApp link previews and the sitemap. Leave empty to detect automatically. The SITE_URL environment variable overrides this.' },
  { key: 'seo_title', label: 'Google title for the home page', hint: 'About 50–60 characters: company name plus what you do.' },
  { key: 'seo_description', label: 'Google description for the home page', area: true, hint: 'About 140–160 characters. Shown under the title in Google results.' },
  { key: 'uen', label: 'UEN (company registration number, shown on site)' },
  { key: 'licenses', label: 'Licences, registrations and certifications (shown on site)', area: true, hint: 'One per line, only real ones, e.g. BCA registration, GST Reg No, bizSAFE level, brand authorisations.' },
  { key: 'service_area', label: 'Areas served (optional)', area: true, hint: 'One per line, e.g. Singapore, Jurong, Tampines. Empty means Singapore.' },
  { key: 'social_links', label: 'Social / Google reviews links (optional)', area: true, hint: 'One full link per line (https://...). Facebook, Instagram, LinkedIn, Google Business Profile.' },
  { key: 'open_hours', label: 'Opening hours (Singapore time, optional)', area: true, hint: 'One per line, e.g. Mon-Fri 09:00-18:00 and Sat 09:00-13:00. Shows a live "Open now" badge. Leave empty to hide it.' },
  { key: 'google_rating', label: 'Google rating (optional)', hint: 'Your real rating from Google Business Profile, e.g. 4.9. Shown under the hero and next to reviews. Empty hides it.' },
  { key: 'google_review_count', label: 'Number of Google reviews (optional)', hint: 'e.g. 37' },
  { key: 'google_reviews_url', label: 'Google reviews link (optional)', hint: 'The link to your Google Business Profile reviews (https://...). Adds a "Read all reviews on Google" button.' },
  { key: 'stats', label: 'Numbers to show (optional)', area: true, hint: 'One per line: Number | Label, e.g. 120+ | Projects completed. Only real figures. Empty hides the section.' },
  { key: 'warranty_title', label: 'Guarantee section title (optional)', hint: 'e.g. Our guarantee' },
  { key: 'warranty_text', label: 'Guarantee / warranty points (optional)', area: true, hint: 'One per line, only what you really offer, e.g. 12 months workmanship warranty. Empty hides the section.' },
  { key: 'quote_reply_time', label: 'Message after a quote is sent (optional)', hint: 'e.g. We reply on WhatsApp within 2 hours during opening hours.' },
  { key: 'notify_email', label: 'Email new quote requests to (optional)', hint: 'Needs the SMTP settings on the server (see DEPLOY.md). Requests are always saved in Admin > Quotes.' },
  { key: 'price_range', label: 'Price range for Google (optional)', hint: 'Shown to Google only, e.g. $$ or From $300. Leave empty if you prefer not to say.' },
  { key: 'ga_measurement_id', label: 'Google Analytics measurement ID (optional)', hint: 'From Google Analytics > Admin > Data streams > your website, e.g. G-AB12CD34EF. Empty turns Analytics off. Takes effect on the next page load.' },
  { key: 'hero_image', label: 'Hero image 1 (optional, replaces the service tiles)', image: true },
  { key: 'hero_image_2', label: 'Hero image 2 (optional, makes the hero a slider)', image: true },
  { key: 'hero_image_3', label: 'Hero image 3 (optional)', image: true },
  { key: 'hero_headlines', label: 'Slider headlines (optional)', area: true, hint: 'One per line, in slide order. Empty lines use the main headline.' },
  { key: 'page_bg', label: 'Hero background image (optional, shown very faded behind the top section of the home page)', image: true },
  { key: 'hero_title', label: 'Hero headline' },
  { key: 'hero_lead', label: 'Hero paragraph', area: true },
  { key: 'services_title', label: 'Services section title' },
  { key: 'why_title', label: 'Why-us section title' },
  { key: 'why_list', label: 'Why-us points', area: true, hint: 'One point per line' },
  { key: 'process_title', label: 'Process section title' },
  { key: 'steps', label: 'Process steps', area: true, hint: 'One per line: Title | Description' },
  { key: 'about_text', label: 'Footer "About us" text', area: true },
  { key: 'footer_bg', label: 'Footer background image (optional, shown faded)', image: true },
  { key: 'about_intro', label: 'About page intro', area: true, hint: 'One paragraph per line' },
  { key: 'about_image', label: 'About page image (optional)', image: true },
  { key: 'about_mission', label: 'About page mission', area: true },
  { key: 'about_vision', label: 'About page vision (optional)', area: true, hint: 'Where you want the company to be. Empty hides it.' },
  { key: 'about_values', label: 'About page values (optional)', area: true, hint: 'One per line: Title | Short explanation, e.g. Safety | Safe work practices on every site. Empty hides the section.' },
  { key: 'org_chart', label: 'Team page organisation chart (optional image)', image: true },
  { key: 'privacy_text', label: 'Privacy policy text', area: true, hint: 'One paragraph per line. A line starting with "# " becomes a heading.' },
  { key: 'quote_title', label: 'Quote form title' },
  { key: 'quote_intro', label: 'Quote form intro text', area: true },
  { key: 'property_types', label: 'Property types in quote form', area: true, hint: 'One per line' },
];

function Settings() {
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api<Record<string, string>>('/admin/settings', { auth: true }).then(setForm).catch((e: Error) => setMsg(e.message)); }, []);
  if (!form) return <p className={msg ? 'err' : ''}>{msg || 'Loading…'}</p>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api('/admin/settings', { method: 'PUT', auth: true, body: form });
      setMsg('Saved. Refresh the site to see the changes.');
    } catch (x) { setMsg((x as Error).message); }
  }
  return (
    <form className="form card" onSubmit={submit}>
      {SETTING_FIELDS.map((f) => f.image ? (
        <ImageField key={f.key} label={f.label} value={form[f.key] ?? ''} onChange={(v) => setForm({ ...form, [f.key]: v })} />
      ) : (
        <label key={f.key} className={f.area ? 'full' : ''}>{f.label}
          {f.hint && <small>{f.hint}</small>}
          {f.area
            ? <textarea rows={['hero_lead', 'quote_intro', 'seo_description'].includes(f.key) ? 3 : 6} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            : <input value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
        </label>
      ))}
      <button className="btn full">Save settings</button>
      {msg && <p className={`full ${msg.startsWith('Saved') ? 'ok' : 'err'}`}>{msg}</p>}
    </form>
  );
}

// One click: add back the company's standard services that are missing and fill empty service pages.
function StandardServices({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function run() {
    if (!confirm('Add any missing standard services (ACMV, aircon, electrical, CCTV, ceiling partition, painting, tiles, general building) and fill EMPTY service page text, FAQ and Google titles? Nothing you have written is changed or deleted.')) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await api<{ added: string[]; filled: string[] }>('/admin/services/standard', { method: 'POST', auth: true });
      setMsg([r.added.length ? `Added: ${r.added.join(', ')}.` : 'No services missing.', r.filled.length ? `Filled empty pages: ${r.filled.join(', ')}.` : 'No empty pages to fill.'].join(' '));
      onDone();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="card std-svc">
      <p><strong>Standard services</strong><br /><small>Adds back the services on the company card that are missing, with page text, FAQ and Google title, and fills empty pages of other services. Your own text is never changed.</small></p>
      <button type="button" className="btn" onClick={run} disabled={busy}>{busy ? 'Working…' : 'Add standard services and fill empty pages'}</button>
      {msg && <p className="ok" role="status">{msg}</p>}
    </div>
  );
}

const TABS = ['Overview', 'Quotes', 'Services', 'Blog', 'Gallery', 'Team', 'Testimonials', 'Payroll', 'Settings'] as const;
const INTRO: Record<(typeof TABS)[number], string> = {
  Overview: 'Quote requests by status and revenue from completed jobs.',
  Quotes: 'Requests sent from the website. Update the status, amount and notes as the job moves on.',
  Services: 'The services shown on the site, each with its own page for Google.',
  Blog: 'Articles that answer customer questions and bring visitors from Google.',
  Gallery: 'Finished projects shown in Portfolio and on the home page. The project name is also the photo description for Google.',
  Team: 'People shown on the About page.',
  Testimonials: 'Reviews from real customers. Send the review link after a job and approve new reviews before they show.',
  Payroll: 'Employees, daily attendance and the monthly salary run with payslips.',
  Settings: 'Company details, contact, Google and trust information used across the site.',
};

function tabFromHash() {
  const h = decodeURIComponent(location.hash.slice(1)).toLowerCase();
  return TABS.find((t) => t.toLowerCase() === h) ?? 'Overview';
}

export default function Admin() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'));
  // the open section lives in the address (#payroll), so a reload or Back stays on it
  const [tab, setTabState] = useState<(typeof TABS)[number]>(tabFromHash);
  const setTab = (t: (typeof TABS)[number]) => { setTabState(t); history.replaceState(null, '', `#${t.toLowerCase()}`); };
  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [stdKey, setStdKey] = useState(0);
  if (!authed) return <div className="wrap narrow"><Login onDone={() => setAuthed(true)} /></div>;
  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-inner">
          <div className="admin-top">
            <strong className="admin-brand">Management</strong>
            <div className="admin-links">
              <a href="/">View site</a>
              <button className="btn ghost" onClick={() => { localStorage.removeItem('token'); setAuthed(false); }}>Sign out</button>
            </div>
          </div>
          <nav className="tabs admin-tabs" aria-label="Management sections">
            {TABS.map((t) => <button key={t} className={t === tab ? 'on' : ''} aria-current={t === tab ? 'page' : undefined} onClick={() => { setTab(t); window.scrollTo({ top: 0 }); }}>{t}</button>)}
          </nav>
        </div>
      </header>
      <main className="admin-inner admin-body">
      <div className="admin-head">
        <h1>{tab}</h1>
        <p>{INTRO[tab]}</p>
      </div>
      {tab === 'Overview' && <Overview />}
      {tab === 'Quotes' && <Quotes />}
      {tab === 'Services' && <StandardServices onDone={() => setStdKey((k) => k + 1)} />}
      {tab === 'Services' && <Crud key={`svc-${stdKey}`} table="services" fields={[
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Short description (card and top of the service page)', area: true },
        { key: 'slug', label: 'Page address (optional)', optional: true, hint: 'e.g. aircon-installation-singapore → /services/aircon-installation-singapore. Empty = made from the title. Avoid changing it once Google has the page.' },
        { key: 'sort_order', label: 'Order', num: true },
        { key: 'content', label: 'Service page text (optional)', area: true, optional: true, hint: 'One paragraph per line. A line starting with "# " becomes a heading. Write what you do, for which properties and areas in Singapore.' },
        { key: 'faq', label: 'Questions and answers (optional)', area: true, optional: true, hint: 'One per line: Question | Answer. Shown on the page and to Google.' },
        { key: 'seo_title', label: 'Google title (optional)', optional: true, hint: 'About 50–60 characters, e.g. Aircon Installation Singapore – HDB & Condo | SB Reliance' },
        { key: 'seo_description', label: 'Google description (optional)', area: true, optional: true, hint: 'About 140–160 characters. Shown under the title in Google results.' },
        { key: 'image_url', label: 'Image', image: true },
      ]} />}
      {tab === 'Blog' && <Crud table="posts" fields={[{ key: 'title', label: 'Title' }, { key: 'slug', label: 'Page address (optional)', optional: true, hint: 'e.g. aircon-servicing-tips → /blog/aircon-servicing-tips. Empty = made from the title.' }, { key: 'excerpt', label: 'Excerpt', area: true }, { key: 'content', label: 'Content', area: true, hint: 'One paragraph per line. A line starting with "# " becomes a heading.' }, { key: 'image_url', label: 'Cover image', image: true }]} />}
      {tab === 'Gallery' && <Crud table="gallery" fields={[
        { key: 'title', label: 'Project name', hint: 'Say the work and the place type, e.g. Office ACMV installation, HDB 4-room aircon replacement' },
        { key: 'category', label: 'Category (optional, e.g. Aircon, ACMV, CCTV, Electrical)', optional: true, hint: 'Use a service name so the project links to that service page and shows there first.' },
        { key: 'location', label: 'Location (optional)', optional: true, hint: 'e.g. Jurong, Tampines HDB, Ubi office. Added to the page title: "Office ACMV installation, Jurong".' },
        { key: 'duration', label: 'Time taken (optional)', optional: true, hint: 'e.g. 1 day, 3 weeks' },
        { key: 'description', label: 'What we did (optional, needed for Google)', area: true, optional: true, hint: 'One paragraph per line: the problem, what we installed or fixed (brands, number of units), and the result. Google lists the project page only once this has at least 2–3 sentences.' },
        { key: 'slug', label: 'Page address (optional)', optional: true, hint: 'e.g. office-acmv-installation-jurong → /portfolio/office-acmv-installation-jurong. Empty = made from the name and location.' },
        { key: 'image_url', label: 'Photo (after / finished work)', image: true, required: true },
        { key: 'before_image_url', label: 'Before photo (optional, shows a before / after view)', image: true },
        { key: 'photo_2', label: 'More photo 1 (optional)', image: true },
        { key: 'photo_3', label: 'More photo 2 (optional)', image: true },
        { key: 'photo_4', label: 'More photo 3 (optional)', image: true },
      ]} />}
      {tab === 'Team' && <Crud table="team" fields={[{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role / title' }, { key: 'bio', label: 'Short bio (optional)', area: true, optional: true }, { key: 'sort_order', label: 'Order (smaller shows first)', num: true }, { key: 'image_url', label: 'Photo (optional)', image: true }]} />}
      {tab === 'Payroll' && <Payroll />}
      {tab === 'Settings' && <Settings />}
      {tab === 'Testimonials' && <ReviewLink />}
      {tab === 'Testimonials' && <Crud table="testimonials" fields={[
        { key: 'name', label: 'Name' },
        { key: 'text', label: 'Review', area: true },
        { key: 'location', label: 'Area (optional)', optional: true },
        { key: 'rating', label: 'Stars (1–5, optional)', num: true, optional: true },
        { key: 'source', label: 'Where is this review from?', options: [['website', 'Website / WhatsApp'], ['google', 'Google (copied from our Google Business Profile)']], hint: 'Choose Google only for reviews that are really on your Google profile. They show with the Google "G" mark.' },
        { key: 'review_date', label: 'Review date (optional)', date: true, optional: true, hint: 'The date shown on Google, so the site can say e.g. "3 months ago". Empty = the day it was added here.' },
        { key: 'status', label: 'Show on website?', options: [['approved', 'Yes, show it'], ['pending', 'Waiting for approval'], ['hidden', 'No, hide it']] },
      ]} />}
      </main>
    </div>
  );
}
