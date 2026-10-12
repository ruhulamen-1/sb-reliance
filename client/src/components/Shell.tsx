import { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

export type Settings = Record<string, string>;

export default function Shell({ S, children }: { S: Settings; children: ReactNode }) {
  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  return (
    <>
      {S.page_bg && <div className="pagebg" aria-hidden="true" style={{ backgroundImage: `url("${S.page_bg}")` }} />}
      <header className="topbar">
        <div className="wrap row between">
          <a className="brand" href="/">{S.brand}</a>
          <nav className="row gap">
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/why-us">Why us</NavLink>
            <NavLink to="/blog">Blog</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>
          <a className="btn" href={wa}>WhatsApp {S.phone}</a>
        </div>
      </header>
      {children}
      <div className="floaters">
        <a className="fab wa" href={wa} aria-label="Chat on WhatsApp">WhatsApp</a>
        {S.phone && <a className="fab call" href={`tel:${S.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${S.phone}`}>Call</a>}
      </div>

      <footer className="foot" style={S.footer_bg ? { backgroundImage: `url("${S.footer_bg}")` } : undefined}>
        <div className="foot-shade">
          <div className="wrap">
            <div className="foot-cols">
              <div className="foot-about">
                <h2>About us</h2>
                <p>{S.about_text}</p>
                <Link className="btn-outline" to="/contact">Request a quote</Link>
              </div>
              <div className="foot-contact">
                <h2>Get in touch</h2>
                <p>
                  {S.phone && <a href={`tel:${S.phone.replace(/[^\d+]/g, '')}`}>{S.phone}</a>}
                  {S.phone && S.email && ' | '}
                  {S.email && <a href={`mailto:${S.email}`}>{S.email}</a>}
                </p>
                <p>{S.address}</p>
              </div>
            </div>
            <div className="foot-bottom">
              <span>Copyright {S.company_name} {new Date().getFullYear()}. All rights reserved.</span>
              <nav aria-label="Footer">
                <NavLink to="/services">Services</NavLink>
                <NavLink to="/why-us">Why us</NavLink>
                <NavLink to="/blog">Blog</NavLink>
                <NavLink to="/contact">Contact</NavLink>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
