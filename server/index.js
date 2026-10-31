// Runs the TOBOR API on this computer (npm run dev / npm start). On Vercel, api/index.js runs it instead.
import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import app, { isProd, ADMIN_KEY } from './app.js'
import { paymentsLive } from './payments.js'
import { mailLive, mailProvider } from './mail.js'
import { storeKind } from './store.js'
import { filesKind } from './files.js'

// In development Vite owns PORT (5173) and proxies /api here; in production this server serves everything.
const PORT = Number(process.env.API_PORT || (isProd && process.env.PORT) || 5174)

// production on a plain server: serve the built site too
const dist = path.resolve('dist')
if (isProd && fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '7d', index: false }))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`TOBOR API on http://localhost:${PORT}`)
  console.log(`Records in ${storeKind === 'postgres' ? 'Postgres (DATABASE_URL)' : 'server/data/db.json'}, uploads in ${filesKind === 'blob' ? 'Vercel Blob' : 'server/uploads'}`)
  if (!isProd && !process.env.ADMIN_KEY) console.log('Team dashboard key (dev default): tobor-admin — set ADMIN_KEY in .env')
  if (!ADMIN_KEY) console.log('Team dashboard is OFF — set ADMIN_KEY to enable it')
  if (!paymentsLive) console.log('Payments in TEST MODE — add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to go live')
  console.log(mailLive ? `Enquiry emails send via ${mailProvider}` : 'Enquiry emails are LOGGED, not sent — add BREVO_API_KEY to .env to send them')
})
