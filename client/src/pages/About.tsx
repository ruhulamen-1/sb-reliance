import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Shell, { Settings } from '../components/Shell';

interface Service { id: number; title: string; description: string; image_url?: string | null }

const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default function About() {
  const [S, setS] = useState<Settings>({});
  const [services, setServices] = useState<Service[]>([]);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    api<{ settings?: Settings; services?: Service[] }>('/public/home')
      .then((d) => { setS(d.settings ?? {}); setServices(d.services ?? []); })
      .catch((e: Error) => setErr(e.message));
  }, []);
  useEffect(() => {
    document.title = S.company_name ? `About us – ${S.company_name}` : 'About us';
  }, [S.company_name]);

  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const steps = lines(S.steps).map((l) => { const [t, ...d] = l.split('|'); return [t.trim(), d.join('|').trim()]; });
  const tabs = [
    { id: 'mission', label: 'Our mission', body: <p>{S.about_mission}</p> },
    { id: 'how', label: 'How we work', body: <ol className="steps">{steps.map(([t, d]) => <li key={t}><strong>{t}</strong><span>{d}</span></li>)}</ol> },
    { id: 'why', label: S.why_title || 'Why us', body: <ul className="ticks">{lines(S.why_list).map((t) => <li key={t}>{t}</li>)}</ul> },
  ];

  return (
    <Shell S={S}>
      {err && <p className="err wrap block">{err}</p>}

      <section className="band light about-intro">
        <div className="wrap two">
          <div>
            <h1 className="h1s">About {S.brand || 'us'}</h1>
            {lines(S.about_intro).map((p) => <p key={p} className="lead">{p}</p>)}
          </div>
          {S.about_image && <img className="heroimg" src={S.about_image} alt="" />}
        </div>
      </section>

      <section className="wrap block">
        <div role="tablist" aria-label="About us" className="tabs">
          {tabs.map((t, i) => (
            <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === i} aria-controls={`panel-${t.id}`} tabIndex={tab === i ? 0 : -1}
              className={tab === i ? 'on' : ''} onClick={() => setTab(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') setTab((tab + 1) % tabs.length);
                if (e.key === 'ArrowLeft') setTab((tab + tabs.length - 1) % tabs.length);
              }}>
              {t.label}
            </button>
          ))}
        </div>
        {tabs.map((t, i) => (
          <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={tab !== i} className="tabpanel">
            {t.body}
          </div>
        ))}
      </section>

      {services.length > 0 && (
        <section className="wrap block">
          <div className="sechead"><h2>{S.services_title || 'What we do'}</h2></div>
          <div className="gallery">
            {services.map((s) => (
              <Link key={s.id} to="/contact" className="tile">
                {s.image_url ? <img src={s.image_url} alt="" loading="lazy" /> : <span className="tile-ph" aria-hidden="true" />}
                <span className="tile-label">{s.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="band">
        <div className="wrap narrow cta">
          <h2>Ready to start?</h2>
          <p>Tell us about your property and the work you need. We reply on WhatsApp.</p>
          <div className="row gap">
            <Link className="btn" to="/contact">Request a quote</Link>
            <a className="btn ghost" href={wa}>Chat on WhatsApp</a>
            <Link className="btn ghost" to="/">Back to home</Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
