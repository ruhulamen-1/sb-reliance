import { useEffect, useState } from 'react';
import { api } from '../api';
import Shell, { Settings } from '../components/Shell';

export default function Privacy() {
  const [S, setS] = useState<Settings>({});
  const [err, setErr] = useState('');
  useEffect(() => {
    api<{ settings?: Settings }>('/public/home').then((d) => setS(d.settings ?? {})).catch((e: Error) => setErr(e.message));
  }, []);
  useEffect(() => {
    document.title = S.company_name ? `Privacy policy – ${S.company_name}` : 'Privacy policy';
  }, [S.company_name]);

  const rows = (S.privacy_text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <Shell S={S}>
      <section className="wrap narrow block legal">
        <h1 className="h1s">Privacy policy</h1>
        {err && <p className="err">{err}</p>}
        {rows.map((l, i) => (l.startsWith('# ') ? <h2 key={i}>{l.slice(2)}</h2> : <p key={i}>{l}</p>))}
      </section>
    </Shell>
  );
}
