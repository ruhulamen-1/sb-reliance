// SEO helpers: per-page <head> tags, JSON-LD, robots.txt and sitemap.xml.
// Pure functions (no DB, no Express) so they are easy to test.
// The page titles/descriptions below are mirrored in client/src/pages/* (useSeo) for in-app navigation.

export type Settings = Record<string, string>;
export interface SeoService { title: string; description: string }

const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);
const clip = (v: string, max = 160) => {
  const t = v.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);
const abs = (base: string, url: string) => (/^https?:\/\//i.test(url) ? url : base + (url.startsWith('/') ? url : `/${url}`));
// the default settings ship with a placeholder email; never publish it
const realEmail = (e?: string) => (e && !/@example\.com$/i.test(e.trim()) ? e.trim() : '');

/** Pages that should be in the sitemap. /services, /why-us and /blog show the home page, so they are not listed. */
export const INDEXABLE = ['/', '/portfolio', '/team', '/contact', '/about', '/privacy-policy'];
const HOME_ALIASES: Record<string, string> = { '/services': 'Services', '/why-us': 'Why choose us', '/blog': 'Blog' };

interface PageMeta {
  title: string;
  description: string;
  canonical?: string; // path
  noindex?: boolean;
  status: number;
  schema?: boolean;
}

export function pageMeta(path: string, S: Settings): PageMeta {
  const co = S.company_name || S.brand || 'SB Reliance';
  const homeDesc = clip(S.seo_description || S.hero_lead || S.about_text || '');
  switch (path) {
    case '/':
      return { title: S.seo_title || co, description: homeDesc, canonical: '/', status: 200, schema: true };
    case '/services':
    case '/why-us':
    case '/blog':
      return { title: `${HOME_ALIASES[path]} – ${co}`, description: homeDesc, canonical: '/', status: 200 };
    case '/portfolio':
      return { title: `Portfolio – ${co}`, description: clip(`Completed projects by ${co}: air-conditioning, electrical, CCTV, ceiling, painting, tiles and building works.`), canonical: path, status: 200 };
    case '/team':
      return { title: `Team – ${co}`, description: clip(`Meet the people at ${co} who plan, install and finish your project.`), canonical: path, status: 200 };
    case '/contact':
      return { title: `Contact – ${co}`, description: clip(`Contact ${co}: call, WhatsApp or send a quote request. ${S.address || ''}`), canonical: path, status: 200, schema: true };
    case '/about':
      return { title: `About us – ${co}`, description: clip(lines(S.about_intro)[0] || S.about_text || ''), canonical: path, status: 200, schema: true };
    case '/privacy-policy':
      return { title: `Privacy policy – ${co}`, description: clip(`How ${co} collects and uses the details you send us.`), canonical: path, status: 200 };
    case '/admin':
      return { title: `Admin – ${co}`, description: '', noindex: true, status: 200 };
    default:
      return { title: `Page not found – ${co}`, description: '', noindex: true, status: 404 };
  }
}

const DAY: Record<string, string> = { mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su' };
function openingHours(v?: string): string[] {
  const out: string[] = [];
  for (const l of lines(v)) {
    const m = l.match(/^([A-Za-z]{3})[a-z]*(?:\s*-\s*([A-Za-z]{3})[a-z]*)?\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const a = DAY[m[1].toLowerCase()];
    const b = m[2] ? DAY[m[2].toLowerCase()] : a;
    if (!a || !b) continue;
    out.push(`${a === b ? a : `${a}-${b}`} ${m[3].padStart(2, '0')}:${m[4]}-${m[5].padStart(2, '0')}:${m[6]}`);
  }
  return out;
}

export function businessJsonLd(S: Settings, services: SeoService[], base: string): Record<string, unknown> {
  const co = S.company_name || S.brand || 'SB Reliance';
  const img = S.hero_image || S.about_image || S.logo;
  const addr = (S.address || '').trim();
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'GeneralContractor',
    '@id': `${base}/#business`,
    name: co,
    url: `${base}/`,
    description: clip(S.seo_description || S.about_text || ''),
    address: {
      '@type': 'PostalAddress',
      ...(addr && addr.toLowerCase() !== 'singapore' ? { streetAddress: addr } : {}),
      addressLocality: 'Singapore',
      addressCountry: 'SG',
    },
    areaServed: lines(S.service_area).length ? lines(S.service_area) : ['Singapore'],
  };
  if (S.phone) data.telephone = S.phone;
  if (realEmail(S.email)) data.email = realEmail(S.email);
  if (img) data.image = abs(base, img);
  if (S.logo) data.logo = abs(base, S.logo);
  if (S.uen) data.identifier = { '@type': 'PropertyValue', propertyID: 'UEN', value: S.uen };
  const same = lines(S.social_links).filter(isHttpUrl);
  if (same.length) data.sameAs = same;
  const hours = openingHours(S.open_hours);
  if (hours.length) data.openingHours = hours;
  if (services.length) {
    data.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: S.services_title || 'Services',
      itemListElement: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: clip(s.description, 200) } })),
    };
  }
  // Deliberately no aggregateRating/review markup: only add it from real, verifiable reviews.
  return data;
}

export function headTags(path: string, S: Settings, services: SeoService[], base: string): { tags: string; status: number } {
  const m = pageMeta(path, S);
  const co = S.company_name || S.brand || 'SB Reliance';
  const image = S.hero_image || S.about_image || S.logo;
  const t: string[] = [`<title>${esc(m.title)}</title>`];
  if (m.description) t.push(`<meta name="description" content="${esc(m.description)}" />`);
  t.push(m.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow, max-image-preview:large" />');
  if (!m.noindex && m.canonical) {
    const url = base + (m.canonical === '/' ? '/' : m.canonical);
    t.push(`<link rel="canonical" href="${esc(url)}" />`);
    t.push('<meta property="og:type" content="website" />');
    t.push(`<meta property="og:site_name" content="${esc(co)}" />`);
    t.push('<meta property="og:locale" content="en_SG" />');
    t.push(`<meta property="og:title" content="${esc(m.title)}" />`);
    if (m.description) t.push(`<meta property="og:description" content="${esc(m.description)}" />`);
    t.push(`<meta property="og:url" content="${esc(url)}" />`);
    if (image) t.push(`<meta property="og:image" content="${esc(abs(base, image))}" />`);
    t.push(`<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`);
    t.push(`<meta name="twitter:title" content="${esc(m.title)}" />`);
    if (m.description) t.push(`<meta name="twitter:description" content="${esc(m.description)}" />`);
    if (image) t.push(`<meta name="twitter:image" content="${esc(abs(base, image))}" />`);
  }
  if (m.schema) {
    const json = JSON.stringify(businessJsonLd(S, services, base)).replace(/</g, '\\u003c');
    t.push(`<script type="application/ld+json">${json}</script>`);
  }
  return { tags: t.join('\n    '), status: m.status };
}

/** Inserts the page's tags into the built index.html (replacing its default <title>/description). */
export function renderHtml(template: string, rawPath: string, S: Settings, services: SeoService[], base: string): { html: string; status: number } {
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  const { tags, status } = headTags(path, S, services, base);
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace(/<\/head>/i, `    ${tags}\n  </head>`);
  return { html, status };
}

export const robotsTxt = (base: string) => `User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`;

export function sitemapXml(base: string): string {
  const urls = INDEXABLE.map((p) => `  <url><loc>${esc(base + (p === '/' ? '/' : p))}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
