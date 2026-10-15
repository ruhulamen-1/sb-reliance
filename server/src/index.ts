import 'dotenv/config';
import { accessSync, constants as fsConstants, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mysql, { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import compression from 'compression';
import { renderHtml, robotsTxt, sitemapXml, SeoPost, SeoService } from './seo.js';
import { SERVICE_DEFAULTS, defaultsFor, slugify } from './serviceDefaults.js';
import { PASS_TYPES, computePay, OW_CEILING } from './payroll.js';
import { ATT_STATUS, autoOt, tally, workingDays, PayrollConfig, readConfig } from './attendance.js';

const env = process.env;
const JWT_SECRET = env.JWT_SECRET || 'change-this-secret';
if (env.NODE_ENV === 'production') {
  const weak: string[] = [];
  if (JWT_SECRET === 'change-this-secret' || JWT_SECRET.length < 24) weak.push('JWT_SECRET (use a random value of 24+ characters)');
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD === 'Admin@12345') weak.push('ADMIN_PASSWORD (do not use the default)');
  if (weak.length) {
    console.error('Refusing to start in production. Set a strong value for: ' + weak.join('; '));
    process.exit(1);
  }
}
const pool = mysql.createPool({
  host: env.DB_HOST || 'localhost',
  user: env.DB_USER || 'root',
  password: env.DB_PASSWORD || '',
  database: env.DB_NAME || 'sbreliance',
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
});

const STATUSES = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'] as const;

// Editable content tables -> whitelisted columns
const CONTENT: Record<string, string[]> = {
  services: ['title', 'slug', 'description', 'content', 'faq', 'seo_title', 'seo_description', 'sort_order', 'image_url'],
  posts: ['title', 'slug', 'excerpt', 'content', 'image_url'],
  testimonials: ['name', 'location', 'text', 'rating', 'status'],
  gallery: ['title', 'category', 'image_url', 'before_image_url', 'location', 'duration', 'description'],
  team: ['name', 'role', 'bio', 'image_url', 'sort_order'],
};

// Site settings (editable from Admin > Settings). Saved values override these defaults.
const DEFAULTS: Record<string, string> = {
  brand: 'SB Reliance',
  company_name: 'SB Reliance Pte Ltd',
  phone: '+65 8533 4478',
  whatsapp: '6585334478',
  email: 'info@example.com',
  address: 'Singapore',
  hero_image: '',
  hero_image_2: '',
  hero_image_3: '',
  hero_headlines: '',
  about_text:
    'SB Reliance Pte Ltd is a Singapore contractor for ACMV and air-conditioning, electrical, CCTV, ceiling partition, painting, tiles and general building works.',
  footer_bg: '',
  org_chart: '',
  logo: '',
  open_hours: '',
  site_url: '',
  seo_title: 'SB Reliance Pte Ltd – ACMV, Electrical, CCTV & Building Contractor in Singapore',
  seo_description:
    'Singapore contractor for ACMV and air-conditioning installation, electrical, CCTV, ceiling partition, painting, tiles and general building works. Request a site visit and written quotation.',
  uen: '',
  licenses: '',
  service_area: '',
  social_links: '',
  privacy_text: '# What we collect\nWhen you send a quote request we collect the details you enter: your name, WhatsApp number, address, property type, the services you need, your preferred date and your message.\n# How we use it\nWe use these details only to reply to your request, visit your site, prepare a quotation and carry out the work you agree to. We may contact you on WhatsApp, by phone or by email about your request.\n# Sharing\nWe do not sell your details. We share them only with people who need them to do the work for you, such as our own team and subcontractors, or when the law requires it.\n# Keeping your details\nWe keep your details for as long as we need them for your request, our records and legal requirements, and then delete them.\n# Your choices\nYou can ask us to show you the details we hold, correct them, or stop contacting you, and you can withdraw your consent at any time. Contact us using the details on our Contact page and we will respond as soon as we can.\n# Changes\nWe may update this policy from time to time. The latest version is always on this page.',
  about_intro: [
    'SB Reliance Pte Ltd specialises in ACMV and air-conditioning installation, electrical, CCTV, ceiling partition, painting, tiles and general building works for homes, offices and commercial spaces across Singapore.',
    'We act as one contractor for M&E, fit-out and finishing works, so you deal with one team from site visit to handover.',
  ].join('\n'),
  about_image: '',
  about_mission:
    'To deliver air-conditioning, electrical, security and building works that are clearly scoped, fairly priced and properly finished.',
  page_bg: '',
  hero_title: 'Air-con, electrical, CCTV and building works from one contractor.',
  hero_lead:
    'SB Reliance Pte Ltd specialises in ACMV and air-conditioning installation, electrical, CCTV, ceiling partition, painting, tiles and general building works for homes, offices and commercial spaces across Singapore.',
  services_title: 'What we do',
  why_title: 'Why work with us',
  why_list: [
    'One contractor for M&E, fit-out and finishing works',
    'Site visit and a written quotation for your exact scope',
    'Registered Singapore company (Pte Ltd)',
    'Scope, timeline and price agreed before work starts',
    'Residential, commercial and industrial projects',
    'Handover inspection before sign-off',
  ].join('\n'),
  process_title: 'How a project runs',
  steps: [
    'Site visit | We check the site and agree the scope with you.',
    'Quotation | You receive a clear written quote and timeline.',
    'Works | Installation or building works carried out on schedule.',
    'Handover | Final inspection and handover once you are satisfied.',
  ].join('\n'),
  quote_title: 'Get a quote',
  quote_intro: 'Tell us what you need and we will get back to you with a site visit and quotation.',
  // trust signals (each block is hidden on the site while its field is empty)
  google_rating: '',
  google_review_count: '',
  google_reviews_url: '',
  stats: '',
  warranty_title: '',
  warranty_text: '',
  quote_reply_time: '',
  notify_email: '',
  ga_measurement_id: '',
  price_range: '',
  property_types: ['HDB', 'Condo', 'Landed', 'Retail Shop', 'Office', 'Factory / Warehouse', 'Others'].join('\n'),
};

async function getSettings(): Promise<Record<string, string>> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM settings WHERE id = 1');
  let saved: Record<string, string> = {};
  if (rows[0]) {
    try {
      saved = JSON.parse(String(rows[0].data));
    } catch {
      saved = {};
    }
  }
  return { ...DEFAULTS, ...saved };
}

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

