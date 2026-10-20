import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';
import NotFound from './NotFound';
import { TextBlocks, Service } from '../components/content';
import { PostSummary, Tags } from '../components/BlogTags';
import { HIGH, photo, SIZES } from '../img';

interface Post extends PostSummary { content: string }

export default function PostPage() {
  const { slug = '' } = useParams();
  const [S, setS] = useState<Settings>({});
  const [post, setPost] = useState<Post | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [others, setOthers] = useState<PostSummary[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'err'>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    setState('loading');
    api<{ post: Post; services: Service[]; settings: Settings }>(`/public/posts/${encodeURIComponent(slug)}`)
      .then((d) => { setPost(d.post); setServices(d.services ?? []); setS(d.settings ?? {}); setState('ok'); })
      .catch((e: Error) => { setErr(e.message); setState(/not found/i.test(e.message) ? 'missing' : 'err'); });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);
  // other articles under the post; the page works without them
  useEffect(() => { api<PostSummary[]>('/public/posts').then(setOthers).catch(() => setOthers([])); }, []);

  useSeo({ title: post && S.company_name ? `${post.title} – ${S.company_name}` : '', description: post?.excerpt, canonical: `/blog/${slug}` });

  if (state === 'missing') return <NotFound />;
  const wa = (S.whatsapp || '').replace(/\D/g, '');
  const more = others.filter((p) => p.slug !== slug).slice(0, 3);
  return (
    <Shell S={S} services={services}>
      {state === 'err' && <p className="err wrap block">{err}</p>}
      {state === 'loading' && <p className="wrap block">Loading…</p>}
      {post && (
        <article className="wrap block post pf">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden="true">/</span> <Link to="/blog">Blog</Link>
          </nav>
          <header className={post.image_url ? 'pf-hero' : 'pf-hero noimg'}>
            <div>
              <Tags p={post} />
              <h1 className="h1m">{post.title}</h1>
              {post.excerpt && <p className="lead">{post.excerpt}</p>}
            </div>
            {post.image_url && <img className="pf-img" {...photo(post.image_url, SIZES.wide)} alt={post.title} {...HIGH} />}
          </header>

          <div className="pf-body">
            <div className="prose pf-prose">
              <TextBlocks text={post.content} />
              <p className="row gap pf-cta">
                <Link className="btn" to="/contact">Request a quote</Link>
                <Link className="btn ghost" to="/blog">More articles</Link>
              </p>
            </div>
            <aside className="pf-side">
              <div className="pf-box pf-quote">
                <h2>Need this done?</h2>
                <p>Tell us about your place. We visit, check the site and give you a clear price.</p>
                <Link className="btn" to="/contact">Get a free quote</Link>
                {wa && <a className="btn ghost" href={`https://wa.me/${wa}`}>WhatsApp us</a>}
              </div>
              {services.length > 0 && (
                <div className="pf-box">
                  <h2>Our services</h2>
                  <ul className="pf-links">
                    {services.filter((s) => s.slug).map((s) => <li key={s.id}><Link to={`/services/${s.slug}`}>{s.title}</Link></li>)}
                  </ul>
                </div>
              )}
            </aside>
          </div>

          {more.length > 0 && (
            <section className="pf-more">
              <h2>More articles</h2>
              <div className="bl-grid">
                {more.map((p) => (
                  <article key={p.id} className="bl-card">
                    <Link className="bl-img" to={`/blog/${p.slug}`} tabIndex={-1} aria-hidden="true">
                      {p.image_url ? <img {...photo(p.image_url, SIZES.card)} alt="" loading="lazy" /> : <span className="bl-noimg" />}
                    </Link>
                    <div className="bl-body">
                      <Tags p={p} />
                      <h3><Link to={`/blog/${p.slug}`}>{p.title}</Link></h3>
                      <p>{p.excerpt}</p>
                      <Link className="bl-more" to={`/blog/${p.slug}`}>Read article <span aria-hidden="true">↗</span></Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </article>
      )}
    </Shell>
  );
}
