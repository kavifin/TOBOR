# TOBOR — 3D printing from a photo

Customers send a photo (or a 3D file), approve a sample model and quote, pay, and follow their print to their door. The site also sells ready-made printed products.

## Run it

```bash
npm install
npm run dev
```

- Site: http://localhost:5173 (also on your Wi-Fi address, so phones can open the QR link)
- API: http://localhost:5174 (Vite proxies `/api` and `/files` to it)
- Team dashboard: http://localhost:5173/admin — dev key `tobor-admin`

Production:

```bash
npm run build
NODE_ENV=production ADMIN_KEY=your-secret PUBLIC_URL=https://your-domain node server/index.js
```

The Node server then serves both the site and the API on `PORT` (or `API_PORT`). Put it behind HTTPS (Nginx, Caddy, Render, Railway, a VPS…). Keep `server/data` and `server/uploads` on persistent storage.

## What's where

| Area | Files |
| --- | --- |
| Scroll film (7 chapters, one vase from photo to parcel, rendered live in 3D) | `src/sections/Story.jsx` (captions, cards, timing), `src/three/film.js` (the scene), `src/styles/story.css` |
| Quote studio (3D file → instant price, or photo → request + phone QR) | `src/sections/QuoteStudio.jsx`, `src/sections/PhotoRequest.jsx`, `src/three/loadModel.js` |
| Shop, product pages with live 3D, cart drawer | `src/pages/Shop.jsx`, `src/pages/Product.jsx`, `src/components/CartDrawer.jsx` |
| Checkout (contact, address, delivery, UPI / card / COD) | `src/pages/Checkout.jsx`, `src/components/Payment.jsx` |
| Order and request tracking, sample approval, pay later | `src/pages/Track.jsx` |
| Phone upload page opened by the QR code | `src/pages/Send.jsx` |
| Team dashboard (quotes, sample upload, status updates, WhatsApp log) | `src/pages/Admin.jsx` |
| Footer enquiry form, contact details, WhatsApp button | `src/components/Footer.jsx`, `src/components/WhatsAppButton.jsx` |
| Prices, materials, colours, shipping, payment methods | `shared/pricing.js` (used by browser **and** server) |
| Product catalog | `shared/products.js` |
| Order stages and WhatsApp message text | `shared/status.js` |
| API, uploads, JSON database | `server/index.js`, `server/store.js` |
| WhatsApp Cloud API | `server/notify.js` |
| Razorpay | `server/payments.js` |
| Design tokens (colours, radii, spacing, fonts) | `design/tokens.json` → `src/styles/tokens.css` |

## Make it yours

1. **Business details**: copy `.env.example` to `.env` and set `VITE_WHATSAPP_NUMBER`, `VITE_CONTACT_PHONE`, `VITE_CONTACT_EMAIL`, `VITE_ADDRESS`.
2. **Payments**: add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (UPI, cards, net banking). Until then checkout runs in a clearly labelled test mode where no money moves.
3. **WhatsApp updates**: add `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` from Meta's WhatsApp Cloud API. To message customers outside the 24-hour window, create an approved template with one body variable and set `WHATSAPP_TEMPLATE`. Until then every message is logged in the dashboard with a "Send by hand" wa.me link.
4. **Enquiry emails**: the footer form emails each enquiry to `BUSINESS_EMAIL` and sends the customer a confirmation, through Brevo's free plan. In Brevo, verify the sender address (`MAIL_FROM`), create an API key and set `BREVO_API_KEY`. Gmail with an App Password (`SMTP_USER`, `SMTP_PASS`) also works. Until either is set, enquiries are saved in the dashboard and the emails are only logged.
5. **Products**: edit `shared/products.js`. Each product renders from a procedural 3D model (`shape`). To show real photos, put them in `public/products/` and add `photos: ['/products/your-photo.jpg']`.
6. **Customer gallery**: put real order photos in `public/gallery/` and list them in `src/data/gallery.js`. The section stays hidden until it has photos.
7. **Colours and type**: edit `design/tokens.json`, then regenerate the CSS with the design-system token script:
   ```bash
   node "<ui-ux-pro-max plugin>/.claude/skills/design-system/scripts/generate-tokens.cjs" --config design/tokens.json -o src/styles/tokens.css
   ```

## Design notes

- **Look "Sunlit workshop"**: warm daylight neutrals (`#F4EEE5` page, `#1F1B17` ink), forest green `#127048` for actions and approvals, nozzle-glow amber `#F2A93B`, and a dark hologram-studio teal `#0E1719` for the footer and price card.
- **Glass**: the header, story captions, cards, drawer, modals, FAQ and product cards are frosted glass (`.glass` / `.panel`, tokens `--glass-*`) over a soft sunlit gradient background.
- **Type**: Bricolage Grotesque for headlines and prices, Instrument Sans for interface and reading text, JetBrains Mono only for order IDs.
- **Signature**: the TOBOR wordmark is built from print layers and prints itself once on load. The scroll film follows one spiral vase through the real workflow: phone upload, particles forming a hologram, green approval, payment, printing layer by layer, a WhatsApp "100% completed" message, then the labelled box with the courier van outside.
- The film is rendered live with three.js, not a video file, so it stays sharp at any size and downloads far less. Chapter timings live in `STEPS` in `src/sections/Story.jsx`; what happens on screen at each moment lives in `Film.update()` in `src/three/film.js`.
- Respects `prefers-reduced-motion` (no smooth-scroll inertia, no idle motion; the film still follows the scrollbar).

## 3D models in the scroll film

`public/models/` holds the phone, gaming PC, Bambu Lab A1 mini printer and the printed piece (`love.glb`, the "Circle of Love" sculpture converted from its Bambu Studio 3MF and simplified from 684k to 31k triangles) used in the film, loaded by `src/three/models.js`. The printer prints the piece along its real outline: the toolhead covers one axis on the gantry, the bed slides along the other, and plastic appears only where the nozzle has passed. They stream in after the page starts; built-in stand-ins show until they arrive, so the film never waits on a download.

They were optimised from the original Sketchfab downloads (57 MB → about 4 MB) with [gltf-transform](https://gltf-transform.dev):

```bash
npx @gltf-transform/cli metalrough printer-original.glb printer-mr.glb
npx @gltf-transform/cli optimize printer-mr.glb public/models/printer.glb --compress meshopt --texture-compress webp --texture-size 512 --simplify-ratio 0.2
npx @gltf-transform/cli optimize phone-original.glb public/models/phone.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false
npx @gltf-transform/cli optimize pc-original.glb public/models/pc.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false
```

**Licences:** check each model's Sketchfab page. Most are CC Attribution, which means the site must credit the author (a line in the footer or an About page is enough).

## Swapping in your own 3D assets (optional)

The film and catalog need no downloads: every model is generated in code. If you want a hand-made model (a real printer, a photographed vase), free CC0/CC-BY sources include [Poly Pizza](https://poly.pizza), [Kenney](https://kenney.nl/assets) and [Sketchfab](https://sketchfab.com/search?features=downloadable&type=models) (downloadable filter; check each licence). Export as `.glb` into `public/models/` and load it with `GLTFLoader` in `src/three/film.js` in place of `makePrinter()` or `buildShape('spiralVase')`.
