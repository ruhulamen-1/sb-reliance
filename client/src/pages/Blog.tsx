import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';
import { HIGH, photo, SIZES } from '../img';
import { PostSummary, Tags } from '../components/BlogTags';

type Post = PostSummary;

/** Every blog post, newest first: the latest one large, the rest as cards. The home page shows only the latest five. */
export default function Blog() {
  const [S] = useState<Settings>(() => initialHome()?.settings ?? {});
  const [posts, setPosts] = useState<Post[]>(() => initialHome()?.allPosts ?? []);
  const [loaded, setLoaded] = useState(() => !!initialHome()?.allPosts);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loaded) return;
    api<Post[]>('/public/posts').then(setPosts).catch((e: Error) => setErr(e.message)).finally(() => setLoaded(true));
  }, [loaded]);
  useSeo({ title: S.company_name ? `Blog – ${S.company_name}` : '', description: S.company_name ? `Guides from ${S.company_name} on hacking, renovation, air-conditioning, electrical, CCTV, painting and tiling in Singapore.` : '', canonical: '/blog' });

  const [first, ...rest] = posts;
  return (
    <Shell S={S}>
      <section className="wrap block blog-page">
        <header className="bl-head">
          <h1>Blog</h1>
          <p className="lead">Guides and tips for homes, offices and shops in Singapore.</p>
        </header>
        {err && <p className="err">{err}</p>}
        {loaded && !err && posts.length === 0 && <p>Posts will appear here soon.</p>}

        {first && (
          <article className="bl-feature">
            <Link className="bl-img" to={`/blog/${first.slug}`} tabIndex={-1} aria-hidden="true">
              {first.image_url ? <img {...photo(first.image_url, SIZES.wide)} alt="" {...HIGH} /> : <span className="bl-noimg" />}
            </Link>
            <div className="bl-body">
              <Tags p={first} />
              <h2><Link to={`/blog/${first.slug}`}>{first.title}</Link></h2>
              <p>{first.excerpt}</p>
              <Link className="bl-more" to={`/blog/${first.slug}`}>Read article <span aria-hidden="true">↗</span></Link>
            </div>
          </article>
        )}

        {rest.length > 0 && (
          <div className="bl-grid">
            {rest.map((p) => (
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
        )}
      </section>
    </Shell>
  );
}
