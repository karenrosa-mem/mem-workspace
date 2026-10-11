\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M5. Repete M1–M4 (05_m4.sql) e continua daqui.
\ir 05_m4.sql

-- ================= M5 =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Ana compara (antes da call; aqui, já com o M5 aberto) e responde "é para você?"
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 5, 'comparacao', jsonb_build_object(
    'criterios', jsonb_build_object(
      'peso',     jsonb_build_object('escolha', :'h2', 'porque', 'pagaram e inventaram solução'),
      'repete',   jsonb_build_object('escolha', :'h1', 'porque', 'três contextos diferentes'),
      'dinheiro', jsonb_build_object('escolha', 'nao_da', 'porque', 'ninguém pagou ainda'),
      'desejada', jsonb_build_object('escolha', 'empatam', 'porque', 'os dois querem a mudança'),
      'testar',   jsonb_build_object('escolha', :'h1', 'porque', 'chego nessas pessoas fácil')),
    'para_voce', jsonb_build_object(:'h1', 'nao_sei', :'h2', 'nao')), 'mentorada', auth.uid()
  from public.jornada returning id as cmp \gset
select public.t_erro(format($$update public.registro set conteudo_mentora = '{"conversa_feita":{}}' where id = %L$$, :'cmp'), 'Ana não marca a conversa como feita');
select public.t_erro(format($$select public.registrar_investigacao_m5(id, 'peso', 'x') from public.jornada$$), 'Ana não abre investigação curta');

-- Karen registra a aposta
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
  select conta_id, id, 5, 'decisao_m5', jsonb_build_object(
    'aposta', :'h2',
    'recomendacao', jsonb_build_object('aposta', :'h1', 'texto', 'recorrência e acesso'),
    'porque', 'pagaram de verdade',
    'nao_sabemos', jsonb_build_array('Se isso cresce além dos primeiros clientes.'),
    'fora', jsonb_build_array(jsonb_build_object('hipotese', :'h1', 'razao', 'r', 'condicao_volta', 'c'))),
    'mentora', auth.uid(), true
  from public.jornada returning id as dm5 \gset
select public.t_erro(format($$select public.registrar_aposta_m5(%L)$$, :'dm5'), '“é para você?” = Não: não pode ser a aposta');

update public.registro set conteudo_mentora = jsonb_build_object(
    'aposta', :'h1',
    'recomendacao', jsonb_build_object('aposta', :'h1', 'texto', 'recorrência e acesso'),
    'porque', 'é o que mais se repete',
    'nao_sabemos', jsonb_build_array('Se isso cresce além dos primeiros clientes.'),
    'fora', jsonb_build_array(jsonb_build_object('hipotese', :'h2', 'razao', 'não é para mim', 'condicao_volta', 'se eu mudar de ideia')))
  where id = :'dm5';
