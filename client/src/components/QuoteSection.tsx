import QuoteForm from './QuoteForm';
import { realEmail, Settings } from './Shell';

const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);

// line icons for the contact cards (24x24, drawn in the card's accent colour)
const ICON = {
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  chat: 'M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
};

const DAY: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const clock = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
/** "Mon-Fri 09:00-18:00" → ["Monday – Friday", "9:00 AM – 6:00 PM"]; any other line is shown as written. */
function hoursCard(line: string): [string, string] {
  const m = line.match(/^(.+?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!m) return [line, ''];
  const days = m[1].split('-').map((d) => DAY[d.trim().slice(0, 3).toLowerCase()] || d.trim()).join(' – ');
  return [days, m[2] === '00:00' && m[3] === '23:59' ? 'Open 24 hours' : `${clock(m[2])} – ${clock(m[3])}`];
}

/** The quote request block: a heading and ways to reach us on the left, the form in a card on the right. */
export default function QuoteSection({ S, serviceNames, title, defaultService = '', contact = true }:
  { S: Settings; serviceNames: string[]; title?: string; defaultService?: string; contact?: boolean }) {
  const tel = (S.phone || '').replace(/[^\d+]/g, '');
  const wa = (S.whatsapp || '').replace(/\D/g, '');
  const email = realEmail(S.email);
  const map = S.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.address)}` : '';
  const ways: [keyof typeof ICON, string, string, string][] = contact ? [
    ...(tel ? [['phone', 'Phone', S.phone, `tel:${tel}`] as [keyof typeof ICON, string, string, string]] : []),
    ...(wa ? [['chat', 'WhatsApp', 'Chat with us', `https://wa.me/${wa}`] as [keyof typeof ICON, string, string, string]] : []),
    ...(email ? [['mail', 'Email', email, `mailto:${email}`] as [keyof typeof ICON, string, string, string]] : []),
    ...(S.address ? [['pin', 'Office address', S.address, map] as [keyof typeof ICON, string, string, string]] : []),
  ] : [];
  const hours = lines(S.open_hours).map(hoursCard);
  // the title can show a word or two in gold, written as *word* in Admin
  const heading = (title || S.quote_title || 'Get a quote').split(/\*([^*]+)\*/).map((p, i) => (i % 2 ? <em key={i} className="gold">{p}</em> : p));

  return (
    <section id="quote" className="qx">
      <div className="wrap qx-grid">
        <div className="qx-info">
          <h2>{heading}</h2>
          {S.quote_intro && <p className="qx-intro">{S.quote_intro}</p>}
          {ways.length > 0 && (
            <>
              <h3>Contact us directly</h3>
              <ul className="qx-cards">
                {ways.map(([icon, label, value, href]) => (
                  <li key={label}>
                    <a href={href} {...(icon === 'pin' || icon === 'chat' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      <span className="qx-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={ICON[icon]} /></svg></span>
                      <span><strong>{label}</strong><span>{value}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {hours.length > 0 && (
            <>
              <h3>Working hours</h3>
              <ul className="qx-hours">
                {hours.map(([d, t]) => <li key={d + t}><strong>{d}</strong>{t && <span>{t}</span>}</li>)}
              </ul>
            </>
          )}
        </div>
        <div className="qx-form">
          <QuoteForm S={S} serviceNames={serviceNames} defaultService={defaultService} />
        </div>
      </div>
    </section>
  );
}
