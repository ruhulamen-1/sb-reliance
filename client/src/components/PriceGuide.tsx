// Starting prices entered per service in Admin > Services > Price guide ("Item | Price | Note" per line).
import { Link } from 'react-router-dom';
import type { Service } from './content';

export type PriceRow = { item: string; price: string; note: string };

export function priceRows(v?: string | null): PriceRow[] {
  return (v || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [item = '', price = '', ...note] = l.split('|').map((x) => x.trim());
    return { item, price, note: note.join(' | ') };
  }).filter((r) => r.item && r.price);
}

const NOTE = 'Starting prices for typical jobs. The final price depends on your site and scope and is confirmed in a written quotation after the site visit.';

/** Table of prices on a service page. */
export function PriceTable({ service }: { service: Service }) {
  const rows = priceRows(service.prices);
  if (!rows.length) return null;
  return (
    <section className="wrap block" aria-labelledby="price-guide">
      <h2 id="price-guide">{service.title} price guide</h2>
      <div className="price-table">
        {rows.map((r) => (
          <div key={r.item} className="price-row">
            <div><strong>{r.item}</strong>{r.note && <small>{r.note}</small>}</div>
            <span className="price">{r.price}</span>
          </div>
        ))}
      </div>
      <p className="price-note">{NOTE}</p>
    </section>
  );
}

/** Home page: one card per service that has prices, with its first (usually lowest) price. */
export function PriceCards({ services }: { services: Service[] }) {
  const priced = services.map((s) => ({ s, rows: priceRows(s.prices) })).filter((x) => x.rows.length);
  if (!priced.length) return null;
  return (
    <section className="band light" aria-labelledby="home-prices">
      <div className="wrap">
        <h2 id="home-prices">Price guide</h2>
        <div className="price-cards">
          {priced.map(({ s, rows }) => (
            <Link key={s.id} className="price-card" to={s.slug ? `/services/${s.slug}` : '/contact'}>
              <span className="price-card-title">{s.title}</span>
              <span className="price">{rows[0].price}</span>
              <small>{rows[0].item}</small>
              <span className="more">{rows.length > 1 ? `See ${rows.length} prices` : 'See details'} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
        <p className="price-note">{NOTE}</p>
      </div>
    </section>
  );
}
