# Hostinger এ live করার গাইড

এই app এ আছে: React (client) + Node.js/Express (server) + MySQL। তাই Hostinger এ **Node.js Web App** সুবিধা থাকা plan লাগবে।

## ১. কী কিনবেন
- **Hosting:** Business Web Hosting, অথবা Cloud Startup (বা তার ওপরের Cloud plan)। Hostinger এর নথি অনুযায়ী Node.js Web App এই plan গুলোতে চলে। সস্তা Single/Premium plan এ Node.js app চলে না। (VPS ও চলে, কিন্তু সেটা নিজে command দিয়ে সাজাতে হয়।)
- **Domain:** একই cart এ domain নিলে সাধারণত hosting এর সঙ্গে নিজে থেকে যুক্ত হয়, আলাদা DNS বদলাতে হয় না।
- কেনাকাটা আপনাকেই করতে হবে (payment আমি করতে পারি না)।

## ২. MySQL database বানান
hPanel → **Databases → MySQL Databases** এ নতুন database, user ও password বানান। নামগুলো টুকে রাখুন (নিচে লাগবে)।

## ৩. Web App তৈরি
hPanel → **Websites → Create Website → Web App → Import Git Repository** → GitHub authorize করে `ruhulamen-1/sb-reliance` বেছে নিন।

Build settings (hPanel যা দেখায় সেটা মিলিয়ে নিন):
| ঘর | মান |
|---|---|
| Build command | `npm run build` |
| Start command / Entry file | `npm start` অথবা `server/dist/index.js` |
| Node.js version | 20.x বা 22.x |

(root `npm install` চললে `postinstall` এ client ও server এর package নিজে থেকে install হয়।)

## ৪. Environment variables
Web App এর **Environment Variables** এ এগুলো দিন:

| নাম | মান |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST` | hPanel এর MySQL পাতায় যা লেখা আছে (সাধারণত `localhost`) |
| `DB_USER` | আপনার MySQL user |
| `DB_PASSWORD` | সেই password |
| `DB_NAME` | database এর নাম |
| `JWT_SECRET` | লম্বা এলোমেলো লেখা (২৪+ অক্ষর) |
| `ADMIN_EMAIL` | আপনার admin email |
| `ADMIN_PASSWORD` | শক্ত নতুন password |
| `SITE_URL` | (প্রস্তাবিত) আপনার আসল domain, যেমন `https://your-domain.com` (শেষে `/` ছাড়া)। canonical link, sitemap আর link preview এ লাগে |
| `UPLOAD_DIR` | (ঐচ্ছিক) app folder এর বাইরের একটা পথ, যাতে নতুন deploy এ ছবি মুছে না যায় |

`NODE_ENV=production` দিলে `JWT_SECRET` আর `ADMIN_PASSWORD` ডিফল্ট থাকলে server চালুই হবে না, এটা ইচ্ছাকৃত নিরাপত্তা।

ঐচ্ছিক (দরকার হলে):

| নাম | কী করে |
|---|---|
| `FORCE_HTTPS` | `true` দিলে http:// থেকে https:// এ পাঠায়। hPanel এ নিজস্ব "Force HTTPS" থাকলে সেটাই যথেষ্ট। |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | নতুন quote এলে email পাঠায় (Hostinger email: `smtp.hostinger.com`, port `465`)। প্রাপক = Admin → Settings → "Email new quote requests to"। |

## ৫. Deploy ও domain
1. **Deploy** চাপুন। প্রথমবার চালু হলে টেবিল আর admin user নিজে তৈরি হয়।
2. Domain যুক্ত করুন এবং **SSL (https)** চালু করুন (hPanel → Security → SSL)।
3. `https://আপনার-domain/admin` এ ঢুকে admin email/password দিয়ে login করুন।

