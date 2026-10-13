// Shared helpers for admin-written text: services and blog posts.
// Mirrors server/src/seo.ts (faqPairs, serviceHeading) so the app and the first HTML response match.

export interface Service {
  id: number;
  title: string;
  description: string;
  slug?: string | null;
  content?: string | null;
  faq?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  image_url?: string | null;
}

const lines = (v?: string | null) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);

export const serviceHeading = (s: { title: string }) => (/singapore/i.test(s.title) ? s.title : `${s.title} in Singapore`);

/** "Question | Answer" lines -> pairs (lines without a "|" are skipped). */
export function faqPairs(v?: string | null): [string, string][] {
  return lines(v)
    .map((l) => {
      const i = l.indexOf('|');
      return i > 0 ? ([l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string]) : null;
    })
    .filter((p): p is [string, string] => !!p && !!p[0] && !!p[1]);
}

/** One paragraph per line; a line starting with "# " becomes a heading. */
export function TextBlocks({ text }: { text?: string | null }) {
  return (
    <>
      {lines(text).map((l, i) => (l.startsWith('# ') ? <h2 key={i}>{l.slice(2)}</h2> : <p key={i}>{l}</p>))}
    </>
  );
}
