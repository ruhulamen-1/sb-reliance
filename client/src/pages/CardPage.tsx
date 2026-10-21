import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { homeData } from '../api';
import { realEmail, Settings } from '../components/Shell';
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
};
const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

function Row({ href, icon, label, note }: { href: string; icon: string; label: string; note?: string }) {
  const body = (<><span className="cp-ic"><Ico d={icon} /></span><span className="cp-txt"><strong>{label}</strong>{note && <span>{note}</span>}</span><span className="cp-go"><Ico d={P.arrow} /></span></>);
  return isLocal(href)
    ? <Link className="cp-row" to={href}>{body}</Link>
    : <a className="cp-row" href={href} {...(/^https?:/.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{body}</a>;
}

export default function CardPage() {
  const [d, setD] = useState<Data>({});
  useEffect(() => { homeData<Data>().then(setD).catch(() => undefined); }, []);
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
  const ready = !!d.settings;

  return (
    <main className="cardpage">
      <header className="cp-head">
        <Link to="/" aria-label={`${S.brand || 'SB Reliance'} home`}><img src={S.logo || '/logo-gold.svg'} alt={S.brand || ''} width="211" height="44" /></Link>
        {ready && <h1>{S.card_title || `Welcome to ${co}`}</h1>}
        {S.card_intro && <p className="cp-intro">{S.card_intro}</p>}
      </header>

      <div className="cp-body">
        {S.card_notice && <p className="cp-notice" role="note">{S.card_notice}</p>}
        {S.card_image && <img className="cp-hero" src={S.card_image} alt="" />}

        <nav className="cp-list" aria-label="Quick actions">
          {wa && <Row href={`https://wa.me/${wa}`} icon={P.chat} label="Chat on WhatsApp" note="Send photos of the job for a quick reply" />}
          <Row href={on(S.card_quote) ? '#quote' : '/contact#quote'} icon={P.quote} label="Get a free quote" note="Site visit and a written quotation" />
          {tel && <Row href={`tel:${tel}`} icon={P.phone} label="Call us" note={S.phone} />}
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
              <li key={g.id}><Link to={g.slug ? `/portfolio/${g.slug}` : '/portfolio'}><img src={g.image_url!} alt={g.title} loading="lazy" /></Link></li>
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
        <div className="cp-quote"><QuoteSection S={S} serviceNames={services.map((s) => s.title)} contact={false} /></div>
      )}

      <footer className="cp-foot">
        <Link className="btn" to="/"><Ico d={P.home} /> Visit our website</Link>
        <small>{co}{S.uen ? ` · UEN ${S.uen}` : ''}</small>
      </footer>
    </main>
  );
}
