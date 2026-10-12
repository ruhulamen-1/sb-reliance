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
| `UPLOAD_DIR` | (ঐচ্ছিক) app folder এর বাইরের একটা পথ, যাতে নতুন deploy এ ছবি মুছে না যায় |

`NODE_ENV=production` দিলে `JWT_SECRET` আর `ADMIN_PASSWORD` ডিফল্ট থাকলে server চালুই হবে না, এটা ইচ্ছাকৃত নিরাপত্তা।

## ৫. Deploy ও domain
1. **Deploy** চাপুন। প্রথমবার চালু হলে টেবিল আর admin user নিজে তৈরি হয়।
2. Domain যুক্ত করুন এবং **SSL (https)** চালু করুন (hPanel → Security → SSL)।
3. `https://আপনার-domain/admin` এ ঢুকে admin email/password দিয়ে login করুন।

## ৬. Live হওয়ার পর করণীয়
- Admin → Settings এ ফোন, WhatsApp (শুধু অঙ্ক, দেশের কোডসহ), email, ঠিকানা, logo ও ছবি দিন।
- Admin → Team, Gallery, Blog, Testimonials এ আসল তথ্য দিন।
- Privacy policy লেখাটা আপনার আসল নিয়মের সঙ্গে মিলিয়ে নিন।
- Database এর নিয়মিত backup নিন (hPanel → Backups বা phpMyAdmin → Export)।
- Admin password আর `.env` কখনো GitHub এ রাখবেন না (`.env` আগে থেকেই `.gitignore` এ আছে)।

## সমস্যা হলে
- Deploy log এ `Refusing to start in production` দেখালে `JWT_SECRET`/`ADMIN_PASSWORD` ঠিক করুন।
- `DB init failed` দেখালে `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` আবার মিলিয়ে দেখুন।
- সাইট খোলে কিন্তু ছবি আসে না: `UPLOAD_DIR` এর folder এ লেখার অনুমতি আছে কিনা দেখুন।
