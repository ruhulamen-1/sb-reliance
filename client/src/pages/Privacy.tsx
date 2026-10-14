import { useEffect, useState } from 'react';
import { homeData } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';

export default function Privacy() {
  const [S, setS] = useState<Settings>({});
  const [err, setErr] = useState('');
  useEffect(() => {
    homeData<{ settings?: Settings }>().then((d) => setS(d.settings ?? {})).catch((e: Error) => setErr(e.message));
  }, []);
  useSeo({ title: S.company_name ? `Privacy policy – ${S.company_name}` : '', description: S.company_name ? `How ${S.company_name} collects and uses the details you send us.` : '', canonical: '/privacy-policy' });

  const rows = (S.privacy_text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <Shell S={S}>
      <section className="wrap narrow block legal">
        <h1 className="h1s">Privacy policy</h1>
        {err && <p className="err">{err}</p>}
        {rows.map((l, i) => (l.startsWith('# ') ? <h2 key={i}>{l.slice(2)}</h2> : <p key={i}>{l}</p>))}
        {/^G-[A-Z0-9]{4,20}$/i.test((S.ga_measurement_id || '').trim()) && (
          <>
            <h2>Website analytics</h2>
            <p>We use Google Analytics to understand how visitors use this website, for example which pages are viewed and how visitors found us. Google Analytics uses cookies and collects information such as your approximate location, device and browser, but not your name or contact details. You can block these cookies in your browser settings or with Google's opt-out add-on (tools.google.com/dlpage/gaoptout).</p>
          </>
        )}
      </section>
    </Shell>
  );
}