function auth(req: Request, res: Response, next: NextFunction) {
  try {
    jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Adds a column to an existing table if it is missing (so older databases keep working)
async function ensureColumn(table: string, column: string, ddl: string) {
  const [r] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column],
  );
  if (!r.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
}

async function initDb() {
  const here = dirname(fileURLToPath(import.meta.url));
  const schema = readFileSync(join(here, '..', 'sql', 'schema.sql'), 'utf8');
  const dbName = (env.DB_NAME || 'sbreliance').replace(/[^\w]/g, '');
  const conn0 = {
    host: env.DB_HOST || 'localhost',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    multipleStatements: true,
  };
  let root: Awaited<ReturnType<typeof mysql.createConnection>>;
  try {
    // Hosting providers usually create the database for you: connect to it directly.
    root = await mysql.createConnection({ ...conn0, database: dbName });
  } catch {
    // Local development: create the database if it does not exist yet.
    root = await mysql.createConnection(conn0);
    await root.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4`);
    await root.query(`USE \`${dbName}\``);
  }
  await root.query(schema);
  await root.end();

  await ensureColumn('services', 'image_url', 'image_url VARCHAR(255) NULL');
  await ensureColumn('quotes', 'email', 'email VARCHAR(150) NULL');
  // reviews customers send from /review wait as 'pending' until approved in Admin > Testimonials
  await ensureColumn('testimonials', 'rating', 'rating TINYINT NULL');
  await ensureColumn('testimonials', 'status', "status VARCHAR(10) NOT NULL DEFAULT 'approved'");
  await ensureColumn('testimonials', 'whatsapp', 'whatsapp VARCHAR(40) NULL');
  await ensureColumn('testimonials', 'created_at', 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('posts', 'image_url', 'image_url VARCHAR(255) NULL');
  await ensureColumn('gallery', 'category', "category VARCHAR(80) NOT NULL DEFAULT ''");
  // project case studies (Portfolio)
  await ensureColumn('gallery', 'before_image_url', 'before_image_url VARCHAR(255) NULL');
  await ensureColumn('gallery', 'location', 'location VARCHAR(120) NULL');
  await ensureColumn('gallery', 'duration', 'duration VARCHAR(80) NULL');
  await ensureColumn('gallery', 'description', 'description TEXT NULL');
  // service pages (/services/:slug)
  await ensureColumn('services', 'slug', 'slug VARCHAR(190) NULL');
  await ensureColumn('services', 'content', 'content MEDIUMTEXT NULL');
  await ensureColumn('services', 'faq', 'faq TEXT NULL');
  await ensureColumn('services', 'seo_title', 'seo_title VARCHAR(190) NULL');
  await ensureColumn('services', 'seo_description', 'seo_description VARCHAR(320) NULL');
  // payroll: unpaid days taken from attendance
  await ensureColumn('payroll_items', 'unpaid_days', 'unpaid_days DECIMAL(5,1) NOT NULL DEFAULT 0');
  // payroll: daily-rated workers, Sunday/PH pay, transport, loan and advance (company payslip format)
  await ensureColumn('employees', 'pay_basis', "pay_basis VARCHAR(8) NOT NULL DEFAULT 'monthly'");
  await ensureColumn('employees', 'daily_rate', 'daily_rate DECIMAL(8,2) NOT NULL DEFAULT 0');
  await ensureColumn('employees', 'transport', 'transport DECIMAL(10,2) NOT NULL DEFAULT 0');
  for (const [col, ddl] of [
    ['pay_basis', "pay_basis VARCHAR(8) NOT NULL DEFAULT 'monthly'"],
    ['daily_rate', 'daily_rate DECIMAL(8,2) NOT NULL DEFAULT 0'],
    ['work_days', 'work_days DECIMAL(5,1) NOT NULL DEFAULT 0'],
    ['rest_days', 'rest_days DECIMAL(5,1) NOT NULL DEFAULT 0'],
    ['rest_pay', 'rest_pay DECIMAL(10,2) NOT NULL DEFAULT 0'],
    ['transport', 'transport DECIMAL(10,2) NOT NULL DEFAULT 0'],
    ['loan', 'loan DECIMAL(10,2) NOT NULL DEFAULT 0'],
    ['advance', 'advance DECIMAL(10,2) NOT NULL DEFAULT 0'],
  ]) await ensureColumn('payroll_items', col, ddl);

  const [u] = await pool.query<RowDataPacket[]>('SELECT id FROM users LIMIT 1');
  if (!u.length) {
    const hash = await bcrypt.hash(env.ADMIN_PASSWORD || 'Admin@12345', 10);
    await pool.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [
      env.ADMIN_EMAIL || 'admin@sbreliance.local',
      hash,
    ]);
  }
  const [s] = await pool.query<RowDataPacket[]>('SELECT id FROM services LIMIT 1');
  if (!s.length) {
    const seed: [string, string][] = [
      ['ACMV System Installation', 'Design-aligned installation of air-conditioning and mechanical ventilation systems for commercial and industrial buildings.'],
      ['Air-Condition Installation', 'Supply and installation of split and multi-split air-conditioners for homes, shops and offices.'],
      ['Electrical', 'Electrical wiring, distribution boards, lighting and power works for new fit-outs and renovations.'],
      ['CCTV', 'CCTV camera supply, installation and cabling for homes, offices and commercial premises.'],
      ['Ceiling Partition', 'Partitions and false ceilings that reshape the layout of offices, shops and homes.'],
      ['Painting', 'Interior and exterior painting for residential and commercial spaces.'],
      ['Tiles', 'Floor and wall tiling, including preparation and finishing.'],
      ['General Building Contractor', 'Building and renovation works managed from planning to handover.'],
    ];
    for (let i = 0; i < seed.length; i++)
      await pool.query('INSERT INTO services (title, description, sort_order) VALUES (?, ?, ?)', [seed[i][0], seed[i][1], i + 1]);
  }
  await fillServicePages();
}

// Services without a slug get one (and, for the built-in services, starting page text, FAQ and Google
// title/description). Runs on every start but only touches rows whose slug is still empty.
async function fillServicePages() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, title, content, faq, seo_title, seo_description FROM services WHERE slug IS NULL OR slug = '' ORDER BY sort_order, id");
  for (const r of rows) {
    const d = SERVICE_DEFAULTS[String(r.title).trim()];
    await pool.query('UPDATE services SET slug = ?, content = ?, faq = ?, seo_title = ?, seo_description = ? WHERE id = ?', [
      await uniqueSlug('services', d?.slug || String(r.title), r.id),
      r.content || d?.content || null,
      r.faq || d?.faq || null,
      r.seo_title || d?.seo_title || null,
      r.seo_description || d?.seo_description || null,
      r.id,
    ]);
  }
}

// A URL-safe slug that no other row of the table uses (adds -2, -3... when taken)
async function uniqueSlug(table: 'services' | 'posts', wanted: string, id?: number | string) {
  const base = slugify(wanted) || table.slice(0, -1);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [taken] = await pool.query<RowDataPacket[]>('SELECT id FROM ?? WHERE slug = ? AND id <> ? LIMIT 1', [table, slug, id ?? 0]);
    if (!taken.length) return slug;
  }
}

