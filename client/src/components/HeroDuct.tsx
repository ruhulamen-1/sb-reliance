import { useEffect, useRef, useState } from 'react';

// desktop with a mouse, motion allowed and WebGL available; phones never download the 3D code
function canShow3d() {
  if (!window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/** Slowly turning 3D ducting model on the right of the home page hero. three.js is loaded only after the page has finished loading. */
export default function HeroDuct() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => { setOn(canShow3d()); }, []);

  useEffect(() => {
    if (!on) return;
    let stop: (() => void) | undefined;
    let dead = false;
    const start = () => {
      import('./ductScene').then(({ mountDuct }) => {
        const c = canvas.current;
        const hero = wrap.current?.closest('.hero') as HTMLElement | null;
        if (dead || !c || !hero) return;
        stop = mountDuct(c, hero);
        requestAnimationFrame(() => setShown(true));
      }).catch(() => undefined);
    };
    const later = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 2500 });
      else setTimeout(start, 600);
    };
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
    return () => {
      dead = true;
      window.removeEventListener('load', later);
      stop?.();
    };
  }, [on]);

  if (!on) return null;
  return (
    <div ref={wrap} className={shown ? 'hero-visual hero-3d on' : 'hero-visual hero-3d'} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
