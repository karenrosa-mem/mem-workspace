\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M6. Repete M1–M5 (06_m5.sql) e continua daqui.
\ir 06_m5.sql

-- ================= M6 =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select estado from public.movimento where codigo = 6) = 'aberto', 'M6 aberto depois da aposta');

insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 6, 'oportunidade', jsonb_build_object('itens', jsonb_build_object(
    'beneficiario', jsonb_build_object('escolha', 'ajusto', 'valor', 'gestores promovidos de dentro do time', 'fica_de_fora', 'quem veio de fora'),
    'problema',     jsonb_build_object('escolha', 'mantenho', 'valor', 'cobrar quem era colega'),
    'contexto',     jsonb_build_object('escolha', 'mantenho', 'valor', 'primeiros seis meses'),
    'momento',      jsonb_build_object('escolha', 'sem_material'),
    'desejo',       jsonb_build_object('escolha', 'escrito', 'valor', 'cobrar sem me sentir traidor'),
    'destino',      jsonb_build_object('escolha', 'mantenho', 'valor', 'time cumpre o combinado'),
    'direcao',      jsonb_build_object('escolha', 'escrito', 'valor', 'pelas conversas difíceis que eu já conduzi'),
    'comprador',    jsonb_build_object('escolha', 'escrito', 'tipo', 'outra', 'quem', 'a empresa', 'porque', 'o RH já paga cursos'))), 'mentorada', auth.uid()
  from public.jornada returning id as op \gset

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = '{"limites":["não prometer que o time inteiro muda"],"concorda_limites":true,"verificacao":{"beneficiario_ouvido":true,"problema_ouvido":true,"apostas_declaradas":true,"caminho":true}}' where id = :'op';
select public.t_erro(format($$select public.assumir_oportunidade(%L)$$, :'op'), 'beneficiário ajustado sem conversa de apoio não assume');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = jsonb_set(conteudo, '{itens,beneficiario,conversa}', to_jsonb(:'c1'::text)) where id = :'op';
select public.t_erro(format($$select public.assumir_oportunidade(%L)$$, :'op'), 'Ana não assume sozinha');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_erro(format($$select public.assumir_oportunidade(%L)$$, :'op'), 'sem a pergunta transversal não assume');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = conteudo || '{"transversal":"mantive o problema; recortei para quem foi promovido de dentro, que foi quem contou os casos"}' where id = :'op';

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = conteudo_mentora || '{"niveis":{"beneficiario":3}}' where id = :'op';
select public.t_ok(public.assumir_oportunidade(:'op') = 'nao_passou', 'beneficiário de nível 3: a passagem não acontece');
select public.t_ok((select count(*) from public.gate_registro where identificacao = 'passagem_m6' and resultado = 'nao_passou') = 1, '“não passou” fica registrado, com encaminhamento');
select public.t_ok((select estado from public.movimento where codigo = 6) = 'aberto', 'o M6 continua aberto');

update public.registro set conteudo_mentora = conteudo_mentora || '{"niveis":{"beneficiario":2},"concorda_limites":false}' where id = :'op';
select public.t_erro(format($$select public.assumir_oportunidade(%L)$$, :'op'), 'sem concordância com os limites não assume');
update public.registro set conteudo_mentora = conteudo_mentora || '{"concorda_limites":true}' where id = :'op';
select public.t_ok(public.assumir_oportunidade(:'op') = 'passou', 'ela assume: a passagem acontece');
select public.t_ok((select estado from public.movimento where codigo = 7) = 'aberto', 'M6 fecha e M7 abre');
select public.t_ok((select conteudo_mentora ? 'assumida_em' from public.registro where id = :'op'), 'data da assunção registrada');
reset role;
\echo TODOS OS TESTES DO M6 PASSARAM
