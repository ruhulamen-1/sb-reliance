import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Shell from '../components/Shell';
import QuoteForm from '../components/QuoteForm';
import QuickQuote from '../components/QuickQuote';
import OpenStatus from '../components/OpenStatus';
import useSeo from '../components/useSeo';
import { api, initialHome } from '../api';
import { faqPairs, serviceHeading } from '../components/content';
import { PriceCards } from '../components/PriceGuide';
import { Guarantee, HeroStats, TrustBar } from '../components/Trust';
import GoogleReviews, { Review } from '../components/GoogleReviews';
import { HIGH, photo, SIZES } from '../img';

interface Service { id: number; title: string; slug?: string | null; description: string; image_url?: string | null; prices?: string | null }
interface Post { id: number; title: string; slug: string; excerpt: string; image_url?: string | null; created_at: string }
interface GalleryItem { id: number; title: string; slug?: string | null; image_url: string }
type Settings = Record<string, string>;
interface HomeData { services: Service[]; testimonials: Review[]; posts: Post[]; gallery: GalleryItem[]; settings: Settings }

const CHIPS = ['#7FA6D6', '#9CC5B8', '#F2D16B', '#E8A598', '#C9C3E6', '#F4EFE6', '#A7D3C4', '#F0B88A'];
const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);

/** Words between * in an admin-written headline are shown in gold: "Your *aircon* team". */
function Gold({ text }: { text?: string }) {
  return <>{(text || '').split(/\*([^*]+)\*/).map((part, i) => (i % 2 ? <em key={i} className="gold">{part}</em> : part))}</>;
}

