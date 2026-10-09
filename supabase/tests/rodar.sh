#!/bin/sh
# Roda os testes do banco num Postgres local (nunca no Supabase de produção).
# Uso: PSQL="psql -h /caminho -p 5432 -U postgres" sh supabase/tests/rodar.sh
set -e
P="${PSQL:-psql -U postgres} -X -q"
D="$(dirname "$0")"; M="$D/../migrations"
for teste in 01_acesso_nucleo 02_m1; do
  $P -c "drop database if exists mem_teste" >/dev/null && $P -c "create database mem_teste" >/dev/null
  $P -d mem_teste -v ON_ERROR_STOP=1 -c "do \$\$ begin create role anon nologin; exception when duplicate_object then null; end \$\$; do \$\$ begin create role authenticated nologin; exception when duplicate_object then null; end \$\$;" >/dev/null
  grep -v "create role" "$D/00_imitacao_supabase.sql" | $P -d mem_teste -v ON_ERROR_STOP=1 >/dev/null
  for m in "$M"/*.sql; do $P -d mem_teste -v ON_ERROR_STOP=1 -f "$m" >/dev/null; done
  $P -d mem_teste -t -f "$D/$teste.sql" 2>&1 | grep -E "ok ·|FALHOU|ERROR|PASSARAM" | sed 's/^.*NOTICE:  //'
done
