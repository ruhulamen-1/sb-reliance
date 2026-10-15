import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, homeData, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';
import { photo, SIZES } from '../img';

import { Project, projectHeading } from './ProjectPage';

export default function Portfolio() {
  const [S, setS] = useState<Settings>(() => initialHome()?.settings ?? {});
  const [items, setItems] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    homeData<{ settings?: Settings }>().then((d) => setS(d.settings ?? {})).catch(() => undefined);
    api<Project[]>('/public/gallery').then(setItems).catch((e: Error) => setErr(e.message)).finally(() => setLoaded(true));
  }, []);
  useSeo({ title: S.company_name ? `Portfolio – ${S.company_name}` : '', description: S.company_name ? `Completed projects by ${S.company_name}: air-conditioning, electrical, CCTV, ceiling, painting, tiles and building works.` : '', canonical: '/portfolio' });

  const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  const shown = cat ? items.filter((i) => i.category === cat) : items;

  return (
    <Shell S={S}>
      <section className="wrap block">
        <h1 className="h1s">Portfolio</h1>
        <p className="lead">A selection of our completed work.</p>

        {err && <p className="err">{err}</p>}

        {cats.length > 0 && (
          <div className="chips" role="group" aria-label="Filter projects by category">
            <button type="button" aria-pressed={cat === ''} onClick={() => setCat('')}>All</button>
            {cats.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        )}

        {loaded && !err && items.length === 0 && <p>Projects will appear here soon. Add photos in Admin → Gallery.</p>}

        {/* each project opens its own page (/portfolio/:slug), which Google can list on its own */}
        <div className="gallery">
          {shown.map((p) => (
            <Link key={p.id} className="proj" to={`/portfolio/${p.slug}`}>
              <span className="projimg">
                <img {...photo(p.image_url, SIZES.card)} alt={p.title} loading="lazy" />
                {p.before_image_url && <span className="badge">Before / after</span>}
              </span>
              <strong>{projectHeading(p)}</strong>
              {p.category && <small>{p.category}</small>}
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}