// UPLOAD_DIR lets you keep uploaded images outside the app folder so redeploys never delete them
const defaultUploads = join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
function pickUploadsDir() {
  const wanted = (env.UPLOAD_DIR || '').trim();
  if (wanted) {
    try {
      mkdirSync(wanted, { recursive: true });
      accessSync(wanted, fsConstants.W_OK);
      return wanted;
    } catch (e) {
      // A wrong UPLOAD_DIR must not take the whole site down (503): fall back and say so in the log
      console.error(`WARNING: UPLOAD_DIR "${wanted}" is not usable (${(e as Error).message}). Using the app folder instead; uploads will be lost on redeploy.`);
    }
  } else if (env.NODE_ENV === 'production') {
    console.warn('WARNING: UPLOAD_DIR is not set. Uploaded images are stored inside the app folder and are deleted on every redeploy. Set UPLOAD_DIR to a folder outside the app.');
  }
  mkdirSync(defaultUploads, { recursive: true });
  return defaultUploads;
}
// UPLOAD_DIR lets you keep uploaded images outside the app folder so redeploys never delete them
const uploadsDir = pickUploadsDir();
console.log('Uploads folder:', uploadsDir);
const IMAGE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// New quote requests are emailed to Admin > Settings "Notify email" (or NOTIFY_EMAIL) when SMTP_* is set.
// Without SMTP settings this does nothing; the request is always saved and shown in Admin > Quotes.
const mailer = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 465),
      secure: Number(env.SMTP_PORT || 465) === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD || '' } : undefined,
    })
  : null;
async function notifyQuote(q: Record<string, unknown>) {
  if (!mailer) return;
  const S = await getSettings();
  const to = (S.notify_email || env.NOTIFY_EMAIL || '').trim();
  if (!to) return;
  const addons = Array.isArray(q.addons) && q.addons.length ? (q.addons as string[]).join(', ') : '-';
  const text = [
    `Name: ${q.name}`,
    `WhatsApp: ${q.whatsapp}  (https://wa.me/${String(q.whatsapp).replace(/\D/g, '')})`,
    `Email: ${q.email || '-'}`,
    `Address: ${q.address}`,
    `Property: ${q.house_type}`,
    `Service: ${q.service_type}`,
    `Other services: ${addons}`,
    `Preferred date: ${q.preferred_date || '-'}`,
    `Message: ${q.message || '-'}`,
    '',
    'Open Admin > Quotes on the website to update the status.',
  ].join('\n');
  await mailer.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject: `New quote request: ${q.service_type} – ${q.name}`, text });
}

async function notifyReview(name: string, rating: number, reviewText: string) {
  if (!mailer) return;
  const S = await getSettings();
  const to = (S.notify_email || env.NOTIFY_EMAIL || '').trim();
  if (!to) return;
  const text = `${name} left a ${rating}-star review:\n\n${reviewText}\n\nOpen Admin > Testimonials to approve it. It is not shown on the website until you do.`;
  await mailer.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject: `New review (${rating}★) from ${name}`, text });
}

const app = express();
app.set('trust proxy', 1); // hosting proxies terminate HTTPS; needed for the correct https:// in canonical URLs
app.disable('x-powered-by');
app.use(compression());
// FORCE_HTTPS=true sends http:// visitors to https://. Opt-in, because a host that does not pass
// X-Forwarded-Proto would otherwise redirect forever (most panels also have their own "Force HTTPS" switch).
const forceHttps = /^(1|true|yes)$/i.test(env.FORCE_HTTPS || '');
app.use((req, res, next) => {
  if (forceHttps && !req.secure && req.method === 'GET' && !/^(localhost|127\.)/.test(req.hostname)) {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
});
app.use(cors());
// upload names are unique (time + random), so a file never changes: browsers may keep it for 30 days
app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: true }));
// the upload route has its own, larger JSON limit
app.use((req, res, next) => (req.path === '/api/admin/upload' ? next() : express.json({ limit: '1mb' })(req, res, next)));

// ---------- Auth ----------
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email || '']);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '12h' }) });
}));

// ---------- Public ----------
app.get('/api/public/gallery', wrap(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, title, category, image_url, before_image_url, location, duration, description FROM gallery ORDER BY id DESC LIMIT 200');
  res.json(rows);
}));

app.get('/api/public/team', wrap(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, role, bio, image_url FROM team ORDER BY sort_order, id');
  res.json(rows);
}));

// Everything the public pages share (settings, services, latest posts, reviews and photos).
// Also put into the first HTML response, so pages render without waiting for a second request.
async function homeData() {
  const [services] = await pool.query<RowDataPacket[]>('SELECT * FROM services ORDER BY sort_order, id');
  const [testimonials] = await pool.query<RowDataPacket[]>("SELECT id, name, location, text, rating FROM testimonials WHERE status = 'approved' ORDER BY id DESC LIMIT 6");
  const [posts] = await pool.query<RowDataPacket[]>('SELECT id, title, slug, excerpt, image_url, created_at FROM posts ORDER BY id DESC LIMIT 3');
  const [gallery] = await pool.query<RowDataPacket[]>('SELECT id, title, image_url FROM gallery ORDER BY id DESC LIMIT 12');
  return { services, testimonials, posts, gallery, settings: await getSettings() };
}

app.get('/api/public/home', wrap(async (_req, res) => {
  res.json(await homeData());
}));

app.get('/api/public/services/:slug', wrap(async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM services ORDER BY sort_order, id');
  const service = rows.find((r) => r.slug === req.params.slug);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const [gallery] = await pool.query<RowDataPacket[]>('SELECT id, title, image_url FROM gallery ORDER BY id DESC LIMIT 8');
  res.json({ service, services: rows, gallery, settings: await getSettings() });
}));

app.get('/api/public/posts/:slug', wrap(async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM posts WHERE slug = ? LIMIT 1', [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
  const [services] = await pool.query<RowDataPacket[]>('SELECT id, title, slug FROM services ORDER BY sort_order, id');
  res.json({ post: rows[0], services, settings: await getSettings() });
}));

app.post('/api/quotes', wrap(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  // the one-row form under the home page hero sends only name, WhatsApp and optional email / address
  const quick = b.quick === true;
  const need = quick ? ['name', 'whatsapp'] : ['name', 'whatsapp', 'address', 'house_type', 'service_type'];
  if (need.some((k) => !String(b[k] ?? '').trim())) return res.status(400).json({ error: 'Please fill all required fields' });
  const email = String(b.email ?? '').trim().slice(0, 150);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please check the email address' });
  if (quick) Object.assign(b, { address: String(b.address ?? '').trim() || '-', house_type: '-', service_type: 'Quick enquiry', addons: [] });
  const [r] = await pool.query<ResultSetHeader>(
    'INSERT INTO quotes (name, whatsapp, email, address, house_type, service_type, addons, preferred_date, message) VALUES (?,?,?,?,?,?,?,?,?)',
    [b.name, b.whatsapp, email || null, b.address, b.house_type, b.service_type, JSON.stringify(b.addons || []), b.preferred_date || null, b.message || null],
  );
  res.status(201).json({ id: r.insertId });
  notifyQuote(b).catch((e) => console.error('Quote email failed:', (e as Error).message));
}));

