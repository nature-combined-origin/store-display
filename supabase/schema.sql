create extension if not exists "pgcrypto";

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  display_type text not null default 'static',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_pages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  text text,
  image_url text,
  image_path text,
  duration_seconds integer not null default 60,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_active_created_at on public.campaigns(active, created_at desc);
create index if not exists idx_campaign_pages_campaign_sort on public.campaign_pages(campaign_id, sort_order asc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_campaign_pages_updated_at on public.campaign_pages;
create trigger set_campaign_pages_updated_at
before update on public.campaign_pages
for each row execute function public.set_updated_at();

alter table public.campaigns replica identity full;
alter table public.campaign_pages replica identity full;

alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.campaign_pages;
