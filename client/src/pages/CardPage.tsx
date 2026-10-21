import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { homeData } from '../api';
import { realEmail, Settings, WaLogo } from '../components/Shell';
import OpenStatus from '../components/OpenStatus';
import { CountUp, GoogleRating, statPairs } from '../components/Trust';
import QuoteSection from '../components/QuoteSection';
import { lines } from '../components/content';
import useSeo from '../components/useSeo';

// /card: the page the QR code on the business cards opens. Not linked from the website menu or home page,
// hidden from Google, and everything on it is edited in Admin > QR page, so the printed QR never changes.
type Svc = { id: number; title: string; slug?: string | null; description?: string };
type Pic = { id: number; title: string; slug?: string | null; image_url?: string | null };
type Review = { id: number; name: string; location?: string; text: string; rating?: number | null };
type Data = { settings?: Settings; services?: Svc[]; gallery?: Pic[]; testimonials?: Review[] };

const on = (v?: string) => (v ?? 'yes') !== 'no';
/** "Label | link | note" per line; the link can be a full https:// address or a page of this site like /portfolio */
function links(v?: string) {
  return lines(v).map((l) => {
    const [label = '', href = '', note = ''] = l.split('|').map((x) => x.trim());
    return { label, href, note };
  }).filter((x) => x.label && (/^https?:\/\/\S+$/i.test(x.href) || /^\/\S*$/.test(x.href) || /^(tel|mailto):\S+$/i.test(x.href)));
}
const isLocal = (href: string) => href.startsWith('/');

const P = {
  chat: 'M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  quote: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  arrow: 'M9 6l6 6-6 6',
  save: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  close: 'M6 6l12 12M18 6 6 18',
};

