import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import QuoteForm from '../components/QuoteForm';
import useSeo from '../components/useSeo';
import NotFound from './NotFound';
import { Guarantee, TrustBar } from '../components/Trust';
import { faqPairs, serviceHeading, TextBlocks, Service } from '../components/content';
import { HIGH, photo, SIZES } from '../img';
import { PriceTable } from '../components/PriceGuide';

interface GalleryItem { id: number; title: string; slug?: string | null; image_url: string }

export default function ServicePage() {
  const { slug = '' } = useParams();
  // the settings and services are already in the page (window.__HOME__), so the service shows at once; only its photos are fetched
  const [S, setS] = useState<Settings>(() => initialHome()?.settings ?? {});
  const [services, setServices] = useState<Service[]>(() => initialHome()?.services ?? []);
  const [service, setService] = useState<Service | null>(() => services.find((x) => x.slug === slug) ?? null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'err'>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    setState('loading');
    api<{ service: Service; services: Service[]; gallery: GalleryItem[]; settings: Settings }>(`/public/services/${encodeURIComponent(slug)}`)
      .then((d) => { setService(d.service); setServices(d.services ?? []); setGallery(d.gallery ?? []); setS(d.settings ?? {}); setState('ok'); })
      .catch((e: Error) => { setErr(e.message); setState(/not found/i.test(e.message) ? 'missing' : 'err'); });
    window.scrollTo({ top: 0 });
  }, [slug]);

  useSeo({
    title: service && S.company_name ? service.seo_title || `${serviceHeading(service)} – ${S.company_name}` : '',
    description: service ? service.seo_description || service.description : '',
    canonical: `/services/${slug}`,
  });

  if (state === 'missing') return <NotFound />;
  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const faq = faqPairs(service?.faq);
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
                <div className="row gap">
                  <a className="btn" href="#quote">Get a free quote</a>
                  <a className="btn ghost" href={wa}>WhatsApp {S.phone}</a>
                </div>
              </div>
              {service.image_url && <img className="heroimg" {...photo(service.image_url, SIZES.hero)} alt={serviceHeading(service)} {...HIGH} />}
            </div>
          </section>

          <TrustBar S={S} />

          <section className="wrap block svc-body">
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
          </section>

          <PriceTable service={service} />

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

          <section id="quote" className="band">
            <div className="wrap narrow">
              <h2>Get a quote for {service.title.toLowerCase()}</h2>
              <p>{S.quote_intro}</p>
              <QuoteForm S={S} serviceNames={services.map((s) => s.title)} defaultService={service.title} />
            </div>
          </section>

          {others.length > 0 && (
            <section className="wrap block">
              <h2>Other services</h2>
              <ul className="svc-links">
                {others.map((s) => <li key={s.id}><Link to={`/services/${s.slug}`}>{serviceHeading(s)}</Link></li>)}
              </ul>
            </section>
          )}
        </>
      )}
      {state === 'loading' && <p className="wrap block">Loading…</p>}
    </Shell>
  );
}
