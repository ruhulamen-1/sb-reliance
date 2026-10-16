// Customer reviews: a summary card (Google rating from Admin > Settings) and a row of review cards
// that scrolls sideways. Reviews marked "Google" in Admin > Testimonials carry the Google "G" mark.
import { useRef, useState } from 'react';
import type { Settings } from './Shell';
import { ReviewsButton } from './Trust';

export interface Review { id: number; name: string; location?: string | null; text: string; rating?: number | null; source?: string | null; date?: string | null }

const AVATAR = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#00796b', '#5f6368', '#c5221f'];
const avatarColor = (name: string) => AVATAR[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];

/** "2026-07-03" -> "3 months ago" */
function ago(date?: string | null): string {
  if (!date) return '';
  const days = Math.floor((Date.now() - new Date(`${date}T00:00:00+08:00`).getTime()) / 86_400_000);
  if (Number.isNaN(days)) return '';
  const say = (n: number, unit: string) => (n === 1 ? `a ${unit} ago` : `${n} ${unit}s ago`);
  if (days < 1) return 'today';
  if (days < 7) return say(days, 'day');
  if (days < 30) return say(Math.floor(days / 7), 'week');
  if (days < 365) return say(Math.max(1, Math.floor(days / 30)), 'month');
  return say(Math.floor(days / 365), 'year');
}

const ratingWord = (r: number) => (r >= 4.5 ? 'Excellent' : r >= 4 ? 'Very good' : r >= 3.5 ? 'Good' : '');

function Stars({ value, size = 18 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="grv-stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path fill={i <= full ? '#fbbc04' : '#dadce0'} d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

const GoogleG = () => (
  <svg className="grv-g" viewBox="0 0 48 48" width="20" height="20" role="img" aria-label="Google review">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

const GoogleWord = () => (
  <span className="grv-word" aria-label="Google">
    <span style={{ color: '#4285F4' }}>G</span><span style={{ color: '#EA4335' }}>o</span><span style={{ color: '#FBBC05' }}>o</span>
    <span style={{ color: '#4285F4' }}>g</span><span style={{ color: '#34A853' }}>l</span><span style={{ color: '#EA4335' }}>e</span>
  </span>
);

function Card({ r }: { r: Review }) {
  const [open, setOpen] = useState(false);
  const long = r.text.length > 170;
  const google = r.source === 'google';
  return (
    <figure className="grv-card">
      <header>
        <span className="grv-avatar" style={{ background: avatarColor(r.name) }} aria-hidden="true">{r.name.trim().charAt(0).toUpperCase()}</span>
        <figcaption>
          <strong>{r.name}</strong>
          <small>{[r.location, ago(r.date)].filter(Boolean).join(' · ')}</small>
        </figcaption>
        {google && <GoogleG />}
      </header>
      {r.rating ? <Stars value={r.rating} /> : null}
      <blockquote className={open || !long ? '' : 'clamp'}>{r.text}</blockquote>
      {long && <button type="button" className="grv-more" onClick={() => setOpen((o) => !o)}>{open ? 'Show less' : 'Read more'}</button>}
    </figure>
  );
}

export default function GoogleReviews({ S, reviews }: { S: Settings; reviews: Review[] }) {
  const track = useRef<HTMLDivElement>(null);
  const rating = Number(S.google_rating);
  const hasRating = rating > 0 && rating <= 5;
  const count = (S.google_review_count || '').trim();
  const fromGoogle = reviews.some((r) => r.source === 'google');
  const link = /^https?:\/\/\S+$/i.test((S.google_reviews_url || '').trim()) ? S.google_reviews_url : '';
  if (!reviews.length && !hasRating) return null;
  const go = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.9, behavior: 'smooth' });

  const summary = hasRating && (
    <div className="grv-sum">
      {ratingWord(rating) && <strong className="grv-label">{ratingWord(rating)}</strong>}
      <Stars value={rating} size={30} />
      <p>{count ? <>Based on <b>{count} reviews</b></> : <>Rated <b>{rating}</b> out of 5</>}</p>
      <GoogleWord />
    </div>
  );

  return (
    <section className="wrap block greviews" aria-labelledby="greviews-title">
      <h2 id="greviews-title">{fromGoogle || hasRating ? 'Our clients’ Google reviews' : 'What customers say'}</h2>
      <div className="grv">
        {summary && (link ? <a className="grv-sumlink" href={link} target="_blank" rel="noopener noreferrer">{summary}</a> : summary)}
        {reviews.length > 0 && (
          <div className="grv-rail">
            <button type="button" className="grv-nav prev" onClick={() => go(-1)} aria-label="Previous reviews">‹</button>
            <div className="grv-track" ref={track} tabIndex={0} aria-label="Reviews">
              {reviews.map((r) => <Card key={r.id} r={r} />)}
            </div>
            <button type="button" className="grv-nav next" onClick={() => go(1)} aria-label="More reviews">›</button>
          </div>
        )}
      </div>
      <ReviewsButton S={S} />
    </section>
  );
}
