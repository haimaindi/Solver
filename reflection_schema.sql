-- Tabel untuk menyimpan refleksi
create table if not exists public.reflections (
  id uuid default gen_random_uuid() primary key,
  mode text not null, -- 'GIBBS', 'ROLFE', '4L'
  title text not null,
  content jsonb not null, -- Menyimpan langkah-langkah refleksi secara dinamis
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid default null -- Opsional untuk masa depan
);

-- RLS Policy (Bebas/Tanpa Auth sesuai permintaan)
alter table public.reflections enable row level security;

-- Drop policy if exists to avoid errors on re-run
drop policy if exists "Allow all access to reflections" on public.reflections;

create policy "Allow all access to reflections" 
on public.reflections 
for all 
using (true) 
with check (true);
