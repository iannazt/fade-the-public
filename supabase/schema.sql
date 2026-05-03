-- Fade the Public — database schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Idempotent: safe to re-run after edits.

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────────
-- games: one row per scraped matchup. external_id is the Covers.com matchup id.
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.games (
  id            uuid primary key default gen_random_uuid(),
  sport         text not null check (sport in ('nba', 'mlb', 'nhl')),
  external_id   text not null,
  matchup_url   text,
  status        text not null check (status in ('pregame', 'live', 'final')),
  away_team     text not null,
  home_team     text not null,
  away_line     numeric,
  home_line     numeric,
  away_public_pct numeric,
  home_public_pct numeric,
  starts_at_text text,
  inserted_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (sport, external_id)
);

create index if not exists games_status_idx on public.games (status);
create index if not exists games_sport_status_idx on public.games (sport, status);

-- ──────────────────────────────────────────────────────────────────────────────
-- fade_flags: every time a game crosses the public-% threshold, we record a flag.
-- One game can have at most one flag per (threshold, fade_side) pair.
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.fade_flags (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references public.games(id) on delete cascade,
  fade_side       text not null check (fade_side in ('away', 'home')),
  fade_team       text not null,
  fade_line       numeric,
  public_pct      numeric not null,
  threshold_at_flag numeric not null,
  flagged_at      timestamptz not null default now(),
  unique (game_id, fade_side, threshold_at_flag)
);

create index if not exists fade_flags_game_id_idx on public.fade_flags (game_id);
create index if not exists fade_flags_flagged_at_idx on public.fade_flags (flagged_at desc);

-- ──────────────────────────────────────────────────────────────────────────────
-- game_results: one row per game that has gone final. winner is computed
-- relative to the spread/line on the fade side; null if not yet graded.
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.game_results (
  game_id      uuid primary key references public.games(id) on delete cascade,
  away_score   integer not null,
  home_score   integer not null,
  final_at     timestamptz not null default now(),
  -- Outcome of the away team against the spread: win | loss | push.
  -- We store the away-side ATS so the History page can compute fade outcome
  -- by inverting based on each fade's side.
  away_ats     text not null check (away_ats in ('win', 'loss', 'push'))
);

-- ──────────────────────────────────────────────────────────────────────────────
-- Row Level Security: lock down writes. Reads are public so the app can render
-- pages without auth. Writes only happen from the service-role key on the server.
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.games enable row level security;
alter table public.fade_flags enable row level security;
alter table public.game_results enable row level security;

drop policy if exists "public_read_games" on public.games;
create policy "public_read_games" on public.games
  for select using (true);

drop policy if exists "public_read_fade_flags" on public.fade_flags;
create policy "public_read_fade_flags" on public.fade_flags
  for select using (true);

drop policy if exists "public_read_game_results" on public.game_results;
create policy "public_read_game_results" on public.game_results
  for select using (true);
