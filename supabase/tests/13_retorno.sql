\set ON_ERROR_STOP on
\set QUIET on
-- Retorno único no M6. Repete M1–M5 (06_m5.sql) e continua daqui.
\ir 06_m5.sql

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 6, 'oportunidade', '{"itens":{"beneficiario":{"escolha":"ajusto","valor":"donas de clínica"}}}', 'mentorada', auth.uid()
  from public.jornada returning id as op \gset

-- A reserva do M5 (o teste do M5 a retira; aqui ela existe).
reset role;
select (conteudo_mentora ->> 'aposta') as aposta_antes from public.registro where tipo = 'decisao_m5' \gset
select id as outra from public.registro where tipo = 'hipotese' and id::text <> :'aposta_antes' limit 1 \gset
update public.registro set conteudo_mentora = conteudo_mentora || jsonb_build_object('reserva', :'outra', 'reserva_condicao', 'ninguém ouvido') where tipo = 'decisao_m5';
select data_atual as c6_antes from public.encontro where numero = 6 \gset

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_erro(format($$select public.acionar_retorno(%L, 'reserva', 'm', 'r')$$, :'op'), 'Ana não aciona o retorno sozinha');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_erro(format($$select public.acionar_retorno(%L, 'reserva', '', 'r')$$, :'op'), 'sem motivo não há retorno');
select public.t_ok(public.acionar_retorno(:'op', 'reserva', 'o beneficiário não foi ouvido', 'ir para a reserva, que tem conversas') is not null, 'retorno pela reserva acionado');
select public.t_ok((select conteudo_mentora ->> 'aposta' from public.registro where tipo = 'decisao_m5') = :'outra', 'a reserva virou a aposta');
select public.t_ok((select conteudo_mentora ->> 'aposta_anterior' from public.registro where tipo = 'decisao_m5') = :'aposta_antes', 'a aposta anterior fica registrada');
select public.t_ok((select conteudo from public.registro where id = :'op') = '{}'::jsonb and (select conteudo_mentora #>> '{anterior,conteudo,itens,beneficiario,valor}' from public.registro where id = :'op') = 'donas de clínica', 'a oportunidade recomeça, e o que ela escreveu fica guardado');
select public.t_ok((select data_atual from public.encontro where numero = 6) = :'c6_antes'::timestamptz + interval '7 days' and (select data_atual - data_planejada_original from public.encontro where numero = 10) = interval '7 days', 'as Calls 6 a 10 andam uma semana');
select public.t_ok((select folga_usada_dias from public.jornada_cronograma) = 7, 'o retorno consome 7 dias de folga, uma vez');
select public.t_erro(format($$select public.acionar_retorno(%L, 'campo', 'm', 'r')$$, :'op'), 'o retorno é único');
reset role;
\echo TODOS OS TESTES DO RETORNO PASSARAM
