-- share_schema.sql
-- Run this in your Supabase SQL Editor

-- 1. Add solver_id to app_access
alter table public.app_access add column if not exists solver_id text unique;

-- 2. Create resource_shares table for granular sharing
create table if not exists public.resource_shares (
  id uuid default gen_random_uuid() primary key,
  module_name text not null, 
  resource_id uuid, -- NULL means entire module is shared
  shared_by uuid references public.app_access(id) on delete cascade,
  shared_with_solver_id text not null,
  created_at timestamp with time zone default now(),
  unique(module_name, resource_id, shared_by, shared_with_solver_id)
);

-- Enable RLS
alter table public.resource_shares enable row level security;
drop policy if exists "Allow all resource_shares" on public.resource_shares;
create policy "Allow all resource_shares" on public.resource_shares for all using (true) with check (true);