select public.t_erro(format($$select public.registrar_aposta_m5(%L)$$, :'dm5'), '“ainda não sei” sem conversa marcada: não registra');
update public.registro set conteudo_mentora = '{"conversa_feita":{}}'::jsonb || jsonb_build_object('conversa_feita', jsonb_build_object(:'h1', true)) where id = :'cmp';
select public.t_ok((select conteudo_mentora #>> array['conversa_feita', :'h1'] from public.registro where id = :'cmp') = 'true', 'Karen marca a conversa como feita');

-- Contra a recomendação, sem razão estratégica: não registra
update public.registro set conteudo_mentora = conteudo_mentora || jsonb_build_object('recomendacao', jsonb_build_object('aposta', :'h2', 'texto', 'sinal econômico')) where id = :'dm5';
select public.t_erro(format($$select public.registrar_aposta_m5(%L)$$, :'dm5'), 'escolha diferente da recomendação pede razão estratégica');
update public.registro set conteudo_mentora = conteudo_mentora || '{"razao_estrategica":"chego rápido nesse público","condicao_revisao":"se ninguém pagar no NORTE"}' where id = :'dm5';

-- Sem "o que ainda não sabemos": não registra
update public.registro set conteudo_mentora = conteudo_mentora || '{"nao_sabemos":[""]}' where id = :'dm5';
select public.t_erro(format($$select public.registrar_aposta_m5(%L)$$, :'dm5'), 'sem “o que ainda não sabemos” não registra');
update public.registro set conteudo_mentora = conteudo_mentora || '{"nao_sabemos":["Quem paga: o gestor ou a empresa.","Se isso cresce além dos primeiros clientes."]}' where id = :'dm5';

-- Hipótese de fora sem condição: não registra
update public.registro set conteudo_mentora = conteudo_mentora || jsonb_build_object('fora', jsonb_build_array(jsonb_build_object('hipotese', :'h2', 'razao', 'não é para mim', 'condicao_volta', ''))) where id = :'dm5';
select public.t_erro(format($$select public.registrar_aposta_m5(%L)$$, :'dm5'), 'hipótese de fora sem condição para voltar não registra');
update public.registro set conteudo_mentora = conteudo_mentora || jsonb_build_object('fora', jsonb_build_array(jsonb_build_object('hipotese', :'h2', 'razao', 'não é para mim', 'condicao_volta', 'se eu mudar de ideia'))) where id = :'dm5';

-- Reserva com "Não" não entra
update public.registro set conteudo_mentora = conteudo_mentora || jsonb_build_object('reserva', :'h2', 'reserva_condicao', 'x') where id = :'dm5';
select public.t_erro(format($$select public.registrar_aposta_m5(%L)$$, :'dm5'), 'reserva com “não é para mim” não entra');
update public.registro set conteudo_mentora = conteudo_mentora - 'reserva' - 'reserva_condicao' where id = :'dm5';

-- Empate sem saída: investigação curta, Gate 4 não passa
select public.registrar_investigacao_m5(id, 'repete', 'se o problema aparece fora do círculo da amiga') as inv from public.jornada \gset
select public.t_ok((select resultado from public.gate_registro where identificacao = 'gate_4') = 'nao_passou', 'investigação curta: Gate 4 fica “não passou”');
select public.t_erro(format($$select public.registrar_investigacao_m5(id, 'peso', 'outra') from public.jornada$$), 'só uma investigação curta por vez');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, origem_id, conteudo, autora_papel, autora_id)
  select conta_id, id, 5, 'conversa', :'f2', '{"publico":"sim","reconheceu":"caso","falas":["y"]}', 'mentorada', auth.uid() from public.jornada;
select public.t_ok((select count(*) from public.registro where tipo = 'conversa' and movimento_codigo = 5) = 1, 'conversa da investigação entra na frente, marcada M5');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = conteudo_mentora || '{"encerrada":true}' where id = :'inv';

select public.registrar_aposta_m5(:'dm5');
select public.t_ok((select estado from public.movimento where codigo = 5) = 'fechado'
               and (select estado from public.movimento where codigo = 6) = 'aberto', 'aposta registrada: M5 fecha e M6 abre');
select public.t_ok((select count(*) from public.gate_registro where identificacao = 'gate_4' and resultado = 'passou') = 1, 'Gate 4 registrado');
select public.t_ok((select conteudo_mentora ->> 'concordou' from public.registro where id = :'dm5') = 'false', 'fica registrado que a escolha foi diferente da recomendação');
select public.t_erro(format($$select public.registrar_aposta_m5(%L)$$, :'dm5'), 'a aposta não é registrada duas vezes');

-- Ana ajusta o porquê com as palavras dela
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.registro set conteudo = '{"porque":"é o problema que mais se repete e eu chego rápido"}' where id = :'dm5';
select public.t_ok((select conteudo ->> 'porque' from public.registro where id = :'dm5') like 'é o problema%', 'Ana ajusta o porquê da aposta');
select public.t_ok((select estado_edicao from public.registro where id = :'cmp') = 'fechado', 'a comparação fica guardada, fechada');
reset role;
\echo TODOS OS TESTES DO M5 PASSARAM
