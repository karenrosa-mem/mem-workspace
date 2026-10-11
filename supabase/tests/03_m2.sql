\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M2 (banco vazio → 00 → migrações → este arquivo). Começa repetindo o M1.

create function public.t_ok(c boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(c, false) then raise exception 'FALHOU: %', msg; end if; raise notice 'ok · %', msg; end $$;
create function public.t_erro(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then raise notice 'ok · % (bloqueado: %)', msg, sqlerrm; return; end;
  raise exception 'FALHOU: % — deveria ter sido bloqueado', msg;
end $$;
grant execute on function public.t_ok(boolean,text), public.t_erro(text,text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'karen@mem.test', '{"nome":"Karen"}'),
  ('22222222-2222-2222-2222-222222222222', 'ana@mem.test',   '{"nome":"Ana"}');
update public.pessoa set e_mentora = true where email = 'karen@mem.test';

set role authenticated;
-- Karen inicia com mensagem de abertura
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.iniciar_jornada('ana@mem.test', '2026-10-13', array[
  '2026-10-15 19:00-03','2026-10-22 19:00-03','2026-10-29 19:00-03','2026-11-05 19:00-03',
  '2026-11-12 19:00-03','2026-11-19 19:00-03','2026-11-26 19:00-03','2026-12-03 19:00-03',
  '2026-12-17 19:00-03','2026-12-24 19:00-03']::timestamptz[],
  'Aqui você vai contar o que já fez, com situações reais. Eu leio tudo antes de quinta.') as jornada \gset
select public.t_erro($$select public.iniciar_jornada('ana@mem.test', '2026-10-13', array[
  '2026-10-15 19:00-03','2026-10-22 19:00-03','2026-10-29 19:00-03','2026-11-05 19:00-03',
  '2026-11-12 19:00-03','2026-11-19 19:00-03','2026-11-26 19:00-03','2026-12-03 19:00-03',
  '2026-12-17 19:00-03','2026-12-24 19:00-03']::timestamptz[])$$, 'segunda jornada em andamento é recusada');

-- Ana conta
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select conteudo_mentora->>'tipo_leitura' from public.registro where tipo = 'leitura') = 'mensagem_abertura',
  'Ana vê a mensagem de abertura');
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 1, 'onde_voce_esta', '{"o_que_faz":"Resolvo conflitos"}', 'mentorada', auth.uid() from public.jornada;
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 1, 'situacao', jsonb_build_object('ano', 2010 + g, 'contexto','c','o_que_fez','f','o_que_mudou','m'), 'mentorada', auth.uid()
  from public.jornada, generate_series(1,5) g;
select id as sit_ana from public.registro where tipo = 'situacao' limit 1 \gset
select public.t_erro($$insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, autora_papel, autora_id, pendente_publicacao)
  select conta_id, id, 1, 'situacao', 'mentorada', auth.uid(), true from public.jornada$$, 'Ana não cria registro oculto');

-- Karen prepara: situação nova, candidata, nota, leitura
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
  select conta_id, id, 1, 'situacao', '{"titulo":"Mediação na fusão de 2019","origem":"call_1"}', 'mentora', auth.uid(), true
  from public.jornada returning id as sit_nova \gset
insert into public.campo_mentora_rascunho (registro_id, jornada_id, campos)
  values (:'sit_ana', :'jornada', '{"candidata":true,"nome_provisorio":"mediação que retém pessoas"}');
select id as mentoria from public.mentoria \gset
insert into public.leitura_rascunho (mentoria_id, movimento_codigo, tipo_leitura, campos)
  values (:'mentoria', 1, 'call_1', '{"o_que_investigamos":"Três mediações em anos diferentes.","o_que_fazer_agora":"Complete as situações da call."}')
  returning id as leitura \gset

-- Antes da publicação, Ana não vê nada disso
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'situacao') = 5, 'Ana NÃO vê a situação nova antes da leitura');
select public.t_ok((select count(*) from public.campo_mentora_rascunho) = 0, 'Ana NÃO vê candidatas antes da leitura');
select public.t_ok((select conteudo_mentora from public.registro where id = :'sit_ana') = '{}'::jsonb, 'situação dela sem marca da Karen');

-- Karen tenta publicar antes de marcar a call
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_erro(format($$select public.publicar_leitura(%L, true)$$, :'leitura'), 'leitura de passagem exige Call 1 realizada');
update public.encontro set estado = 'realizado', data_realizada = now() where numero = 1;
select public.publicar_leitura(:'leitura', true);
select public.t_ok((select estado from public.movimento where codigo = 1) = 'fechado'
               and (select estado from public.movimento where codigo = 2) = 'aberto', 'M1 fecha e M2 abre');


-- ================= M2 =================
reset role;
select id as jornada_id from public.jornada \gset
select array_agg(id order by (conteudo->>'ano')) as sits from public.registro where tipo = 'situacao' and autora_papel = 'mentorada' \gset
create temp table s as select id, row_number() over (order by conteudo->>'ano') n from public.registro where tipo = 'situacao' and autora_papel = 'mentorada';
grant select on s to authenticated;
select (select id from s where n=1) s1, (select id from s where n=2) s2, (select id from s where n=3) s3, (select id from s where n=4) s4, (select id from s where n=5) s5 \gset

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
-- Karen agrupa: três padrões, ocultos até a leitura
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
select conta_id, id, 2, 'padrao', jsonb_build_object('nome', 'Mediar conflitos', 'situacoes', jsonb_build_array(:'s1', :'s2'),
       'quem_tinha_o_problema', 'gestores prestes a perder gente', 'sabe_fazer', true, 'rotulo', 'ativo'), 'mentora', auth.uid(), true
