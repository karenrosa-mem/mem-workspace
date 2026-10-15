\set ON_ERROR_STOP on
\set QUIET on
-- Acesso por código (0017). Usa o núcleo (01) e cria uma mentorada nova, sem cadastro prévio.
\ir 01_acesso_nucleo.sql

reset role;
grant execute on function public.definir_senha_com_codigo(text, text, text) to anon;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.iniciar_jornada('Bia@MEM.test', current_date, array(select now() + make_interval(days => 7 * g) from generate_series(0, 9) g), null, 'Bia Souza') as jb \gset
select public.t_ok((select titular_id is null and nome = 'Bia Souza' from public.conta where id = (select conta_id from public.jornada where id = :'jb')), 'a jornada nasce sem cadastro no Supabase');
select public.gerar_codigo_acesso(:'jb') as cod \gset
select public.t_ok(:'cod' ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$', 'código no formato XXXX-XXXX');
select public.t_ok((public.situacao_acesso(:'jb') ->> 'entrou')::boolean = false, 'a mentora vê que ela ainda não entrou');

set role anon;
select public.t_ok(public.definir_senha_com_codigo('bia@mem.test', 'AAAA-AAAA', '12345678') = 'codigo_errado', 'código errado não passa');
reset role;
select public.t_ok((select tentativas from public.codigo_acesso where lower(email) = 'bia@mem.test' and usado_em is null and expira_em > now()) = 1, 'a tentativa errada fica contada');
set role anon;
select public.t_erro(format($$select public.definir_senha_com_codigo('bia@mem.test', %L, '123')$$, :'cod'), 'senha curta não passa');
select public.t_ok(public.definir_senha_com_codigo('bia@mem.test', :'cod', '12345678') = 'criar', 'primeiro acesso: ainda não há login, o app cria');

-- O app faz o signUp: o Supabase cria o usuário.
reset role;
insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444', 'bia@mem.test');
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select public.t_ok((select count(*) from public.jornada) = 0, 'antes do código, ela não vê nada');
select public.t_ok(public.vincular_conta(:'cod') = 'pronto', 'o código liga a conta a ela');
select public.t_ok((select count(*) from public.jornada) = 1, 'agora ela vê a jornada dela');
select public.t_ok((select nome from public.pessoa where id = auth.uid()) = 'Bia Souza', 'o nome vem do que a mentora registrou');
select public.t_erro(format($$select public.vincular_conta(%L)$$, :'cod'), 'o código vale uma vez só');

-- Esqueceu a senha: código novo.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_ok((public.situacao_acesso(:'jb') ->> 'entrou')::boolean, 'a mentora vê que ela entrou');
select public.gerar_codigo_acesso(:'jb') as cod2 \gset
set role anon;
select public.t_ok(public.definir_senha_com_codigo('bia@mem.test', :'cod2', 'outrasenha9') = 'pronto', 'senha nova definida com o código novo');
reset role;
select public.t_ok((select encrypted_password = extensions.crypt('outrasenha9', encrypted_password) from auth.users where email = 'bia@mem.test'), 'a senha guardada é a dela, como hash');

-- Cinco tentativas erradas travam o código.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.gerar_codigo_acesso(:'jb') as cod3 \gset
set role anon;
select public.definir_senha_com_codigo('bia@mem.test', 'ZZZZ-ZZZZ', '12345678') from generate_series(1, 5);
select public.t_erro(format($$select public.definir_senha_com_codigo('bia@mem.test', %L, '12345678')$$, :'cod3'), 'depois de 5 erros, nem o código certo passa');
reset role;
\echo TODOS OS TESTES DO ACESSO PASSARAM
