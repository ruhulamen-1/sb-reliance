import { useEffect, useState } from 'react';
import { api } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';

interface Member { id: number; name: string; role: string; bio?: string | null; image_url?: string | null }

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function Team() {
  const [S, setS] = useState<Settings>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<{ settings?: Settings }>('/public/home').then((d) => setS(d.settings ?? {})).catch(() => undefined);
    api<Member[]>('/public/team').then(setMembers).catch((e: Error) => setErr(e.message)).finally(() => setLoaded(true));
  }, []);
  useSeo({ title: S.company_name ? `Team – ${S.company_name}` : '', description: S.company_name ? `Meet the people at ${S.company_name} who plan, install and finish your project.` : '', canonical: '/team' });

  return (
    <Shell S={S}>
      <section className="wrap block">
        <h1 className="h1s">Our team</h1>
        <p className="lead">The people who plan, install and finish your project.</p>
        {err && <p className="err">{err}</p>}
        {loaded && !err && members.length === 0 && <p>Team members will appear here soon. Add them in Admin → Team.</p>}
        <div className="members">
          {members.map((m) => (
            <article key={m.id} className="member">
              {m.image_url ? <img src={m.image_url} alt={m.name} loading="lazy" /> : <span className="avatar" aria-hidden="true">{initials(m.name)}</span>}
              <h3>{m.name}</h3>
              <p className="role">{m.role}</p>
              {m.bio && <p>{m.bio}</p>}
            </article>
          ))}
        </div>
      </section>

      {S.org_chart && (
        <section className="wrap block">
          <div className="sechead"><h2>Organisation chart</h2></div>
          <img className="orgchart" src={S.org_chart} alt="Organisation chart" loading="lazy" />
        </section>
      )}
    </Shell>
  );
}
