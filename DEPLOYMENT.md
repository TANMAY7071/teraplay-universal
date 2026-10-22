# TeraPlay Universal Media Dock: $0 Production Deployment Guide

Deploy TeraPlay Universal Media Dock to production for **$0 / month**: Vercel for the edge frontend, Render.com for the Python resolver microservice (`yt-dlp` across 1,751 platforms).

---

## Architecture

```
[ User Browser ]
       │
       ▼
[ Vercel Edge Frontend (React 18 + Vite) ]
       │
       ├─► (Direct Client Downloads): Instagram, TikTok, TeraBox, Dailymotion CDN
       ├─► (YouTube Player): Embedded Iframe Preview
       └─► (API Calls): /api/resolve?url=...
              │
              ▼
       [ Render.com Python Microservice ]
              │ (yt-dlp engine with 1,751 extractors)
              ▼
       Returns progressive MP4, multi-tier thumbnails, and subtitles
```

---

## Step 1: Deploy the Python microservice to Render.com (free tier)

1. Push your repository to GitHub.
2. Go to **[Render.com](https://render.com/)** and create a free account.
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Fill in the deployment details:
   - **Name**: `teraplay-resolver-api`
   - **Region**: Any (e.g., Oregon or Frankfurt)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free` ($0/mo)
6. Click **Deploy Web Service**.
7. Once deployed, copy your service URL:
   `https://teraplay-resolver-api.onrender.com`

> [!TIP]
> **Keep Render Awake 24/7 for Free**:
> Free Render services sleep after 15 minutes of inactivity. Set up a free monitor at **[UptimeRobot.com](https://uptimerobot.com/)** to ping `https://teraplay-resolver-api.onrender.com/health` every 5 minutes. Your service stays warm.

---

## Step 2: Deploy the frontend to Vercel (free tier)

1. Go to **[Vercel.com](https://vercel.com/)** and connect your GitHub repository.
2. In the project settings, navigate to **Environment Variables** and add:
   - **Key**: `PYTHON_RESOLVER_URL`
   - **Value**: `https://teraplay-resolver-api.onrender.com` (your Render URL from Step 1)
3. Click **Deploy**.
4. The site goes live on Vercel with automatic SSL and edge CDN caching.

---

## Step 3: Monetization setup

1. Register as a publisher on **[Monetag](https://monetag.com/)** or **[Adsterra](https://adsterra.com/)**.
2. Add your Vercel domain and obtain ad script tags:
   - **Top Banner**: `728x90` leaderboard
   - **Content Banner**: `300x250` medium rectangle
   - **Footer Banner**: Responsive multi-tag
3. Paste the tags into [`src/components/ads/AdBannerSlot.tsx`](src/components/ads/AdBannerSlot.tsx):
   ```tsx
   // Replace placeholder inside AdBannerSlot with your ad network script
   ```
4. Push to master; Vercel automatically deploys the monetized build.

---

## Local development workflow

Run both services locally during development:

1. **Start Python Backend / Extractor**:
   ```bash
   .venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
   ```
2. **Start Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`. Pasting any link will auto-detect and resolve media.

3. **Run Regression Tests**:
   ```bash
   node tests/universal-dock.test.mjs
   ```

4. **Verify Production Bundle**:
   ```bash
   npm run build
   ```
