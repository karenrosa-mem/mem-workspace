-- =====================================================================
-- Workspace MEM · V1 · 0006 — M4 · Ouvir o mercado
-- Fonte: Especificação V1 do M4 e "Modelo por movimento", seção M4.
--
-- Registros do M4 (tabelas do núcleo):
--   frente      — uma por hipótese que foi a campo; criada pelo Workspace
--                 quando o M4 abre (origem_id = hipótese).
--                 conteudo (dela): checagem de mercado, acesso não conseguido.
--                 conteudo_mentora (Karen): meta de conversas (começa em 3).
--   conversa    — da mentorada (origem_id = frente). conteudo: público,
--                 reconheceu, tentou, pagou, ideia antes, falas, percepção.
--                 conteudo_mentora: nota de revisão, se "em parte do público"
--                 conta, falas que não contam como prova.
--   ideia_nova  — da mentorada, nascida numa frente; nunca vira evidência.
--   decisao_m4  — registrada pela Karen no início da Call 4 (Gate 3).
--
-- Aplicar uma única vez no Supabase, depois da 0005: SQL Editor → Run.
-- Este arquivo não apaga nada.
-- =====================================================================

-- Uma frente por hipótese que vai a campo (idempotente).
create function public.criar_frentes(p_jornada uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora,
                               autora_papel, origem_id)
  select h.conta_id, h.jornada_id, 4, 'frente', jsonb_build_object('meta', 3), 'workspace', h.id
    from public.registro h
   where h.jornada_id = p_jornada and h.tipo = 'hipotese'
     and h.conteudo_mentora ->> 'status' = 'vai_a_campo'
     and not exists (select 1 from public.registro f
                     where f.tipo = 'frente' and f.origem_id = h.id);
end $$;

create function public.ao_abrir_m4() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.codigo = 4 and new.estado = 'aberto' and old.estado <> 'aberto' then
    perform public.criar_frentes(new.jornada_id);
  end if;
  return new;
end $$;

create trigger m4_cria_frentes after update on public.movimento
  for each row execute function public.ao_abrir_m4();

-- Conversas que contam para o critério de comparação: do público (ou "em parte",
-- quando a Karen marcou que conta), com caso concreto e sem a ideia antes.
create function public.conversas_com_caso(p_frente uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.registro c
   where c.tipo = 'conversa' and c.origem_id = p_frente
     and c.conteudo ->> 'reconheceu' = 'caso'
     and coalesce((c.conteudo ->> 'ideia_antes')::boolean, false) = false
     and (c.conteudo ->> 'publico' = 'sim'
          or (c.conteudo ->> 'publico' = 'em_parte' and c.conteudo_mentora ->> 'conta_publico' = 'true'));
$$;

create function public.registrar_decisao_m4(p_decisao uuid) returns void
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
    if item ->> 'resultado' = 'segue' and public.conversas_com_caso(f.id) < 2 then
      raise exception 'Para seguir para comparação, a frente precisa de pelo menos 2 conversas do público com caso concreto.';
    end if;
  end loop;

  if not exists (select 1 from jsonb_array_elements(coalesce(d.conteudo_mentora -> 'frentes', '[]'::jsonb)) x
                 where x ->> 'resultado' = 'segue') then
    raise exception 'Pelo menos uma frente precisa seguir para comparação.';
  end if;

  update public.registro reg
     set conteudo_mentora = reg.conteudo_mentora || jsonb_build_object(
           'resultado', x ->> 'resultado',
           'razao', trim(x ->> 'razao'),
           'condicao_volta', coalesce(trim(x ->> 'condicao_volta'), ''))
    from jsonb_array_elements(d.conteudo_mentora -> 'frentes') x
   where reg.tipo = 'frente' and reg.jornada_id = d.jornada_id and reg.id::text = x ->> 'frente';

  update public.registro set pendente_publicacao = false where id = d.id;

  select mentora_id into v_mentora from public.mentoria where jornada_id = d.jornada_id;
  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (d.jornada_id, 4, 'gate_3', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'cada frente com decisão e razão', 'atendida', true),
            jsonb_build_object('condicao', 'frentes que seguem têm 2 ou mais conversas do público com caso concreto', 'atendida', true)),
          d.id, v_mentora);

  perform public.fechar_movimento(d.jornada_id, 4::smallint);
end $$;

revoke all on function public.criar_frentes(uuid) from public, anon, authenticated;
revoke all on function public.ao_abrir_m4() from public, anon, authenticated;
revoke all on function public.conversas_com_caso(uuid) from public, anon;
revoke all on function public.registrar_decisao_m4(uuid) from public, anon;
grant execute on function public.conversas_com_caso(uuid), public.registrar_decisao_m4(uuid) to authenticated;

-- Jornadas que já estão no M4 ganham as frentes agora.
select public.criar_frentes(jornada_id) from public.movimento where codigo = 4 and estado = 'aberto';
