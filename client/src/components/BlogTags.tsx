export interface PostSummary { id: number; title: string; slug: string; excerpt: string; image_url?: string | null; created_at: string }

// a topic label from the post title (no categories are stored, so this only reads the words already there)
const TOPICS: [RegExp, string][] = [
  [/hack/i, 'Hacking'], [/duct/i, 'Aircon Ducting'], [/air.?con|aircon|air-condition/i, 'Aircon'], [/acmv|ventilation/i, 'ACMV'],
  [/cctv|camera/i, 'CCTV'], [/ceiling|partition|drywall/i, 'Ceiling & Partition'], [/electric|wiring|lighting/i, 'Electrical'],
  [/paint/i, 'Painting'], [/tile|tiling/i, 'Tiling'], [/renovat/i, 'Renovation'],
];
export const topic = (p: { title: string }) => TOPICS.find(([re]) => re.test(p.title))?.[1] || 'Guide';
export const postDate = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });

export function Tags({ p }: { p: { title: string; created_at: string } }) {
  return (
    <div className="bl-tags">
      <span className="bl-tag t1">{topic(p)}</span>
      <span className="bl-tag t2">Singapore</span>
      <time dateTime={p.created_at}>{postDate(p.created_at)}</time>
    </div>
  );
}
