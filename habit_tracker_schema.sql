-- Update reflections table
alter table public.reflections add column if not exists satisfaction_label text default 'Neutral';
alter table public.reflections add column if not exists satisfaction_color text default '#eab308';

-- Create habits table
create table if not exists public.habits (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  type text default 'build', -- 'build' or 'break'
  color text default '#003399',
  created_at timestamp with time zone default now(),
  user_id uuid default null
);

-- Create habit_logs table
create table if not exists public.habit_logs (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade,
  completed_at date not null,
  created_at timestamp with time zone default now(),
  unique(habit_id, completed_at)
);

-- Enable RLS
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

-- Policies (Allow all access as requested)
drop policy if exists "Allow all habits" on public.habits;
create policy "Allow all habits" on public.habits for all using (true) with check (true);

drop policy if exists "Allow all habit logs" on public.habit_logs;
create policy "Allow all habit logs" on public.habit_logs for all using (true) with check (true);
