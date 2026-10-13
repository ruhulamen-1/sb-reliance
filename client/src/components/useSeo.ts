import { useEffect } from 'react';

// Keeps <title> and meta tags in sync when the visitor navigates inside the app.
// The server already puts the right tags in the first HTML response (server/src/seo.ts);
// this only updates them afterwards. Empty title = settings not loaded yet, so do nothing.
function meta(attr: 'name' | 'property', key: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

export default function useSeo(o: { title: string; description?: string; canonical?: string }) {
  useEffect(() => {
    if (!o.title) return;
    document.title = o.title;
    if (o.description) {
      meta('name', 'description').content = o.description;
      meta('property', 'og:description').content = o.description;
    }
    meta('property', 'og:title').content = o.title;
    // keep the server's origin (SITE_URL) and only swap the path
    const link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (link && o.canonical) {
      const url = new URL(o.canonical, link.href).href;
      link.href = url;
      meta('property', 'og:url').content = url;
    }
  }, [o.title, o.description, o.canonical]);
}
