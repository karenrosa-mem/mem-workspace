\set ON_ERROR_STOP on
\set QUIET on

-- Utilitários de teste
create function public.t_ok(c boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(c, false) then raise exception 'FALHOU: %', msg; end if; raise notice 'ok · %', msg; end $$;
create function public.t_erro(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then raise notice 'ok · % (bloqueado: %)', msg, sqlerrm; return; end;
  raise exception 'FALHOU: % — deveria ter sido bloqueado', msg;
end $$;
create function public.t_linhas(q text) returns integer language plpgsql as $$
declare n integer; begin execute q; get diagnostics n = row_count; return n; end $$;
grant execute on function public.t_ok(boolean,text), public.t_erro(text,text), public.t_linhas(text) to authenticated;

-- Pessoas (como o convite do Supabase faria)
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'karen@mem.test', '{"nome":"Karen"}'),
  ('22222222-2222-2222-2222-222222222222', 'ana@mem.test',   '{"nome":"Ana"}'),
  ('33333333-3333-3333-3333-333333333333', 'outra@mem.test', '{}');
update public.pessoa set e_mentora = true where email = 'karen@mem.test';
select public.t_ok((select count(*) from public.pessoa) = 3, 'pessoas criadas no cadastro');

-- ================= KAREN =================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select public.t_erro($$select public.iniciar_jornada('ana@mem.test', '2026-10-13',
  array['2026-10-14 19:00-03']::timestamptz[])$$, 'jornada exige 10 calls');

select public.iniciar_jornada('ana@mem.test', '2026-10-13', array[
  '2026-10-14 19:00-03','2026-10-21 19:00-03','2026-10-28 19:00-03','2026-11-04 19:00-03',
  '2026-11-11 19:00-03','2026-11-18 19:00-03','2026-11-25 19:00-03','2026-12-02 19:00-03',
  '2026-12-16 19:00-03','2026-12-23 19:00-03']::timestamptz[]) as jornada \gset

select public.t_ok((select data_limite from public.jornada) = '2027-01-05', 'data-limite = início + 12 semanas');
select public.t_ok((select count(*) from public.movimento where estado = 'aberto' and codigo = 1) = 1, 'M1 nasce aberto');
select public.t_ok((select count(*) from public.encontro) = 10, '10 calls planejadas');

select id as mentoria from public.mentoria \gset
insert into public.nota_privada (mentoria_id, movimento_codigo, conteudo, autora_id)
  values (:'mentoria', 1, 'Tensão: fala muito do cargo, pouco das situações.', auth.uid());
insert into public.leitura_rascunho (mentoria_id, movimento_codigo, tipo_leitura, conteudo)
  values (:'mentoria', 1, 'leitura_call', 'Rascunho da leitura da Call 1.') returning id as rascunho \gset

insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora, autora_papel, autora_id)
  select conta_id, id, 2, 'pre_preenchido', '{"quem_tinha_o_problema":"gerentes"}', 'mentora', auth.uid()
  from public.jornada returning id as reg_karen \gset

-- ================= ANA (mentorada) =================
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select public.t_ok((select count(*) from public.jornada) = 1, 'Ana vê a própria jornada');
select public.t_ok((select count(*) from public.nota_privada) = 0, 'Ana NÃO vê notas privadas');
select public.t_ok((select count(*) from public.leitura_rascunho) = 0, 'Ana NÃO vê rascunhos de leitura');
select public.t_ok((select count(*) from public.pessoa) = 2, 'Ana vê a si mesma e a mentora');

insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, autora_papel, autora_id)
  select conta_id, id, 1, 'situacao', '{"titulo":"Reestruturei a área"}', 'mentorada', auth.uid()
  from public.jornada returning id as reg_ana \gset

select public.t_ok(public.t_linhas(format($$update public.registro set conteudo = '{"titulo":"Reestruturei a área de vendas"}' where id = %L$$, :'reg_ana')) = 1,
  'Ana edita a própria situação aberta');
select public.t_ok(public.t_linhas(format($$update public.registro set conteudo = '{"quem_tinha_o_problema":"gerentes regionais"}' where id = %L$$, :'reg_karen')) = 1,
  'Ana confirma/corrige campo pré-preenchido');
select public.t_erro(format($$update public.registro set conteudo_mentora = '{}' where id = %L$$, :'reg_karen'),
  'Ana não altera campo da mentora');
select public.t_erro(format($$update public.registro set estado_edicao = 'fechado' where id = %L$$, :'reg_ana'),
  'Ana não fecha registro');
select public.t_erro($$insert into public.registro (conta_id, jornada_id, tipo, autora_papel, autora_id)
  select conta_id, id, 'leitura', 'mentorada', auth.uid() from public.jornada$$, 'Ana não cria leitura');
select public.t_erro($$insert into public.registro (conta_id, jornada_id, tipo, autora_papel, autora_id)
  select conta_id, id, 'situacao', 'mentora', auth.uid() from public.jornada$$, 'Ana não se passa por mentora');
