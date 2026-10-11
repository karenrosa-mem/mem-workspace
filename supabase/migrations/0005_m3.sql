-- =====================================================================
-- Workspace MEM · V1 · 0005 — M3 · Formular hipóteses
-- Fonte: Especificação V1 do M3 e "Modelo por movimento", seção M3.
--
-- Registros do M3 (tabelas do núcleo):
--   quem_mais    — da mentorada, um por ativo escolhido (conteudo.ativo = padrão);
--                  guarda também o motivo quando o ativo fica sem hipótese
--   hipotese     — da mentorada: ativo, público, problema, contexto,
--                  transformação, lastro. A lista de públicos é derivada.
--   decisao_m3   — registrada pela Karen durante a Call 3 (Gate 2)
--
-- Duas funções:
--   reformular_hipotese  — a mentorada reescreve uma hipótese e a versão
--                          anterior fica guardada (usada a partir do dia da Call 3)
--   registrar_decisao_m3 — a Karen registra o que vai a campo, o que fica
--                          guardado e o porquê dela (nas palavras dela, na call).
--                          Gate 2 passa, o M3 fecha e o M4 abre na hora.
--
-- Aplicar uma única vez no Supabase, depois da 0004: SQL Editor → Run.
-- Este arquivo não apaga nada.
-- =====================================================================

create function public.reformular_hipotese(
  p_registro uuid,
  p_conteudo jsonb
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r     public.registro;
  v_num integer;
begin
  select * into r from public.registro where id = p_registro for update;
  if r.id is null or r.tipo <> 'hipotese' or not public.eh_titular_da_jornada(r.jornada_id) then
    raise exception 'Hipótese não encontrada.';
  end if;
  if r.estado_edicao <> 'aberto' then
    raise exception 'Esta hipótese já foi decidida.';
  end if;
  if nullif(p_conteudo ->> 'ativo', '') is null then
    raise exception 'Toda hipótese precisa de um ativo.';
  end if;
  if p_conteudo is not distinct from r.conteudo then
    raise exception 'Nada mudou.';
  end if;

  v_num := r.versao_atual;
  insert into public.registro_versao (registro_id, numero, conteudo, conteudo_mentora,
                                      status_metodologico, motivo, evento, autora_id)
  values (r.id, v_num, r.conteudo, r.conteudo_mentora, r.status_metodologico,
          'atualizacao_prevista', 'reformulada na Call 3', auth.uid());

  update public.registro
     set conteudo = p_conteudo, versao_atual = v_num + 1
   where id = r.id;

  return v_num + 1;
end $$;

create function public.registrar_decisao_m3(p_decisao uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d         public.registro;
  v_mentora uuid;
  v_vao     jsonb;
  v_guard   jsonb;
  h         record;
begin
  select * into d from public.registro where id = p_decisao for update;
  if d.id is null or d.tipo <> 'decisao_m3' or not public.eh_mentora_ativa(d.jornada_id) then
    raise exception 'Decisão não encontrada.';
  end if;
  if not d.pendente_publicacao then
    raise exception 'Esta decisão já foi registrada.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = d.jornada_id and codigo = 3 and estado = 'aberto') then
    raise exception 'O M3 não está aberto.';
  end if;

  v_vao   := coalesce(d.conteudo_mentora -> 'vao', '[]'::jsonb);
  v_guard := coalesce(d.conteudo_mentora -> 'guardadas', '[]'::jsonb);

  if jsonb_array_length(v_vao) = 0 then
    raise exception 'Pelo menos uma hipótese precisa ir a campo.';
  end if;
  if nullif(trim(d.conteudo_mentora ->> 'porque'), '') is null then
    raise exception 'Registre o porquê nas palavras dela.';
  end if;
  if exists (select 1 from jsonb_array_elements(v_guard) g
             where nullif(trim(g ->> 'razao'), '') is null) then
    raise exception 'Escreva a razão de cada hipótese guardada.';
  end if;

  -- Cada hipótese que vai a campo é dela, desta jornada e tem ativo.
  for h in select x #>> '{}' as id from jsonb_array_elements(v_vao) x loop
    if not exists (select 1 from public.registro
                   where id = h.id::uuid and jornada_id = d.jornada_id and tipo = 'hipotese'
                     and nullif(conteudo ->> 'ativo', '') is not null) then
      raise exception 'Uma hipótese que vai a campo não foi encontrada ou não tem ativo.';
    end if;
  end loop;

  update public.registro
     set conteudo_mentora = conteudo_mentora || jsonb_build_object('status', 'vai_a_campo')
   where jornada_id = d.jornada_id and tipo = 'hipotese'
     and id::text in (select x #>> '{}' from jsonb_array_elements(v_vao) x);

  update public.registro reg
     set conteudo_mentora = reg.conteudo_mentora || jsonb_build_object(
           'status', 'guardada',
           'razao', trim(g ->> 'razao'),
           'condicao_volta', coalesce(trim(g ->> 'condicao_volta'), ''))
    from jsonb_array_elements(v_guard) g
   where reg.jornada_id = d.jornada_id and reg.tipo = 'hipotese'
     and reg.id::text = g ->> 'hipotese';

  update public.registro set pendente_publicacao = false where id = d.id;

  select mentora_id into v_mentora from public.mentoria where jornada_id = d.jornada_id;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (d.jornada_id, 3, 'gate_2', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'hipóteses que vão a campo têm ativo de origem', 'atendida', true),
            jsonb_build_object('condicao', 'porquê nas palavras dela, registrado na Call 3', 'atendida', true)),
          d.id, v_mentora);

  perform public.fechar_movimento(d.jornada_id, 3::smallint);

  -- A frase continua dela: pode ajustar depois, sem reabrir nada.
  update public.registro set estado_edicao = 'aberto' where id = d.id;
end $$;

revoke all on function public.reformular_hipotese(uuid, jsonb) from public, anon;
revoke all on function public.registrar_decisao_m3(uuid) from public, anon;
grant execute on function public.reformular_hipotese(uuid, jsonb),
                          public.registrar_decisao_m3(uuid)
  to authenticated;
