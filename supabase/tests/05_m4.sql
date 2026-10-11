\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M4. Repete M1–M3 (04_m3.sql) e continua daqui.
\ir 04_m3.sql

-- ================= M4 =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'frente') = 2, 'M4 abre com uma frente por hipótese que foi a campo');
select id as f1 from public.registro where tipo = 'frente' and origem_id = :'h1' \gset
select id as f2 from public.registro where tipo = 'frente' and origem_id = :'h2' \gset
select public.t_ok((select (conteudo_mentora->>'meta')::int from public.registro where id = :'f1') = 3, 'meta começa em 3');

-- Conversas da frente 1
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, origem_id, conteudo, autora_papel, autora_id)
  select conta_id, id, 4, 'conversa', :'f1', '{"publico":"sim","reconheceu":"caso","tentou":true,"tentou_como":"leu um livro","pagou":false,"ideia_antes":false,"falas":["fico com cara de traidor"]}', 'mentorada', auth.uid()
  from public.jornada returning id as c1 \gset
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, origem_id, conteudo, autora_papel, autora_id)
  select conta_id, id, 4, 'conversa', :'f1', '{"publico":"sim","reconheceu":"caso","pagou":true,"pagou_oque":"curso","ideia_antes":true,"falas":["eu pagaria"]}', 'mentorada', auth.uid()
  from public.jornada returning id as c2 \gset
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, origem_id, conteudo, autora_papel, autora_id)
  select conta_id, id, 4, 'conversa', :'f1', '{"publico":"em_parte","reconheceu":"caso","ideia_antes":false,"falas":["x"]}', 'mentorada', auth.uid()
  from public.jornada returning id as c3 \gset
select public.t_ok(public.conversas_com_caso(:'f1') = 1, 'ideia antes e "em parte" não contam ainda');

-- Karen revisa: "em parte" conta; nota na conversa; a mentorada vê
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = '{"conta_publico":true,"nota":"Boa: começou pela última vez."}' where id = :'c3';
update public.registro set conteudo_mentora = '{"falas_opiniao":[0]}' where id = :'c2';
select public.t_ok(public.conversas_com_caso(:'f1') = 2, '"em parte" marcado pela Karen passa a contar');
update public.registro set conteudo_mentora = conteudo_mentora || '{"meta":2}' where id = :'f2';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select conteudo_mentora->>'nota' from public.registro where id = :'c3') is not null, 'Ana vê a nota da Karen na conversa');
select public.t_erro(format($$update public.registro set conteudo_mentora = '{}' where id = %L$$, :'c3'), 'Ana não mexe na revisão da Karen');
update public.registro set conteudo = '{"checagem":"sim","checagem_links":["curso X"]}' where id = :'f1';
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, origem_id, conteudo, autora_papel, autora_id)
  select conta_id, id, 4, 'ideia_nova', :'f2', '{"texto":"sócias com capital desigual"}', 'mentorada', auth.uid() from public.jornada;

-- Decisão do início da Call 4
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
  select conta_id, id, 4, 'decisao_m4', jsonb_build_object('frentes', jsonb_build_array(
    jsonb_build_object('frente', :'f1', 'resultado', 'segue', 'razao', 'dois casos concretos'),
    jsonb_build_object('frente', :'f2', 'resultado', 'segue', 'razao', 'gosto muito'))), 'mentora', auth.uid(), true
  from public.jornada returning id as dm4 \gset
select public.t_erro(format($$select public.registrar_decisao_m4(%L)$$, :'dm4'), 'frente sem 2 casos concretos não segue para comparação');
update public.registro set conteudo_mentora = jsonb_build_object('frentes', jsonb_build_array(
    jsonb_build_object('frente', :'f1', 'resultado', 'segue', 'razao', 'dois casos concretos'),
    jsonb_build_object('frente', :'f2', 'resultado', 'guardada', 'razao', '', 'condicao_volta', 'duas conversas com capital desigual'))) where id = :'dm4';
select public.t_erro(format($$select public.registrar_decisao_m4(%L)$$, :'dm4'), 'frente sem razão não registra');
update public.registro set conteudo_mentora = jsonb_set(conteudo_mentora, '{frentes,1,razao}', '"só uma conversa válida"') where id = :'dm4';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_erro(format($$select public.registrar_decisao_m4(%L)$$, :'dm4'), 'Ana não registra a decisão');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.registrar_decisao_m4(:'dm4');
select public.t_ok((select estado from public.movimento where codigo = 4) = 'fechado'
               and (select estado from public.movimento where codigo = 5) = 'aberto', 'decisão registrada: M4 fecha e M5 abre');
select public.t_ok((select count(*) from public.gate_registro where identificacao = 'gate_3') = 1, 'Gate 3 registrado');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select conteudo_mentora->>'resultado' from public.registro where id = :'f2') = 'guardada', 'Ana vê a frente guardada, com razão');
reset role;
\echo TODOS OS TESTES DO M4 PASSARAM
