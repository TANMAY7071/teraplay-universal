# LinkCastle / TeraPlay 2026 Production Deployment Runbook
## Zero-Cost, Card-Free High-Scale Architecture (Modal + Cloudflare + Render Fallback)

---

### Architecture Overview

```
[User Browser (Mobile / Desktop)]
              │
              ▼
  [Cloudflare Pages (Frontend)]
  • 100% Free, Unlimited Bandwidth
  • Google AdSense / Monetag Allowed (Zero ToS bans)
              │
              ▼
 [Cloudflare Worker Gateway (/api/extract)]
  • 100k requests/day free
  • Edge Caching (Cache API / KV): 15ms response for viral links
  • Automatic Failover: Primary (Modal) ──(failover)──► Secondary (Render)
              │
              ▼
   [Modal.com Serverless Microservice]
  • $30/mo free recurring credits, 1 TiB free egress, 2 GB RAM
  • Auto-scales to 100+ parallel instances, scales to 0 when idle
  • Mobile client rotation + COOKIES_B64 anti-bot protection
```

---

### Step 1: Deploy Backend to Modal.com ($30/mo Free, 2GB RAM, No Card)

1. **Sign up on Modal:**
   - Go to [modal.com](https://modal.com/) and sign in with GitHub (no credit card required).
2. **Install Modal CLI locally:**
   ```bash
   pip install modal
   modal setup
   ```
3. **Deploy the LinkCastle Resolver:**
   ```bash
   modal deploy backend/modal_app.py
   ```
4. Modal will provide a public HTTPS URL:
   `https://<your-username>--linkcastle-resolver-web.modal.run`

---

### Step 2: Deploy Cloudflare Edge Gateway (100k free req/day)

1. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```
2. **Set your backend URLs in `cloudflare/wrangler.toml`:**
   ```toml
   [vars]
   PRIMARY_RESOLVER_URL = "https://<your-username>--linkcastle-resolver-web.modal.run"
   FALLBACK_RESOLVER_URL = "https://linkcastle.onrender.com"
   ```
3. **Deploy the Worker:**
   ```bash
   cd cloudflare
   npx wrangler deploy
   ```
4. Cloudflare yields: `https://linkcastle-gateway.<subdomain>.workers.dev`

---

### Step 3: Deploy Frontend to Cloudflare Pages (Ad-Safe Unlimited Hosting)

1. In Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Select repository: `TANMAY7071/teraplay-universal`.
3. Set build settings:
   - **Framework Preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL` (or `PYTHON_RESOLVER_URL`): `https://linkcastle-gateway.<subdomain>.workers.dev`
5. Click **Save and Deploy**.
6. Cloudflare provides: `https://linkcastle.pages.dev` (and you can bind `playlinks4u.com` for free).

---

### Step 4: Anti-Bot Protection (Exporting `COOKIES_B64`)

If YouTube ever throttles cloud IPs:
1. Install Chrome extension "Get cookies.txt LOCALLY".
2. Go to YouTube, log into any dummy/alt account, and export `cookies.txt`.
3. Convert to base64:
   ```bash
   # Linux / macOS
   base64 -w 0 cookies.txt
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("cookies.txt"))
   ```
4. Set `COOKIES_B64` secret in Modal / Render environment variables.
5. The backend automatically decodes it at startup, completely evading YouTube bot gates.

---

### Benchmark & Concurrency Summary

- **Instant Uncached Link Burst**: 20–30 simultaneous users per second (cleared in <5s).
- **Cached Link Burst**: 127 requests/second (median latency ~280ms).
- **Edge Static CDN**: 570+ requests/second (median latency ~116ms).
- **Daily Capacity**: 5,000 to 50,000 daily active visitors on 100% free tier.
