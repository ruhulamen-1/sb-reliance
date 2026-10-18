import { useEffect } from 'react';
import type Lenis from 'lenis';

// Inertia ("buttery") scrolling for the mouse wheel on computers. Phones and tablets keep their own native
// scrolling, and so does anyone who asked their device to reduce motion. The small library loads after the page is ready.
let lenis: Lenis | null = null;
let loading = false;

const wanted = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function useSmoothScroll() {
  useEffect(() => {
    if (!wanted()) return;
    let cancel: () => void = () => undefined;
    if (!lenis && !loading) {
      const start = async () => {
        loading = true;
        const { default: LenisLib } = await import('lenis');
        loading = false;
        if (lenis || !document.querySelector('main.page')) return; // left for another page (e.g. Admin) while loading
        lenis = new LenisLib({ lerp: 0.1, smoothWheel: true, allowNestedScroll: true, anchors: { offset: -70 }, autoRaf: true });
      };
      const id = window.setTimeout(() => { void start(); }, 700); // after the page has settled
      cancel = () => window.clearTimeout(id);
    }
    return () => {
      cancel();
      // pages mount their own Shell: only stop smoothing when no public page is left (e.g. moving to Admin)
      window.setTimeout(() => {
        if (lenis && !document.querySelector('main.page')) { lenis.destroy(); lenis = null; }
      }, 150);
    };
  }, []);
}