select public.t_erro($$update public.pessoa set e_mentora = true where id = auth.uid()$$, 'Ana não vira mentora');
select public.t_erro($$select public.iniciar_jornada('outra@mem.test','2026-10-13', array[]::timestamptz[])$$, 'Ana não inicia jornada');
select public.t_erro(format($$select public.remarcar_encontro(id, now(), 'pedido_mentorada') from public.encontro where numero = 3$$),
  'Ana não remarca encontro');
select public.t_erro(format($$insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado, verificado_por) values (%L, 2, 'gate_1', 'passou', auth.uid())$$, :'jornada'),
  'Ana não registra gate');
select public.t_erro($$insert into public.nota_privada (mentoria_id, conteudo, autora_id) select id, 'x', auth.uid() from public.mentoria$$,
  'Ana não escreve nota privada');

-- ================= OUTRA PESSOA =================
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.t_ok((select count(*) from public.jornada) + (select count(*) from public.registro)
  + (select count(*) from public.encontro) + (select count(*) from public.conta) = 0, 'outra pessoa não vê nada');

-- ================= KAREN: publicar, fechar, gate, remarcar =================
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_erro(format($$update public.registro set conteudo = '{}' where id = %L$$, :'reg_ana'),
  'Karen não altera o texto da Ana');
select public.publicar_leitura(:'rascunho') as leitura \gset
select public.t_erro(format($$select public.publicar_leitura(%L)$$, :'rascunho'), 'leitura não é publicada duas vezes');
select public.t_ok(public.t_linhas(format($$update public.registro set estado_edicao = 'fechado' where id = %L$$, :'reg_ana')) = 1,
  'Karen fecha a situação (evento de passagem)');
insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado, encaminhamento, verificado_por)
  values (:'jornada', 2, 'gate_1', 'nao_passou', 'conversa extra', auth.uid());
select public.t_erro(format($$insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado, verificado_por) values (%L, 2, 'gate_1', 'nao_passou', auth.uid())$$, :'jornada'),
  '"não passou" exige encaminhamento');

select public.t_ok((select public.remarcar_encontro(id, '2026-10-29 19:00-03', 'pedido_mentora') from public.encontro where numero = 3) = 0,
  'remarcar na mesma semana a pedido da mentora: 0 dias');
select public.t_ok((select public.remarcar_encontro(id, '2026-11-12 19:00-03', 'pedido_mentora') from public.encontro where numero = 4) = 0,
  'adiar a pedido da mentora: nunca consome folga');
select public.t_ok((select public.remarcar_encontro(id, '2026-11-25 19:00-03', 'pedido_mentorada') from public.encontro where numero = 6) = 7,
  'adiar para a semana seguinte a pedido dela: 7 dias');
select public.t_ok((select folga_restante_dias from public.jornada_cronograma) = 0, 'folga restante = 0');
select public.t_ok((select data_planejada_original from public.encontro where numero = 6) = '2026-11-18 19:00-03', 'data planejada original preservada');
select public.t_erro($$update public.encontro set data_atual = now() where numero = 7$$, 'data só muda pela remarcação');

-- ================= ANA: vê leitura, gate; corrige registro fechado =================
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro where tipo = 'leitura') = 1, 'Ana vê a leitura publicada');
select public.t_ok((select count(*) from public.gate_registro where resultado = 'nao_passou') = 1, 'Ana vê o "não passou" e o encaminhamento');
select public.t_ok(public.t_linhas(format($$update public.registro set conteudo = '{}' where id = %L$$, :'reg_ana')) = 0,
  'registro fechado não se edita direto');
select public.t_ok(public.nova_versao(:'reg_ana', '{"titulo":"Reestruturei a área de vendas (2019)"}', (select conteudo_mentora from public.registro where id = :'reg_ana'), 'correcao') = 2,
  'correção vira versão 2');
select public.t_ok((select conteudo->>'titulo' from public.registro_versao where registro_id = :'reg_ana' and numero = 1) = 'Reestruturei a área de vendas',
  'versão anterior preservada');
select public.t_erro(format($$select public.nova_versao(%L, '{}', '{}', 'protecao_de_dados')$$, :'reg_ana'), 'proteção de dados só pela plataforma');
select public.t_ok(public.t_linhas(format($$delete from public.registro where id = %L$$, :'leitura')) = 0, 'leitura não é apagada');
select public.t_ok(public.t_linhas(format($$delete from public.registro where id = %L$$, :'reg_ana')) = 0, 'registro fechado não é apagado');

-- ================= FIM DA MENTORIA: Karen perde o acesso =================
reset role;
update public.mentoria set acesso_ate = now() - interval '1 second';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_ok((select count(*) from public.jornada) + (select count(*) from public.registro)
  + (select count(*) from public.nota_privada) + (select count(*) from public.pessoa where email = 'ana@mem.test') = 0,
  'depois do fim, a Karen não vê mais nada da Ana');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro) = 3, 'a Ana continua vendo tudo o que é dela');
reset role;
\echo TODOS OS TESTES PASSARAM
