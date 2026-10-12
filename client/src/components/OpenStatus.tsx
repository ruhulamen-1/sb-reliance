import { useEffect, useState } from 'react';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const RULE = /^([A-Za-z]{3})[a-z]*(?:\s*-\s*([A-Za-z]{3})[a-z]*)?\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

function nowInSingapore() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return { day: DAYS.indexOf(get('weekday').toLowerCase().slice(0, 3)), minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

// Returns the closing time ("18:00") if open right now, '' if closed, null if no valid hours are set.
function closesAt(hours: string): string | '' | null {
  const rules = hours.split('\n').map((l) => l.trim().match(RULE)).filter(Boolean) as RegExpMatchArray[];
  if (!rules.length) return null;
  const { day, minutes } = nowInSingapore();
  for (const m of rules) {
    const from = DAYS.indexOf(m[1].toLowerCase());
    const to = m[2] ? DAYS.indexOf(m[2].toLowerCase()) : from;
    if (from < 0 || to < 0) continue;
    const inDays = from <= to ? day >= from && day <= to : day >= from || day <= to;
    const start = Number(m[3]) * 60 + Number(m[4]);
    const end = Number(m[5]) * 60 + Number(m[6]);
    if (inDays && minutes >= start && minutes < end) return `${m[5].padStart(2, '0')}:${m[6]}`;
  }
  return '';
}

export default function OpenStatus({ hours }: { hours?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const c = closesAt(hours || '');
  if (c === null) return null;
  return (
    <p className={c ? 'status open' : 'status closed'} role="status">
      <span className="dot" aria-hidden="true" />
      {c ? `Open now · until ${c}` : 'Closed now · message us on WhatsApp and we will reply when we open'}
    </p>
  );
}
