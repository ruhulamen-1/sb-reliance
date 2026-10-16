import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { homeData, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';
import { AddressMap, Guarantee, Stats } from '../components/Trust';
import { HIGH, photo, SIZES } from '../img';

interface GalleryItem { id: number; title: string; slug?: string | null; image_url: string }
interface Service { id: number; title: string; slug?: string | null; description: string; image_url?: string | null }

const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default function About() {
  const [S, setS] = useState<Settings>(() => initialHome()?.settings ?? {});
  const [services, setServices] = useState<Service[]>(() => initialHome()?.services ?? []);
  const [err, setErr] = useState('');
  const [gallery] = useState<GalleryItem[]>(() => initialHome()?.gallery ?? []);

  useEffect(() => {
    homeData<{ settings?: Settings; services?: Service[] }>()
      .then((d) => { setS(d.settings ?? {}); setServices(d.services ?? []); })
      .catch((e: Error) => setErr(e.message));
  }, []);
  useSeo({ title: S.company_name ? `About us – ${S.company_name}` : '', description: lines(S.about_intro)[0] || S.about_text, canonical: '/about' });

  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const pairs = (v?: string) => lines(v).map((l) => { const [t, ...d] = l.split('|'); return [t.trim(), d.join('|').trim()]; }).filter(([t]) => t);
  const steps = pairs(S.steps);
  const values = pairs(S.about_values);
  const why = lines(S.why_list);
  const brands = lines(S.brands);
  const work = gallery.slice(0, 6);

  return (
    <Shell S={S} services={services}>
      {err && <p className="err wrap block">{err}</p>}

      <section className="band light about-intro">
        <div className="wrap two">
          <div>
            <h1 className="h1s">About {S.brand || 'us'}</h1>
            {lines(S.about_intro).map((p) => <p key={p} className="lead">{p}</p>)}
            <div className="row gap">
              <Link className="btn" to="/contact">Request a quote</Link>
              <a className="btn ghost" href={wa}>Chat on WhatsApp</a>
            </div>
          </div>
          {S.about_image && <img className="heroimg" {...photo(S.about_image, SIZES.hero)} alt={S.company_name || ''} {...HIGH} />}
        </div>
      </section>

      <Stats S={S} />

      {why.length > 0 && (
        <section className="wrap block" aria-labelledby="about-why">
          <h2 id="about-why">{S.why_title || 'Why work with us'}</h2>
          <ul className="why-cards">
            {why.map((t) => <li key={t}><span className="why-ico" aria-hidden="true">✓</span>{t}</li>)}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section className="band light" aria-labelledby="about-steps">
          <div className="wrap">
            <h2 id="about-steps">{S.process_title || 'How we work'}</h2>
            <ol className="step-cards">
              {steps.map(([t, d], i) => <li key={t}><span className="step-no" aria-hidden="true">{i + 1}</span><strong>{t}</strong>{d && <p>{d}</p>}</li>)}
            </ol>
          </div>
        </section>
      )}

      {(S.about_mission || S.about_vision || values.length > 0) && (
        <section className="wrap block" aria-label="Mission, vision and values">
          {(S.about_mission || S.about_vision) && (
            <div className="mv">
              {S.about_mission && <div className="card"><h2>Our mission</h2><p>{S.about_mission}</p></div>}
              {S.about_vision && <div className="card"><h2>Our vision</h2><p>{S.about_vision}</p></div>}
            </div>
          )}
          {values.length > 0 && (
            <>
              <h2 className="values-title">Our values</h2>
              <div className="value-cards">
                {values.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3>{d && <p>{d}</p>}</div>)}
              </div>
            </>
          )}
        </section>
      )}

      <Guarantee S={S} />

      {work.length > 0 && (
        <section className="wrap block" aria-labelledby="about-work">
          <h2 id="about-work">Recent work</h2>
          <div className="gallery home-work">
            {work.map((g) => (
              <Link key={g.id} className="shot" to={g.slug ? `/portfolio/${g.slug}` : '/portfolio'}>
                <img {...photo(g.image_url, SIZES.card)} alt={g.title} loading="lazy" />
                <figcaption>{g.title}</figcaption>
              </Link>
            ))}
          </div>
          <p><Link className="btn ghost" to="/portfolio">View all projects</Link></p>
        </section>
      )}

      {brands.length > 0 && (
        <section className="wrap block" aria-labelledby="about-brands">
          <h2 id="about-brands">Brands we work with</h2>
          <ul className="brand-list">{brands.map((b) => <li key={b}>{b}</li>)}</ul>
        </section>
      )}

      {(S.uen || lines(S.licenses).length > 0 || S.service_area || (S.address && S.address.trim().toLowerCase() !== 'singapore')) && (
        <section className="wrap block" aria-labelledby="company-details">
          <div className="sechead"><h2 id="company-details">Company details</h2></div>
          {S.uen && <p><strong>UEN:</strong> {S.uen}</p>}
          {S.service_area && <p><strong>Areas served:</strong> {lines(S.service_area).join(', ')}</p>}
          {lines(S.licenses).length > 0 && <ul className="ticks">{lines(S.licenses).map((l) => <li key={l}>{l}</li>)}</ul>}
          <AddressMap S={S} />
        </section>
      )}

      {services.length > 0 && (
        <section className="wrap block">
          <div className="sechead"><h2>{S.services_title || 'What we do'}</h2></div>
          <div className="gallery">
            {services.map((s) => (
              <Link key={s.id} to={s.slug ? `/services/${s.slug}` : '/contact'} className="tile">
                {s.image_url ? <img {...photo(s.image_url, SIZES.card)} alt={s.title} loading="lazy" /> : <span className="tile-ph" aria-hidden="true" />}
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
