// SEO helpers: per-page <head> tags, JSON-LD, crawlable page text, robots.txt and sitemap.xml.
// Pure functions (no DB, no Express) so they are easy to test.
// The page titles/descriptions below are mirrored in client/src/pages/* (useSeo) for in-app navigation.

export type Settings = Record<string, string>;
export interface SeoService {
  title: string;
  description: string;
  slug?: string | null;
  content?: string | null;
  faq?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  image_url?: string | null;
}
export interface SeoPost {
  title: string;
  slug: string;
  excerpt: string;
  content?: string | null;
  image_url?: string | null;
  created_at?: string | Date | null;
}
export interface SeoData { services: SeoService[]; post?: SeoPost | null }

const lines = (v?: string | null) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);
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
const isoDate = (d?: string | Date | null) => {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '' : t.toISOString();
};
const safeDecode = (v: string) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

/** "Question | Answer" lines -> pairs (lines without a "|" are skipped). */
export function faqPairs(v?: string | null): [string, string][] {
  return lines(v)
    .map((l) => {
      const i = l.indexOf('|');
      return i > 0 ? ([l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string]) : null;
    })
    .filter((p): p is [string, string] => !!p && !!p[0] && !!p[1]);
}

export const serviceHeading = (s: SeoService) => (/singapore/i.test(s.title) ? s.title : `${s.title} in Singapore`);
const findService = (services: SeoService[], slug: string) => services.find((s) => s.slug === slug);
const servicePath = (path: string) => path.match(/^\/services\/([^/]+)$/)?.[1];
const blogPath = (path: string) => path.match(/^\/blog\/([^/]+)$/)?.[1];

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
  image?: string;
}

export function pageMeta(path: string, S: Settings, data: SeoData = { services: [] }): PageMeta {
  const co = S.company_name || S.brand || 'SB Reliance';
  const homeDesc = clip(S.seo_description || S.hero_lead || S.about_text || '');
  const notFound = { title: `Page not found – ${co}`, description: '', noindex: true, status: 404 };
  const svcSlug = servicePath(path);
  if (svcSlug) {
    const s = findService(data.services, safeDecode(svcSlug));
    if (!s) return notFound;
    return {
      title: s.seo_title || `${serviceHeading(s)} – ${co}`,
      description: clip(s.seo_description || s.description || ''),
      canonical: path,
      status: 200,
      image: s.image_url || undefined,
    };
  }
  const postSlug = blogPath(path);
  if (postSlug) {
    const p = data.post && data.post.slug === safeDecode(postSlug) ? data.post : null;
    if (!p) return notFound;
    return { title: `${p.title} – ${co}`, description: clip(p.excerpt || p.content || ''), canonical: path, status: 200, image: p.image_url || undefined };
  }
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
    case '/review':
      return { title: `Leave a review – ${co}`, description: clip(`Tell us how ${co} did on your job.`), noindex: true, status: 200 };
    case '/admin':
      return { title: `Admin – ${co}`, description: '', noindex: true, status: 200 };
    default:
      return notFound;
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

const areaServed = (S: Settings) => (lines(S.service_area).length ? lines(S.service_area) : ['Singapore']);

/** "236A Serangoon Road Singapore 218084" -> street "236A Serangoon Road" + postal code "218084". */
export function postalAddress(addr: string): Record<string, string> {
  const out: Record<string, string> = { '@type': 'PostalAddress', addressLocality: 'Singapore', addressCountry: 'SG' };
  if (!addr || addr.toLowerCase() === 'singapore') return out;
  const code = addr.match(/(?:singapore|s)\s*\(?(\d{6})\)?\s*$/i) || addr.match(/\b(\d{6})\s*$/);
  let street = addr;
  if (code) {
    out.postalCode = code[1];
    street = addr.slice(0, code.index).replace(/[\s,]+$/, '');
  }
  street = street.replace(/[\s,]*singapore$/i, '').trim();
  out.streetAddress = street || addr;
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
    address: postalAddress(addr),
    areaServed: areaServed(S),
  };
  if (S.phone) data.telephone = S.phone;
  if ((S.price_range || '').trim()) data.priceRange = clip(S.price_range, 100);
  if (realEmail(S.email)) data.email = realEmail(S.email);
  if (img) data.image = abs(base, img);
  data.logo = abs(base, S.logo || '/icon-512.png');
  if (S.uen) data.identifier = { '@type': 'PropertyValue', propertyID: 'UEN', value: S.uen };
  const same = lines(S.social_links).filter(isHttpUrl);
  if (same.length) data.sameAs = same;
  const hours = openingHours(S.open_hours);
  if (hours.length) data.openingHours = hours;
  if (services.length) {
    data.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: S.services_title || 'Services',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.title,
          description: clip(s.description, 200),
          ...(s.slug ? { url: `${base}/services/${encodeURIComponent(s.slug)}` } : {}),
        },
      })),
    };
  }
  // Deliberately no aggregateRating/review markup: only add it from real, verifiable reviews.
  return data;
}

