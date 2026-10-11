\set ON_ERROR_STOP on
\set QUIET on
-- Simula a jornada da Karen: decisão do M2 publicada pelo fluxo antigo, M2 ainda aberto.
create function public.t_ok(c boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(c, false) then raise exception 'FALHOU: %', msg; end if; raise notice 'ok · %', msg; end $$;
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'karen@mem.test', '{"nome":"Karen"}'),
  ('22222222-2222-2222-2222-222222222222', 'ana@mem.test',   '{"nome":"Ana"}');
update public.pessoa set e_mentora = true where email = 'karen@mem.test';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.iniciar_jornada('ana@mem.test', '2026-10-13', array[
  '2026-10-15 19:00-03','2026-10-22 19:00-03','2026-10-29 19:00-03','2026-11-05 19:00-03',
  '2026-11-12 19:00-03','2026-11-19 19:00-03','2026-11-26 19:00-03','2026-12-03 19:00-03',
  '2026-12-17 19:00-03','2026-12-24 19:00-03']::timestamptz[]);
reset role;
update public.movimento set estado = 'fechado' where codigo = 1;
update public.movimento set estado = 'aberto' where codigo = 2;
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
  select conta_id, id, 2, 'decisao_m2', '{"escolhidos":[{"padrao":"x","rotulo":"ativo"}],"nao_seguiram":[]}', 'mentora',
         '11111111-1111-1111-1111-111111111111', false from public.jornada;
\i supabase/tests/destravar_m2.sql
select public.t_ok((select estado from public.movimento where codigo = 2) = 'fechado'
               and (select estado from public.movimento where codigo = 3) = 'aberto', 'M2 destravado: fecha e M3 abre');
select public.t_ok((select count(*) from public.gate_registro where identificacao = 'gate_1') = 1, 'Gate 1 registrado');
select public.t_ok((select estado_edicao from public.registro where tipo = 'decisao_m2') = 'aberto', 'ela ainda pode ajustar o porquê');
\i supabase/tests/destravar_m2.sql
select public.t_ok((select count(*) from public.gate_registro where identificacao = 'gate_1') = 1, 'rodar duas vezes não duplica');
\echo DESTRAVAR OK
