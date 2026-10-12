import { useEffect, useState } from 'react';
import { api } from '../api';
import Shell, { Settings } from '../components/Shell';
import QuoteForm from '../components/QuoteForm';

export default function Contact() {
  const [S, setS] = useState<Settings>({});
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<{ settings?: Settings; services?: { title: string }[] }>('/public/home')
      .then((d) => { setS(d.settings ?? {}); setServiceNames((d.services ?? []).map((s) => s.title)); })
      .catch((e: Error) => setErr(e.message));
  }, []);
  useEffect(() => {
    document.title = S.company_name ? `Contact – ${S.company_name}` : 'Contact';
  }, [S.company_name]);

  const wa = `https://wa.me/${(S.whatsapp || '').replace(/\D/g, '')}`;
  const tel = (S.phone || '').replace(/[^\d+]/g, '');
  const map = S.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.address)}` : '';

  return (
    <Shell S={S}>
      <section className="wrap block">
        <h1 className="h1s">Contact us</h1>
        <p className="lead">Call, message or send us the form. We reply on WhatsApp.</p>
        {err && <p className="err">{err}</p>}
        <div className="contact-blocks">
          {S.phone && (
            <div className="card"><h3>Call</h3><p><a href={`tel:${tel}`}>{S.phone}</a></p></div>
          )}
          {S.whatsapp && (
            <div className="card"><h3>WhatsApp</h3><p><a href={wa}>Chat with us</a></p></div>
          )}
          {S.email && (
            <div className="card"><h3>Email</h3><p><a href={`mailto:${S.email}`}>{S.email}</a></p></div>
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