function breadcrumbs(base: string, items: [string, string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: base + path })),
  };
}

function faqJsonLd(pairs: [string, string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

/** Structured data for one page: the business itself, or a service / blog post that points back to it. */
export function pageJsonLd(path: string, S: Settings, data: SeoData, base: string): Record<string, unknown>[] {
  const m = pageMeta(path, S, data);
  if (m.status !== 200 || m.noindex) return [];
  const co = S.company_name || S.brand || 'SB Reliance';
  const svcSlug = servicePath(path);
  if (svcSlug) {
    const s = findService(data.services, safeDecode(svcSlug))!;
    const out: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: serviceHeading(s),
        serviceType: s.title,
        description: clip(s.seo_description || s.description || '', 300),
        url: base + path,
        areaServed: areaServed(S),
        provider: { '@type': 'GeneralContractor', '@id': `${base}/#business`, name: co, url: `${base}/`, ...(S.phone ? { telephone: S.phone } : {}) },
        ...(s.image_url ? { image: abs(base, s.image_url) } : {}),
      },
      breadcrumbs(base, [['Home', '/'], ['Services', '/services'], [s.title, path]]),
    ];
    const pairs = faqPairs(s.faq);
    if (pairs.length) out.push(faqJsonLd(pairs));
    return out;
  }
  if (blogPath(path) && data.post) {
    const p = data.post;
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: clip(p.title, 110),
        description: clip(p.excerpt || ''),
        url: base + path,
        mainEntityOfPage: base + path,
        ...(isoDate(p.created_at) ? { datePublished: isoDate(p.created_at) } : {}),
        ...(p.image_url ? { image: abs(base, p.image_url) } : {}),
        author: { '@type': 'Organization', name: co, url: `${base}/` },
        publisher: { '@type': 'Organization', name: co, url: `${base}/`, logo: { '@type': 'ImageObject', url: abs(base, S.logo || '/icon-512.png') } },
      },
      breadcrumbs(base, [['Home', '/'], ['Blog', '/blog'], [p.title, path]]),
    ];
  }
  return m.schema ? [businessJsonLd(S, data.services, base)] : [];
}

