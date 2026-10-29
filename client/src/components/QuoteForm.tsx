import { FormEvent, useState } from 'react';
import { api } from '../api';
import type { Settings } from './Shell';
import { track } from '../analytics';
import { sendError, waProblem } from '../contactText';

const EMPTY_FORM = { name: '', whatsapp: '', address: '', house_type: '', service_type: '', preferred_date: '', message: '' };
const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);

/** compact: a shorter form (no extra services or date), for the business-card QR page; source is sent along to mark where the lead came from */
export default function QuoteForm({ S, serviceNames, defaultService = '', compact = false, source }:
  { S: Settings; serviceNames: string[]; defaultService?: string; compact?: boolean; source?: string }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, service_type: defaultService });
  const [addons, setAddons] = useState<string[]>([]);
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' });
  const [sent, setSent] = useState<typeof EMPTY_FORM | null>(null);
  const set = (k: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const bad = waProblem(form.whatsapp);
    if (bad) return setState({ kind: 'err', msg: bad });
    setState({ kind: 'sending' });
    try {
      await api('/quotes', { method: 'POST', body: { ...form, addons, ...(source ? { source } : {}) } });
      // the lead GA4 counts (mark generate_lead as a key event in Google Analytics)
      track('generate_lead', { form: source === 'card' ? 'qr_page_quote' : 'quote_form', service: form.service_type, property_type: form.house_type });
      setState({ kind: 'ok' });
      setSent(form);
      setForm({ ...EMPTY_FORM, service_type: defaultService });
      setAddons([]);
    } catch (err) {
      setState({ kind: 'err', msg: sendError(err, S.phone) });
    }
  }

  return (
    <form onSubmit={submit} className="form">
      <label>Full name<input required value={form.name} onChange={set('name')} placeholder="Your name" autoComplete="name" /></label>
      <label>WhatsApp number<input required value={form.whatsapp} onChange={set('whatsapp')} placeholder="e.g. 9123 4567" inputMode="tel" autoComplete="tel" /></label>
      <label className="full">Address<input required value={form.address} onChange={set('address')} placeholder="Block, street, unit or postal code" autoComplete="street-address" /></label>
      <label>Property type<select required value={form.house_type} onChange={set('house_type')}><option value="">Select</option>{lines(S.property_types).map((h) => <option key={h}>{h}</option>)}</select></label>
      <label>Main service needed<select required value={form.service_type} onChange={set('service_type')}><option value="">Select</option>{serviceNames.map((h) => <option key={h}>{h}</option>)}</select></label>
      {!compact && (
        <>
        <fieldset className="full">
          <legend>Other services needed</legend>
          {serviceNames.map((a) => (
            <label key={a} className="check">
              <input type="checkbox" checked={addons.includes(a)} onChange={(e) => setAddons(e.target.checked ? [...addons, a] : addons.filter((x) => x !== a))} />
              {a}
            </label>
          ))}
        </fieldset>
        <label>Preferred date<input type="date" value={form.preferred_date} onChange={set('preferred_date')} /></label>
        </>
      )}
      <label className="full">Message<textarea rows={3} value={form.message} onChange={set('message')} placeholder="Tell us a little about the job" /></label>
      <button className="btn full" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'Sending…' : 'Send request'}</button>
      {state.kind === 'ok' && (
        <div className="sent full" role="status">
          <p className="ok">Request sent. {S.quote_reply_time || 'We will contact you shortly.'}</p>
          {S.whatsapp && sent && (
            <p>
              Want a faster reply?{' '}
              <a className="btn ghost" target="_blank" rel="noopener noreferrer"
                href={`https://wa.me/${S.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I just sent a quote request on your website.\nName: ${sent.name}\nService: ${sent.service_type}\nAddress: ${sent.address}`)}`}>
                Send it on WhatsApp too
              </a>
            </p>
          )}
        </div>
      )}
      {state.kind === 'err' && <p className="err full">{state.msg}</p>}
    </form>
  );
}
