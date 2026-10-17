import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';
import { photo, SIZES } from '../img';

interface Post { id: number; title: string; slug: string; excerpt: string; image_url?: string | null; created_at: string }

/** Every blog post, newest first. The home page shows only the latest three. */
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

  return (
    <Shell S={S}>
      <section className="wrap block">
        <h1 className="h1s">Blog</h1>
        <p className="lead">Guides and tips for homes, offices and shops in Singapore.</p>
        {err && <p className="err">{err}</p>}
        {loaded && !err && posts.length === 0 && <p>Posts will appear here soon.</p>}
        <div className="grid3">
          {posts.map((p) => (
            <article key={p.id} className="card">
              {p.image_url && <img className="cardimg" {...photo(p.image_url, SIZES.card)} alt={p.title} loading="lazy" />}
              <h3><Link to={`/blog/${p.slug}`}>{p.title}</Link></h3>
              <p>{p.excerpt}</p>
              <small>{new Date(p.created_at).toLocaleDateString('en-SG', { dateStyle: 'medium' })}</small>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}
