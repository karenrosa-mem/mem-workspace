# Testes do banco

Rodam num Postgres local, nunca no Supabase de produção.

- `00_imitacao_supabase.sql` — imita o que o Supabase já tem (papéis `anon`/`authenticated`, `auth.users`, `auth.uid()`).
- `01_acesso_nucleo.sql` — simula a mentora, uma mentorada e uma estranha e confere quem vê e altera o quê.

Ordem: banco vazio → `00` → `supabase/migrations/0001_nucleo.sql` → `01`. A última linha deve ser `TODOS OS TESTES PASSARAM`.
