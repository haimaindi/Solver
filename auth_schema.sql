-- Table for app-wide access control
create table if not exists public.app_access (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  password text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.app_access enable row level security;

-- Allow read access for verification (publicly readable for this specific use case)
create policy "Allow public read for access verification"
  on public.app_access for select
  using (true);

-- Insert a default record (User should change this in Supabase dashboard)
-- insert into public.app_access (code, password) values ('SOLVER2026', 'admin123');
