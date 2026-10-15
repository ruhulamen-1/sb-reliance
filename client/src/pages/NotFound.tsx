import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { homeData, initialHome } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';

export default function NotFound() {
  const [S, setS] = useState<Settings>(() => initialHome()?.settings ?? {});
  useEffect(() => {
    homeData<{ settings?: Settings }>().then((d) => setS(d.settings ?? {})).catch(() => undefined);
  }, []);
  useSeo({ title: S.company_name ? `Page not found – ${S.company_name}` : '' });

  return (
    <Shell S={S}>
      <section className="wrap narrow block">
        <h1 className="h1s">Page not found</h1>
        <p className="lead">The page you are looking for does not exist or has moved.</p>
        <div className="row gap">
          <Link className="btn" to="/">Back to home</Link>
          <Link className="btn ghost" to="/contact">Contact us</Link>
        </div>
      </section>
    </Shell>
  );
}
