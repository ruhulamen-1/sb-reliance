import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api';

type Row = Record<string, any>;
const STATUSES = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'];

async function toDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Could not read the file'));
    r.readAsDataURL(file);
  });
  if (file.type === 'image/gif' || file.size < 1_500_000) return raw;
  // shrink large photos to max 1600px so uploads stay small
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
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
              <p><a href={`https://wa.me/${String(r.whatsapp).replace(/\D/g, '')}`}>{r.whatsapp}</a> · {r.address}</p>
              <p>{r.house_type} · {r.service_type}{addons.length ? ` · ${addons.join(', ')}` : ''}</p>
              {r.preferred_date && <p>Preferred: {String(r.preferred_date).slice(0, 10)}</p>}
              {r.message && <p>“{r.message}”</p>}
            </div>
            <div className="qctl">
              <select value={r.status} onChange={(e) => save(r, { status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              <input type="number" placeholder="Quoted amount" value={r.quoted_amount ?? ''} onChange={(e) => edit(r.id, { quoted_amount: e.target.value })} onBlur={() => save(r, {})} />
              <textarea rows={2} placeholder="Internal notes" value={r.notes ?? ''} onChange={(e) => edit(r.id, { notes: e.target.value })} onBlur={() => save(r, {})} />
              <button className="btn ghost" onClick={async () => { if (confirm('Delete this request?')) { await api(`/admin/quotes/${r.id}`, { method: 'DELETE', auth: true }); load(); } }}>Delete</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function Crud({ table, fields }: { table: string; fields: { key: string; label: string; area?: boolean; num?: boolean; image?: boolean; required?: boolean }[] }) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, f.num ? 0 : '']));
  const textKey = fields.find((f, i) => i > 0 && !f.image)?.key;
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api<Row[]>(`/admin/${table}`, { auth: true }).then(setRows), [table]);
  useEffect(() => { load().catch(() => undefined); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const missing = fields.find((f) => f.image && f.required && !form[f.key]);
    if (missing) return setErr(`Please upload: ${missing.label}`);
    try {
      await api(editId ? `/admin/${table}/${editId}` : `/admin/${table}`, { method: editId ? 'PUT' : 'POST', auth: true, body: form });
      setForm(blank); setEditId(null); load();
    } catch (x) { setErr((x as Error).message); }
  }

  return (
    <>
      <form className="form card" onSubmit={submit}>
        {fields.map((f) => f.image ? (
          <ImageField key={f.key} label={f.label} value={form[f.key] ?? ''} onChange={(v) => setForm({ ...form, [f.key]: v })} />
        ) : (
          <label key={f.key} className={f.area ? 'full' : ''}>{f.label}
            {f.area
              ? <textarea rows={4} required value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              : <input required type={f.num ? 'number' : 'text'} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: f.num ? Number(e.target.value) : e.target.value })} />}
          </label>
        ))}
        {err && <p className="err full">{err}</p>}
        <div className="row gap full">
          <button className="btn">{editId ? 'Save changes' : 'Add'}</button>
          {editId && <button type="button" className="btn ghost" onClick={() => { setEditId(null); setForm(blank); }}>Cancel</button>}
        </div>
      </form>
      {rows.map((r) => (
        <div key={r.id} className="card row between">
          <div className="row gap">{r.image_url && <img src={r.image_url} alt="" className="thumb" />}<div><strong>{r[fields[0].key]}</strong>{textKey && <p>{String(r[textKey] ?? '').slice(0, 120)}</p>}</div></div>
          <div className="row gap">
            <button className="btn ghost" onClick={() => { setEditId(r.id); setForm(Object.fromEntries(fields.map((f) => [f.key, r[f.key]]))); }}>Edit</button>
            <button className="btn ghost" onClick={async () => { if (confirm('Delete?')) { await api(`/admin/${table}/${r.id}`, { method: 'DELETE', auth: true }); load(); } }}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}

const SETTING_FIELDS: { key: string; label: string; area?: boolean; hint?: string; image?: boolean }[] = [
  { key: 'brand', label: 'Brand name (header)' },
  { key: 'company_name', label: 'Company name (footer, page title)' },
  { key: 'phone', label: 'Phone (shown on site)' },
  { key: 'whatsapp', label: 'WhatsApp number (digits only, with country code)', hint: 'e.g. 6585334478' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'hero_image', label: 'Hero image (optional, replaces the service tiles)', image: true },
  { key: 'page_bg', label: 'Page background image (optional, shown faded behind the whole page)', image: true },
  { key: 'hero_title', label: 'Hero headline' },
  { key: 'hero_lead', label: 'Hero paragraph', area: true },
  { key: 'services_title', label: 'Services section title' },
  { key: 'why_title', label: 'Why-us section title' },
  { key: 'why_list', label: 'Why-us points', area: true, hint: 'One point per line' },
  { key: 'process_title', label: 'Process section title' },
  { key: 'steps', label: 'Process steps', area: true, hint: 'One per line: Title | Description' },
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
            ? <textarea rows={f.key === 'hero_lead' || f.key === 'quote_intro' ? 3 : 6} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            : <input value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
        </label>
      ))}
      <button className="btn full">Save settings</button>
      {msg && <p className={`full ${msg.startsWith('Saved') ? 'ok' : 'err'}`}>{msg}</p>}
    </form>
  );
}

const TABS = ['Overview', 'Quotes', 'Services', 'Blog', 'Gallery', 'Testimonials', 'Settings'] as const;

export default function Admin() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'));
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  if (!authed) return <div className="wrap narrow"><Login onDone={() => setAuthed(true)} /></div>;
  return (
    <div className="wrap block">
      <div className="row between">
        <h1 className="h1s">Management</h1>
        <div className="row gap">
          <a href="/">View site</a>
          <button className="btn ghost" onClick={() => { localStorage.removeItem('token'); setAuthed(false); }}>Sign out</button>
        </div>
      </div>
      <nav className="tabs">{TABS.map((t) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</nav>
      {tab === 'Overview' && <Overview />}
      {tab === 'Quotes' && <Quotes />}
      {tab === 'Services' && <Crud table="services" fields={[{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', area: true }, { key: 'sort_order', label: 'Order', num: true }, { key: 'image_url', label: 'Image', image: true }]} />}
      {tab === 'Blog' && <Crud table="posts" fields={[{ key: 'title', label: 'Title' }, { key: 'slug', label: 'Slug' }, { key: 'excerpt', label: 'Excerpt', area: true }, { key: 'content', label: 'Content', area: true }, { key: 'image_url', label: 'Cover image', image: true }]} />}
      {tab === 'Gallery' && <Crud table="gallery" fields={[{ key: 'title', label: 'Caption' }, { key: 'image_url', label: 'Photo', image: true, required: true }]} />}
      {tab === 'Settings' && <Settings />}
      {tab === 'Testimonials' && <Crud table="testimonials" fields={[{ key: 'name', label: 'Name' }, { key: 'location', label: 'Area' }, { key: 'text', label: 'Review', area: true }]} />}
    </div>
  );
}
