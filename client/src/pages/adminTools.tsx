// Helpers for the Admin pages: a text box with a small writing toolbar and live preview, and automatic drafts.
import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../api';

// ---- drafts: what you type is kept in this browser until it is saved, so a refresh or closed tab loses nothing ----
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

/** A saved draft. `stale` means the item was changed (here or on another device) after the draft was started. */
export function loadDraft<T extends object>(key: string, base: object): { value: Partial<T>; stale: boolean } | null {
  const raw = store.get(key);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.value || typeof d.value !== 'object') return null;
    return { value: d.value, stale: JSON.stringify(d.base) !== JSON.stringify(base) };
  } catch { return null; }
}
export const clearDraft = (key: string) => store.del(key);

/** Keeps `value` as a draft while it differs from `base`. Returns the time of the last draft save. */
export function useAutoDraft(key: string | null, value: object | null, base: object | null): string {
  const [at, setAt] = useState('');
  useEffect(() => {
    if (!key || !value || !base) return;
    const t = setTimeout(() => {
      if (JSON.stringify(value) === JSON.stringify(base)) { store.del(key); setAt(''); return; }
      store.set(key, JSON.stringify({ base, value }));
      setAt(new Intl.DateTimeFormat('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).format(new Date()));
    }, 700);
    return () => clearTimeout(t);
  }, [key, value, base]);
  return at;
}

export function DraftNote({ restored, savedAt, onDiscard, stale, onLoadStale }: {
  restored: boolean; savedAt: string; onDiscard: () => void; stale?: boolean; onLoadStale?: () => void;
}) {
  if (stale) {
    return (
      <p className="draftnote full" role="status">
        An older unsaved draft exists, but this was saved again after you started it, so the draft was <strong>not</strong> applied (it would overwrite the newer text).{' '}
        <button type="button" className="linklike" onClick={onLoadStale}>Load the old draft anyway</button>{' · '}
        <button type="button" className="linklike" onClick={onDiscard}>Discard it</button>
      </p>
    );
  }
  if (!restored && !savedAt) return null;
  return (
    <p className="draftnote full" role="status">
      {restored ? 'Your unsaved draft was restored.' : `Draft saved at ${savedAt}.`} It is kept in this browser until you save.{' '}
      <button type="button" className="linklike" onClick={onDiscard}>Discard draft</button>
    </p>
  );
}

// ---- text box with a writing toolbar ----
// The site stores text as plain lines (one paragraph per line, "# " heading, "A | B" columns), which Google can read.
function Preview({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return <p className="prev-empty">Nothing to preview yet.</p>;
  return (
    <div className="prev">
      {lines.map((l, i) => {
        if (l.startsWith('# ')) return <h4 key={i}>{l.slice(2)}</h4>;
        if (l.includes('|')) {
          const [a, ...b] = l.split('|');
          return <div key={i} className="prev-row"><strong>{a.trim()}</strong><span>{b.join('|').trim()}</span></div>;
        }
        return <p key={i}>{l}</p>;
      })}
    </div>
  );
}

export function TextBox({ value, onChange, rows = 4, required, max }: {
  value: string; onChange: (v: string) => void; rows?: number; required?: boolean; max?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState(false);

  function lineRange(el: HTMLTextAreaElement) {
    const start = value.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const nl = value.indexOf('\n', el.selectionEnd);
    return [start, nl === -1 ? value.length : nl] as const;
  }
  function heading() {
    const el = ref.current; if (!el) return;
    const [s, e] = lineRange(el);
    const block = value.slice(s, e).split('\n');
    const all = block.every((l) => l.startsWith('# ') || !l.trim());
    const out = block.map((l) => (!l.trim() ? l : all ? l.slice(2) : l.startsWith('# ') ? l : `# ${l}`)).join('\n');
    onChange(value.slice(0, s) + out + value.slice(e));
    el.focus();
  }
  function bar() {
    const el = ref.current; if (!el) return;
    const p = el.selectionStart;
    onChange(`${value.slice(0, p)} | ${value.slice(el.selectionEnd)}`);
    setTimeout(() => { el.focus(); el.setSelectionRange(p + 3, p + 3); }, 0);
  }
  const over = max !== undefined && value.length > max;

  return (
    <span className="tbox">
      <span className="tbar">
        <button type="button" onClick={heading} title="Turn the line into a heading (adds # at the start)">Heading</button>
        <button type="button" onClick={bar} title="Insert a divider ( | ) between two columns">Column |</button>
        <button type="button" className={view ? 'on' : ''} onClick={() => setView(!view)}>{view ? 'Edit' : 'Preview'}</button>
        <small className={over ? 'over' : ''}>{value.length}{max ? ` / ${max}` : ''} characters</small>
      </span>
      {view
        ? <Preview text={value} />
        : <textarea ref={ref} rows={rows} required={required} value={value} onChange={(e) => onChange(e.target.value)} />}
    </span>
  );
}

// ---- version history ----
type Version = { id: number; created_at: string; label: string; changed: string[] };
const when = (iso: string) => new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' }).format(new Date(iso));

/** List of earlier saved versions with a Restore button. `listPath` and `restorePath(id)` are admin API paths. */
export function VersionList({ listPath, restorePath, onRestored, empty = 'No earlier versions yet. One is kept each time you save a change.' }: {
  listPath: string; restorePath: (id: number) => string; onRestored: () => void; empty?: string;
}) {
  const [rows, setRows] = useState<Version[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(0);
  useEffect(() => { api<Version[]>(listPath, { auth: true }).then(setRows).catch((e: Error) => setErr(e.message)); }, [listPath]);
  async function restore(v: Version) {
    if (!confirm(`Restore the version from ${when(v.created_at)}? The current text is kept in the history, so you can undo this.`)) return;
    setBusy(v.id); setErr('');
    try { await api(restorePath(v.id), { method: 'POST', auth: true, body: {} }); onRestored(); } catch (e) { setErr((e as Error).message); } finally { setBusy(0); }
  }
  if (err) return <p className="err">{err}</p>;
  if (!rows) return <p>Loading…</p>;
  if (!rows.length) return <p className="prev-empty">{empty}</p>;
  return (
    <ul className="versions">
      {rows.map((v) => (
        <li key={v.id}>
          <div><strong>{when(v.created_at)}</strong><small>{v.label}{v.changed.length ? ` · differs in: ${v.changed.join(', ')}` : ''}</small></div>
          <button type="button" className="btn ghost" disabled={busy === v.id} onClick={() => restore(v)}>Restore</button>
        </li>
      ))}
    </ul>
  );
}

// ---- how the page will look in Google ----
export function SnippetPreview({ title, description, path }: { title: string; description: string; path: string }) {
  const t = (title || 'Page title').trim();
  const d = (description || '').trim();
  return (
    <div className="snippet full" aria-label="Preview in Google">
      <small>Preview in Google (approximate)</small>
      <div className="snip-url">{location.host}{path}</div>
      <div className="snip-title">{t.length > 60 ? `${t.slice(0, 58)}…` : t}</div>
      <div className="snip-desc">{d ? (d.length > 160 ? `${d.slice(0, 158)}…` : d) : 'No description: Google picks text from the page.'}</div>
    </div>
  );
}

// ---- redirects ----
type Redirect = { id: number; from_path: string; to_path: string };
export function Redirects() {
  const [rows, setRows] = useState<Redirect[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [err, setErr] = useState('');
  const load = () => api<Redirect[]>('/admin/redirects', { auth: true }).then(setRows).catch((e: Error) => setErr(e.message));
  useEffect(() => { load(); }, []);
  async function add(e: FormEvent) {
    e.preventDefault(); setErr('');
    try { await api('/admin/redirects', { method: 'POST', auth: true, body: { from_path: from, to_path: to } }); setFrom(''); setTo(''); load(); } catch (x) { setErr((x as Error).message); }
  }
  return (
    <>
      <form className="form card" onSubmit={add}>
        <label>Old address<small>e.g. /services/aircon-installation-singapore-2</small><input required value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Send visitors and Google to<small>e.g. /services/aircon-installation-singapore</small><input required value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {err && <p className="err full">{err}</p>}
        <div className="full"><button className="btn">Add redirect</button></div>
      </form>
      {!rows.length && <p className="prev-empty">No redirects yet. When you change a page address in Services, Blog or Gallery, the old address is added here automatically.</p>}
      {rows.map((r) => (
        <div key={r.id} className="card row between">
          <div><code>{r.from_path}</code> → <code>{r.to_path}</code></div>
          <button className="btn ghost" onClick={async () => { await api(`/admin/redirects/${r.id}`, { method: 'DELETE', auth: true }); load(); }}>Delete</button>
        </div>
      ))}
    </>
  );
}
