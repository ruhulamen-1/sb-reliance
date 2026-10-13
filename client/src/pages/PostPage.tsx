import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';
import NotFound from './NotFound';
import { TextBlocks, Service } from '../components/content';

interface Post { id: number; title: string; slug: string; excerpt: string; content: string; image_url?: string | null; created_at: string }

export default function PostPage() {
  const { slug = '' } = useParams();
  const [S, setS] = useState<Settings>({});
  const [post, setPost] = useState<Post | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'err'>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    setState('loading');
    api<{ post: Post; services: Service[]; settings: Settings }>(`/public/posts/${encodeURIComponent(slug)}`)
      .then((d) => { setPost(d.post); setServices(d.services ?? []); setS(d.settings ?? {}); setState('ok'); })
      .catch((e: Error) => { setErr(e.message); setState(/not found/i.test(e.message) ? 'missing' : 'err'); });
    window.scrollTo({ top: 0 });
  }, [slug]);

  useSeo({ title: post && S.company_name ? `${post.title} – ${S.company_name}` : '', description: post?.excerpt, canonical: `/blog/${slug}` });

  if (state === 'missing') return <NotFound />;
  return (
    <Shell S={S} services={services}>
      {state === 'err' && <p className="err wrap block">{err}</p>}
      {state === 'loading' && <p className="wrap block">Loading…</p>}
      {post && (
        <article className="wrap narrow block post">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden="true">/</span> <Link to="/blog">Blog</Link>
          </nav>
          <h1 className="h1m">{post.title}</h1>
          <small>{new Date(post.created_at).toLocaleDateString('en-SG', { dateStyle: 'medium' })}</small>
          {post.image_url && <img className="cardimg postimg" src={post.image_url} alt={post.title} />}
          <p className="lead">{post.excerpt}</p>
          <div className="prose"><TextBlocks text={post.content} /></div>
          <p className="row gap">
            <Link className="btn" to="/contact">Request a quote</Link>
            <Link className="btn ghost" to="/blog">More articles</Link>
          </p>
        </article>
      )}
    </Shell>
  );
}
