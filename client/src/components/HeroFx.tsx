import { CSSProperties, useEffect, useRef } from 'react';

// soft air streams: each line is drawn twice, a faint guide and a short bright streak that travels along it
const LINES = [
  'M-40 120 C220 40 420 200 640 120 S1040 40 1240 110',
  'M-40 190 C200 130 460 260 700 190 S1060 120 1240 180',
  'M-40 260 C240 200 440 320 680 250 S1020 190 1240 250',
  'M-40 330 C260 280 500 380 760 320 S1080 270 1240 320',
];

/** Moving background for the home page hero: a faint blueprint grid, drifting gold and green light, air streams, and a glow that follows the mouse. */
export default function HeroFx() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const hero = el?.parentElement;
    if (!el || !hero) return;
    // the glow is for a mouse only, and off for people who ask their device to reduce motion
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const move = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty('--mx', `${x}px`);
        el.style.setProperty('--my', `${y}px`);
        el.classList.add('glow-on');
      });
    };
    const leave = () => el.classList.remove('glow-on');
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    return () => {
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="hero-fx" aria-hidden="true">
      <span className="fx-grid" />
      <span className="fx-aurora a1" />
      <span className="fx-aurora a2" />
      <span className="fx-aurora a3" />
      <svg className="fx-air" viewBox="0 0 1200 400" preserveAspectRatio="none">
        {LINES.map((d, i) => (
          <g key={d} style={{ '--delay': `${i * -2.3}s`, '--dur': `${9 + (i % 2) * 3}s` } as CSSProperties}>
            <path className="fx-guide" d={d} pathLength={100} />
            <path className={i % 2 ? 'fx-streak gold' : 'fx-streak'} d={d} pathLength={100} />
          </g>
        ))}
      </svg>
      <span className="fx-glow" />
    </div>
  );
}