// an icon for each project step, picked from the words in its title
const STEP_ICONS: [RegExp, string][] = [
  [/call|contact|whatsapp|request|enquir|book/i, 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'],
  [/visit|inspect|survey|check|assess|measure/i, 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4'],
  [/quot|price|plan|proposal|agree/i, 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6'],
  [/work|install|build|fix|repair|carry/i, 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z'],
  [/hand|finish|clean|done|complete|sign/i, 'M20 6 9 17l-5-5'],
];
const stepIcon = (t: string) => STEP_ICONS.find(([re]) => re.test(t))?.[1] || 'M20 6 9 17l-5-5';

export default function Home() {
  const full = (d: Partial<HomeData>): HomeData => ({ services: d.services ?? [], testimonials: d.testimonials ?? [], posts: d.posts ?? [], gallery: d.gallery ?? [], settings: d.settings ?? {} });
  // first render uses the data already in the page, so the hero and its photo show at once
  const [data, setData] = useState<HomeData>(() => full(initialHome() ?? {}));
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    if (initialHome()) return;
    api<Partial<HomeData>>('/public/home')
      .then((d) => setData(full(d)))
      .catch((e: Error) => setLoadErr(e.message));
  }, []);

  const S = data.settings;
  const { pathname } = useLocation();
  useEffect(() => {
    const id = ({ '/services': 'services', '/why-us': 'included' } as Record<string, string>)[pathname];
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    else if (!id) window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  }, [pathname, data]);
  const slides = [S.hero_image, S.hero_image_2, S.hero_image_3].filter(Boolean) as string[];
  const homeFaq = faqPairs(S.home_faq);
  const hacking = data.services.find((s) => s.slug === 'hacking' || /hacking/i.test(s.title));
  const hackPoints = lines(S.hacking_points);
  const aboutLines = lines(S.about_intro || S.about_text).slice(0, 2);
  const headlines = (S.hero_headlines || '').split('\n').map((x) => x.trim());
  const slideCount = Math.max(slides.length, headlines.filter(Boolean).length, 1);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  // the 2nd and 3rd hero photos are added only after the page has loaded, so phones spend
  // their bandwidth on the first photo and the headline first (PageSpeed LCP)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const go = () => setTimeout(() => setReady(true), 1500);
    if (document.readyState === 'complete') { const t = go(); return () => clearTimeout(t); }
    let t: ReturnType<typeof setTimeout> | undefined;
    const onLoad = () => { t = go(); };
    window.addEventListener('load', onLoad, { once: true });
    return () => { window.removeEventListener('load', onLoad); if (t) clearTimeout(t); };
  }, []);
  useEffect(() => {
    if (slideCount < 2 || paused || !ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % slideCount), 6000);
    return () => clearInterval(t);
  }, [slideCount, paused, ready]);
  const cur = slide % slideCount;
  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const serviceNames = data.services.map((s) => s.title);
  const steps = lines(S.steps).map((l) => {
    const [t, ...d] = l.split('|');
    return [t.trim(), d.join('|').trim()];
  });

  const alias = ({ '/services': 'Services', '/why-us': 'Why choose us' } as Record<string, string>)[pathname];
  useSeo({
    title: !S.company_name ? '' : alias ? `${alias} – ${S.company_name}` : S.seo_title || S.company_name,
    description: S.seo_description,
    canonical: '/',
  });

  return (
    <Shell S={S} services={data.services}>

      {loadErr && <p className="err wrap block">{loadErr}</p>}

      {/* the "page background image" setting now sits only behind the hero, lightly, instead of behind every section */}
      <section className="hero" style={S.page_bg ? { ['--hero-bg' as string]: `url("${S.page_bg}")` } : undefined}>
        <svg className="airflow" aria-hidden="true" viewBox="0 0 2400 400" preserveAspectRatio="none">
          {[0, 1200].map((x) => (
            <g key={x} transform={`translate(${x} 0)`} fill="none" strokeLinecap="round">
              <path d="M0 110 C300 30 300 190 600 110 C900 30 900 190 1200 110" strokeWidth="3" />
              <path d="M0 200 C300 120 300 280 600 200 C900 120 900 280 1200 200" strokeWidth="2" />
              <path d="M0 290 C300 210 300 370 600 290 C900 210 900 370 1200 290" strokeWidth="3" />
            </g>
          ))}
        </svg>
        <div className="wrap hero-grid">
          <div className="hero-copy">
            {S.hero_badge && <p className="hero-badge">{S.hero_badge}</p>}
            <h1><Gold text={headlines[cur] || S.hero_title} /></h1>
            <p className="lead">{S.hero_lead}</p>
            <div className="row gap">
              <Link className="btn" to="/contact">Request a quote <span aria-hidden="true">↗</span></Link>
              <a className="btn ghost" href={wa}>Chat on WhatsApp</a>
            </div>
            <OpenStatus hours={S.open_hours} />
            <HeroStats S={S} />
          </div>
          <div className={`hero-visual${S.hero_cutout ? ' cutout' : slides.length ? ' photos' : ''}`}>
          {(S.hero_cutout || slides.length > 0) && (
            <svg className="hero-deco" aria-hidden="true" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="28" /></svg>
          )}
          {S.hero_cutout ? (
            <div className="hero-person">
              <span className="hero-blob" aria-hidden="true" />
              <img {...photo(S.hero_cutout, SIZES.hero)} alt={S.company_name || ''} {...HIGH} />
            </div>
          ) : slides.length > 0 ? (
            <div className="heroslides" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
              {slides.slice(0, ready ? slides.length : 1).map((src, i) => (
                <img key={src} className={i === cur % slides.length ? 'heroimg on' : 'heroimg'} {...photo(src, SIZES.hero)} alt={S.company_name || ''}
                  {...(i === 0 ? HIGH : { loading: 'lazy' as const })} />
              ))}
              {slideCount > 1 && (
                <div className="dots">
                  {Array.from({ length: slideCount }, (_, i) => (
                    <button key={i} type="button" className={i === cur ? 'on' : ''} aria-label={`Show slide ${i + 1}`} aria-current={i === cur} onClick={() => setSlide(i)} />
                  ))}
                </div>
              )}
            </div>
          ) : (
          <div className="swatches" aria-hidden="true">
            {serviceNames.map((n, i) => (
              <div key={n} className="chip" style={{ background: CHIPS[i % CHIPS.length], transform: `rotate(${((i % 4) - 1.5) * 2}deg)` }}>
                <span>{n}</span>
              </div>
            ))}
          </div>
          )}
          </div>
        </div>
      </section>

      <TrustBar S={S} />

      <QuickQuote S={S} />

      <section id="services" className="wrap block">
        <h2>{S.services_title}</h2>
        <div className="grid3">
          {data.services.map((s) => (
            <article key={s.id} className="card">
              {s.image_url && <img className="cardimg" {...photo(s.image_url, SIZES.card)} alt={serviceHeading(s)} loading="lazy" />}
              <h3>{s.slug ? <Link to={`/services/${s.slug}`}>{s.title}</Link> : s.title}</h3>
              <p>{s.description}</p>
              {s.slug && <Link className="more" to={`/services/${s.slug}`}>More about {s.title.toLowerCase()} <span aria-hidden="true">→</span></Link>}
            </article>
          ))}
        </div>
      </section>

      {/* short company introduction; the full story is on /about (text and photo from Admin > Settings > About page) */}
      {hacking && (
        <section className="home-hack" aria-labelledby="home-hack-title">
          <div className="wrap home-hack-grid">
            <div>
              <p className="home-hack-kicker">Hacking works</p>
              <h2 id="home-hack-title">Hacking works in Singapore</h2>
              {hacking.description && <p className="home-hack-lead">{hacking.description}</p>}
              {hackPoints.length > 0 && <ul className="home-hack-points">{hackPoints.map((t) => <li key={t}>{t}</li>)}</ul>}
              <div className="row gap">
                <a className="btn" href={`https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${S.brand || S.company_name || ''}, I would like a quotation for hacking works.`)}`}>Get a hacking quote</a>
                {hacking.slug && <Link className="btn btn-outline" to={`/services/${hacking.slug}`}>More about hacking</Link>}
              </div>
            </div>
            {hacking.image_url && <img className="home-hack-img" {...photo(hacking.image_url, SIZES.hero)} alt="Hacking works" loading="lazy" />}
          </div>
        </section>
      )}

      {aboutLines.length > 0 && (
        <section className="wrap block home-about" aria-labelledby="home-about-title">
          {S.about_image && <img className="home-about-img" {...photo(S.about_image, SIZES.hero)} alt={S.company_name || ''} loading="lazy" />}
          <div>
            <h2 id="home-about-title">About {S.brand || S.company_name || 'us'}</h2>
            {aboutLines.map((l) => <p key={l}>{l}</p>)}
            <Link className="more" to="/about">More about us <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      )}

      <PriceCards services={data.services} />

      {steps.length > 0 && (
        <section id="how" className="wrap block how" aria-labelledby="how-title">
          <h2 id="how-title"><Gold text={S.process_title} /></h2>
          <ol className="how-steps">
            {steps.map(([t, d], i) => (
              <li key={t}>
                <span className="how-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d={stepIcon(t)} /></svg>
                  <b>{i + 1}</b>
                </span>
                <strong>{t}</strong>
                {d && <p>{d}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section id="included" className="band">
        <div className="wrap">
          <h2>{S.why_title}</h2>
          <ul className="ticks ticks-2">{lines(S.why_list).map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </section>

      <Guarantee S={S} />

      {data.gallery.length > 0 && (
        <section id="work" className="wrap block">
          <h2>Our work</h2>
          <div className="gallery home-work">
            {data.gallery.slice(0, 6).map((g) => (
              <Link key={g.id} className="shot" to={g.slug ? `/portfolio/${g.slug}` : '/portfolio'}>
                <img {...photo(g.image_url, SIZES.card)} alt={g.title} loading="lazy" />
                <figcaption>{g.title}</figcaption>
              </Link>
            ))}
          </div>
          <p><Link className="btn ghost" to="/portfolio">View all projects</Link></p>
        </section>
      )}

      <GoogleReviews S={S} reviews={data.testimonials} />

      {data.posts.length > 0 && (
        <section id="blog" className="wrap block">
          <h2>From the blog</h2>
          <div className="grid3">
            {data.posts.map((p) => (
              <article key={p.id} className="card">
                {p.image_url && <img className="cardimg" {...photo(p.image_url, SIZES.card)} alt={p.title} loading="lazy" />}
                <h3><Link to={`/blog/${p.slug}`}>{p.title}</Link></h3>
                <p>{p.excerpt}</p>
                <small>{new Date(p.created_at).toLocaleDateString('en-SG', { dateStyle: 'medium' })}</small>
              </article>
            ))}
          </div>
          <p><Link className="btn ghost" to="/blog">View all posts</Link></p>
        </section>
      )}

      {homeFaq.length > 0 && (
        <section className="wrap block faq home-faq" aria-labelledby="home-faq-title">
          <h2 id="home-faq-title">{S.home_faq_title || 'Common questions'}</h2>
          {homeFaq.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      )}

      <section id="quote" className="band">
        <div className="wrap narrow">
          <h2>{S.quote_title}</h2>
          <p>{S.quote_intro}</p>
          <QuoteForm S={S} serviceNames={serviceNames} />
        </div>
      </section>

    </Shell>
  );
}
