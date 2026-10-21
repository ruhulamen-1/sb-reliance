// Trust signals built only from what the company enters in Admin > Settings.
// Every block hides itself while its fields are empty, so nothing made-up is ever shown.
import { useEffect, useRef } from 'react';
import type { Settings } from './Shell';

const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);
const isUrl = (v?: string) => /^https?:\/\/\S+$/i.test((v || '').trim());

/** "★ 4.9 on Google · 37 reviews", linked to the Google reviews page when one is set. */
export function GoogleRating({ S }: { S: Settings }) {
  const rating = (S.google_rating || '').trim();
  if (!rating) return null;
  const count = (S.google_review_count || '').trim();
  const text = (
    <>
      <span className="stars" aria-hidden="true">★</span> {rating} on Google{count && ` · ${count} reviews`}
    </>
  );
  return isUrl(S.google_reviews_url)
    ? <a href={S.google_reviews_url} target="_blank" rel="noopener noreferrer">{text}</a>
    : <span>{text}</span>;
}

/** Thin row under the hero: Google rating, UEN and licences. */
export function TrustBar({ S }: { S: Settings }) {
  const items = [
    S.google_rating ? <GoogleRating key="g" S={S} /> : null,
    S.uen ? <span key="uen">UEN {S.uen}</span> : null,
    ...lines(S.licenses).map((l) => <span key={l}>{l}</span>),
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="trustbar" aria-label="Company credentials">
      <div className="wrap"><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
    </div>
  );
}

/** "120+ | Projects completed" lines -> big numbers. */
/** "150+" counts up from 0 the first time it scrolls into view. Without JavaScript the real number is in the page. */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const m = /^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value);
    if (!el || !m || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [, pre, num, post] = m;
    const target = parseFloat(num.replace(/,/g, ''));
    const decimals = (num.split('.')[1] || '').length;
    const show = (v: number) => {
      const t = v.toFixed(decimals);
      el.textContent = pre + (num.includes(',') ? Number(t).toLocaleString('en-US', { minimumFractionDigits: decimals }) : t) + post;
    };
    show(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400);
        show(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick); else el.textContent = value;
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); el.textContent = value; };
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

export const statPairs = (S: Settings) => lines(S.stats)
  .map((l) => { const [n, ...t] = l.split('|'); return [n.trim(), t.join('|').trim()]; })
  .filter(([n, t]) => n && t);

/** The same numbers, small, inside the home page hero. */
export function HeroStats({ S }: { S: Settings }) {
  const stats = statPairs(S).slice(0, 3);
  if (!stats.length) return null;
  return (
    <dl className="hero-stats">
      {stats.map(([n, t]) => <div key={t}><dt>{t}</dt><dd><CountUp value={n} /></dd></div>)}
    </dl>
  );
}

export function Stats({ S }: { S: Settings }) {
  const stats = statPairs(S);
  if (!stats.length) return null;
  return (
    <section className="wrap block stats-band" aria-label="In numbers">
      <dl className="statgrid">
        {stats.map(([n, t]) => <div key={t}><dt>{t}</dt><dd><CountUp value={n} /></dd></div>)}
      </dl>
    </section>
  );
}

/** Warranty / guarantee points. */
export function Guarantee({ S }: { S: Settings }) {
  const points = lines(S.warranty_text);
  if (!points.length) return null;
  return (
    <section className="wrap block" aria-labelledby="guarantee">
      <div className="guarantee">
        <div className="seal" aria-hidden="true">✓</div>
        <div>
          <h2 id="guarantee">{S.warranty_title || 'Our guarantee'}</h2>
          <ul className="ticks">{points.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

/** Button to the company's Google reviews. */
export function ReviewsButton({ S }: { S: Settings }) {
  const read = isUrl(S.google_reviews_url);
  const write = isUrl(S.google_review_write_url);
  if (!read && !write) return null;
  return (
    <p className="reviews-cta row gap">
      {read && (
        <a className="btn ghost" href={S.google_reviews_url} target="_blank" rel="noopener noreferrer">
          {S.google_rating ? <>Read all reviews on Google (★ {S.google_rating})</> : 'Read our reviews on Google'}
        </a>
      )}
      {write && <a className="btn ghost" href={S.google_review_write_url} target="_blank" rel="noopener noreferrer">Write a Google review</a>}
    </p>
  );
}

/** Google Map for the address in Settings (no API key needed). Hidden while the address is only "Singapore". */
export function AddressMap({ S }: { S: Settings }) {
  const addr = (S.address || '').trim();
  if (!addr || addr.toLowerCase() === 'singapore') return null;
  return (
    <iframe
      className="map"
      title={`Map: ${addr}`}
      src={`https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