export function headTags(path: string, S: Settings, data: SeoData, base: string): { tags: string; status: number } {
  const m = pageMeta(path, S, data);
  const co = S.company_name || S.brand || 'SB Reliance';
  const image = m.image || S.hero_image || S.about_image || S.logo;
  const t: string[] = [`<title>${esc(m.title)}</title>`];
  if (m.description) t.push(`<meta name="description" content="${esc(m.description)}" />`);
  t.push(m.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow, max-image-preview:large" />');
  if (!m.noindex && m.canonical) {
    const url = base + (m.canonical === '/' ? '/' : m.canonical);
    t.push(`<link rel="canonical" href="${esc(url)}" />`);
    t.push(`<meta property="og:type" content="${blogPath(path) ? 'article' : 'website'}" />`);
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
  const ga = gaTag(S, path);
  if (ga) t.push(ga);
  for (const ld of pageJsonLd(path, S, data, base)) {
    t.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  }
  return { tags: t.join('\n    '), status: m.status };
}

/** A Google Analytics 4 measurement ID, e.g. G-AB12CD34EF; anything else is ignored. */
export const gaId = (S: Settings) => {
  const id = (S.ga_measurement_id || '').trim().toUpperCase();
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : '';
};

/** Google Analytics (GA4) tag for public pages; never on /admin. Page changes inside the app are
 *  counted by GA4's "page changes based on browser history" setting, which is on by default. */
export function gaTag(S: Settings, path: string): string {
  const id = gaId(S);
  if (!id || path === '/admin' || path.startsWith('/admin/')) return '';
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`
    + `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');</script>`;
}

/** Page text with "# " heading lines -> HTML paragraphs and headings. */
const textHtml = (v?: string | null) =>
  lines(v).map((l) => (l.startsWith('# ') ? `<h2>${esc(l.slice(2))}</h2>` : `<p>${esc(l)}</p>`)).join('');

const serviceLinks = (services: SeoService[]) =>
  services.filter((s) => s.slug).map((s) => `<li><a href="/services/${esc(encodeURIComponent(s.slug!))}">${esc(serviceHeading(s))}</a></li>`).join('');

/**
 * The page's main text as plain HTML, put inside <div id="root"> so search engines (and visitors without
 * JavaScript) get the content in the first response. React replaces it as soon as the app starts.
 */
export function bodyHtml(path: string, S: Settings, data: SeoData): string {
  const m = pageMeta(path, S, data);
  if (m.status !== 200 || m.noindex) return '';
  const co = S.company_name || S.brand || 'SB Reliance';
  const nav = `<nav><a href="/">${esc(co)}</a> · <a href="/portfolio">Portfolio</a> · <a href="/about">About</a> · <a href="/contact">Contact</a></nav>`;
  const svcList = serviceLinks(data.services);
  const contact = S.phone ? `<p>Call or WhatsApp ${esc(S.phone)} for a site visit and quotation.</p>` : '';
  let main: string;
  const svcSlug = servicePath(path);
  if (svcSlug) {
    const s = findService(data.services, safeDecode(svcSlug))!;
    const pairs = faqPairs(s.faq);
    const others = serviceLinks(data.services.filter((x) => x !== s));
    main = `<h1>${esc(serviceHeading(s))}</h1><p>${esc(s.description || '')}</p>${textHtml(s.content)}`
      + (pairs.length ? `<h2>Frequently asked questions</h2>${pairs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}` : '')
      + contact
      + (others ? `<h2>Other services</h2><ul>${others}</ul>` : '');
  } else if (blogPath(path) && data.post) {
    main = `<article><h1>${esc(data.post.title)}</h1><p>${esc(data.post.excerpt || '')}</p>${textHtml(data.post.content)}</article>${contact}`;
  } else if (path === '/' || path in HOME_ALIASES) {
    main = `<h1>${esc(S.hero_title || co)}</h1><p>${esc(S.hero_lead || '')}</p>`
      + (svcList ? `<h2>${esc(S.services_title || 'Services')}</h2><ul>${svcList}</ul>` : '')
      + contact;
  } else if (path === '/about') {
    main = `<h1>About ${esc(S.brand || co)}</h1>${lines(S.about_intro).map((p) => `<p>${esc(p)}</p>`).join('')}${svcList ? `<ul>${svcList}</ul>` : ''}`;
  } else if (path === '/contact') {
    main = `<h1>Contact ${esc(co)}</h1>${contact}${S.address ? `<p>${esc(S.address)}</p>` : ''}`;
  } else {
    return '';
  }
  return `<div class="prerender">${nav}<main>${main}</main></div>`;
}

/** The first, largest image a visitor sees on this page (hero or service photo), if any. */
export function lcpImage(path: string, S: Settings, data: SeoData): string {
  if (path === '/' || path in HOME_ALIASES) return S.hero_image || '';
  const svcSlug = servicePath(path);
  if (svcSlug) return findService(data.services, safeDecode(svcSlug))?.image_url || '';
  if (path === '/about') return S.about_image || '';
  return '';
}

/** Inserts the page's tags and text into the built index.html (replacing its default <title>/description). */
export function renderHtml(template: string, rawPath: string, S: Settings, data: SeoData, base: string, initial?: unknown): { html: string; status: number } {
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  const head = headTags(path, S, data, base);
  const status = head.status;
  let tags = head.tags;
  // start the biggest picture early (it is what PageSpeed measures as "Largest Contentful Paint")
  const lcp = lcpImage(path, S, data);
  if (lcp) tags = `<link rel="preload" as="image" href="${esc(lcp)}" fetchpriority="high" />\n    ` + tags;
  // the shared page data, so the app renders at once instead of fetching it again
  if (initial && path !== '/admin') tags += `\n    <script>window.__HOME__=${JSON.stringify(initial).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}</script>`;
  const body = bodyHtml(path, S, data);
  // function replacements, so "$" in page text is never read as a replacement pattern
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace(/<\/head>/i, () => `    ${tags}\n  </head>`);
  if (body) html = html.replace(/<div id="root"><\/div>/i, () => `<div id="root">${body}</div>`);
  return { html, status };
}

// /api/public/ stays crawlable: Google renders the pages with JavaScript, and the page text and
// photos come from there. Admin pages and the rest of the API stay blocked.
export const robotsTxt = (base: string) =>
  `User-agent: *\nAllow: /api/public/\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`;

export function sitemapXml(base: string, services: SeoService[] = [], posts: SeoPost[] = []): string {
  const url = (p: string, lastmod = '') => `  <url><loc>${esc(base + (p === '/' ? '/' : p))}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}</url>`;
  const all = [
    ...INDEXABLE.map((p) => url(p)),
    ...services.filter((s) => s.slug).map((s) => url(`/services/${encodeURIComponent(s.slug!)}`)),
    ...posts.filter((p) => p.slug).map((p) => url(`/blog/${encodeURIComponent(p.slug)}`, isoDate(p.created_at))),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.join('\n')}\n</urlset>\n`;
}
