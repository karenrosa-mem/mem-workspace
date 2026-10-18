\set ON_ERROR_STOP on
\set QUIET on
-- Invasão: alguém cria login pelo site (o cadastro é aberto, por causa do acesso por código)
-- e tenta ver ou mexer em qualquer coisa. Também: a mentorada tentando ir além do que é dela.
\ir 01_acesso_nucleo.sql

reset role;
insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999999', 'estranha@fora.test');
select id as jana, conta_id as cana from public.jornada limit 1 \gset
select id as mentoria_ana from public.mentoria limit 1 \gset

-- ================= ESTRANHA (logada, sem conta) =================
set role authenticated;
set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
do $$
declare t text; n bigint;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not like 't\_%' loop
    begin
      execute format('select count(*) from public.%I', t) into n;
    exception when insufficient_privilege then
      raise notice 'ok · a estranha nem tem permissão em %', t; continue;
    end;
    if t = 'pessoa' then
      perform public.t_ok(n = 1, 'a estranha só vê o próprio cadastro (pessoa)');
    else
      perform public.t_ok(n = 0, format('a estranha não vê nada em %s', t));
    end if;
  end loop;
end $$;
select public.t_erro($$update public.pessoa set e_mentora = true where id = auth.uid()$$, 'a estranha não vira mentora');
select public.t_erro($$insert into public.pessoa (id, nome, email, e_mentora) values (gen_random_uuid(), 'x', 'x@x', true)$$, 'a estranha não cria pessoa mentora');
select public.t_erro($$insert into public.conta (titular_id) values (auth.uid())$$, 'a estranha não cria conta');
select public.t_erro(format($$insert into public.registro (conta_id, jornada_id, tipo, autora_papel, autora_id) values (%L, %L, 'situacao', 'mentorada', auth.uid())$$, :'cana', :'jana'), 'a estranha não escreve na jornada de outra');
select public.t_erro(format($$insert into public.registro (conta_id, jornada_id, tipo, autora_papel, autora_id) values (%L, %L, 'situacao', 'mentora', auth.uid())$$, :'cana', :'jana'), 'a estranha não se passa por mentora');
select public.t_erro($$select public.iniciar_jornada('x@x.test', current_date, array(select now() + make_interval(days => 7 * g) from generate_series(0, 9) g), null, 'X')$$, 'a estranha não inicia jornada');
select public.t_erro(format($$select public.gerar_codigo_acesso(%L)$$, :'jana'), 'a estranha não gera código de acesso');
select public.t_ok(public.situacao_acesso(:'jana') is null, 'a estranha não vê a situação de acesso');
select public.t_ok(public.t_linhas(format($$update public.registro set conteudo = '{}' where jornada_id = %L$$, :'jana')) = 0, 'a estranha não altera registros');
select public.t_ok(public.t_linhas($$delete from public.registro$$) = 0, 'a estranha não apaga registros');

-- ================= ANÔNIMA (sem login) =================
reset role;
set role anon;
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not like 't\_%' loop
    begin
      execute format('select count(*) from public.%I', t);
      raise exception 'FALHOU: anônima leu %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
  raise notice 'ok · sem login, nenhuma tabela pode ser lida';
end $$;
reset role;

-- ================= MENTORADA (Ana) indo além do que é dela =================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.nota_privada) = 0, 'a mentorada não vê notas privadas');
select public.t_ok((select count(*) from public.leitura_rascunho) = 0, 'a mentorada não vê rascunhos de leitura');
select public.t_ok((select count(*) from public.campo_mentora_rascunho) = 0, 'a mentorada não vê rascunhos da mentora');
select public.t_erro($$update public.pessoa set e_mentora = true where id = auth.uid()$$, 'a mentorada não vira mentora');
select public.t_erro(format($$select public.gerar_codigo_acesso(%L)$$, :'jana'), 'a mentorada não gera código');
select public.t_erro(format($$insert into public.registro (conta_id, jornada_id, tipo, autora_papel, autora_id, conteudo_mentora) values (%L, %L, 'situacao', 'mentorada', auth.uid(), '{"candidata":true}')$$, :'cana', :'jana'), 'a mentorada não escreve campos da mentora');
select public.t_erro(format($$insert into public.registro (conta_id, jornada_id, tipo, autora_papel, autora_id) values (%L, %L, 'situacao', 'mentora', auth.uid())$$, :'cana', :'jana'), 'a mentorada não se passa por mentora');
select public.t_erro(format($$insert into public.gate_registro (jornada_id, movimento_codigo, verificado_por) values (%L, 1, auth.uid())$$, :'jana'), 'a mentorada não registra decisão no lugar da mentora');
select public.t_ok(public.t_linhas($$update public.encontro set estado = 'cancelado'$$) = 0, 'a mentorada não mexe nas calls');
reset role;
\echo TODOS OS TESTES DE INVASAO PASSARAM
