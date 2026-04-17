-- AI Consultant and Multi-Key Support Schema

-- Update app_access to support multiple API keys
alter table public.app_access add column if not exists gemini_api_keys text[] default '{}';

-- Create problem_consultations table
create table if not exists public.problem_consultations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.app_access(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  question text not null,
  answer text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.problem_consultations enable row level security;

-- Policies (Allow all access for user convenience in this specific app context)
drop policy if exists "Allow all consultations" on public.problem_consultations;
create policy "Allow all consultations" on public.problem_consultations for all using (true) with check (true);
