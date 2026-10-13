import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';

interface Project { id: number; title: string; category: string; image_url: string }

export default function Portfolio() {
  const [S, setS] = useState<Settings>({});
  const [items, setItems] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    api<{ settings?: Settings }>('/public/home').then((d) => setS(d.settings ?? {})).catch(() => undefined);
    api<Project[]>('/public/gallery').then(setItems).catch((e: Error) => setErr(e.message)).finally(() => setLoaded(true));
  }, []);
  useSeo({ title: S.company_name ? `Portfolio – ${S.company_name}` : '', description: S.company_name ? `Completed projects by ${S.company_name}: air-conditioning, electrical, CCTV, ceiling, painting, tiles and building works.` : '', canonical: '/portfolio' });

  const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const shown = cat ? items.filter((i) => i.category === cat) : items;
  const cur = open !== null ? shown[open] : undefined;

  function show(i: number) {
    setOpen(i);
    dlg.current?.showModal();
  }
  const step = (d: number) => setOpen((i) => (i === null ? i : (i + d + shown.length) % shown.length));

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

        <div className="gallery">
          {shown.map((p, i) => (
            <button key={p.id} type="button" className="proj" onClick={() => show(i)} aria-label={`View ${p.title}`}>
              <img src={p.image_url} alt={p.title} loading="lazy" />
              <strong>{p.title}</strong>
              {p.category && <small>{p.category}</small>}
            </button>
          ))}
        </div>
      </section>

      <dialog ref={dlg} className="lightbox" aria-label={cur?.title || 'Project photo'} onClose={() => setOpen(null)}
        onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}>
        {cur && (
          <figure>
            <img src={cur.image_url} alt={cur.title} />
            <figcaption><strong>{cur.title}</strong>{cur.category && <small> · {cur.category}</small>}</figcaption>
            <div className="lbbar">
              <div className="row gap">
                <button type="button" className="btn ghost" onClick={() => step(-1)} disabled={shown.length < 2}>Previous</button>
                <button type="button" className="btn ghost" onClick={() => step(1)} disabled={shown.length < 2}>Next</button>
              </div>
              <button type="button" className="btn" onClick={() => dlg.current?.close()}>Close</button>
            </div>
          </figure>
        )}
      </dialog>
    </Shell>
  );
}
