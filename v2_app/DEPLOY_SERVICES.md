# Deploying Backend Services (Render & Supabase)

To get your V2 App working 100%, you need two backend services:
1.  **Render**: To host the NREGA Scraper (Node.js).
2.  **Supabase**: To host your Database (Orders, Panchayats).

---

## Part 1: Deploy Scraper to Render

The scraper runs separately so it can fetch data without timing out Vercel's limits.

### 1. Create a New Web Service
1.  Go to [dashboard.render.com](https://dashboard.render.com).
2.  Click **"New +"** -> **"Web Service"**.
3.  Connect your GitHub repository: `jittojose333-design/aoneboardv2`.

### 2. Configure Settings
*   **Name**: `aone-scraper` (or similar)
*   **Region**: Singapore (or nearest to you)
*   **Branch**: `main`
*   **Root Directory**: `v2_app/scraper_backend` (⚠️ Important!)
*   **Runtime**: **Node**
*   **Build Command**: `npm install`
*   **Start Command**: `node index.js`
*   **Free Instance**: Yes

### 3. Deploy
1.  Click **Create Web Service**.
2.  Wait for it to deploy.
3.  **Copy your Service URL** (top left, looks like `https://aone-scraper-xyz.onrender.com`).
4.  **Save this URL!** You will need it for Vercel.

---

## Part 2: Get Supabase Credentials

Your Next.js app needs to talk to your database.

### 1. Go to Supabase
1.  Log in to [supabase.com](https://supabase.com).
2.  Open your Project.

### 2. Find API Keys
1.  Go to **Project Settings** (gear icon) -> **API**.
2.  Copy these two values:
    *   **Project URL** (e.g., `https://xyz.supabase.co`)
    *   **anon / public** Key (long string)

---

## Part 3: Connect to Vercel

Now put it all together in Vercel.

1.  Go to your **Vercel Project Settings** -> **Environment Variables**.
2.  Add:
    *   `SCRAPER_SERVICE_URL` = Your Render URL (from Part 1)
    *   `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase URL (from Part 2)
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase Key (from Part 2)
3.  **Redeploy** (Go to Deployments -> Redeploy) for changes to take effect.
