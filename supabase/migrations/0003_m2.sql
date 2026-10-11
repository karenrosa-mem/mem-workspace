-- =====================================================================
-- Workspace MEM · V1 · 0003 — M2 · Enxergar seus ativos
-- Fonte: Especificação V1 do M2 e "Modelo por movimento", seção M2.
--
-- Os registros do M2 usam as tabelas do núcleo:
--   padrao          — criado pela mentora, oculto até a leitura com os padrões
--   reacao_padrao   — da mentorada, uma por padrão (origem_id = padrão)
--   escolha_dois    — da mentorada
--   decisao_m2      — registrada pela mentora (oculta até a leitura curta);
--                     o porquê é escrito pela mentorada
-- Esta migração só acrescenta a passagem do Gate 1: quando ela escreve o
-- porquê, o gate é registrado e o M2 fecha (Modelo M2.2, evento "Porquê escrito").
--
-- Aplicar uma única vez no Supabase, depois da 0002: SQL Editor → Run.
-- Este arquivo não apaga nada.
-- =====================================================================

create function public.escrever_porque_m2(
  p_decisao       uuid,
  p_porque        text,
  p_justificativa text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d           public.registro;
  v_mentora   uuid;
  v_escolhidos integer;
begin
  select * into d from public.registro where id = p_decisao for update;
  if d.id is null or d.tipo <> 'decisao_m2' or not public.eh_titular_da_jornada(d.jornada_id) then
    raise exception 'Decisão não encontrada.';
  end if;
  if d.pendente_publicacao then
    raise exception 'A decisão ainda não foi publicada pela Karen.';
  end if;
  if d.estado_edicao <> 'aberto' then
    raise exception 'Esta decisão já foi concluída.';
  end if;
  if nullif(trim(p_porque), '') is null then
    raise exception 'Escreva o porquê em uma frase.';
  end if;

  v_escolhidos := coalesce(jsonb_array_length(d.conteudo_mentora -> 'escolhidos'), 0);
  if v_escolhidos > 3 and nullif(trim(p_justificativa), '') is null then
    raise exception 'Mais de três ativos escolhidos pedem uma justificativa.';
  end if;

  update public.registro
     set conteudo = d.conteudo || jsonb_build_object('porque', trim(p_porque))
                    || case when nullif(trim(p_justificativa), '') is null then '{}'::jsonb
                            else jsonb_build_object('justificativa', trim(p_justificativa)) end
   where id = d.id;

  select mentora_id into v_mentora from public.mentoria where jornada_id = d.jornada_id;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (d.jornada_id, 2, 'gate_1', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'decisão registrada com escolhidos e não seguidos', 'atendida', true),
            jsonb_build_object('condicao', 'porquê nas palavras dela', 'atendida', true)),
          d.id, v_mentora);

  perform public.fechar_movimento(d.jornada_id, 2::smallint);
end $$;

revoke all on function public.escrever_porque_m2(uuid, text, text) from public, anon;
grant execute on function public.escrever_porque_m2(uuid, text, text) to authenticated;
