-- =====================================================================
-- Workspace MEM · V1 · 0007 — M4 com duas trilhas (decisão de 11/10/2026)
--
-- Cada hipótese pode ser investigada por:
--   · Pesquisa de mercado — relatos encontrados em público (comentários,
--     avaliações de quem comprou) e sinais de mercado (anúncios, mais vendidos,
--     serviços), registrados pela mentorada;
--   · Conversas — como antes, agora também por mensagem.
--
-- Novos registros (tabelas do núcleo, origem_id = frente):
--   relato        — conteudo: onde, trecho literal, link, caso (bool).
--                   conteudo_mentora.nao_conta = true quando a Karen descarta.
--   sinal_mercado — conteudo: onde, nome, link, tempo (menos_1 | 1_3 | mais_3),
--                   anuncios (número), mais_vendidos (bool), preco.
--
-- Para seguir para comparação (Gate 3), uma das duas:
--   · 2 conversas do público com caso concreto; ou
--   · 3 relatos com caso concreto + 1 sinal de demanda sustentada
--     (rodando ou vendendo há mais de 3 meses, ou entre os mais vendidos).
-- A meta inicial de conversas passa de 3 para 2.
--
-- Aplicar uma única vez no Supabase, depois da 0006: SQL Editor → Run.
-- Este arquivo não apaga dados.
-- =====================================================================

create or replace function public.criar_frentes(p_jornada uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora,
                               autora_papel, origem_id)
  select h.conta_id, h.jornada_id, 4, 'frente', jsonb_build_object('meta', 2), 'workspace', h.id
    from public.registro h
   where h.jornada_id = p_jornada and h.tipo = 'hipotese'
     and h.conteudo_mentora ->> 'status' = 'vai_a_campo'
     and not exists (select 1 from public.registro f
                     where f.tipo = 'frente' and f.origem_id = h.id);
end $$;

create function public.pesquisa_suficiente(p_frente uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.registro r
      where r.tipo = 'relato' and r.origem_id = p_frente
        and coalesce((r.conteudo ->> 'caso')::boolean, false)
        and coalesce(r.conteudo_mentora ->> 'nao_conta', 'false') <> 'true') >= 3
    and
    (select count(*) from public.registro s
      where s.tipo = 'sinal_mercado' and s.origem_id = p_frente
        and (s.conteudo ->> 'tempo' = 'mais_3' or coalesce((s.conteudo ->> 'mais_vendidos')::boolean, false))) >= 1;
$$;

create or replace function public.registrar_decisao_m4(p_decisao uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d         public.registro;
  v_mentora uuid;
  f         record;
  item      jsonb;
begin
  select * into d from public.registro where id = p_decisao for update;
  if d.id is null or d.tipo <> 'decisao_m4' or not public.eh_mentora_ativa(d.jornada_id) then
    raise exception 'Decisão não encontrada.';
  end if;
  if not d.pendente_publicacao then
    raise exception 'Esta decisão já foi registrada.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = d.jornada_id and codigo = 4 and estado = 'aberto') then
    raise exception 'O M4 não está aberto.';
  end if;

  for f in select id from public.registro where jornada_id = d.jornada_id and tipo = 'frente' loop
    select x into item from jsonb_array_elements(coalesce(d.conteudo_mentora -> 'frentes', '[]'::jsonb)) x
     where x ->> 'frente' = f.id::text limit 1;
    if item is null or coalesce(item ->> 'resultado', '') not in ('segue', 'volta', 'guardada') then
      raise exception 'Cada frente precisa de uma decisão.';
    end if;
    if nullif(trim(item ->> 'razao'), '') is null then
      raise exception 'Escreva a razão de cada frente.';
    end if;
    if item ->> 'resultado' = 'segue'
       and public.conversas_com_caso(f.id) < 2
       and not public.pesquisa_suficiente(f.id) then
      raise exception 'Para seguir para comparação: 2 conversas do público com caso concreto, ou 3 relatos com caso concreto e 1 sinal de demanda sustentada.';
    end if;
  end loop;

  if not exists (select 1 from jsonb_array_elements(coalesce(d.conteudo_mentora -> 'frentes', '[]'::jsonb)) x
                 where x ->> 'resultado' = 'segue') then
    raise exception 'Pelo menos uma frente precisa seguir para comparação.';
  end if;

  -- Guarda por qual trilha cada frente chegou (o M5 mostra isso na comparação).
  update public.registro reg
     set conteudo_mentora = reg.conteudo_mentora || jsonb_build_object(
           'resultado', x ->> 'resultado',
           'razao', trim(x ->> 'razao'),
           'condicao_volta', coalesce(trim(x ->> 'condicao_volta'), ''),
           'base', case
                     when public.conversas_com_caso(reg.id) >= 2 and public.pesquisa_suficiente(reg.id) then 'ambas'
                     when public.conversas_com_caso(reg.id) >= 2 then 'conversas'
                     when public.pesquisa_suficiente(reg.id) then 'pesquisa'
                     else 'nenhuma' end)
    from jsonb_array_elements(d.conteudo_mentora -> 'frentes') x
   where reg.tipo = 'frente' and reg.jornada_id = d.jornada_id and reg.id::text = x ->> 'frente';

  update public.registro set pendente_publicacao = false where id = d.id;

  select mentora_id into v_mentora from public.mentoria where jornada_id = d.jornada_id;
  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (d.jornada_id, 4, 'gate_3', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'cada frente com decisão e razão', 'atendida', true),
            jsonb_build_object('condicao', 'frentes que seguem têm 2 conversas com caso concreto, ou 3 relatos com caso e 1 sinal de demanda sustentada', 'atendida', true)),
          d.id, v_mentora);

  perform public.fechar_movimento(d.jornada_id, 4::smallint);
end $$;

revoke all on function public.pesquisa_suficiente(uuid) from public, anon;
grant execute on function public.pesquisa_suficiente(uuid) to authenticated;
