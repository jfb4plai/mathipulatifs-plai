-- Nettoyage
drop table if exists public.sessions cascade;
drop table if exists public.exercises cascade;
drop table if exists public.teachers cascade;

-- Teachers table
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nom text not null,
  ecole text,
  niveau text check (niveau in ('primaire', 'secondaire', 'les deux')) default 'les deux',
  created_at timestamptz default now()
);

-- Exercises table
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete cascade,
  titre text not null,
  consigne text,
  manipulative text not null check (manipulative in ('base10', 'droite-numerique', 'fractions')),
  config jsonb default '{}',
  publie boolean default true,
  token text unique default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz default now()
);

-- Sessions table
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercises(id) on delete cascade,
  prenom_eleve text,
  reponse jsonb,
  correct boolean,
  duree_secondes integer,
  created_at timestamptz default now()
);

-- RLS
alter table public.teachers enable row level security;
alter table public.exercises enable row level security;
alter table public.sessions enable row level security;

create policy "Teachers can manage own data" on public.teachers
  for all using (auth.uid() = user_id);

create policy "Teachers can manage own exercises" on public.exercises
  for all using (
    teacher_id in (select id from public.teachers where user_id = auth.uid())
  );

create policy "Public read exercises by token" on public.exercises
  for select using (publie = true);

create policy "Anyone can insert sessions" on public.sessions
  for insert with check (true);

create policy "Teachers can read own sessions" on public.sessions
  for select using (
    exercise_id in (
      select e.id from public.exercises e
      join public.teachers t on t.id = e.teacher_id
      where t.user_id = auth.uid()
    )
  );
