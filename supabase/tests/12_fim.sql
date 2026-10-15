\set ON_ERROR_STOP on
\set QUIET on
-- Fim do acesso: repete o fluxo do M10 e avança o relógio da jornada.
\ir 11_m10.sql

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro) > 0, 'dentro dos 60 dias, ela vê a jornada');
select public.t_ok(public.acesso_encerrado_em() is null, 'dentro dos 60 dias, o acesso não está encerrado');
reset role;
update public.jornada set encerrada_em = now() - interval '61 days';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.t_ok((select count(*) from public.registro) = 0 and (select count(*) from public.jornada) = 0, 'depois de 60 dias, ela não vê mais nada');
select public.t_ok(public.acesso_encerrado_em() is not null, 'e a tela sabe dizer quando o acesso terminou');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.t_ok((select count(*) from public.registro) > 0 and (select count(*) from public.nota_privada) >= 0, 'a mentora continua vendo a jornada');
reset role;
\echo TODOS OS TESTES DO FIM DO ACESSO PASSARAM
