import { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import useReveal from './useReveal';
import { useEffect } from 'react';
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
  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const email = realEmail(S.email);
  const svcLinks = services.filter((s) => s.slug);
  return (
    <>
      {S.page_bg && <div className="pagebg" aria-hidden="true" style={{ backgroundImage: `url("${S.page_bg}")` }} />}
      <div className="progress" aria-hidden="true" />
      <header className="topbar">
        <div className="wrap row between">
          <Link className="brand brandrow" to="/"><img className="logo" src={S.logo || '/logo.svg'} alt="" />{S.brand}</Link>
          <nav className="row gap">
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/portfolio">Portfolio</NavLink>
            <NavLink to="/why-us">Why us</NavLink>
            <NavLink to="/blog">Blog</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/team">Team</NavLink>
          </nav>
          <a className="btn" href={wa}>WhatsApp {S.phone}</a>
        </div>
      </header>
      <main className="page">{children}</main>
      <div className="floaters">
        <a className="fab wa" href={wa} aria-label="Chat on WhatsApp">WhatsApp</a>
        {S.phone && <a className="fab call" href={`tel:${S.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${S.phone}`}>Call</a>}
      </div>

      <footer className="foot" style={S.footer_bg ? { backgroundImage: `url("${S.footer_bg}")` } : undefined}>
        <div className="foot-shade">
          <div className="wrap">
            <div className="foot-cols">
              <div className="foot-about">
                <img className="logo logo-lg" src={S.logo || '/logo.svg'} alt="" />
                <h2>About us</h2>
                <p>{S.about_text}</p>
                <Link className="btn-outline" to="/contact">Request a quote</Link>
              </div>
              <div className="foot-contact">
                <h2>Get in touch</h2>
                <p>
                  {S.phone && <a href={`tel:${S.phone.replace(/[^\d+]/g, '')}`}>{S.phone}</a>}
                  {S.phone && email && ' | '}
                  {email && <a href={`mailto:${email}`}>{email}</a>}
                </p>
                <p>{S.address}</p>
                {(S.uen || lines(S.licenses).length > 0 || lines(S.social_links).length > 0) && (
                  <div className="foot-trust">
                    {S.uen && <p>UEN: {S.uen}</p>}
                    {lines(S.licenses).length > 0 && <ul>{lines(S.licenses).map((l) => <li key={l}>{l}</li>)}</ul>}
                    {lines(S.social_links).length > 0 && (
                      <p>{lines(S.social_links).filter((u) => /^https?:\/\//i.test(u)).map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer">{linkLabel(u)}</a>)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {svcLinks.length > 0 && (
              <nav className="foot-services" aria-label="Services">
                <h2>Our services</h2>
                <ul>{svcLinks.map((s) => <li key={s.id}><Link to={`/services/${s.slug}`}>{serviceHeading(s)}</Link></li>)}</ul>
              </nav>
            )}
            <div className="foot-bottom">
              <span>Copyright {S.company_name} {new Date().getFullYear()}. All rights reserved.</span>
              <nav aria-label="Footer">
                <NavLink to="/services">Services</NavLink>
                <NavLink to="/why-us">Why us</NavLink>
                <NavLink to="/blog">Blog</NavLink>
                <NavLink to="/contact">Contact</NavLink>
                <NavLink to="/privacy-policy">Privacy policy</NavLink>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
