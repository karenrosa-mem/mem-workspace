\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M10. Repete M1–M9 (10_m9.sql) e continua daqui.
\ir 10_m9.sql

-- ================= M10 =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select estado from public.movimento where codigo = 10) = 'aberto', 'M10 aberto depois do Gate 7');

insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 10, 'decisao_m10', jsonb_build_object(
    'aconteceu', 'uma compra e um pedido de proposta entre três pessoas',
    'sugere', 'os dados sugerem que o problema leva a considerar comprar',
    'aprendi', jsonb_build_array(jsonb_build_object('texto', 'quem paga é o próprio gestor, não o RH', 'muda', 'comprador')),
    'decisao', 'continuar', 'porque', 'mais da mesma evidência', 'nao_sabe', 'se outros compram',
    'revisao', 'se nas próximas 6 exposições ninguém avançar',
    'estatuto', 'validada',
    'plano', jsonb_build_object('acao', 'nova rodada pela mesma rota', 'pergunta', 'outros compram?', 'revisitar', '2027-01-15')), 'mentorada', auth.uid()
  from public.jornada returning id as dz \gset

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = '{"termos":{"t1":true,"t2":true,"t3":true,"t4":true,"t5":true},"parte_a":{"a1":true,"a2":true,"a3":true,"a4":true,"a5":true,"a6":true}}' where id = :'dz';
select public.t_erro(format($$select public.registrar_gate8(%L)$$, :'dz'), 'sem marcar as quatro capacidades não registra');
update public.registro set conteudo_mentora = conteudo_mentora || '{"capacidades":{"reconstruir":{"demonstrada":true},"distinguir":{"demonstrada":false,"faltou":"precisou de condução"},"justificar":{"demonstrada":true},"proximo":{"demonstrada":true}}}' where id = :'dz';

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = conteudo || '{"decisao":"investigar","investigacao":{"pergunta":"p","evidencia":"e","limite":"l"}}' where id = :'dz';
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_ok(public.registrar_gate8(:'dz') = 'passou', 'Gate 7 inconclusivo: “validada” vira “fortalecida”, e investigar passa');
select public.t_ok((select conteudo_mentora ->> 'estatuto_registrado' from public.registro where id = :'dz') = 'fortalecida', 'estatuto registrado: fortalecida, não validada');
select public.t_ok((select conteudo_mentora ->> 'status_jornada' from public.registro where id = :'dz') = 'parcial', 'três de quatro capacidades: autonomia parcial');
select public.t_ok((select estado from public.jornada) = 'concluida' and (select status_autonomia from public.jornada) = 'parcial', 'jornada concluída, com o status de autonomia');
select public.t_ok(public.registrar_conversa_fechamento(:'dz', '{"distinguir":{"demonstrada":true}}') = 'demonstrada', 'conversa de fechamento: a capacidade que faltou é demonstrada');
select public.t_erro(format($$select public.registrar_conversa_fechamento(%L, '{}')$$, :'dz'), 'a conversa de fechamento acontece uma vez só');
reset role;
\echo TODOS OS TESTES DO M10 PASSARAM
