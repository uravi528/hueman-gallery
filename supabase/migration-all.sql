-- ============================================================
--  hueman. — combined upgrade (duplicate-skip + public showcase)
--  Safe to run once. Re-running does nothing (uses IF NOT EXISTS).
--  Run in: Supabase dashboard → SQL Editor → New query → Run
-- ============================================================

-- duplicate detection (remember each photo's original name + size)
alter table public.photos add column if not exists original_name text;
alter table public.photos add column if not exists file_size    bigint;

-- public sneak-peek / showcase
alter table public.galleries add column if not exists is_public     boolean not null default false;
alter table public.galleries add column if not exists public_slug    text unique;
alter table public.galleries add column if not exists cover_path     text;
alter table public.galleries add column if not exists intro_heading  text;
alter table public.galleries add column if not exists intro_text     text;
create index if not exists galleries_public_slug_idx on public.galleries(public_slug);

alter table public.photos add column if not exists is_preview boolean not null default false;
