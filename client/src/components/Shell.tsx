import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import useReveal from './useReveal';
import { serviceHeading } from './content';

export type Settings = Record<string, string>;
// the default settings ship with a placeholder email; never show it
export const realEmail = (e?: string) => (e && !/@example\.com$/i.test(e.trim()) ? e.trim() : '');

const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);
const linkLabel = (u: string) => {
  try {
    const h = new URL(u).hostname.replace(/^www\./, '');
    const known: Record<string, string> = { 'facebook.com': 'Facebook', 'instagram.com': 'Instagram', 'linkedin.com': 'LinkedIn', 'tiktok.com': 'TikTok', 'youtube.com': 'YouTube', 'g.page': 'Google reviews', 'google.com': 'Google reviews', 'maps.app.goo.gl': 'Google reviews' };
    return known[h] || h;
  } catch {
    return u;
  }
};

// small line icons for the footer contact list (24x24, drawn with the current text colour)
const ICONS = {
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  chat: 'M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
};
const Icon = ({ d }: { d: string }) => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

// chat-bubble-with-handset mark for WhatsApp buttons (drawn in the button's text colour)
const WaIcon = () => (
  <svg className="wa-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.3a8.5 8.5 0 1 1 15.5-4.6z" />
    <path d="M9 8.3c.3-.6.9-.6 1.2 0l.7 1.5c.1.3 0 .6-.2.8l-.6.6a6 6 0 0 0 2.7 2.7l.6-.6c.2-.2.5-.3.8-.2l1.5.7c.6.3.6.9 0 1.2l-.7.5c-.6.4-1.4.5-2.1.2a9 9 0 0 1-4.6-4.6c-.3-.7-.2-1.5.2-2.1z" fill="currentColor" stroke="none" />
  </svg>
);

export default function Shell({ S, services = [], children }: { S: Settings; services?: { id: number; title: string; slug?: string | null }[]; children: ReactNode }) {
  useReveal();
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty('--p', String(max > 0 ? Math.min(window.scrollY / max, 1) : 0));
      document.body.classList.toggle('scrolled', window.scrollY > 8);
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); document.body.classList.remove('scrolled'); };
  }, []);
  // phone menu (the three-line button): closes on navigation, Escape or a tap outside the header
  const [menu, setMenu] = useState(false);
  const header = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    const onDown = (e: PointerEvent) => { if (!header.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [menu]);

  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const tel = (S.phone || '').replace(/[^\d+]/g, '');
  const email = realEmail(S.email);
  const svcLinks = services.filter((s) => s.slug);
  const socials = lines(S.social_links).filter((u) => /^https?:\/\//i.test(u));
  return (
    <>
      <header className={menu ? 'topbar menu-open' : 'topbar'} ref={header}>
        <div className="wrap row between">
          <Link className="brand brandrow" to="/"><img className="logo" src={S.logo || '/logo.svg'} alt="" />{S.brand}</Link>
          <button type="button" className="menu-btn" aria-expanded={menu} aria-controls="site-nav" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(!menu)}>
            <span aria-hidden="true" />
          </button>
          <nav id="site-nav" className="row gap" aria-label="Main">
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/portfolio">Portfolio</NavLink>
            <NavLink to="/why-us">Why us</NavLink>
            <NavLink to="/blog">Blog</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/team">Team</NavLink>
            <div className="menu-actions">
              <a className="btn btn-wa" href={wa}><WaIcon />WhatsApp</a>
              {tel && <a className="btn ghost" href={`tel:${tel}`}>Call</a>}
            </div>
          </nav>
          <a className="btn btn-wa head-wa" href={wa}><WaIcon />WhatsApp {S.phone}</a>
        </div>
      </header>
      <main className="page">{children}</main>
      <div className="floaters">
        <a className="fab wa" href={wa} aria-label="Chat on WhatsApp">WhatsApp</a>
        {tel && <a className="fab call" href={`tel:${tel}`} aria-label={`Call ${S.phone}`}>Call</a>}
      </div>

      <footer className="foot" style={S.footer_bg ? { backgroundImage: `url("${S.footer_bg}")` } : undefined}>
        <div className="foot-shade">
          <div className="wrap">
            <div className="foot-grid">
              <div className="foot-brand">
                <Link className="foot-logo" to="/"><img className="logo" src={S.logo || '/logo.svg'} alt="" /><span>{S.brand}</span></Link>
                <p>{S.about_text}</p>
                <Link className="btn-outline" to="/contact">Request a quote</Link>
                {socials.length > 0 && (
                  <p className="foot-social">{socials.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer">{linkLabel(u)}</a>)}</p>
                )}
              </div>

              <nav className="foot-col" aria-label="Quick links">
                <h2>Quick links</h2>
                <ul>
                  <li><Link to="/">Home</Link></li>
                  <li><Link to="/services">Services</Link></li>
                  <li><Link to="/portfolio">Portfolio</Link></li>
                  <li><Link to="/why-us">Why us</Link></li>
                  <li><Link to="/about">About us</Link></li>
                  <li><Link to="/team">Our team</Link></li>
                  <li><Link to="/blog">Blog</Link></li>
                  <li><Link to="/contact">Contact</Link></li>
                </ul>
              </nav>

              {svcLinks.length > 0 && (
                <nav className="foot-col" aria-label="Services">
                  <h2>Our services</h2>
                  <ul>{svcLinks.map((s) => <li key={s.id}><Link to={`/services/${s.slug}`} title={serviceHeading(s)}>{s.title}</Link></li>)}</ul>
                </nav>
              )}

              <div className="foot-col foot-contact">
                <h2>Get in touch</h2>
                <ul className="foot-icons">
                  {tel && <li><Icon d={ICONS.phone} /><a href={`tel:${tel}`}>{S.phone}</a></li>}
                  {S.whatsapp && <li><Icon d={ICONS.chat} /><a href={wa}>WhatsApp us</a></li>}
                  {email && <li><Icon d={ICONS.mail} /><a href={`mailto:${email}`}>{email}</a></li>}
                  {S.address && <li><Icon d={ICONS.pin} /><span>{S.address}</span></li>}
                  {lines(S.open_hours).length > 0 && <li><Icon d={ICONS.clock} /><span>{lines(S.open_hours).map((h) => <span key={h} className="hours-line">{h}</span>)}</span></li>}
                </ul>
                {(S.uen || lines(S.licenses).length > 0) && (
                  <div className="foot-trust">
                    {S.uen && <p>UEN: {S.uen}</p>}
                    {lines(S.licenses).length > 0 && <ul>{lines(S.licenses).map((l) => <li key={l}>{l}</li>)}</ul>}
                  </div>
                )}
              </div>
            </div>

            <div className="foot-bottom">
              <span>© {new Date().getFullYear()} {S.company_name}. All rights reserved.</span>
              <nav aria-label="Legal">
                <Link to="/privacy-policy">Privacy policy</Link>
                <Link to="/contact">Contact</Link>
                <button type="button" className="totop" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
                  Back to top <span aria-hidden="true">↑</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
