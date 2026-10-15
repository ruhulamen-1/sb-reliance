import { FormEvent, useEffect, useState } from 'react';
import { api, homeData } from '../api';
import Shell, { Settings } from '../components/Shell';
import useSeo from '../components/useSeo';

// /review: the link sent to customers after a job. Reviews wait in Admin > Testimonials until approved.
const EMPTY = { name: '', location: '', text: '', whatsapp: '', website: '' };

export default function Review() {
  const [S, setS] = useState<Settings>({});
  const [form, setForm] = useState(EMPTY);
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' });
  useEffect(() => { homeData<{ settings?: Settings }>().then((d) => setS(d.settings ?? {})).catch(() => undefined); }, []);
  useSeo({ title: S.company_name ? `Leave a review – ${S.company_name}` : '', description: '', canonical: '/review' });
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) return setState({ kind: 'err', msg: 'Please choose a star rating' });
    setState({ kind: 'sending' });
    try {
      await api('/reviews', { method: 'POST', body: { ...form, rating } });
      setState({ kind: 'ok' });
    } catch (err) {
      setState({ kind: 'err', msg: (err as Error).message });
    }
  }

  const google = /^https?:\/\//.test(S.google_reviews_url || '') ? S.google_reviews_url : '';
  return (
    <Shell S={S}>
      <section className="wrap narrow block">
        <h1 className="h1s">How did we do?</h1>
        {state.kind === 'ok' ? (
          <div className="card" role="status">
            <p className="ok">Thank you, {form.name.split(' ')[0]}. Your review has been sent.</p>
            {google && rating >= 4 && (
              <p>It would help us a lot if you could post the same review on Google too.{' '}
                <a className="btn" href={google} target="_blank" rel="noopener noreferrer">Review us on Google</a></p>
            )}
          </div>
        ) : (
          <>
            <p>Thank you for choosing {S.company_name || 'us'}. Tell us how the job went. Your review appears on our website after we check it.</p>
            <form className="form" onSubmit={submit}>
              <fieldset className="full stars" aria-required="true">
                <legend>Your rating</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className={n <= rating ? 'on' : ''}>
                    <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
                    <span aria-hidden="true">★</span><span className="sr">{n} star{n > 1 ? 's' : ''}</span>
                  </label>
                ))}
              </fieldset>
              <label>Your name<small>Shown with the review</small><input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
              <label>Area (optional)<small>e.g. Tampines, Jurong office</small><input value={form.location} onChange={set('location')} /></label>
              <label className="full">Your review<small>What we did and how it went</small><textarea required minLength={10} rows={5} value={form.text} onChange={set('text')} /></label>
              <label>WhatsApp number (optional)<small>Not shown. Only so we can match the review to your job.</small><input type="tel" autoComplete="tel" value={form.whatsapp} onChange={set('whatsapp')} /></label>
              <label className="hp" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
              <button className="btn full" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'Sending…' : 'Send review'}</button>
              {state.kind === 'err' && <p className="err full" role="alert">{state.msg}</p>}
            </form>
          </>
        )}
      </section>
    </Shell>
  );
}
