# SB Reliance Pte Ltd – Website + Management System

## Run
1. MySQL চালু রাখো। `server/.env.example` কে `server/.env` করে DB info দাও।
2. `cd server && npm install && npm run dev`  (DB, tables, admin user ও 5টা service প্রথমবার auto তৈরি হয়)
3. `cd client && npm install && npm run dev`  → http://localhost:5173
4. Admin: http://localhost:5173/admin  (email/password = `.env` এর ADMIN_EMAIL / ADMIN_PASSWORD)

Production: `cd client && npm run build`, তারপর dist/ nginx দিয়ে serve করো, `/api` কে port 4000 এ proxy করো।

## Production (শুধু localhost:3000)
```
npm run install:all
npm run build
npm start
```
এরপর http://localhost:3000 এ site, http://localhost:3000/admin এ admin।
