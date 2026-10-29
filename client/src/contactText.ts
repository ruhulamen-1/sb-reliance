// Small text helpers shared by the quote forms, the footer and the quote section.

/** A WhatsApp number we can actually reply to: a Singapore mobile / landline (8 digits starting 3, 6, 8 or 9,
 *  with or without +65), or a number with another country code (8–15 digits). Same rule as the server. */
export function waProblem(v: string): string {
  const raw = v.trim();
  const d = raw.replace(/\D/g, '');
  const sg = (n: string) => /^[3689]\d{7}$/.test(n);
  if (sg(d) || (d.startsWith('65') && sg(d.slice(2)))) return '';
  if (raw.startsWith('+') && d.length >= 8 && d.length <= 15) return '';
  return 'Please check your WhatsApp number, e.g. 9123 4567 (or with country code, e.g. +60 12 345 6789).';
}

/** The message a visitor sees when sending fails: no "Failed to fetch", and a way to reach us anyway. */
export function sendError(err: unknown, phone?: string): string {
  const m = (err as Error)?.message || '';
  if (/fetch|network|reach|load failed/i.test(m))
    return `We couldn't send your request. Please check your internet connection and try again${phone ? `, or WhatsApp us on ${phone}` : ''}.`;
  return m || 'Something went wrong. Please try again.';
}

const DAY: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const clock = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
/** "Mon-Fri 09:00-18:00" → ["Monday – Friday", "9:00 AM – 6:00 PM"]; "00:00-23:59" → ["", "Open 24 hours"];
 *  any other line is shown as written. */
export function hoursCard(line: string): [string, string] {
  const m = line.match(/^(?:(.+?)\s+)?(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!m) return [line, ''];
  const days = (m[1] || '').split('-').filter(Boolean).map((d) => DAY[d.trim().slice(0, 3).toLowerCase()] || d.trim()).join(' – ');
  return [days, m[2] === '00:00' && m[3] === '23:59' ? 'Open 24 hours' : `${clock(m[2])} – ${clock(m[3])}`];
}
/** One line for the footer: "Monday – Saturday: 9:00 AM – 6:00 PM", or "Open 24 hours" */
export const hoursLine = (line: string) => hoursCard(line).filter(Boolean).join(': ');
