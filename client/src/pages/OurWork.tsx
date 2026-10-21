import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';
import { CountUp, statPairs } from '../components/Trust';
import { photo, SIZES } from '../img';
import { Project, projectHeading } from './ProjectPage';

// a word or two between * in the heading show in gold
const gold = (t: string) => t.split(/\*([^*]+)\*/).map((p, i) => (i % 2 ? <em key={i} className="gold">{p}</em> : p));
const short = (t?: string | null, n = 230) => {
  const s = (t || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
};

/** /our-work: every project as a large alternating row (photo one side, details the other), with a filter by type of work. */
export default function OurWork() {
  const home = initialHome();
  const [S] = useState<Settings>(() => home?.settings ?? {});
  const [services] = useState<{ id: number; title: string; slug?: string | null }[]>(() => home?.services ?? []);
  const [items, setItems] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    api<Project[]>('/public/gallery').then(setItems).catch((e: Error) => setErr(e.message)).finally(() => setLoaded(true));
  }, []);
  useSeo({ title: S.company_name ? `Our work – ${S.company_name}` : '', description: S.work_intro, canonical: '/our-work' });

  // a project's category can list several kinds of work ("Drywall, Ceiling, Insulation"): each one is its own filter,
  // the same word written twice ("ACMV", "acmv ") shows once, and the most used come first
  const tagsOf = (p: Project) => (p.category || '').split(/[,/|]/).map((t) => t.trim()).filter(Boolean);
  const count = new Map<string, { label: string; n: number }>();
  items.forEach((p) => tagsOf(p).forEach((t) => {
    const k = t.toLowerCase();
    const c = count.get(k);
    if (c) c.n += 1; else count.set(k, { label: t, n: 1 });
  }));
  const cats = [...count.values()].sort((a, b) => b.n - a.n).map((c) => c.label);
  const shown = cat ? items.filter((p) => tagsOf(p).some((t) => t.toLowerCase() === cat.toLowerCase())) : items;
  const stats = statPairs(S).slice(0, 3);
  const wa = (S.whatsapp || '').replace(/\D/g, '');

  return (
    <Shell S={S} services={services}>
      <section className={S.work_bg ? 'ow-hero has-bg' : 'ow-hero'} style={S.work_bg ? { ['--ow-bg' as string]: `url("${S.work_bg}")` } : undefined}>
        <div className="wrap ow-hero-grid">
          <div>
            <p className="hero-badge">Our work</p>
            <h1>{gold(S.work_title || 'Projects we have *built* across Singapore')}</h1>
            {S.work_intro && <p className="lead">{S.work_intro}</p>}
          </div>
          {stats.length > 0 && (
            <dl className="ow-stats">
              {stats.map(([n, t]) => <div key={t}><dd><CountUp value={n} /></dd><dt>{t}</dt></div>)}
            </dl>
          )}
        </div>
      </section>

      <section className="wrap block ow-list" aria-labelledby="ow-recent">
        <div className="ow-head">
          <div>
            <span className="ow-kicker">Recent projects</span>
            <h2 id="ow-recent">Work our team has delivered</h2>
          </div>
          {cats.length > 1 && (
            <div className="chips ow-chips" role="group" aria-label="Filter projects by type of work">
              <button type="button" aria-pressed={cat === ''} onClick={() => setCat('')}>All</button>
              {cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
            </div>
          )}
        </div>

        {err && <p className="err">{err}</p>}
        {loaded && !err && items.length === 0 && <p>Projects will appear here soon.</p>}

        <div className="ow-rows">
          {shown.map((p, i) => (
            <article key={p.id} className={i % 2 ? 'ow-row flip' : 'ow-row'}>
              <Link className="ow-media" to={`/portfolio/${p.slug}`} tabIndex={-1} aria-hidden="true">
                <span className="ow-pic"><img {...photo(p.image_url, SIZES.card)} alt="" loading={i < 2 ? 'eager' : 'lazy'} /></span>
                {p.before_image_url && (
                  <span className="ow-before"><img src={p.before_image_url} alt="" loading="lazy" /><b>Before</b></span>
                )}
              </Link>
              <div className="ow-body">
                <h3><Link to={`/portfolio/${p.slug}`}>{projectHeading(p)}</Link></h3>
                {p.description && <p className="ow-desc">{short(p.description)}</p>}
                <dl className="ow-meta">
                  {p.category && <div><dt>Work</dt><dd>{tagsOf(p).join(', ')}</dd></div>}
                  {p.location && <div><dt>Location</dt><dd>{p.location}</dd></div>}
                  {p.duration && <div><dt>Duration</dt><dd>{p.duration}</dd></div>}
                </dl>
                <Link className="bl-more" to={`/portfolio/${p.slug}`}>View project <span aria-hidden="true">↗</span></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap ow-cta">
        <div>
          <h2>Planning a similar project?</h2>
          <p>Tell us what you need. We visit the site and give you a clear written quotation.</p>
        </div>
        <div className="row gap">
          <Link className="btn" to="/contact#quote">Get a free quote <span aria-hidden="true">↗</span></Link>
          {wa && <a className="btn ghost" href={`https://wa.me/${wa}`}>Chat on WhatsApp</a>}
        </div>
      </section>
    </Shell>
  );
}