from public.jornada returning id as p1 \gset
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
select conta_id, id, 2, 'padrao', jsonb_build_object('nome', 'Organizar processos', 'situacoes', jsonb_build_array(:'s3')), 'mentora', auth.uid(), true
from public.jornada returning id as p2 \gset
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
select conta_id, id, 2, 'padrao', jsonb_build_object('nome', 'Gestores de primeira viagem', 'situacoes', jsonb_build_array(:'s4')), 'mentora', auth.uid(), true
from public.jornada returning id as p3 \gset
insert into public.campo_mentora_rascunho (registro_id, jornada_id, campos)
  values (:'s5', :'jornada_id', '{"outra_experiencia":{"motivo":"você fez, mas não há ninguém com um problema do outro lado"}}');
insert into public.leitura_rascunho (mentoria_id, movimento_codigo, tipo_leitura, campos)
  select id, 2, 'mapa_ativos', '{"texto":"Enxerguei três padrões na sua história."}' from public.mentoria returning id as mapa \gset

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'padrao') = 0, 'Ana NÃO vê os padrões antes da leitura');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.publicar_leitura(:'mapa', false);
select public.t_ok((select estado from public.movimento where codigo = 2) = 'aberto', 'publicar o Mapa de Ativos não fecha o M2');

-- Ana reage
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'padrao') = 3, 'Ana vê os três padrões');
select public.t_ok((select conteudo_mentora->'outra_experiencia'->>'motivo' from public.registro where id = :'s5') is not null, 'Ana vê a outra experiência com o motivo');
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, origem_id, conteudo, autora_papel, autora_id)
  select conta_id, id, 2, 'reacao_padrao', :'p1', '{"reconhece":"reconheco","frase":"eu faço as partes se ouvirem","vontade":"muita","como_sabe":"alguem_reconheceu"}', 'mentorada', auth.uid()
  from public.jornada;
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 2, 'escolha_dois', jsonb_build_object('padroes', jsonb_build_array(:'p1', :'p3')), 'mentorada', auth.uid() from public.jornada;
select public.t_erro(format($$update public.registro set conteudo_mentora = '{}' where id = %L$$, :'p1'), 'Ana não altera o padrão da Karen');

-- Karen registra a decisão (oculta até a leitura curta)
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.encontro set estado = 'realizado', data_realizada = now() where numero = 2;
insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id, pendente_publicacao)
select conta_id, id, 2, 'decisao_m2', jsonb_build_object(
  'escolhidos', jsonb_build_array(jsonb_build_object('padrao', :'p1', 'rotulo', 'ativo'), jsonb_build_object('padrao', :'p3', 'rotulo', 'ativo_a_confirmar'),
                                  jsonb_build_object('padrao', :'p2', 'rotulo', 'ativo'), jsonb_build_object('padrao', 'x', 'rotulo', 'ativo')),
  'nao_seguiram', '[]'::jsonb), 'mentora', auth.uid(), true
from public.jornada returning id as decisao \gset
insert into public.campo_mentora_rascunho (registro_id, jornada_id, campos)
  values (:'p2', :'jornada_id', '{"status":"nao_seguiu","rotulo_final":"outra_experiencia"}');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'decisao_m2') = 0, 'Ana NÃO vê a decisão antes da leitura curta');
select public.t_erro(format($$select public.escrever_porque_m2(%L, 'porque sim')$$, :'decisao'), 'porquê antes da publicação é recusado');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.leitura_rascunho (mentoria_id, movimento_codigo, tipo_leitura, campos)
  select id, 2, 'call_2', '{"o_que_decidimos":"Seguem mediação e gestores."}' from public.mentoria returning id as curta \gset
select public.publicar_leitura(:'curta', false);

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'decisao_m2') = 1, 'Ana vê a decisão depois da leitura curta');
select public.t_ok((select conteudo_mentora->>'status' from public.registro where id = :'p2') = 'nao_seguiu', 'padrão não seguido continua visível, marcado');
select public.t_erro(format($$select public.escrever_porque_m2(%L, '  ')$$, :'decisao'), 'porquê vazio é recusado');
select public.t_erro(format($$select public.escrever_porque_m2(%L, 'são o que eu faria')$$, :'decisao'), 'mais de 3 escolhidos sem justificativa: não passa');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.registro set conteudo_mentora = jsonb_set(conteudo_mentora, '{escolhidos}',
  jsonb_build_array(jsonb_build_object('padrao', :'p1', 'rotulo', 'ativo'), jsonb_build_object('padrao', :'p3', 'rotulo', 'ativo_a_confirmar')))
  where id = :'decisao';

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.escrever_porque_m2(:'decisao', 'são o que eu faria mesmo sem ser paga');
select public.t_ok((select estado from public.movimento where codigo = 2) = 'fechado'
               and (select estado from public.movimento where codigo = 3) = 'aberto', 'porquê escrito: M2 fecha e M3 abre');
select public.t_ok((select count(*) from public.gate_registro where identificacao = 'gate_1' and resultado = 'passou') = 1, 'Gate 1 registrado como passou');
select public.t_ok((select bool_and(estado_edicao = 'fechado') from public.registro where tipo = 'situacao'), 'situações deixam de ser editáveis');
select public.t_ok((select conteudo->>'porque' from public.registro where id = :'decisao') is not null, 'o porquê fica na decisão, como dela');
select public.t_erro(format($$select public.escrever_porque_m2(%L, 'de novo')$$, :'decisao'), 'decisão concluída não reabre');
reset role;
\echo TODOS OS TESTES DO M2 PASSARAM
