-- Seshat Technologies · esquema de Supabase
-- Ejecuta este archivo en Supabase > SQL Editor.

create table if not exists public.contactos (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  nombre      text not null check (char_length(nombre) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 200),
  empresa     text check (char_length(empresa) <= 160),
  interes     text check (char_length(interes) <= 80),
  mensaje     text not null check (char_length(mensaje) between 1 and 4000)
);

alter table public.contactos enable row level security;

-- Los visitantes (rol anon) solo pueden INSERTAR. No pueden leer, editar ni borrar.
-- Los mensajes se leen desde el panel de Supabase (Table Editor).
drop policy if exists "contacto_insertar_anon" on public.contactos;
create policy "contacto_insertar_anon"
  on public.contactos for insert
  to anon
  with check (true);
