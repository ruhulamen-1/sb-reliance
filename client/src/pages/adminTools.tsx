// Helpers for the Admin pages: a text box with a small writing toolbar and live preview, and automatic drafts.
import { useEffect, useRef, useState } from 'react';

// ---- drafts: what you type is kept in this browser until it is saved, so a refresh or closed tab loses nothing ----
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export function loadDraft<T extends object>(key: string): Partial<T> | null {
  const raw = store.get(key);
  if (!raw) return null;
  try { const v = JSON.parse(raw); return v && typeof v === 'object' ? v : null; } catch { return null; }
}
export const clearDraft = (key: string) => store.del(key);

/** Keeps `value` as a draft while it differs from `base`. Returns the time of the last draft save. */
export function useAutoDraft(key: string | null, value: object | null, base: object | null): string {
  const [at, setAt] = useState('');
  useEffect(() => {
    if (!key || !value || !base) return;
    const t = setTimeout(() => {
      if (JSON.stringify(value) === JSON.stringify(base)) { store.del(key); setAt(''); return; }
      store.set(key, JSON.stringify(value));
      setAt(new Intl.DateTimeFormat('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).format(new Date()));
    }, 700);
    return () => clearTimeout(t);
  }, [key, value, base]);
  return at;
}

export function DraftNote({ restored, savedAt, onDiscard }: { restored: boolean; savedAt: string; onDiscard: () => void }) {
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
