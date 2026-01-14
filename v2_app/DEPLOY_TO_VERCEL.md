# Deploying Aone Board V2 to Vercel

Since your application is built with **Next.js**, Vercel is the optimal hosting platform.

## Prerequisites

1.  **GitHub Account**: Ensure your project is pushed to a GitHub repository.
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com) using your GitHub account.
3.  **Render Service URL**: Your Scraper Service URL from Render (e.g., `https://your-scraper-service.onrender.com`).
4.  **Supabase Credentials**: Your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Step 1: Prepare Your Project

Ensure your project folder structure is correct. You have a folder named `v2_app` inside your repository.

1.  **Commit & Push**: Make sure all your recent changes (Master Key, Status Filters, etc.) are committed and pushed to GitHub.

---

## Step 2: Import Project in Vercel

1.  Log in to your **Vercel Dashboard**.
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your GitHub Repository (`antigravity-aone-board` or whatever you named it).

---

## Step 3: Configure Project Settings

This is the **most crucial step** because your app is in a subfolder (`v2_app`).

1.  **Framework Preset**: Select `Next.js`.
2.  **Root Directory**:
    -   Click "Edit" next to Root Directory.
    -   Select the **`v2_app`** folder.
    -   *Why?* Because your `package.json` for the frontend lives there.

---

## Step 4: Environment Variables

Expand the **"Environment Variables"** section and add the following keys. These connect your frontend to your backend services.

| Key | Value | Description |
| :--- | :--- | :--- |
| `SCRAPER_SERVICE_URL` | `https://your-scraper-service.onrender.com/scrape` | The URL of your service deployed on Render (Step 1). **Critical for Auto-Fetch.** |
| `NEXT_PUBLIC_SUPABASE_URL` | `your_supabase_url` | Your Supabase Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_supabase_anon_key` | Your Supabase Anonymous API Key. |

*(Note: You can find your Supabase keys in your local `.env` file or Supabase Dashboard)*

---

## Step 5: Deploy

1.  Click **"Deploy"**.
2.  Vercel will build your Next.js application.
3.  Once finished, you will get a live URL (e.g., `https://v2-app-zeta.vercel.app`).

---

## Step 6: Verify Deployment

1.  Open your new Vercel URL.
2.  Check the **Master Key**: Click it and see if it successfully talks to your Render service.
3.  Check **Supabase Sync**: Ensure data loads correctly.

### Troubleshooting
- **Auto-Fetch Failed?** Check the `SCRAPER_SERVICE_URL` variable in Vercel. It must match your Render URL exactly (no trailing slash errors).
- **Build Failed?** Check the Vercel logs. Ensure you didn't accidentally include the `scraper_backend` folder in the Next.js build process (setting the Root Directory to `v2_app` usually handles this isolation).
