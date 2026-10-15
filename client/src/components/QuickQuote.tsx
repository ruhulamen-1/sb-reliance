import { FormEvent, useState } from 'react';
import { api } from '../api';
import type { Settings } from './Shell';

// One-row quote form under the home page hero: only name and WhatsApp are needed.
const EMPTY = { name: '', whatsapp: '', email: '', address: '' };

export default function QuickQuote({ S }: { S: Settings }) {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' });
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ kind: 'sending' });
    try {
      await api('/quotes', { method: 'POST', body: { ...form, quick: true } });
      setState({ kind: 'ok' });
      setForm(EMPTY);
    } catch (err) {
      setState({ kind: 'err', msg: (err as Error).message });
    }
  }

  return (
    <section className="quickq" aria-labelledby="quickq-title">
      <div className="wrap">
        <h2 id="quickq-title">Get a quote</h2>
        <form className="quickq-form" onSubmit={submit}>
          <label>Name<input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
          <label>WhatsApp number<input required type="tel" autoComplete="tel" inputMode="tel" value={form.whatsapp} onChange={set('whatsapp')} /></label>
          <label><span>Email <small>(optional)</small></span><input type="email" autoComplete="email" value={form.email} onChange={set('email')} /></label>
          <label><span>Address <small>(optional)</small></span><input autoComplete="street-address" value={form.address} onChange={set('address')} /></label>
          <button className="btn" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'Sending…' : 'Submit'}</button>
        </form>
        {state.kind === 'ok' && <p className="ok" role="status">Thank you. {S.quote_reply_time || 'We will contact you shortly.'}</p>}
        {state.kind === 'err' && <p className="err" role="alert">{state.msg}</p>}
      </div>
    </section>
  );
}
