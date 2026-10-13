import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mysql, { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { renderHtml, robotsTxt, sitemapXml } from './seo.js';

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
  services: ['title', 'description', 'sort_order', 'image_url'],
  posts: ['title', 'slug', 'excerpt', 'content', 'image_url'],
  testimonials: ['name', 'location', 'text'],
  gallery: ['title', 'category', 'image_url'],
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
  await ensureColumn('posts', 'image_url', 'image_url VARCHAR(255) NULL');
  await ensureColumn('gallery', 'category', "category VARCHAR(80) NOT NULL DEFAULT ''");

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
}

// UPLOAD_DIR lets you keep uploaded images outside the app folder so redeploys never delete them
const uploadsDir = env.UPLOAD_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
mkdirSync(uploadsDir, { recursive: true });
const IMAGE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const app = express();
app.set('trust proxy', 1); // hosting proxies terminate HTTPS; needed for the correct https:// in canonical URLs
app.use(cors());
app.use('/uploads', express.static(uploadsDir));
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
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, title, category, image_url FROM gallery ORDER BY id DESC LIMIT 200');
  res.json(rows);
}));

app.get('/api/public/team', wrap(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, role, bio, image_url FROM team ORDER BY sort_order, id');
  res.json(rows);
}));

app.get('/api/public/home', wrap(async (_req, res) => {
  const [services] = await pool.query<RowDataPacket[]>('SELECT * FROM services ORDER BY sort_order, id');
  const [testimonials] = await pool.query<RowDataPacket[]>('SELECT * FROM testimonials ORDER BY id DESC LIMIT 6');
  const [posts] = await pool.query<RowDataPacket[]>('SELECT id, title, slug, excerpt, image_url, created_at FROM posts ORDER BY id DESC LIMIT 3');
  const [gallery] = await pool.query<RowDataPacket[]>('SELECT id, title, image_url FROM gallery ORDER BY id DESC LIMIT 12');
  res.json({ services, testimonials, posts, gallery, settings: await getSettings() });
}));

app.post('/api/quotes', wrap(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const need = ['name', 'whatsapp', 'address', 'house_type', 'service_type'];
  if (need.some((k) => !String(b[k] ?? '').trim())) return res.status(400).json({ error: 'Please fill all required fields' });
  const [r] = await pool.query<ResultSetHeader>(
    'INSERT INTO quotes (name, whatsapp, address, house_type, service_type, addons, preferred_date, message) VALUES (?,?,?,?,?,?,?,?)',
    [b.name, b.whatsapp, b.address, b.house_type, b.service_type, JSON.stringify(b.addons || []), b.preferred_date || null, b.message || null],
  );
  res.status(201).json({ id: r.insertId });
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

for (const [table, cols] of Object.entries(CONTENT)) {
  const base = `/api/admin/${table}`;
  const values = (b: Record<string, unknown>) => cols.map((c) => b[c] ?? null);
  app.get(base, auth, wrap(async (_req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM ?? ORDER BY id DESC', [table]);
    res.json(rows);
  }));
  app.post(base, auth, wrap(async (req, res) => {
    const sql = `INSERT INTO ?? (${cols.map(() => '??').join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
    const [r] = await pool.query<ResultSetHeader>(sql, [table, ...cols, ...values(req.body)]);
    res.status(201).json({ id: r.insertId });
  }));
  app.put(`${base}/:id`, auth, wrap(async (req, res) => {
    const sql = `UPDATE ?? SET ${cols.map(() => '?? = ?').join(',')} WHERE id = ?`;
    const params = [table, ...cols.flatMap((c, i) => [c, values(req.body)[i]]), req.params.id];
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
  res.type('application/xml').send(sitemapXml(baseUrl(req, await getSettings())));
}));

const clientDist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  const indexFile = join(clientDist, 'index.html');
  const template = readFileSync(indexFile, 'utf8');
  app.use(express.static(clientDist, { index: false }));
  app.get(/^\/(?!api).*/, async (req, res) => {
    try {
      const S = await getSettings();
      const [services] = await pool.query<RowDataPacket[]>('SELECT title, description FROM services ORDER BY sort_order, id');
      const { html, status } = renderHtml(template, req.path, S, services as { title: string; description: string }[], baseUrl(req, S));
      res.status(status).type('html').send(html);
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
