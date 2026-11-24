-- Remote settings for Bolt Beat's ads (read by android/app/src/main/java/com/opalgames/boltbeat/AdConfig.kt).
-- Run once in the Supabase SQL editor. The table is shared-ready: other games can add rows under their own `app`.

create table if not exists public.app_config (
  app        text        not null,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (app, key)
);

-- Anyone with the public anon key may READ settings; only the dashboard / service role can change them.
alter table public.app_config enable row level security;
drop policy if exists "app_config is readable" on public.app_config;
create policy "app_config is readable" on public.app_config for select to anon, authenticated using (true);

insert into public.app_config (app, key, value) values
  ('bolt-beat', 'ads_enabled',                   'true'),  -- remote kill switch (the app's own switch must be on too)
  ('bolt-beat', 'interstitial_every_levels',     '3'),     -- an interstitial after every 3rd cleared level (0 = never)
  ('bolt-beat', 'interstitial_min_interval_sec', '120'),   -- and never two within 2 minutes
  ('bolt-beat', 'rewarded_easy_pass_percent',    '50')     -- a boss needs this % (instead of 60) after the rewarded ad
on conflict (app, key) do update set value = excluded.value, updated_at = now();
