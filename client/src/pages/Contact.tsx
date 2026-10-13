import { useEffect, useState } from 'react';
import { api } from '../api';
import Shell, { Settings, realEmail } from '../components/Shell';
import { Service } from '../components/content';
import QuoteForm from '../components/QuoteForm';
import OpenStatus from '../components/OpenStatus';
import useSeo from '../components/useSeo';

export default function Contact() {
  const [S, setS] = useState<Settings>({});
  const [services, setServices] = useState<Service[]>([]);
  const serviceNames = services.map((s) => s.title);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<{ settings?: Settings; services?: Service[] }>('/public/home')
      .then((d) => { setS(d.settings ?? {}); setServices(d.services ?? []); })
      .catch((e: Error) => setErr(e.message));
  }, []);
  useSeo({ title: S.company_name ? `Contact – ${S.company_name}` : '', description: S.company_name ? `Contact ${S.company_name}: call, WhatsApp or send a quote request. ${S.address || ''}`.trim() : '', canonical: '/contact' });

  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const email = realEmail(S.email);
  const tel = (S.phone || '').replace(/[^\d+]/g, '');
  const map = S.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.address)}` : '';

  return (
    <Shell S={S} services={services}>
      <section className="wrap block">
        <h1 className="h1s">Contact us</h1>
        <p className="lead">Call, message or send us the form. We reply on WhatsApp.</p>
        <OpenStatus hours={S.open_hours} />
        {err && <p className="err">{err}</p>}
        <div className="contact-blocks">
          {S.phone && (
            <div className="card"><h3>Call</h3><p><a href={`tel:${tel}`}>{S.phone}</a></p></div>
          )}
          {S.whatsapp && (
            <div className="card"><h3>WhatsApp</h3><p><a href={wa}>Chat with us</a></p></div>
          )}
          {email && (
            <div className="card"><h3>Email</h3><p><a href={`mailto:${email}`}>{email}</a></p></div>
          )}
          {S.address && (
            <div className="card"><h3>Address</h3><p>{S.address}</p><p><a href={map} target="_blank" rel="noreferrer">Open in Google Maps</a></p></div>
          )}
        </div>
      </section>

      <section id="quote" className="band">
        <div className="wrap narrow">
          <h2>{S.quote_title || 'Request a quote'}</h2>
          <p>{S.quote_intro}</p>
          <QuoteForm S={S} serviceNames={serviceNames} />
        </div>
      </section>
    </Shell>
  );
}
