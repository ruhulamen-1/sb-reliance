// "Chat with us" window that looks like WhatsApp: a greeting, quick topics and a message box.
// Send opens WhatsApp (app or web) with the message already typed; the conversation itself
// happens in WhatsApp. Greeting text comes from Admin > Settings.
import { useEffect, useRef, useState } from 'react';
import type { Settings } from './Shell';
import { closesAt } from './OpenStatus';

const TEASER_KEY = 'wa-teaser-seen';

export default function WaChat({ S, services, open, onClose }: {
  S: Settings; services: { title: string }[]; open: boolean; onClose: () => void;
}) {
  const [msg, setMsg] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const num = (S.whatsapp || '').replace(/\D/g, '');
  const name = S.brand || S.company_name || 'us';
  const closes = closesAt(S.open_hours || '');
  const status = closes === null ? 'Chat with us on WhatsApp' : closes ? 'Online now' : 'Away · we reply when we open';
  const greeting = (S.wa_greeting || 'Hi there 👋\nHow can we help you today?').split('\n').map((l) => l.trim()).filter(Boolean);
  const time = new Intl.DateTimeFormat('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).format(new Date());

  useEffect(() => {
    if (!open) return;
    setTimeout(() => box.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function send(text = msg) {
    const body = `${text.trim() || `Hi ${name}, I would like a quotation.`}\n\n(${window.location.href})`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(body)}`, '_blank', 'noopener');
    onClose();
  }

  if (!open) return null;
  return (
    <div className="wachat" role="dialog" aria-label={`Chat with ${name} on WhatsApp`}>
      <header>
        <img src={S.logo || '/logo.svg'} alt="" />
        <div><strong>{name}</strong><small className={closes ? 'on' : ''}>{status}</small></div>
        <button type="button" onClick={onClose} aria-label="Close chat">×</button>
      </header>
      <div className="wachat-body">
        <div className="wachat-bubble">
          {greeting.map((l) => <p key={l}>{l}</p>)}
          <time>{time}</time>
        </div>
        {services.length > 0 && (
          <div className="wachat-topics" aria-label="Quick topics">
            {services.slice(0, 6).map((s) => (
              <button key={s.title} type="button" onClick={() => setMsg(`Hi ${name}, I would like a quotation for ${s.title.toLowerCase()}.`)}>{s.title}</button>
            ))}
          </div>
        )}
      </div>
      <form className="wachat-send" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea ref={box} rows={2} value={msg} placeholder="Type your message…" aria-label="Your message"
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="submit" aria-label="Send on WhatsApp">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" /></svg>
        </button>
      </form>
      <p className="wachat-foot">Opens WhatsApp with your message</p>
    </div>
  );
}

/** Small greeting next to the WhatsApp button, once per visit, on larger screens only. */
export function WaTeaser({ S, onOpen }: { S: Settings; onOpen: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(TEASER_KEY) === '1'; } catch { /* storage blocked */ }
    if (seen || !window.matchMedia('(min-width: 701px)').matches) return;
    const t = setTimeout(() => setShow(true), 8000);
    return () => clearTimeout(t);
  }, []);
  const hide = () => { setShow(false); try { sessionStorage.setItem(TEASER_KEY, '1'); } catch { /* ignore */ } };
  if (!show) return null;
  const first = (S.wa_greeting || 'Hi there 👋\nHow can we help you today?').split('\n')[0];
  return (
    <div className="wateaser" role="status">
      <button type="button" className="wateaser-text" onClick={() => { hide(); onOpen(); }}>{first}</button>
      <button type="button" className="wateaser-x" onClick={hide} aria-label="Dismiss">×</button>
    </div>
  );
}