## ৬. Live হওয়ার পর করণীয়
- Admin → Settings এ ফোন, WhatsApp (শুধু অঙ্ক, দেশের কোডসহ), email, ঠিকানা, logo ও ছবি দিন।
- Admin → Team, Gallery, Blog, Testimonials এ আসল তথ্য দিন।
- Admin → Settings এ trust এর তথ্য দিন (শুধু আসল তথ্য; খালি থাকলে site এ লুকানো থাকে): UEN, licences, Google rating ও reviews link, numbers (যেমন `120+ | Projects completed`), guarantee, quote পাঠানোর পরের message।
- Google Analytics: analytics.google.com এ GA4 property বানিয়ে Web data stream এর Measurement ID (`G-...`) Admin → Settings → "Google Analytics measurement ID" তে দিন। খালি রাখলে Analytics বন্ধ থাকে; admin পাতায় কখনো চলে না।
- Admin → Gallery তে project এর location, সময়, কী কাজ এবং before photo দিলে Portfolio তে before / after দেখায়।
- Privacy policy লেখাটা আপনার আসল নিয়মের সঙ্গে মিলিয়ে নিন।
- Database এর নিয়মিত backup নিন (hPanel → Backups বা phpMyAdmin → Export)।
- Admin password আর `.env` কখনো GitHub এ রাখবেন না (`.env` আগে থেকেই `.gitignore` এ আছে)।

## Payroll (Admin → Payroll)
- **Employees:** প্রতিটা কর্মী একবার যোগ করুন (নাম, pass, জন্মতারিখ, basic salary, allowance, levy)।
- **Monthly payroll:** মাস বেছে "Add active employees to this month" চাপুন, তারপর OT ঘণ্টা, bonus, ছুটি কাটা, অন্য কাটা লিখুন। CPF, SDL, net pay নিজে হিসাব হয়।
- **Attendance:** একজনের পুরো মাস একসাথে দিতে "One employee, full month" (কর্মী আর মাস বেছে "Fill empty days", তারপর শুধু absent/ছুটির দিন বদলে "Save month")। অথবা প্রতিদিন তারিখ বেছে "Mark the rest Present" চাপুন, তারপর যারা আসেনি/ছুটিতে তাদের status বদলান। Time in/out দিলে OT নিজে হিসাব হয়, না হলে OT ঘণ্টা নিজে লিখুন। "Month sheet" এ পুরো মাস দেখা যায়।
- মাস শেষে Monthly payroll এ "Take OT and unpaid leave from attendance" চাপুন: OT ঘণ্টা আর unpaid দিনের কাটা (basic + fixed allowance ÷ মাসের working days × দিন) নিজে বসে যায়। Work week (৬/৫½/৫ দিন), দিনের normal ঘণ্টা আর break বদলাতে Attendance → "Attendance rules"।
- বেতন দেওয়ার পর "Mark paid" দিন; তারপর ওই মাস বদলানো যায় না (আগে "Mark unpaid" করতে হয়)।
- "Payslip" থেকে প্রিন্ট বা PDF, "Download Excel (CSV)" থেকে পুরো মাস।
- CPF: Singaporean ও PR (৩য় বছর থেকে) এর জন্য 1 Jan 2026 এর CPF Board rate দিয়ে নিজে হিসাব হয়। PR ১ম/২য় বছরের CPF হাতে লিখতে হয়। Bonus থাকলে CPF Board calculator দিয়ে মিলিয়ে নিন।

## সমস্যা হলে
- Deploy log এ `Refusing to start in production` দেখালে `JWT_SECRET`/`ADMIN_PASSWORD` ঠিক করুন।
- `DB init failed` দেখালে `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` আবার মিলিয়ে দেখুন।
- সাইট খোলে কিন্তু ছবি আসে না: `UPLOAD_DIR` এর folder এ লেখার অনুমতি আছে কিনা দেখুন।

## SEO ও বিশ্বাসযোগ্যতা (live হওয়ার পর)
- `https://আপনার-domain/robots.txt` আর `/sitemap.xml` খুলে দেখুন (server নিজে বানায়)।
- Admin → Settings এ **UEN, Licences, Areas served, Social links, Google title/description** দিন। শুধু আসল তথ্য দিন, খালি রাখলে সাইটে দেখাবে না।
- Admin → Settings এ **Email** আসল company email দিন (`info@example.com` রাখলে সাইটে/Google এ যাবে না, কিন্তু footer/Contact এ দেখাবে)।
- Google Search Console এ domain যুক্ত করে `sitemap.xml` submit করুন।
- Google Business Profile বানিয়ে website link দিন, তারপর সেই link Admin → Social links এ বসান।
- Portfolio/Gallery তে আসল প্রজেক্টের ছবি আর বর্ণনামূলক title দিন (title ই image এর alt text)।