// Customer review from /review: saved as pending, shown on the site only after approval in Admin
const reviewHits = new Map<string, number[]>();
app.post('/api/reviews', wrap(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (String(b.website ?? '')) return res.status(201).json({ ok: true }); // hidden field only bots fill in
  const now = Date.now();
  const hits = (reviewHits.get(req.ip || '') || []).filter((t) => now - t < 3600_000);
  if (hits.length >= 5) return res.status(429).json({ error: 'Too many reviews from this connection. Please try again later.' });
  const name = String(b.name ?? '').trim().slice(0, 120);
  const reviewText = String(b.text ?? '').trim().slice(0, 1500);
  const rating = Math.round(Number(b.rating));
  if (!name || reviewText.length < 10) return res.status(400).json({ error: 'Please enter your name and a few words about the job' });
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Please choose a star rating' });
  reviewHits.set(req.ip || '', [...hits, now]);
  await pool.query("INSERT INTO testimonials (name, location, text, rating, whatsapp, status) VALUES (?,?,?,?,?,'pending')",
    [name, String(b.location ?? '').trim().slice(0, 120), reviewText, rating, String(b.whatsapp ?? '').trim().slice(0, 40) || null]);
  res.status(201).json({ ok: true });
  notifyReview(name, rating, reviewText).catch((e) => console.error('Review email failed:', (e as Error).message));
}));

// ---------- Admin ----------
app.post('/api/admin/upload', express.json({ limit: '8mb' }), auth, wrap(async (req, res) => {
  const data = String((req.body as { data?: string }).data || '');
  const comma = data.indexOf(',');
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64$/.exec(comma > 0 ? data.slice(0, comma) : '');
  if (!m) return res.status(400).json({ error: 'Only JPG, PNG, WebP or GIF images are allowed' });
  const buf = Buffer.from(data.slice(comma + 1), 'base64');
  if (!buf.length || buf.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Image must be under 5 MB' });
  const name = `${Date.now()}-${randomBytes(4).toString('hex')}.${IMAGE_EXT[m[1]]}`;
  writeFileSync(join(uploadsDir, name), buf);
  res.status(201).json({ url: `/uploads/${name}` });
}));

app.get('/api/admin/settings', auth, wrap(async (_req, res) => {
  res.json(await getSettings());
}));

app.put('/api/admin/settings', auth, wrap(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const next: Record<string, string> = {};
  for (const k of Object.keys(DEFAULTS)) if (typeof b[k] === 'string') next[k] = b[k] as string;
  await pool.query(
    'INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [JSON.stringify(next)],
  );
  res.json({ ok: true });
}));

app.get('/api/admin/stats', auth, wrap(async (_req, res) => {
  const [byStatus] = await pool.query<RowDataPacket[]>('SELECT status, COUNT(*) AS count FROM quotes GROUP BY status');
  const [rev] = await pool.query<RowDataPacket[]>("SELECT COALESCE(SUM(quoted_amount),0) AS revenue FROM quotes WHERE status='completed'");
  res.json({ byStatus, revenue: Number(rev[0].revenue) });
}));

app.get('/api/admin/quotes', auth, wrap(async (req, res) => {
  const status = String(req.query.status || '');
  const [rows] = STATUSES.includes(status as (typeof STATUSES)[number])
    ? await pool.query<RowDataPacket[]>('SELECT * FROM quotes WHERE status = ? ORDER BY id DESC', [status])
    : await pool.query<RowDataPacket[]>('SELECT * FROM quotes ORDER BY id DESC');
  res.json(rows);
}));

app.patch('/api/admin/quotes/:id', auth, wrap(async (req, res) => {
  const b = req.body as { status?: string; quoted_amount?: number | null; notes?: string };
  if (b.status && !STATUSES.includes(b.status as (typeof STATUSES)[number])) return res.status(400).json({ error: 'Bad status' });
  await pool.query(
    'UPDATE quotes SET status = COALESCE(?, status), quoted_amount = ?, notes = ? WHERE id = ?',
    [b.status ?? null, b.quoted_amount ?? null, b.notes ?? null, req.params.id],
  );
  res.json({ ok: true });
}));

app.delete('/api/admin/quotes/:id', auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM quotes WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// Admin > Services > "Add standard services and fill empty pages":
// 1) adds back any of the company's standard services that no current service covers (with page text,
//    FAQ, Google title and description, and the original page address), and
// 2) fills only the EMPTY page text / FAQ / Google title / description of services that have suggested text.
// Nothing an admin has written is overwritten, and nothing is deleted.
app.post('/api/admin/services/standard', auth, wrap(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, title, content, faq, seo_title, seo_description, sort_order FROM services');
  const added: string[] = [];
  const filled: string[] = [];
  let order = Math.max(0, ...rows.map((r) => Number(r.sort_order) || 0));
  for (const [title, d] of Object.entries(SERVICE_DEFAULTS)) {
    if (rows.some((r) => (d.covers ? d.covers.test(String(r.title)) : String(r.title) === title))) continue;
    await pool.query(
      'INSERT INTO services (title, slug, description, content, faq, seo_title, seo_description, sort_order) VALUES (?,?,?,?,?,?,?,?)',
      [title, await uniqueSlug('services', d.slug), d.description || '', d.content, d.faq, d.seo_title, d.seo_description, ++order],
    );
    added.push(title);
  }
  for (const r of rows) {
    const d = defaultsFor(String(r.title));
    if (!d || (r.content && r.faq && r.seo_title && r.seo_description)) continue;
    await pool.query('UPDATE services SET content = ?, faq = ?, seo_title = ?, seo_description = ? WHERE id = ?', [
      r.content || d.content, r.faq || d.faq, r.seo_title || d.seo_title, r.seo_description || d.seo_description, r.id,
    ]);
    filled.push(String(r.title));
  }
  res.json({ added, filled });
}));

