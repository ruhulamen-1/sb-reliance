import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Shell from '../components/Shell';
import QuoteForm from '../components/QuoteForm';
import QuickQuote from '../components/QuickQuote';
import OpenStatus from '../components/OpenStatus';
import useSeo from '../components/useSeo';
import { api, initialHome } from '../api';
import { serviceHeading } from '../components/content';
import { Guarantee, ReviewsButton, Stats, TrustBar } from '../components/Trust';

interface Service { id: number; title: string; slug?: string | null; description: string; image_url?: string | null }
interface Testimonial { id: number; name: string; location: string; text: string }
interface Post { id: number; title: string; slug: string; excerpt: string; image_url?: string | null; created_at: string }
interface GalleryItem { id: number; title: string; image_url: string }
type Settings = Record<string, string>;
interface HomeData { services: Service[]; testimonials: Testimonial[]; posts: Post[]; gallery: GalleryItem[]; settings: Settings }

const CHIPS = ['#7FA6D6', '#9CC5B8', '#F2D16B', '#E8A598', '#C9C3E6', '#F4EFE6', '#A7D3C4', '#F0B88A'];
const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);

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
    const id = ({ '/services': 'services', '/why-us': 'included', '/blog': 'blog' } as Record<string, string>)[pathname];
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    else if (!id) window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  }, [pathname, data]);
  const slides = [S.hero_image, S.hero_image_2, S.hero_image_3].filter(Boolean) as string[];
  const headlines = (S.hero_headlines || '').split('\n').map((x) => x.trim());
  const slideCount = Math.max(slides.length, headlines.filter(Boolean).length, 1);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slideCount < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % slideCount), 6000);
    return () => clearInterval(t);
  }, [slideCount, paused]);
  const cur = slide % slideCount;
  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const serviceNames = data.services.map((s) => s.title);
  const steps = lines(S.steps).map((l) => {
    const [t, ...d] = l.split('|');
    return [t.trim(), d.join('|').trim()];
  });

  const alias = ({ '/services': 'Services', '/why-us': 'Why choose us', '/blog': 'Blog' } as Record<string, string>)[pathname];
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
          <div>
            <h1>{headlines[cur] || S.hero_title}</h1>
            <p className="lead">{S.hero_lead}</p>
            <div className="row gap">
              <Link className="btn" to="/contact">Request a quote</Link>
              <a className="btn ghost" href={wa}>Chat on WhatsApp</a>
            </div>
            <OpenStatus hours={S.open_hours} />
          </div>
          {slides.length > 0 ? (
            <div className="heroslides" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
              {slides.map((src, i) => (
                <img key={src} className={i === cur % slides.length ? 'heroimg on' : 'heroimg'} src={src} alt={S.company_name || ''}
                  {...(i === 0 ? { fetchpriority: 'high' } : { loading: 'lazy' as const })} />
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
      </section>

      <TrustBar S={S} />

      <QuickQuote S={S} />

      <section id="services" className="wrap block">
        <h2>{S.services_title}</h2>
        <div className="grid3">
          {data.services.map((s) => (
            <article key={s.id} className="card">
              {s.image_url && <img className="cardimg" src={s.image_url} alt={serviceHeading(s)} loading="lazy" />}
              <h3>{s.slug ? <Link to={`/services/${s.slug}`}>{s.title}</Link> : s.title}</h3>
              <p>{s.description}</p>
              {s.slug && <Link className="more" to={`/services/${s.slug}`}>More about {s.title.toLowerCase()} <span aria-hidden="true">→</span></Link>}
            </article>
          ))}
        </div>
      </section>

      <Stats S={S} />

      <section id="included" className="band">
        <div className="wrap two">
          <div>
            <h2>{S.why_title}</h2>
            <ul className="ticks">{lines(S.why_list).map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div>
            <h2>{S.process_title}</h2>
            <ol className="steps">
              {steps.map(([t, d]) => (
                <li key={t}><strong>{t}</strong><span>{d}</span></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <Guarantee S={S} />

      {data.gallery.length > 0 && (
        <section id="work" className="wrap block">
          <h2>Our work</h2>
          <div className="gallery home-work">
            {data.gallery.slice(0, 6).map((g) => (
              <figure key={g.id} className="shot">
                <img src={g.image_url} alt={g.title} loading="lazy" />
                <figcaption>{g.title}</figcaption>
              </figure>
            ))}
          </div>
          <p><Link className="btn ghost" to="/portfolio">View all projects</Link></p>
        </section>
      )}

      {(data.testimonials.length > 0 || S.google_reviews_url) && (
        <section className="wrap block">
          <h2>What customers say</h2>
          <div className="grid3">
            {data.testimonials.map((t) => (
              <figure key={t.id} className="card quote">
                <blockquote>{t.text}</blockquote>
                <figcaption>{t.name}, {t.location}</figcaption>
              </figure>
            ))}
          </div>
          <ReviewsButton S={S} />
        </section>
      )}

      {data.posts.length > 0 && (
        <section id="blog" className="wrap block">
          <h2>From the blog</h2>
          <div className="grid3">
            {data.posts.map((p) => (
              <article key={p.id} className="card">
                {p.image_url && <img className="cardimg" src={p.image_url} alt={p.title} loading="lazy" />}
                <h3><Link to={`/blog/${p.slug}`}>{p.title}</Link></h3>
                <p>{p.excerpt}</p>
                <small>{new Date(p.created_at).toLocaleDateString('en-SG', { dateStyle: 'medium' })}</small>
              </article>
            ))}
          </div>
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
