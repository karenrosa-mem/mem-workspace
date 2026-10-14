\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M9. Repete M1–M8 (09_m8.sql) e continua daqui.
\ir 09_m8.sql

-- ================= M9 =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select estado from public.movimento where codigo = 9) = 'aberto', 'M9 aberto depois do Gate 6');

insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 9, 'teste', jsonb_build_object(
    'desenho', jsonb_build_object('fonte', 'ex-colegas promovidos', 'inicio', '2026-11-30', 'fim', '2026-12-13'),
    'contagem', jsonb_build_object('conversa', jsonb_build_object('tentados', 12, 'alcancados', 9))), 'mentorada', auth.uid()
  from public.jornada returning id as te \gset
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, origem_id, conteudo, autora_papel, autora_id)
  select conta_id, id, 9, 'exposicao', :'te', '{"perfil":"gestor promovido há 2 meses","compativel":"sim","proxima":false,"rota":"conversa","comportamento":"pagou","ponto":"forte","preco":"aceito","retomadas":1}', 'mentorada', auth.uid()
  from public.jornada;

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = '{"verificacao":{"v1":true,"v2":true,"v3":true,"v4":true,"v5":true,"v6":true},"revisao":{"texto":"explicou bem; não pressionou"}}' where id = :'te';
select public.t_erro(format($$select public.registrar_gate7(%L)$$, :'te'), 'teste sem critério de fim não passa');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = conteudo || '{"encerramento":{"criterio":"janela"},"leitura":{"geral":"inconclusiva","sintese":"só 1 exposição qualificada","limites":"não permite dizer nada sobre preço"}}' where id = :'te';
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = conteudo_mentora || '{"leitura_karen":{"geral":"parcial","porque":""}}' where id = :'te';
select public.t_erro(format($$select public.registrar_gate7(%L)$$, :'te'), 'leitura diferente da Karen sem porquê não registra');
update public.registro set conteudo_mentora = conteudo_mentora || '{"leitura_karen":{"geral":"parcial","porque":"a compra veio de quem tinha o problema"},"verificacao":{"v1":true,"v2":true,"v3":false,"v4":true,"v5":true,"v6":true}}' where id = :'te';
select public.t_ok(public.registrar_gate7(:'te') = 'nao_passou', 'acesso não contado: Gate 7 não passa');
update public.registro set conteudo_mentora = conteudo_mentora || '{"verificacao":{"v1":true,"v2":true,"v3":true,"v4":true,"v5":true,"v6":true}}' where id = :'te';
select public.t_ok(public.registrar_gate7(:'te') = 'passou', 'leitura inconclusiva passa: é informação para o M10');
select public.t_ok((select conteudo_mentora ->> 'leitura_registrada' from public.registro where id = :'te') = 'inconclusiva', 'fica a leitura dela, com a da Karen ao lado');
select public.t_ok((select estado from public.movimento where codigo = 10) = 'aberto', 'M9 fecha e M10 abre');
reset role;
\echo TODOS OS TESTES DO M9 PASSARAM
