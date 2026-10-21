import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, homeData, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import QuoteSection from '../components/QuoteSection';
import useSeo from '../components/useSeo';
import NotFound from './NotFound';
import { Guarantee, TrustBar } from '../components/Trust';
import { faqPairs, lines, serviceHeading, TextBlocks, Service } from '../components/content';
import { HIGH, photo, SIZES } from '../img';
import GoogleReviews, { Review } from '../components/GoogleReviews';
import { PriceTable, priceRows } from '../components/PriceGuide';

interface GalleryItem { id: number; title: string; slug?: string | null; image_url: string }

export default function ServicePage() {
  const { slug = '' } = useParams();
  // the settings and services are already in the page (window.__HOME__), so the service shows at once; only its photos are fetched
  const [S, setS] = useState<Settings>(() => initialHome()?.settings ?? {});
  const [services, setServices] = useState<Service[]>(() => initialHome()?.services ?? []);
  const [service, setService] = useState<Service | null>(() => services.find((x) => x.slug === slug) ?? null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>(() => initialHome()?.testimonials ?? []);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'err'>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!reviews.length) homeData().then((d) => setReviews(d.testimonials ?? [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setState('loading');
    api<{ service: Service; services: Service[]; gallery: GalleryItem[]; settings: Settings }>(`/public/services/${encodeURIComponent(slug)}`)
      .then((d) => { setService(d.service); setServices(d.services ?? []); setGallery(d.gallery ?? []); setS(d.settings ?? {}); setState('ok'); })
      .catch((e: Error) => { setErr(e.message); setState(/not found/i.test(e.message) ? 'missing' : 'err'); });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  useSeo({
    title: service && S.company_name ? service.seo_title || `${serviceHeading(service)} – ${S.company_name}` : '',
    description: service ? service.seo_description || service.description : '',
    canonical: `/services/${slug}`,
  });

  if (state === 'missing') return <NotFound />;
  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const faq = faqPairs(service?.faq);
  const intro = lines(service?.content).find((l) => !l.startsWith('# '));
  const rows = priceRows(service?.prices).slice(0, 4);
  const steps = lines(S.steps).map((l) => { const [t, ...d] = l.split('|'); return [t.trim(), d.join('|').trim()]; });
  const hasBody = !!(service?.content || faq.length);
  const others = services.filter((s) => s.id !== service?.id && s.slug);

  return (
    <Shell S={S} services={services}>
      {state === 'err' && <p className="err wrap block">{err}</p>}
      {service && (
        <>
          <section className="band light svc-hero">
            <div className="wrap two">
              <div>
                <nav className="crumbs" aria-label="Breadcrumb">
                  <Link to="/">Home</Link> <span aria-hidden="true">/</span> <Link to="/services">Services</Link> <span aria-hidden="true">/</span> <span aria-current="page">{service.title}</span>
                </nav>
                <h1 className="h1m">{serviceHeading(service)}</h1>
                <p className="lead">{service.description}</p>
                {intro && <p className="svc-intro">{intro}</p>}
                {rows.length > 0 && (
                  <ul className="ticks svc-prices" aria-label="Typical starting prices">
                    {rows.map((r) => <li key={r.item}><span>{r.item}</span> <strong>{r.price}</strong></li>)}
                  </ul>
                )}
                <div className="row gap">
                  <a className="btn" href="#quote">Get a free quote</a>
                  <a className="btn ghost" href={wa}>WhatsApp {S.phone}</a>
                </div>
              </div>
              {service.image_url && <img className="heroimg" {...photo(service.image_url, SIZES.hero)} alt={serviceHeading(service)} {...HIGH} />}
            </div>
          </section>

          <TrustBar S={S} />

          {hasBody && <section className="wrap block svc-body">
            <div className="prose"><TextBlocks text={service.content} /></div>
            {faq.length > 0 && (
              <div className="faq">
                <h2>Frequently asked questions</h2>
                {faq.map(([q, a]) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            )}
          </section>}

          <PriceTable service={service} />

          {steps.length > 0 && (
            <section className="band light" aria-labelledby="svc-steps">
              <div className="wrap">
                <h2 id="svc-steps">{S.process_title || 'How we work'}</h2>
                <ol className="step-cards">
                  {steps.map(([t, d], i) => <li key={t}><span className="step-no" aria-hidden="true">{i + 1}</span><strong>{t}</strong>{d && <p>{d}</p>}</li>)}
                </ol>
              </div>
            </section>
          )}

          <GoogleReviews S={S} reviews={reviews} />

          <Guarantee S={S} />

          {gallery.length > 0 && (
            <section className="wrap block">
              <h2>Recent projects</h2>
              <div className="gallery">
                {gallery.map((g) => (
                  <Link key={g.id} className="shot" to={g.slug ? `/portfolio/${g.slug}` : '/portfolio'}>
                    <img {...photo(g.image_url, SIZES.card)} alt={g.title} loading="lazy" />
                    <figcaption>{g.title}</figcaption>
                  </Link>
                ))}
              </div>
              <p><Link className="btn ghost" to="/portfolio">View all projects</Link></p>
            </section>
          )}

          <QuoteSection S={S} serviceNames={services.map((s) => s.title)} defaultService={service.title} title={`Get a quote for *${service.title.toLowerCase()}*`} />

          {others.length > 0 && (
            <section className="wrap block">
              <h2>Other services</h2>
              <ul className="svc-minis">
                {others.map((s) => (
                  <li key={s.id}>
                    <Link to={`/services/${s.slug}`}>
                      {s.image_url && <img {...photo(s.image_url, SIZES.card)} alt="" loading="lazy" />}
                      <span>{s.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {state === 'loading' && <p className="wrap block">Loading…</p>}
    </Shell>
  );
}
