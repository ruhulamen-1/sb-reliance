import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Service { id: number; title: string; description: string; image_url?: string | null }
interface Testimonial { id: number; name: string; location: string; text: string }
interface Post { id: number; title: string; excerpt: string; image_url?: string | null; created_at: string }
interface GalleryItem { id: number; title: string; image_url: string }
type Settings = Record<string, string>;
interface HomeData { services: Service[]; testimonials: Testimonial[]; posts: Post[]; gallery: GalleryItem[]; settings: Settings }

const CHIPS = ['#7FA6D6', '#9CC5B8', '#F2D16B', '#E8A598', '#C9C3E6', '#F4EFE6', '#A7D3C4', '#F0B88A'];
const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);
const EMPTY_FORM = { name: '', whatsapp: '', address: '', house_type: '', service_type: '', preferred_date: '', message: '' };

export default function Home() {
  const [data, setData] = useState<HomeData>({ services: [], testimonials: [], posts: [], gallery: [], settings: {} });
  const [form, setForm] = useState(EMPTY_FORM);
  const [addons, setAddons] = useState<string[]>([]);
  const [loadErr, setLoadErr] = useState('');
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' });

  useEffect(() => {
    api<Partial<HomeData>>('/public/home')
      .then((d) => setData({ services: d.services ?? [], testimonials: d.testimonials ?? [], posts: d.posts ?? [], gallery: d.gallery ?? [], settings: d.settings ?? {} }))
      .catch((e: Error) => setLoadErr(e.message));
  }, []);

  const S = data.settings;
  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const serviceNames = data.services.map((s) => s.title);
  const steps = lines(S.steps).map((l) => {
    const [t, ...d] = l.split('|');
    return [t.trim(), d.join('|').trim()];
  });

  useEffect(() => {
    if (S.company_name) document.title = S.company_name;
  }, [S.company_name]);

  const set = (k: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ kind: 'sending' });
    try {
      await api('/quotes', { method: 'POST', body: { ...form, addons } });
      setState({ kind: 'ok' });
      setForm(EMPTY_FORM);
      setAddons([]);
    } catch (err) {
      setState({ kind: 'err', msg: (err as Error).message });
    }
  }

  return (
    <>
      {S.page_bg && <div className="pagebg" aria-hidden="true" style={{ backgroundImage: `url("${S.page_bg}")` }} />}
      <header className="topbar">
        <div className="wrap row between">
          <a className="brand" href="/">{S.brand}</a>
          <nav className="row gap">
            <a href="#services">Services</a>
            <a href="#included">Why us</a>
            <a href="#blog">Blog</a>
            <a href="#quote">Contact</a>
            <Link to="/admin">Admin</Link>
          </nav>
          <a className="btn" href={wa}>WhatsApp {S.phone}</a>
        </div>
      </header>

      {loadErr && <p className="err wrap block">{loadErr}</p>}

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>{S.hero_title}</h1>
            <p className="lead">{S.hero_lead}</p>
            <div className="row gap">
              <a className="btn" href="#quote">Request a quote</a>
              <a className="btn ghost" href={wa}>Chat on WhatsApp</a>
            </div>
          </div>
          {S.hero_image ? (
            <img className="heroimg" src={S.hero_image} alt="" />
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

      <section id="services" className="wrap block">
        <h2>{S.services_title}</h2>
        <div className="grid3">
          {data.services.map((s) => (
            <article key={s.id} className="card">
              {s.image_url && <img className="cardimg" src={s.image_url} alt="" />}
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </article>
          ))}
        </div>
      </section>

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

      {data.gallery.length > 0 && (
        <section id="work" className="wrap block">
          <h2>Our work</h2>
          <div className="gallery">
            {data.gallery.map((g) => (
              <figure key={g.id} className="shot">
                <img src={g.image_url} alt={g.title} loading="lazy" />
                <figcaption>{g.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {data.testimonials.length > 0 && (
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
        </section>
      )}

      {data.posts.length > 0 && (
        <section id="blog" className="wrap block">
          <h2>From the blog</h2>
          <div className="grid3">
            {data.posts.map((p) => (
              <article key={p.id} className="card">
                {p.image_url && <img className="cardimg" src={p.image_url} alt="" />}
                <h3>{p.title}</h3>
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
          <form onSubmit={submit} className="form">
            <label>Full name<input required value={form.name} onChange={set('name')} /></label>
            <label>WhatsApp number<input required value={form.whatsapp} onChange={set('whatsapp')} /></label>
            <label className="full">Address<input required value={form.address} onChange={set('address')} /></label>
            <label>Property type<select required value={form.house_type} onChange={set('house_type')}><option value="">Select</option>{lines(S.property_types).map((h) => <option key={h}>{h}</option>)}</select></label>
            <label>Main service needed<select required value={form.service_type} onChange={set('service_type')}><option value="">Select</option>{serviceNames.map((h) => <option key={h}>{h}</option>)}</select></label>
            <fieldset className="full">
              <legend>Other services needed</legend>
              {serviceNames.map((a) => (
                <label key={a} className="check">
                  <input type="checkbox" checked={addons.includes(a)} onChange={(e) => setAddons(e.target.checked ? [...addons, a] : addons.filter((x) => x !== a))} />
                  {a}
                </label>
              ))}
            </fieldset>
            <label>Preferred date<input type="date" value={form.preferred_date} onChange={set('preferred_date')} /></label>
            <label className="full">Message<textarea rows={3} value={form.message} onChange={set('message')} /></label>
            <button className="btn full" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'Sending…' : 'Send request'}</button>
            {state.kind === 'ok' && <p className="ok full">Request sent. We will contact you shortly.</p>}
            {state.kind === 'err' && <p className="err full">{state.msg}</p>}
          </form>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap row between">
          <span>{S.company_name} · {S.address}</span>
          <span>{S.phone} · {S.email}</span>
        </div>
      </footer>
    </>
  );
}
