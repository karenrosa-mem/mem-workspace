\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M8. Repete M1–M7 (08_m7.sql) e continua daqui.
\ir 08_m7.sql

-- ================= M8 =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select estado from public.movimento where codigo = 8) = 'aberto', 'M8 aberto depois da oferta');

insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 8, 'preparo', jsonb_build_object(
    'promessa', jsonb_build_object('texto', 'Pare de adiar a conversa difícil', 'cumprimento', 'sim', 'origem', 'contida'),
    'abordagem', jsonb_build_object('texto', 'em cima das conversas reais da sua semana'),
    'resumo', 'Para gestores promovidos de dentro do time...',
    'rota', jsonb_build_object('tipo', 'conversa', 'porque', 'cheguei rápido nesse público pelos colegas'),
    'caminho', jsonb_build_object(
      'interesse', jsonb_build_object('como', 'pede para conversar pelo WhatsApp', 'percorrido', true),
      'aceite', jsonb_build_object('como', 'proposta por mensagem', 'percorrido', true),
      'pagamento', jsonb_build_object('como', 'Pix ou link de cartão', 'percorrido', false),
      'inicio', jsonb_build_object('como', 'primeira sessão na semana seguinte', 'percorrido', true))), 'mentorada', auth.uid()
  from public.jornada returning id as pr \gset

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = '{"verificacao":{"compreensao":true,"contencao":true,"caminho":true,"continuidade":true,"proporcionalidade":true},"objecoes":[{"texto":"já li livro sobre isso","origem":"tentativas do M4","resposta":"aqui é sobre as suas conversas reais"}]}' where id = :'pr';
select public.t_erro(format($$select public.assumir_preparo(%L)$$, :'pr'), 'sem ensaio da apresentação falada não passa');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = conteudo || '{"falada":{"ensaiada_em":"2026-11-20"}}' where id = :'pr';
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_ok(public.assumir_preparo(:'pr') = 'nao_passou', 'pagamento não percorrido: Gate 6 não passa');

update public.registro set conteudo_mentora = conteudo_mentora || '{"objecoes":[{"texto":"x","origem":""}]}' where id = :'pr';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = jsonb_set(conteudo, '{caminho,pagamento,percorrido}', 'true') where id = :'pr';
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_erro(format($$select public.assumir_preparo(%L)$$, :'pr'), 'objeção sem origem não entra');
update public.registro set conteudo_mentora = conteudo_mentora || '{"objecoes":[{"texto":"já li livro","origem":"M4","resposta":"conversas reais"}]}' where id = :'pr';
select public.t_ok(public.assumir_preparo(:'pr') = 'passou', 'Gate 6 passa: oferta preparada para teste');
select public.t_ok((select estado from public.movimento where codigo = 9) = 'aberto', 'M8 fecha e M9 abre');
reset role;
\echo TODOS OS TESTES DO M8 PASSARAM
