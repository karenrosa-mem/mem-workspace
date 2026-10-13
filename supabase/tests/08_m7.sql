\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M7. Repete M1–M6 (07_m6.sql) e continua daqui.
\ir 07_m6.sql

-- ================= M7 =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select estado from public.movimento where codigo = 7) = 'aberto', 'M7 aberto depois da oportunidade');

insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 7, 'oferta', jsonb_build_object(
    'entrega', jsonb_build_object('texto', 'conduziu sozinho as cobranças que adiava', 'cobre', 'a primeira metade', 'fora', 'o time cumprir sem escalar'),
    'como', jsonb_build_object('etapas', jsonb_build_array('mapear', 'preparar', 'conduzir', 'revisar'), 'diferencial', 'sobre as conversas reais'),
    'forma', jsonb_build_object('texto', 'individual, 6 semanas', 'inclui', 'cobranças do próprio time', 'exclui', ''),
    'capacidade', jsonb_build_object('horas_semana', 2, 'horas_cliente', 3, 'pronto_antes', 'roteiros-base'),
    'preco', jsonb_build_object('valor', '1.000 a 1.500', 'condicao', 'até 3x', 'racional', 'o gestor paga'),
    'transversal', 'porque é como eu já ajudei'), 'mentorada', auth.uid()
  from public.jornada returning id as of \gset

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = '{"verificacao":{"v1":true,"v2":true,"v3":true,"v4":true,"v5":true,"v6":true,"v7":true}}' where id = :'of';
select public.t_erro(format($$select public.assumir_oferta(%L)$$, :'of'), 'forma sem exclusões não passa');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = jsonb_set(conteudo, '{forma,exclui}', '"conflitos com pares, desligamentos"') where id = :'of';
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_erro(format($$select public.assumir_oferta(%L)$$, :'of'), 'preço em faixa não é aceito');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = jsonb_set(conteudo, '{preco,valor}', '1500') where id = :'of';
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_ok(public.assumir_oferta(:'of') = 'nao_passou', '2 h disponíveis e 3 h por cliente: a passagem não acontece');
select public.t_ok((select count(*) from public.gate_registro where identificacao = 'gate_5' and resultado = 'nao_passou') = 1, '“não passou” registrado');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = jsonb_set(conteudo, '{capacidade,horas_semana}', '6') where id = :'of';
select public.t_erro(format($$select public.assumir_oferta(%L)$$, :'of'), 'Ana não assume sozinha');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_ok(public.assumir_oferta(:'of') = 'passou', 'ela assume a oferta: Gate 5 passa');
select public.t_ok((select (conteudo_mentora ->> 'clientes_simultaneos')::int from public.registro where id = :'of') = 2, '6 h e 3 h por cliente: 2 clientes simultâneos');
select public.t_ok((select estado from public.movimento where codigo = 8) = 'aberto', 'M7 fecha e M8 abre');
reset role;
\echo TODOS OS TESTES DO M7 PASSARAM
