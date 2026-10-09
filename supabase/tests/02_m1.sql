\set ON_ERROR_STOP on
\set QUIET on
-- Fluxo do M1 (banco vazio → 00 → 0001 → 0002 → este arquivo)

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

-- Depois da publicação
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'situacao') = 6, 'Ana vê a situação nova');
select public.t_ok((select conteudo_mentora->>'nome_provisorio' from public.registro where id = :'sit_ana') = 'mediação que retém pessoas',
  'Ana vê a candidata com o nome provisório');
select public.t_ok((select conteudo_mentora->>'o_que_investigamos' from public.registro where tipo = 'leitura' and conteudo_mentora->>'tipo_leitura' = 'call_1') is not null,
  'Ana lê a leitura da Call 1');
select public.t_ok((select estado_edicao from public.registro where tipo = 'onde_voce_esta') = 'fechado', '"Onde você está" fecha com o M1');
select public.t_ok((select bool_and(estado_edicao = 'aberto') from public.registro where tipo = 'situacao'), 'situações seguem abertas no M2');
update public.registro set conteudo = '{"ano":2019,"contexto":"fusão","o_que_fez":"mediei","o_que_mudou":"ficaram"}' where id = :'sit_nova';
select public.t_ok((select conteudo->>'o_que_fez' from public.registro where id = :'sit_nova') = 'mediei', 'Ana completa a situação da call');
reset role;
\echo TODOS OS TESTES DO M1 PASSARAM
