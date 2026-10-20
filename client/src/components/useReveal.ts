import { useEffect } from 'react';

// Items that fade/slide in the first time they scroll into view.
const SELECTOR = '.card, .shot, .member, .tile, .proj, .srow, .ticks li, .steps li, .gallery > *';

export default function useReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        io.unobserve(el);
        const idx = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        const delay = Math.min(idx, 6) * 45;
        el.style.transitionDelay = `${delay}ms`;
        el.classList.add('in');
        window.setTimeout(() => {
          el.classList.remove('reveal', 'in');
          el.style.transitionDelay = '';
        }, 600 + delay);
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' }); // any visible part counts: very tall forms (Admin > Settings) never reach a percentage of the screen

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.dataset.reveal) return;
        el.dataset.reveal = '1';
        el.classList.add('reveal');
        io.observe(el);
      });
    };
    scan();
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
}
