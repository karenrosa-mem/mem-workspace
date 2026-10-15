-- Imitação mínima do que o Supabase já tem: papéis, auth.users, auth.uid().
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
-- Para o acesso por código (0017): senha guardada como no Supabase e pgcrypto em "extensions".
alter table auth.users add column if not exists encrypted_password text, add column if not exists email_confirmed_at timestamptz, add column if not exists updated_at timestamptz;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
