import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import QuoteForm from '../components/QuoteForm';
import useSeo from '../components/useSeo';
import NotFound from './NotFound';
import { serviceHeading, Service } from '../components/content';
import { HIGH, photo, SIZES } from '../img';

export interface Project {
  id: number; title: string; slug: string; category?: string | null; location?: string | null; duration?: string | null;
  description?: string | null; image_url: string; before_image_url?: string | null;
  photo_2?: string | null; photo_3?: string | null; photo_4?: string | null;
}
interface ProjectData { project: Project; service: Service | null; related: Project[] }

/** "Office ACMV installation" + ", Jurong" unless the name already says where (same as server/src/seo.ts). */
export const projectHeading = (p: Pick<Project, 'title' | 'location'>) => {
  const loc = (p.location || '').trim();
  return loc && !p.title.toLowerCase().includes(loc.toLowerCase()) ? `${p.title}, ${loc}` : p.title;
};

export default function ProjectPage() {
  const { slug = '' } = useParams();
  const home = initialHome();
  const [S] = useState<Settings>(() => home?.settings ?? {});
  const [services] = useState<Service[]>(() => home?.services ?? []);
  // the server puts this project in the page (window.__HOME__.project), so it shows at once on first load
  const [data, setData] = useState<ProjectData | null>(() => (home?.project?.project?.slug === slug ? home.project : null));
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'err'>(() => (data ? 'ok' : 'loading'));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (data?.project.slug === slug) return;
    setState('loading');
    api<ProjectData>(`/public/projects/${encodeURIComponent(slug)}`)
      .then((d) => { setData(d); setState('ok'); })
      .catch((e: Error) => { setErr(e.message); setState(/not found/i.test(e.message) ? 'missing' : 'err'); });
    window.scrollTo({ top: 0, behavior: 'instant' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const p = data?.project;
  useSeo({ title: p && S.company_name ? `${projectHeading(p)} – ${S.company_name}` : '', description: p?.description || undefined, canonical: `/portfolio/${slug}` });

  if (state === 'missing') return <NotFound />;
  const extra = p ? [p.photo_2, p.photo_3, p.photo_4].filter((x): x is string => !!x) : [];
  const svc = data?.service;

  return (
    <Shell S={S} services={services}>
      {state === 'err' && <p className="err wrap block">{err}</p>}
      {p && (
        <>
          <article className="wrap block project">
            <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/portfolio">Portfolio</Link> / {p.title}</nav>
            <h1 className="h1s">{projectHeading(p)}</h1>
            {(p.category || p.location || p.duration) && (
              <dl className="projfacts">
                {p.category && <div><dt>Type</dt><dd>{p.category}</dd></div>}
                {p.location && <div><dt>Location</dt><dd>{p.location}</dd></div>}
                {p.duration && <div><dt>Time taken</dt><dd>{p.duration}</dd></div>}
              </dl>
            )}

            {p.before_image_url ? (
              <div className="beforeafter projba">
                <div><img {...photo(p.before_image_url, SIZES.wide)} alt={`${p.title}, before`} {...HIGH} /><span>Before</span></div>
                <div><img {...photo(p.image_url, SIZES.wide)} alt={`${p.title}, after`} /><span>After</span></div>
              </div>
            ) : (
              <img className="projmain" {...photo(p.image_url, SIZES.wide)} alt={p.title} {...HIGH} />
            )}

            {p.description && <div className="projtext">{p.description.split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}</div>}

            {extra.length > 0 && (
              <div className="gallery projmore">
                {extra.map((src, i) => <img key={src} {...photo(src, SIZES.card)} alt={`${p.title}, photo ${i + 2}`} loading="lazy" />)}
              </div>
            )}

            {svc?.slug && (
              <p className="projsvc">
                More about this service: <Link to={`/services/${svc.slug}`}>{serviceHeading(svc)}</Link>
              </p>
            )}
          </article>

          <section id="quote" className="band">
            <div className="wrap narrow">
              <h2>Need similar work?</h2>
              <p>{S.quote_intro}</p>
              <QuoteForm S={S} serviceNames={services.map((s) => s.title)} defaultService={svc?.title || ''} />
            </div>
          </section>

          {data!.related.length > 0 && (
            <section className="wrap block">
              <h2>More projects</h2>
              <div className="gallery">
                {data!.related.map((r) => (
                  <Link key={r.id} className="shot projlink" to={`/portfolio/${r.slug}`}>
                    <img {...photo(r.image_url, SIZES.card)} alt={r.title} loading="lazy" />
                    <span>{projectHeading(r)}</span>
                  </Link>
                ))}
              </div>
              <p><Link className="btn ghost" to="/portfolio">View all projects</Link></p>
            </section>
          )}
        </>
      )}
    </Shell>
  );
}
