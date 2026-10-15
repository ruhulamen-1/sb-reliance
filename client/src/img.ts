/** Smaller copies of uploaded photos (the server makes them on first request, see server/src/images.ts). */
const WIDTHS = [480, 800, 1200];

/** srcset for an uploaded JPEG / PNG / WebP, so phones download a small copy instead of the full photo. */
export function srcSet(url?: string | null): string | undefined {
  if (!url || !/^\/uploads\/[\w-]+\.(jpe?g|png|webp)$/i.test(url)) return undefined;
  return [...WIDTHS.map((w) => `${url}?w=${w} ${w}w`), `${url} 1600w`].join(', ');
}

/** Props for an <img> of an uploaded photo: src, srcset and how wide it shows on screen. */
export const photo = (url: string, sizes: string) => ({ src: url, srcSet: srcSet(url), sizes: srcSet(url) ? sizes : undefined });

// how wide each kind of photo is drawn, for the browser to pick the right copy
export const SIZES = {
  hero: '(max-width: 800px) 100vw, 45vw',
  card: '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw',
  wide: '(max-width: 900px) 100vw, 900px',
};

/** fetchpriority="high" for the main photo of a page (React 18 only passes it through in lower case). */
export const HIGH = { fetchpriority: 'high' } as Record<string, string>;