// Google Analytics events (only when Analytics is on in Admin), so QR scans and taps can be counted
const track = (name: string) => (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', name, { page: 'card' });
const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

function Row({ href, icon, label, note, event, download }: { href: string; icon: string; label: string; note?: string; event?: string; download?: boolean }) {
  const body = (<><span className="cp-ic"><Ico d={icon} /></span><span className="cp-txt"><strong>{label}</strong>{note && <span>{note}</span>}</span><span className="cp-go"><Ico d={P.arrow} /></span></>);
  const onClick = event ? () => track(event) : undefined;
  return isLocal(href) && !download
    ? <Link className="cp-row" to={href} onClick={onClick}>{body}</Link>
    : <a className="cp-row" href={href} onClick={onClick} {...(download ? { download: '' } : {})} {...(/^https?:/.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{body}</a>;
}

export default function CardPage() {
  const [d, setD] = useState<Data>({});
  const [big, setBig] = useState<Pic | null>(null);
  useEffect(() => { homeData<Data>().then(setD).catch(() => undefined); }, []);
  useEffect(() => { track('qr_card_open'); }, []);
  useEffect(() => {
    if (!big) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [big]);
  const S = d.settings ?? {};
  const co = S.company_name || S.brand || 'SB Reliance Pte Ltd';
  useSeo({ title: S.company_name ? (S.card_title ? `${S.card_title} – ${co}` : co) : '', description: '', canonical: '/card' });

  const wa = (S.whatsapp || '').replace(/\D/g, '');
  const tel = (S.phone || '').replace(/[^\d+]/g, '');
  const email = realEmail(S.email);
  const map = S.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.address)}` : '';
  const services = (d.services ?? []).filter((s) => s.slug);
  const pics = (d.gallery ?? []).filter((g) => g.image_url).slice(0, 6);
  const reviews = (d.testimonials ?? []).slice(0, 3);
  const extra = links(S.card_links);
  const stats = statPairs(S).slice(0, 3);
  const ready = !!d.settings;

  async function share() {
    track('qr_card_share');
    const url = `${window.location.origin}/card`;
    const text = `${co} – aircon, ACMV, electrical, CCTV and renovation works in Singapore`;
    try {
      if (navigator.share) return await navigator.share({ title: co, text, url });
    } catch { return; } // closed the share sheet
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  }

  return (
    <main className={`cardpage${wa || tel ? ' has-bar' : ''}`}>
      <header className="cp-head">
        <Link to="/" aria-label={`${S.brand || 'SB Reliance'} home`}><img src={S.logo || '/logo-gold.svg'} alt={S.brand || ''} width="211" height="44" /></Link>
        {ready && <h1>{S.card_title || `Welcome to ${co}`}</h1>}
        {S.card_intro && <p className="cp-intro">{S.card_intro}</p>}
        {ready && (S.google_rating || S.open_hours) && (
          <div className="cp-trust">
            {S.google_rating && <span className="cp-pill"><GoogleRating S={S} /></span>}
            <OpenStatus hours={S.open_hours} />
          </div>
        )}
        {stats.length > 0 && (
          <dl className="cp-stats">{stats.map(([n, t]) => <div key={t}><dt>{t}</dt><dd><CountUp value={n} /></dd></div>)}</dl>
        )}
      </header>

      <div className="cp-body">
        {S.card_notice && <p className="cp-notice" role="note">{S.card_notice}</p>}
        {S.card_image && <img className="cp-hero" src={S.card_image} alt="" />}

        {wa && (
          <a className="cp-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={() => track('qr_card_whatsapp')}>
            <WaLogo />
            <span><strong>Chat on WhatsApp</strong><span>Send photos of the job for a quick reply</span></span>
          </a>
        )}

        <nav className="cp-list" aria-label="Quick actions">
          <Row href={on(S.card_quote) ? '#quote' : '/contact#quote'} icon={P.quote} label="Get a free quote" note="Site visit and a written quotation" event="qr_card_quote" />
          {tel && <Row href={`tel:${tel}`} icon={P.phone} label="Call us" note={S.phone} event="qr_card_call" />}
          <Row href="/card.vcf" download icon={P.save} label="Save our contact" note="Add us to your phone in one tap" event="qr_card_save" />
          <button type="button" className="cp-row" onClick={share}>
            <span className="cp-ic"><Ico d={P.share} /></span>
            <span className="cp-txt"><strong>Share with a friend</strong><span>Send this page on WhatsApp or anywhere</span></span>
            <span className="cp-go"><Ico d={P.arrow} /></span>
          </button>
          {extra.map((x, i) => <Row key={i} href={x.href} icon={P.link} label={x.label} note={x.note} />)}
        </nav>

        {on(S.card_services) && services.length > 0 && (
          <section className="cp-sec" aria-labelledby="cp-svc">
            <h2 id="cp-svc">Our services</h2>
            <ul className="cp-chips">{services.map((s) => <li key={s.id}><Link to={`/services/${s.slug}`}>{s.title}</Link></li>)}</ul>
          </section>
        )}

        {on(S.card_projects) && pics.length > 0 && (
          <section className="cp-sec" aria-labelledby="cp-proj">
            <div className="cp-sec-head"><h2 id="cp-proj">Recent projects</h2><Link to="/portfolio">See all</Link></div>
            <ul className="cp-pics">{pics.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => setBig(g)} aria-label={`Show larger: ${g.title}`}>
                  <img src={g.image_url!} alt="" loading="lazy" />
                </button>
                <span>{g.title}</span>
              </li>
            ))}</ul>
          </section>
        )}

        {on(S.card_reviews) && reviews.length > 0 && (
          <section className="cp-sec" aria-labelledby="cp-rev">
            <h2 id="cp-rev">What customers say</h2>
            {reviews.map((r) => (
              <figure key={r.id} className="cp-review">
                {!!r.rating && <span className="cp-stars" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(Math.min(5, Math.round(Number(r.rating))))}</span>}
                <blockquote>{r.text.length > 220 ? `${r.text.slice(0, 217).trimEnd()}…` : r.text}</blockquote>
                <figcaption>{r.name}{r.location ? `, ${r.location}` : ''}</figcaption>
              </figure>
            ))}
          </section>
        )}

        {(email || S.address) && (
          <nav className="cp-list" aria-label="Contact">
            {email && <Row href={`mailto:${email}`} icon={P.mail} label="Email" note={email} />}
            {S.address && <Row href={map} icon={P.pin} label="Office" note={S.address} />}
          </nav>
        )}
      </div>

      {ready && on(S.card_quote) && (
        <div className="cp-quote"><QuoteSection S={S} serviceNames={services.map((s) => s.title)} contact={false} compact source="card" /></div>
      )}

      <footer className="cp-foot">
        <Link className="btn" to="/"><Ico d={P.home} /> Visit our website</Link>
        <small>{co}{S.uen ? ` · UEN ${S.uen}` : ''}</small>
      </footer>

      {(wa || tel) && (
        <div className="cp-bar">
          {wa && <a className="cp-bar-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={() => track('qr_card_whatsapp')}><WaLogo /> WhatsApp</a>}
          {tel && <a className="cp-bar-call" href={`tel:${tel}`} onClick={() => track('qr_card_call')}><Ico d={P.phone} /> Call</a>}
        </div>
      )}

      {big && (
        <div className="cp-big" role="dialog" aria-modal="true" aria-label={big.title} onClick={() => setBig(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={big.image_url!} alt={big.title} />
            <figcaption>
              <span>{big.title}</span>
              {big.slug && <Link to={`/portfolio/${big.slug}`}>View project</Link>}
            </figcaption>
          </figure>
          <button type="button" className="cp-big-x" aria-label="Close" autoFocus onClick={() => setBig(null)}><Ico d={P.close} /></button>
        </div>
      )}
    </main>
  );
}
