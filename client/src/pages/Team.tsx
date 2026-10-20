import { CSSProperties, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, homeData, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import QuoteForm from '../components/QuoteForm';
import useSeo from '../components/useSeo';
import { photo, SIZES } from '../img';

interface Member { id: number; name: string; role: string; bio?: string | null; image_url?: string | null }
interface Svc { title: string }

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
const isPlaceholderEmail = (e?: string) => !e || /example\.com$/i.test(e);

export default function Team() {
  const home = initialHome();
  const [S, setS] = useState<Settings>(() => home?.settings ?? {});
  const [services, setServices] = useState<Svc[]>(() => home?.services ?? []);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    homeData<{ settings?: Settings; services?: Svc[] }>().then((d) => { setS(d.settings ?? {}); setServices(d.services ?? []); }).catch(() => undefined);
    api<Member[]>('/public/team')
      .then((m) => { setMembers(m); setActive(window.matchMedia('(max-width: 800px)').matches ? 0 : Math.floor((m.length - 1) / 2)); })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoaded(true));
  }, []);
  useSeo({ title: S.company_name ? `Team – ${S.company_name}` : '', description: S.company_name ? `Meet the people at ${S.company_name} who plan, install and finish your project.` : '', canonical: '/team' });

  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const tel = (S.phone || '').replace(/[^\d+]/g, '');
  const cur = members[active];

  return (
    <Shell S={S}>
      <section className="team-hero wrap">
        <p className="team-pill"><span aria-hidden="true" /> {S.brand || 'SB Reliance'} · Singapore</p>
        <h1>One team for your project, from site visit to handover</h1>
        <p className="lead">The people who plan, install and finish your work across Singapore.</p>
        <div className="row gap team-cta">
          <a className="btn ghost" href={wa}>Chat on WhatsApp</a>
          <a className="btn" href="#team-contact">Get a quote</a>
        </div>
      </section>

      {err && <p className="err wrap">{err}</p>}
      {loaded && !err && members.length === 0 && <p className="wrap block">Team members will appear here soon. Add them in Admin → Team.</p>}

      {members.length > 0 && (
        <section className="team-rail" aria-label="Our team">
          <div className="team-track">
            {members.map((m, i) => (
              <figure key={m.id} className={i === active ? 'tcard on' : 'tcard'} style={{ '--d': Math.min(Math.abs(i - active), 4) } as CSSProperties}
                tabIndex={0} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}>
                {m.image_url
                  ? <img {...photo(m.image_url, SIZES.card)} alt={m.name} loading="lazy" />
                  : <span className="tcard-initials" aria-hidden="true">{initials(m.name)}</span>}
                <figcaption><strong>{m.name}</strong><span>{m.role}</span></figcaption>
              </figure>
            ))}
          </div>
          {cur?.bio && (
            <p className="team-bio wrap" aria-live="polite"><strong>{cur.name}</strong> · {cur.role}<br />{cur.bio}</p>
          )}
        </section>
      )}

      <section id="team-contact" className="wrap block team-contact">
        <div className="card team-form">
          <h2>Talk to our team</h2>
          <p>Tell us what you need and we will get back to you with a site visit and quotation.</p>
          <QuoteForm S={S} serviceNames={services.map((s) => s.title)} />
        </div>
        <div className="team-ways">
          <div>
            <h3>Chat on WhatsApp</h3>
            <p>The fastest way to reach us. Send photos of your site too.</p>
            <a href={wa}>{S.phone || 'WhatsApp us'}</a>
          </div>
          {tel && (
            <div>
              <h3>Call us</h3>
              <p>{S.open_hours ? S.open_hours.split('\n')[0] : 'During opening hours.'}</p>
              <a href={`tel:${tel}`}>{S.phone}</a>
            </div>
          )}
          {!isPlaceholderEmail(S.email) && (
            <div>
              <h3>Email</h3>
              <p>For drawings, documents and tenders.</p>
              <a href={`mailto:${S.email}`}>{S.email}</a>
            </div>
          )}
          {S.address && S.address.trim().toLowerCase() !== 'singapore' && (
            <div>
              <h3>Visit us</h3>
              <p>{S.address}</p>
              <Link to="/contact">Map and directions</Link>
            </div>
          )}
        </div>
      </section>

      {S.org_chart && (
        <section className="wrap block">
          <div className="sechead"><h2>Organisation chart</h2></div>
          <img className="orgchart" src={S.org_chart} alt="Organisation chart" loading="lazy" />
        </section>
      )}
    </Shell>
  );
}
