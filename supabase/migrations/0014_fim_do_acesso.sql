-- =====================================================================
-- Workspace MEM · V1 · 0014 — Fim do acesso da mentorada (decisão de 15/10)
--
-- A mentorada acessa a jornada até 60 dias depois do fim (encerrada_em).
-- Depois disso, deixa de ver tudo. A mentora continua vendo a jornada
-- inteira, inclusive as notas privadas, para consulta (cláusula no contrato).
-- Nada é apagado.
-- Pode ser colado no SQL Editor mais de uma vez.
-- =====================================================================

create or replace function public.eh_titular_da_jornada(j uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jornada jo
    join public.conta c on c.id = jo.conta_id
    where jo.id = j and c.titular_id = auth.uid()
      and (jo.encerrada_em is null or jo.encerrada_em > now() - interval '60 days'));
$$;

-- Para a tela de entrada dizer "o seu acesso terminou em …" em vez de
-- "a sua jornada ainda não começou". Só responde sobre a própria conta.
create or replace function public.acesso_encerrado_em() returns timestamptz
language sql stable security definer set search_path = '' as $$
  select max(jo.encerrada_em + interval '60 days')
    from public.jornada jo
    join public.conta c on c.id = jo.conta_id
   where c.titular_id = auth.uid()
     and jo.encerrada_em is not null
     and jo.encerrada_em <= now() - interval '60 days';
$$;

revoke all on function public.acesso_encerrado_em() from public, anon;
grant execute on function public.acesso_encerrado_em() to authenticated;
