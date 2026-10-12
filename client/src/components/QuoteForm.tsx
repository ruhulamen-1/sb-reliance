import { FormEvent, useState } from 'react';
import { api } from '../api';
import type { Settings } from './Shell';

const EMPTY_FORM = { name: '', whatsapp: '', address: '', house_type: '', service_type: '', preferred_date: '', message: '' };
const lines = (v?: string) => (v || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default function QuoteForm({ S, serviceNames }: { S: Settings; serviceNames: string[] }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [addons, setAddons] = useState<string[]>([]);
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' });
  const set = (k: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ kind: 'sending' });
    try {
      await api('/quotes', { method: 'POST', body: { ...form, addons } });
      setState({ kind: 'ok' });
      setForm(EMPTY_FORM);
      setAddons([]);
    } catch (err) {
      setState({ kind: 'err', msg: (err as Error).message });
    }
  }

  return (
    <form onSubmit={submit} className="form">
      <label>Full name<input required value={form.name} onChange={set('name')} /></label>
      <label>WhatsApp number<input required value={form.whatsapp} onChange={set('whatsapp')} /></label>
      <label className="full">Address<input required value={form.address} onChange={set('address')} /></label>
      <label>Property type<select required value={form.house_type} onChange={set('house_type')}><option value="">Select</option>{lines(S.property_types).map((h) => <option key={h}>{h}</option>)}</select></label>
      <label>Main service needed<select required value={form.service_type} onChange={set('service_type')}><option value="">Select</option>{serviceNames.map((h) => <option key={h}>{h}</option>)}</select></label>
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
      <label className="full">Message<textarea rows={3} value={form.message} onChange={set('message')} /></label>
      <button className="btn full" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'Sending…' : 'Send request'}</button>
      {state.kind === 'ok' && <p className="ok full">Request sent. We will contact you shortly.</p>}
      {state.kind === 'err' && <p className="err full">{state.msg}</p>}
    </form>
  );
}
