# hueman. — client galleries

A self-hosted client gallery app for Hueman Story. Upload photos, share a private
link, let clients view and download full-resolution files (or lock it to view-only).
Built with **React + TypeScript + Vite + Supabase**, deploys free on **Vercel**.

---

## What it does

**For you (owner)**
- Email magic-link sign-in (you + your partner, no passwords)
- Create unlimited galleries, each with its own unguessable private link
- Drag-and-drop photo upload — full resolution kept, thumbnails made automatically in-browser
- Upload **your own logo** (header) and **your own watermark PNG** (your Canva mark)
- Per-gallery toggles: allow downloads vs view-only, watermark on/off, default light/dark, default photo size, optional access code

**For your clients**
- Open the link, no account needed
- Switch between **light cinematic** and **dark cinematic** themes
- Change photo **size** (small / medium / large)
- Full-screen lightbox with arrow-key navigation
- Select specific photos and download, or download all, at full resolution
- Optional access-code gate

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine).
2. Open **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**.
   This creates the tables, security rules, and the `photos` + `brand` storage buckets.
3. In **Authentication → Providers → Email**, make sure **Email** is enabled
   (magic link works out of the box).
4. In **Project Settings → API**, copy your **Project URL** and **anon public** key.

## 2. Run locally

```bash
npm install
cp .env.example .env        # then paste your URL + anon key into .env
npm run dev
```

Open the local URL it prints. Sign in with your email, click the magic link,
and you're in the dashboard.

> First sign-in creates your owner account automatically. Have your partner sign in
> with their email the same way — both of you can manage all galleries.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
4. Add two **Environment Variables** (same names as `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.
6. Back in Supabase → **Authentication → URL Configuration**, set the **Site URL**
   to your Vercel domain so magic links redirect correctly.

A `vercel.json` is included so client-side routes like `/g/your-gallery` work on refresh.

---

## How sharing works

Each gallery gets a link like `your-site.com/g/aanya-dev-wedding-x7k2p9`.
The random suffix makes it effectively unguessable — that's the privacy model
(the same approach Pic-Time and most client-gallery tools use).

The optional **access code** is a friendly courtesy gate, not hard cryptographic
protection: because files are served from a public bucket for fast viewing, anyone
with the exact link can reach the gallery. For most client work this is exactly right.
If you ever need true hard-locking (signed, expiring URLs), that's a later upgrade
using Supabase signed URLs + an edge function — ask and it can be added.

## Free-tier notes

Supabase's free tier includes 1 GB of file storage. Full-res wedding sets add up,
so when you grow you can either:
- archive older galleries (delete photos after clients have downloaded), or
- upgrade Supabase storage (cheap, pay-as-you-go), or
- point the `photos` bucket at an external S3-compatible store.

The app itself stays free on Vercel.

## Project structure

```
supabase/schema.sql        database + storage setup (run once)
src/lib/supabase.ts         client + storage URL helpers
src/lib/image.ts            thumbnail generation, slugs, downloads
src/lib/types.ts            shared types
src/pages/Login.tsx         owner sign-in
src/pages/Dashboard.tsx     gallery list + create
src/pages/GalleryEditor.tsx settings, branding, photo upload
src/pages/ClientGallery.tsx the public client view
src/index.css               light/dark cinematic themes
```