// ---------- Payroll (admin only) ----------
const EMP_COLS = ['name', 'id_number', 'pass_type', 'date_of_birth', 'designation', 'join_date', 'pay_basis', 'basic_salary', 'daily_rate', 'transport', 'fixed_allowance', 'ot_rate', 'monthly_levy', 'bank_name', 'bank_account', 'active', 'notes'] as const;
const money = (v: unknown, nullable = false) => {
  if (v === '' || v === null || v === undefined) return nullable ? null : 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : (nullable ? null : 0);
};
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
const text = (v: unknown, max: number) => (String(v ?? '').trim().slice(0, max) || null);
function employeeRow(b: Record<string, unknown>) {
  return {
    name: String(b.name || '').trim().slice(0, 150),
    id_number: text(b.id_number, 20),
    pass_type: PASS_TYPES[String(b.pass_type)] ? String(b.pass_type) : 'WP',
    date_of_birth: day(b.date_of_birth),
    designation: text(b.designation, 120),
    join_date: day(b.join_date),
    pay_basis: b.pay_basis === 'daily' ? 'daily' : 'monthly',
    basic_salary: money(b.basic_salary),
    daily_rate: money(b.daily_rate),
    transport: money(b.transport),
    fixed_allowance: money(b.fixed_allowance),
    ot_rate: money(b.ot_rate, true),
    monthly_levy: money(b.monthly_levy),
    bank_name: text(b.bank_name, 80),
    bank_account: text(b.bank_account, 40),
    active: b.active === 0 || b.active === '0' || b.active === false ? 0 : 1,
    notes: text(b.notes, 2000),
  };
}
app.get('/api/admin/employees', auth, wrap(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM employees ORDER BY active DESC, name');
  res.json(rows);
}));
app.post('/api/admin/employees', auth, wrap(async (req, res) => {
  const e = employeeRow(req.body);
  if (!e.name) return res.status(400).json({ error: 'Name is required' });
  const [r] = await pool.query<ResultSetHeader>('INSERT INTO employees SET ?', [e]);
  res.status(201).json({ id: r.insertId });
}));
app.put('/api/admin/employees/:id', auth, wrap(async (req, res) => {
  const e = employeeRow(req.body);
  if (!e.name) return res.status(400).json({ error: 'Name is required' });
  await pool.query('UPDATE employees SET ? WHERE id = ?', [e, req.params.id]);
  res.json({ ok: true });
}));
app.delete('/api/admin/employees/:id', auth, wrap(async (req, res) => {
  // Paid months are kept as records; unpaid draft lines and attendance go with the employee
  const [paid] = await pool.query<RowDataPacket[]>("SELECT period FROM payroll_items WHERE employee_id = ? AND status = 'paid' ORDER BY period", [req.params.id]);
  if (paid.length) return res.status(400).json({ error: `This employee was paid for ${paid.map((p) => p.period).join(', ')}. Paid salary records must be kept, so set them to Inactive instead of deleting.` });
  await pool.query('DELETE FROM attendance WHERE employee_id = ?', [req.params.id]);
  await pool.query('DELETE FROM payroll_items WHERE employee_id = ?', [req.params.id]);
  await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
// Ordinary Wages (capped) already paid this calendar year before the given month, for the CPF bonus ceiling
async function owYearToDate(employeeId: number, period: string) {
  const [r] = await pool.query<RowDataPacket[]>(
    'SELECT gross_pay, bonus FROM payroll_items WHERE employee_id = ? AND period LIKE ? AND period < ?',
    [employeeId, `${period.slice(0, 4)}-%`, period],
  );
  return r.reduce((t, x) => t + Math.min(Number(x.gross_pay) - Number(x.bonus), OW_CEILING), 0);
}
async function recalc(item: RowDataPacket, emp: RowDataPacket | undefined) {
  const cfg = await payrollConfig();
  const result = computePay({
    pass_type: item.pass_type,
    date_of_birth: emp?.date_of_birth,
    pay_basis: item.pay_basis,
    daily_rate: Number(item.daily_rate),
    work_days: Number(item.work_days),
    rest_days: Number(item.rest_days),
    transport: Number(item.transport),
    loan: Number(item.loan),
    advance: Number(item.advance),
    month_days: workingDays(item.period, cfg.week),
    day_hours: cfg.day_hours,
    basic_salary: Number(item.basic_salary),
    fixed_allowance: Number(item.fixed_allowance),
    other_allowance: Number(item.other_allowance),
    ot_hours: Number(item.ot_hours),
    ot_rate: emp?.ot_rate === null || emp?.ot_rate === undefined ? null : Number(emp.ot_rate),
    bonus: Number(item.bonus),
    unpaid_leave: Number(item.unpaid_leave),
    other_deduction: Number(item.other_deduction),
    levy: Number(item.levy),
    cpf_manual: !!item.cpf_manual,
    cpf_employee: Number(item.cpf_employee),
    cpf_employer: Number(item.cpf_employer),
    ow_ytd: await owYearToDate(item.employee_id, item.period),
  }, item.period);
  const { ordinary_wages: _ow, basic_pay, ...save } = result;
  // daily-rated: the month's basic is days x rate; monthly-rated keep the basic as entered
  const basic = item.pay_basis === 'daily' ? { basic_salary: basic_pay } : {};
  await pool.query('UPDATE payroll_items SET ? WHERE id = ?', [{ ...save, ...basic, cpf_manual: save.cpf_manual ? 1 : 0 }, item.id]);
}
async function periodItems(period: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT p.*, e.id_number FROM payroll_items p LEFT JOIN employees e ON e.id = p.employee_id WHERE p.period = ? ORDER BY p.employee_name', [period]);
  return rows;
}

app.get('/api/admin/payroll', auth, wrap(async (req, res) => {
  const period = String(req.query.period || '');
  if (!PERIOD.test(period)) return res.status(400).json({ error: 'Choose a month' });
  res.json({ items: await periodItems(period), passTypes: PASS_TYPES });
}));

// Adds a draft line for every active employee who is not in the month yet (salary taken from the employee record)
app.post('/api/admin/payroll/generate', auth, wrap(async (req, res) => {
  const period = String((req.body as { period?: string }).period || '');
  if (!PERIOD.test(period)) return res.status(400).json({ error: 'Choose a month' });
  const [emps] = await pool.query<RowDataPacket[]>('SELECT * FROM employees WHERE active = 1');
  const cfg = await payrollConfig();
  let added = 0;
  for (const e of emps) {
    const [r] = await pool.query<ResultSetHeader>(
      `INSERT IGNORE INTO payroll_items (period, employee_id, employee_name, pass_type, designation, pay_basis, daily_rate, basic_salary, transport, fixed_allowance, levy)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [period, e.id, e.name, e.pass_type, e.designation, e.pay_basis, e.daily_rate, e.pay_basis === 'daily' ? 0 : e.basic_salary, e.transport, e.fixed_allowance, e.monthly_levy],
    );
    if (r.affectedRows) {
      added++;
      const [it] = await pool.query<RowDataPacket[]>('SELECT * FROM payroll_items WHERE id = ?', [r.insertId]);
      if (await applyAttendance(it[0], cfg)) {
        const [again] = await pool.query<RowDataPacket[]>('SELECT * FROM payroll_items WHERE id = ?', [r.insertId]);
        await recalc(again[0], e);
      } else await recalc(it[0], e);
    }
  }
  res.json({ added, items: await periodItems(period) });
}));

app.put('/api/admin/payroll/:id', auth, wrap(async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM payroll_items WHERE id = ?', [req.params.id]);
  const item = rows[0];
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.status === 'paid') return res.status(400).json({ error: 'This salary is marked paid. Mark it unpaid to change it.' });
  const b = req.body as Record<string, unknown>;
  const patch = {
    basic_salary: money(b.basic_salary ?? item.basic_salary),
    fixed_allowance: money(b.fixed_allowance ?? item.fixed_allowance),
    other_allowance: money(b.other_allowance ?? item.other_allowance),
    daily_rate: money(b.daily_rate ?? item.daily_rate),
    work_days: money(b.work_days ?? item.work_days),
    rest_days: money(b.rest_days ?? item.rest_days),
    transport: money(b.transport ?? item.transport),
    loan: money(b.loan ?? item.loan),
    advance: money(b.advance ?? item.advance),
    ot_hours: money(b.ot_hours ?? item.ot_hours),
    bonus: money(b.bonus ?? item.bonus),
    unpaid_leave: money(b.unpaid_leave ?? item.unpaid_leave),
    unpaid_days: money(b.unpaid_days ?? item.unpaid_days),
    other_deduction: money(b.other_deduction ?? item.other_deduction),
    deduction_note: text(b.deduction_note ?? item.deduction_note, 255),
    levy: money(b.levy ?? item.levy),
    cpf_manual: b.cpf_manual === undefined ? item.cpf_manual : (b.cpf_manual ? 1 : 0),
    cpf_employee: money(b.cpf_employee ?? item.cpf_employee),
    cpf_employer: money(b.cpf_employer ?? item.cpf_employer),
  };
  await pool.query('UPDATE payroll_items SET ? WHERE id = ?', [patch, item.id]);
  const [emp] = await pool.query<RowDataPacket[]>('SELECT * FROM employees WHERE id = ?', [item.employee_id]);
  const [fresh] = await pool.query<RowDataPacket[]>('SELECT * FROM payroll_items WHERE id = ?', [item.id]);
  await recalc(fresh[0], emp[0]);
  const [out] = await pool.query<RowDataPacket[]>('SELECT * FROM payroll_items WHERE id = ?', [item.id]);
  res.json(out[0]);
}));

app.post('/api/admin/payroll/:id/status', auth, wrap(async (req, res) => {
  const b = req.body as { paid?: boolean; paid_on?: string; payment_mode?: string };
  if (b.paid) {
    await pool.query("UPDATE payroll_items SET status = 'paid', paid_on = ?, payment_mode = ? WHERE id = ?",
      [day(b.paid_on) || new Date().toISOString().slice(0, 10), text(b.payment_mode, 40) || 'Bank transfer', req.params.id]);
  } else {
    await pool.query("UPDATE payroll_items SET status = 'draft', paid_on = NULL WHERE id = ?", [req.params.id]);
  }
  const [out] = await pool.query<RowDataPacket[]>('SELECT * FROM payroll_items WHERE id = ?', [req.params.id]);
  res.json(out[0]);
}));

app.delete('/api/admin/payroll/:id', auth, wrap(async (req, res) => {
  const [r] = await pool.query<ResultSetHeader>("DELETE FROM payroll_items WHERE id = ? AND status <> 'paid'", [req.params.id]);
  if (!r.affectedRows) return res.status(400).json({ error: 'Paid salaries cannot be deleted. Mark it unpaid first.' });
  res.json({ ok: true });
}));

// ---------- Attendance (admin only) ----------
async function payrollConfig(): Promise<PayrollConfig> {
  const [r] = await pool.query<RowDataPacket[]>('SELECT data FROM payroll_config WHERE id = 1');
  return readConfig(r[0]?.data);
}
app.get('/api/admin/payroll-config', auth, wrap(async (_req, res) => { res.json(await payrollConfig()); }));
app.put('/api/admin/payroll-config', auth, wrap(async (req, res) => {
  const cfg = readConfig(JSON.stringify(req.body || {}));
  await pool.query('INSERT INTO payroll_config (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [JSON.stringify(cfg)]);
  res.json(cfg);
}));

// Sets a draft payroll line's OT hours, unpaid days and unpaid leave amount from the month's attendance.
// Returns false when the employee has no attendance in that month (the line is left as it is).
async function applyAttendance(item: RowDataPacket, cfg: PayrollConfig) {
  const [att] = await pool.query<RowDataPacket[]>(
    'SELECT work_date, status, ot_hours FROM attendance WHERE employee_id = ? AND work_date LIKE ?', [item.employee_id, `${item.period}-%`]);
  if (!att.length) return false;
  const t = tally(att as { work_date: string; status: string; ot_hours: unknown }[]);
  if (item.pay_basis === 'daily') {
    // daily-rated: paid only for the days worked or on paid leave, so there is no separate unpaid deduction
    await pool.query('UPDATE payroll_items SET work_days = ?, rest_days = ?, ot_hours = ?, unpaid_days = 0, unpaid_leave = 0 WHERE id = ?',
      [t.paid_days, t.rest_days, t.ot_hours, item.id]);
  } else {
    // MOM: salary for days not worked = monthly gross rate / working days in the month x days
    const daily = (Number(item.basic_salary) + Number(item.fixed_allowance)) / workingDays(item.period, cfg.week);
    await pool.query('UPDATE payroll_items SET rest_days = ?, ot_hours = ?, unpaid_days = ?, unpaid_leave = ? WHERE id = ?',
      [t.rest_days, t.ot_hours, t.unpaid_days, Math.round(daily * t.unpaid_days * 100) / 100, item.id]);
  }
  return true;
}

app.post('/api/admin/payroll/from-attendance', auth, wrap(async (req, res) => {
  const period = String((req.body as { period?: string }).period || '');
  if (!PERIOD.test(period)) return res.status(400).json({ error: 'Choose a month' });
  const cfg = await payrollConfig();
  let updated = 0, paid = 0, none = 0;
  for (const item of await periodItems(period)) {
    if (item.status === 'paid') { paid++; continue; }
    if (!(await applyAttendance(item, cfg))) { none++; continue; }
    const [emp] = await pool.query<RowDataPacket[]>('SELECT * FROM employees WHERE id = ?', [item.employee_id]);
    const [fresh] = await pool.query<RowDataPacket[]>('SELECT * FROM payroll_items WHERE id = ?', [item.id]);
    await recalc(fresh[0], emp[0]);
    updated++;
  }
  res.json({ updated, paid, none, items: await periodItems(period) });
}));

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = (v: unknown) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? String(v) : null);
// Employees shown on a day or month sheet: active ones, plus anyone who already has attendance in it
async function sheetEmployees(like: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, designation, pass_type, active FROM employees
     WHERE active = 1 OR id IN (SELECT employee_id FROM attendance WHERE work_date LIKE ?) ORDER BY name`, [like]);
  return rows;
}
async function paidLock(employeeId: number, date: string) {
  const [r] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM payroll_items WHERE employee_id = ? AND period = ? AND status = 'paid'", [employeeId, date.slice(0, 7)]);
  return r.length > 0;
}

app.get('/api/admin/attendance', auth, wrap(async (req, res) => {
  const date = String(req.query.date || '');
  if (!DATE.test(date)) return res.status(400).json({ error: 'Choose a date' });
  const [records] = await pool.query<RowDataPacket[]>('SELECT * FROM attendance WHERE work_date = ?', [date]);
  const [paid] = await pool.query<RowDataPacket[]>("SELECT employee_id FROM payroll_items WHERE period = ? AND status = 'paid'", [date.slice(0, 7)]);
  res.json({ employees: await sheetEmployees(date), records, locked: paid.map((p) => p.employee_id), config: await payrollConfig() });
}));

app.get('/api/admin/attendance/month', auth, wrap(async (req, res) => {
  const period = String(req.query.period || '');
  if (!PERIOD.test(period)) return res.status(400).json({ error: 'Choose a month' });
  const [records] = await pool.query<RowDataPacket[]>(
    'SELECT employee_id, work_date, status, ot_hours FROM attendance WHERE work_date LIKE ?', [`${period}-%`]);
  const cfg = await payrollConfig();
  res.json({ employees: await sheetEmployees(`${period}-%`), records, working_days: workingDays(period, cfg.week), config: cfg });
}));

// Saves one employee's day; an empty status clears the day. Returns the saved row, or null when cleared.
async function saveDay(employeeId: number, date: string, b: Record<string, unknown>, cfg: PayrollConfig) {
  const status = String(b.status || '');
  if (!status) {
    await pool.query('DELETE FROM attendance WHERE employee_id = ? AND work_date = ?', [employeeId, date]);
    return null;
  }
  const timeIn = TIME(b.time_in), timeOut = TIME(b.time_out);
  // OT left empty = worked from the times (out - in - break - normal hours); a typed number is kept
  const ot = b.ot_hours === '' || b.ot_hours === null || b.ot_hours === undefined
    ? autoOt(status, timeIn, timeOut, cfg)
    : Math.min(24, money(b.ot_hours) as number);
  const row = { employee_id: employeeId, work_date: date, status, time_in: timeIn, time_out: timeOut, ot_hours: ot, note: text(b.note, 120) };
  await pool.query('INSERT INTO attendance SET ? ON DUPLICATE KEY UPDATE status = VALUES(status), time_in = VALUES(time_in), time_out = VALUES(time_out), ot_hours = VALUES(ot_hours), note = VALUES(note)', [row]);
  const [out] = await pool.query<RowDataPacket[]>('SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [employeeId, date]);
  return out[0];
}
const PAID_MSG = 'The salary for this month is marked paid. Mark it unpaid to change attendance.';

app.put('/api/admin/attendance', auth, wrap(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const employeeId = Number(b.employee_id);
  const date = String(b.work_date || '');
  if (!employeeId || !DATE.test(date)) return res.status(400).json({ error: 'Employee and date are required' });
  if (await paidLock(employeeId, date)) return res.status(400).json({ error: PAID_MSG });
  if (b.status && !ATT_STATUS[String(b.status)]) return res.status(400).json({ error: 'Unknown status' });
  res.json(await saveDay(employeeId, date, b, await payrollConfig()));
}));

// One employee's whole month at once: { employee_id, period, days: [{ work_date, status, time_in, time_out, ot_hours, note }] }
app.get('/api/admin/attendance/employee', auth, wrap(async (req, res) => {
  const employeeId = Number(req.query.employee_id);
  const period = String(req.query.period || '');
  if (!employeeId || !PERIOD.test(period)) return res.status(400).json({ error: 'Choose an employee and a month' });
  const [records] = await pool.query<RowDataPacket[]>('SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ? ORDER BY work_date', [employeeId, `${period}-%`]);
  const cfg = await payrollConfig();
  res.json({ records, locked: await paidLock(employeeId, `${period}-01`), working_days: workingDays(period, cfg.week), config: cfg });
}));
app.put('/api/admin/attendance/employee', auth, wrap(async (req, res) => {
  const b = req.body as { employee_id?: unknown; period?: string; days?: Record<string, unknown>[] };
  const employeeId = Number(b.employee_id);
  const period = String(b.period || '');
  if (!employeeId || !PERIOD.test(period) || !Array.isArray(b.days)) return res.status(400).json({ error: 'Choose an employee and a month' });
  if (await paidLock(employeeId, `${period}-01`)) return res.status(400).json({ error: PAID_MSG });
  const days = b.days.filter((d) => DATE.test(String(d.work_date || '')) && String(d.work_date).startsWith(period));
  const bad = days.find((d) => d.status && !ATT_STATUS[String(d.status)]);
  if (bad) return res.status(400).json({ error: `Unknown status on ${bad.work_date}` });
  const cfg = await payrollConfig();
  let saved = 0, cleared = 0;
  for (const d of days) (await saveDay(employeeId, String(d.work_date), d, cfg)) ? saved++ : cleared++;
  const [records] = await pool.query<RowDataPacket[]>('SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ? ORDER BY work_date', [employeeId, `${period}-%`]);
  res.json({ saved, cleared, records });
}));

// Gives every active employee without an entry that day the same status (usually Present)
app.post('/api/admin/attendance/fill', auth, wrap(async (req, res) => {
  const b = req.body as { date?: string; status?: string };
  const date = String(b.date || '');
  const status = String(b.status || 'P');
  if (!DATE.test(date) || !ATT_STATUS[status]) return res.status(400).json({ error: 'Choose a date' });
  const [r] = await pool.query<ResultSetHeader>(
    `INSERT IGNORE INTO attendance (employee_id, work_date, status)
     SELECT e.id, ?, ? FROM employees e WHERE e.active = 1
       AND e.id NOT IN (SELECT employee_id FROM payroll_items WHERE period = ? AND status = 'paid')`,
    [date, status, date.slice(0, 7)]);
  res.json({ added: r.affectedRows });
}));

// The month as a CSV file (opens in Excel)
app.get('/api/admin/payroll/export', auth, wrap(async (req, res) => {
  const period = String(req.query.period || '');
  if (!PERIOD.test(period)) return res.status(400).json({ error: 'Choose a month' });
  const items = await periodItems(period);
  const [emps] = await pool.query<RowDataPacket[]>('SELECT id, id_number, bank_name, bank_account FROM employees');
  const byId = new Map(emps.map((e) => [e.id, e]));
  const cols: [string, (r: RowDataPacket) => unknown][] = [
    ['Month', (r) => r.period], ['Employee', (r) => r.employee_name], ['NRIC/FIN', (r) => byId.get(r.employee_id)?.id_number || ''],
    ['Pass', (r) => PASS_TYPES[r.pass_type] || r.pass_type], ['Designation', (r) => r.designation || ''],
    ['Pay basis', (r) => r.pay_basis], ['Days', (r) => (r.pay_basis === 'daily' ? r.work_days : '')], ['Daily rate', (r) => (r.pay_basis === 'daily' ? r.daily_rate : '')],
    ['Basic', (r) => r.basic_salary], ['Sunday/PH days', (r) => r.rest_days], ['Sunday/PH pay', (r) => r.rest_pay], ['Transport', (r) => r.transport],
    ['Fixed allowance', (r) => r.fixed_allowance], ['Other allowance', (r) => r.other_allowance],
    ['OT hours', (r) => r.ot_hours], ['OT rate', (r) => r.ot_rate], ['OT pay', (r) => r.ot_pay], ['Bonus', (r) => r.bonus],
    ['Unpaid days', (r) => r.unpaid_days], ['Unpaid leave', (r) => r.unpaid_leave], ['Gross pay', (r) => r.gross_pay], ['CPF employee', (r) => r.cpf_employee],
    ['Loan', (r) => r.loan], ['Advance', (r) => r.advance], ['Other deductions', (r) => r.other_deduction], ['Deduction note', (r) => r.deduction_note || ''], ['Net pay', (r) => r.net_pay],
    ['CPF employer', (r) => r.cpf_employer], ['SDL', (r) => r.sdl], ['Levy', (r) => r.levy],
    ['Bank', (r) => byId.get(r.employee_id)?.bank_name || ''], ['Account', (r) => byId.get(r.employee_id)?.bank_account || ''],
    ['Status', (r) => r.status], ['Paid on', (r) => r.paid_on || ''], ['Payment mode', (r) => r.payment_mode || ''],
  ];
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // keep spreadsheet formulas from running
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.map(([h]) => h).join(','), ...items.map((r) => cols.map(([, f]) => cell(f(r))).join(','))].join('\r\n');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-${period}.csv"`);
  res.type('text/csv').send('\ufeff' + csv);
}));

for (const [table, cols] of Object.entries(CONTENT)) {
  const base = `/api/admin/${table}`;
  const values = (b: Record<string, unknown>) => cols.map((c) => {
    // testimonials: review status and an optional 1-5 star rating
    if (c === 'status') return ['approved', 'pending', 'hidden'].includes(String(b.status)) ? b.status : 'approved';
    if (c === 'rating') { const n = Math.round(Number(b.rating)); return n >= 1 && n <= 5 ? n : null; }
    return b[c] ?? null;
  });
  // services and posts get a clean, unique slug (from the title when left empty)
  const withSlug = async (b: Record<string, unknown>, id?: string) => {
    if (table !== 'services' && table !== 'posts') return b;
    return { ...b, slug: await uniqueSlug(table, String(b.slug || '').trim() || String(b.title || ''), id) };
  };
  app.get(base, auth, wrap(async (_req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM ?? ORDER BY id DESC', [table]);
    res.json(rows);
  }));
  app.post(base, auth, wrap(async (req, res) => {
    const sql = `INSERT INTO ?? (${cols.map(() => '??').join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
    const [r] = await pool.query<ResultSetHeader>(sql, [table, ...cols, ...values(await withSlug(req.body))]);
    res.status(201).json({ id: r.insertId });
  }));
  app.put(`${base}/:id`, auth, wrap(async (req, res) => {
    const sql = `UPDATE ?? SET ${cols.map(() => '?? = ?').join(',')} WHERE id = ?`;
    const v = values(await withSlug(req.body, req.params.id));
    const params = [table, ...cols.flatMap((c, i) => [c, v[i]]), req.params.id];
    await pool.query(sql, params);
    res.json({ ok: true });
  }));
  app.delete(`${base}/:id`, auth, wrap(async (req, res) => {
    await pool.query('DELETE FROM ?? WHERE id = ?', [table, req.params.id]);
    res.json({ ok: true });
  }));
}

// ---------- SEO files + built client (client/dist) ----------
// Public base URL: SITE_URL env, else Admin > Settings "Website address", else the request's own host.
function baseUrl(req: Request, S: Record<string, string>) {
  const fixed = (env.SITE_URL || S.site_url || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(fixed) ? fixed : `${req.protocol}://${req.get('host')}`;
}
app.get('/robots.txt', wrap(async (req, res) => {
  res.type('text/plain').send(robotsTxt(baseUrl(req, await getSettings())));
}));
app.get('/sitemap.xml', wrap(async (req, res) => {
  const [services] = await pool.query<RowDataPacket[]>('SELECT title, description, slug FROM services ORDER BY sort_order, id');
  const [posts] = await pool.query<RowDataPacket[]>('SELECT title, slug, excerpt, created_at FROM posts ORDER BY id DESC');
  res.type('application/xml').send(sitemapXml(baseUrl(req, await getSettings()), services as SeoService[], posts as SeoPost[]));
}));

const clientDist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  const indexFile = join(clientDist, 'index.html');
  const template = readFileSync(indexFile, 'utf8');
  app.use(express.static(clientDist, {
    index: false,
    // build files in /assets have a content hash in their name: cache them for a year
    setHeaders: (res, file) => { if (/[\\/]assets[\\/]/.test(file)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); },
  }));
  app.get(/^\/(?!api).*/, async (req, res) => {
    try {
      const home = await homeData();
      const S = home.settings;
      const services = home.services;
      const postSlug = /^\/blog\/([^/]+)\/?$/.exec(req.path)?.[1];
      let post: SeoPost | null = null;
      if (postSlug) {
        let slug = postSlug;
        try { slug = decodeURIComponent(postSlug); } catch { /* keep as is */ }
        const [p] = await pool.query<RowDataPacket[]>('SELECT title, slug, excerpt, content, image_url, created_at FROM posts WHERE slug = ? LIMIT 1', [slug]);
        post = (p[0] as SeoPost) || null;
      }
      const { html, status } = renderHtml(template, req.path, S, { services: services as SeoService[], post }, baseUrl(req, S), home);
      res.status(status).type('html').setHeader('Cache-Control', 'no-cache').send(html);
    } catch (e) {
      console.error('SEO render failed, sending plain index.html:', (e as Error).message);
      res.sendFile(indexFile);
    }
  });
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Start at PORT (default 3000); if busy, take the next free port
const portFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.api-port');
function listen(port: number, tries = 0) {
  const srv = app.listen(port, () => {
    try { writeFileSync(portFile, String(port)); } catch { /* read-only file system on some hosts */ }
    console.log(`API running on :${port}  ->  http://localhost:${port}`);
  });
  srv.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE' && tries < 20) listen(port + 1, tries + 1);
    else throw e;
  });
}

initDb()
  .then(() => listen(Number(env.PORT || 3000)))
  .catch((e) => {
    console.error('DB init failed:', e.message);
    process.exit(1);
  });
