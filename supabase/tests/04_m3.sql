\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M3. Repete o M1 e o M2 (03_m2.sql) e continua daqui.
\ir 03_m2.sql

-- ================= M3 =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select estado from public.movimento where codigo = 3) = 'aberto', 'M3 aberto depois da decisão do M2');

-- Quem mais? para o ativo p1
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 3, 'quem_mais', jsonb_build_object('ativo', :'p1', 'ja_ajudei', 'amiga dona de clínica', 'outro_tipo', 'sócias de pequenos negócios'),
         'mentorada', auth.uid() from public.jornada;

-- Três hipóteses
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 3, 'hipotese', jsonb_build_object('ativo', :'p1', 'publico', 'sócias de pequenos negócios', 'problema', 'conflitos',
         'contexto', 'quando decidem juntas', 'transformacao', 'decidem sem brigar', 'lastro', 'vi_de_perto'), 'mentorada', auth.uid()
  from public.jornada returning id as h1 \gset
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 3, 'hipotese', jsonb_build_object('ativo', :'p3', 'publico', 'gestores promovidos', 'problema', 'cobrar quem era colega',
         'contexto', 'primeiros seis meses', 'transformacao', 'time cumpre o combinado', 'lastro', 'ja_ajudei'), 'mentorada', auth.uid()
  from public.jornada returning id as h2 \gset
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 3, 'hipotese', jsonb_build_object('ativo', :'p3', 'publico', 'líderes de startup', 'problema', 'liderar cedo',
         'contexto', 'primeiro time', 'transformacao', 'time estável', 'lastro', 'imagino'), 'mentorada', auth.uid()
  from public.jornada returning id as h3 \gset

-- Reformulação na call: a versão anterior fica guardada
select public.t_erro(format($$select public.reformular_hipotese(%L, '{"publico":"x"}')$$, :'h1'), 'reformular sem ativo é recusado');
select public.reformular_hipotese(:'h1', (select conteudo || '{"problema":"sócias que não conseguem decidir juntas"}' from public.registro where id = :'h1'));
select public.t_ok((select versao_atual from public.registro where id = :'h1') = 2, 'hipótese reformulada vai para a versão 2');
select public.t_ok((select conteudo->>'problema' from public.registro_versao where registro_id = :'h1' and numero = 1) = 'conflitos', 'a versão anterior continua visível');

-- Karen registra a decisão
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_erro(format($$select public.reformular_hipotese(%L, '{"ativo":"x"}')$$, :'h2'), 'Karen não reescreve a hipótese dela');
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
  select conta_id, id, 3, 'decisao_m3', jsonb_build_object('vao', jsonb_build_array(:'h1', :'h2'),
         'guardadas', jsonb_build_array(jsonb_build_object('hipotese', :'h3', 'razao', '', 'condicao_volta', 'se eu encontrar acesso'))),
         'mentora', auth.uid(), true from public.jornada returning id as dm3 \gset
select public.t_erro(format($$select public.registrar_decisao_m3(%L)$$, :'dm3'), 'sem o porquê dela, não registra');
update public.registro set conteudo_mentora = conteudo_mentora || '{"porque":"são as que eu consigo encontrar gente para conversar"}' where id = :'dm3';
select public.t_erro(format($$select public.registrar_decisao_m3(%L)$$, :'dm3'), 'hipótese guardada sem razão: não registra');
update public.registro set conteudo_mentora = jsonb_set(conteudo_mentora, '{guardadas,0,razao}', '"não conheço ninguém desse público"') where id = :'dm3';

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_erro(format($$select public.registrar_decisao_m3(%L)$$, :'dm3'), 'Ana não registra a decisão');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.registrar_decisao_m3(:'dm3');
select public.t_ok((select estado from public.movimento where codigo = 3) = 'fechado'
               and (select estado from public.movimento where codigo = 4) = 'aberto', 'decisão registrada: M3 fecha e M4 abre na hora');
select public.t_ok((select count(*) from public.gate_registro where identificacao = 'gate_2' and resultado = 'passou') = 1, 'Gate 2 registrado como passou');
select public.t_erro(format($$select public.registrar_decisao_m3(%L)$$, :'dm3'), 'decisão não é registrada duas vezes');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'decisao_m3') = 1, 'Ana vê a decisão');
select public.t_ok((select conteudo_mentora->>'status' from public.registro where id = :'h1') = 'vai_a_campo', 'hipótese marcada: vai a campo');
select public.t_ok((select conteudo_mentora->>'status' from public.registro where id = :'h3') = 'guardada'
               and (select conteudo_mentora->>'razao' from public.registro where id = :'h3') is not null, 'hipótese guardada com a razão');
select public.t_erro(format($$select public.reformular_hipotese(%L, '{"ativo":"x","publico":"y"}')$$, :'h2'), 'hipótese decidida não é reformulada');
update public.registro set conteudo = '{"porque":"as que eu acesso"}' where id = :'dm3';
select public.t_ok((select conteudo->>'porque' from public.registro where id = :'dm3') is not null, 'Ana pode ajustar o porquê');
reset role;
\echo TODOS OS TESTES DO M3 PASSARAM
