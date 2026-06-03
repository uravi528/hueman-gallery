-- ============================================================
--  hueman. client galleries — Supabase schema
--  Run this in: Supabase dashboard → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- GALLERIES ----------
create table if not exists public.galleries (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  slug              text not null unique,            -- the unguessable part of the share link
  title             text not null default 'Untitled gallery',
  client_name       text,
  location          text,
  shoot_date        date,
  logo_url          text,                            -- owner's brand logo (header)
  watermark_url     text,                            -- owner's watermark PNG
  watermark_enabled boolean not null default false,
  allow_downloads   boolean not null default true,   -- false = public view-only
  default_theme     text not null default 'light',   -- 'light' | 'dark'
  default_size      text not null default 'medium',  -- 'small' | 'medium' | 'large'
  access_code       text,                            -- optional soft gate (nullable)
  created_at        timestamptz not null default now()
);

create index if not exists galleries_owner_idx on public.galleries(owner_id);
create index if not exists galleries_slug_idx  on public.galleries(slug);

-- ---------- PHOTOS ----------
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  gallery_id   uuid not null references public.galleries(id) on delete cascade,
  storage_path text not null,                        -- full-res file path in 'photos' bucket
  thumb_path   text not null,                        -- thumbnail path in 'photos' bucket
  width        int,
  height       int,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists photos_gallery_idx on public.photos(gallery_id, sort_order);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.galleries enable row level security;
alter table public.photos    enable row level security;

-- Galleries: readable by anyone (clients open via link); writable only by the owner.
drop policy if exists "galleries readable" on public.galleries;
create policy "galleries readable"
  on public.galleries for select using (true);

drop policy if exists "owner manages galleries" on public.galleries;
create policy "owner manages galleries"
  on public.galleries for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Photos: readable by anyone; writable only by the owner of the parent gallery.
drop policy if exists "photos readable" on public.photos;
create policy "photos readable"
  on public.photos for select using (true);

drop policy if exists "owner manages photos" on public.photos;
create policy "owner manages photos"
  on public.photos for all
  using (exists (
    select 1 from public.galleries g
    where g.id = photos.gallery_id and g.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.galleries g
    where g.id = photos.gallery_id and g.owner_id = auth.uid()));

-- ============================================================
--  STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('brand', 'brand', true)   on conflict (id) do nothing;

-- Public read on both buckets (privacy comes from the unguessable slug + optional code).
drop policy if exists "public read photos" on storage.objects;
create policy "public read photos"
  on storage.objects for select using (bucket_id = 'photos');

drop policy if exists "public read brand" on storage.objects;
create policy "public read brand"
  on storage.objects for select using (bucket_id = 'brand');

-- Only signed-in owners (you + your partner) may upload / change / delete files.
drop policy if exists "auth write photos" on storage.objects;
create policy "auth write photos"
  on storage.objects for all to authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');

drop policy if exists "auth write brand" on storage.objects;
create policy "auth write brand"
  on storage.objects for all to authenticated
  using (bucket_id = 'brand') with check (bucket_id = 'brand');
