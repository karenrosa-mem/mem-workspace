-- =====================================================================
-- Workspace MEM · V1 · 0004 — M2 · o porquê é registrado na Call 2
-- Decisão de 11/10/2026 (Karen): a mentorada não volta ao Workspace para
-- escrever o porquê depois da leitura curta. Na Call 2, a Karen registra a
-- frase dela, literal. Publicar a decisão fecha o M2 e abre o M3 na hora.
-- Depois, a mentorada pode ajustar a frase com as palavras dela, sem
-- bloquear nada.
--
-- Onde fica cada coisa no registro decisao_m2:
--   conteudo_mentora.porque        — a frase dela, como a Karen registrou na call
--   conteudo_mentora.justificativa — quando mais de três seguem
--   conteudo.porque                — o ajuste que ela mesma fizer depois (opcional)
--
-- Aplicar uma única vez no Supabase, depois da 0003: SQL Editor → Run.
-- Este arquivo não apaga dados.
-- =====================================================================

drop function if exists public.escrever_porque_m2(uuid, text, text);

create function public.publicar_decisao_m2(
  p_rascunho uuid,
  p_decisao  uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  d            public.registro;
  r            public.leitura_rascunho;
  v_mentora    uuid;
  v_escolhidos integer;
  v_leitura    uuid;
begin
  select * into d from public.registro where id = p_decisao for update;
  if d.id is null or d.tipo <> 'decisao_m2' or not public.eh_mentora_ativa(d.jornada_id) then
    raise exception 'Decisão não encontrada.';
  end if;
  if not d.pendente_publicacao then
    raise exception 'Esta decisão já foi publicada.';
  end if;

  select * into r from public.leitura_rascunho where id = p_rascunho;
  if r.id is null or r.movimento_codigo <> 2 or r.tipo_leitura <> 'call_2' then
    raise exception 'Leitura curta não encontrada.';
  end if;

  if not exists (select 1 from public.encontro
                 where jornada_id = d.jornada_id and tipo = 'call' and numero = 2 and estado = 'realizado') then
    raise exception 'Marque a Call 2 como realizada antes de publicar a decisão.';
  end if;

  v_escolhidos := coalesce(jsonb_array_length(d.conteudo_mentora -> 'escolhidos'), 0);
  if v_escolhidos = 0 then
    raise exception 'Pelo menos um possível ativo precisa seguir.';
  end if;
  if nullif(trim(d.conteudo_mentora ->> 'porque'), '') is null then
    raise exception 'Registre o porquê nas palavras dela.';
  end if;
  if v_escolhidos > 3 and nullif(trim(d.conteudo_mentora ->> 'justificativa'), '') is null then
    raise exception 'Mais de três seguindo pede uma justificativa.';
  end if;

  -- Publica a leitura curta: torna visíveis a decisão e as marcas nos padrões.
  v_leitura := public.publicar_leitura(p_rascunho, false);

  select mentora_id into v_mentora from public.mentoria where jornada_id = d.jornada_id;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (d.jornada_id, 2, 'gate_1', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'decisão registrada com escolhidos e não seguidos', 'atendida', true),
            jsonb_build_object('condicao', 'porquê nas palavras dela, registrado na Call 2', 'atendida', true)),
          d.id, v_mentora);

  perform public.fechar_movimento(d.jornada_id, 2::smallint);

  -- A frase continua dela: pode ajustar depois, sem reabrir nada.
  update public.registro set estado_edicao = 'aberto' where id = d.id;

  return v_leitura;
end $$;

revoke all on function public.publicar_decisao_m2(uuid, uuid) from public, anon;
grant execute on function public.publicar_decisao_m2(uuid, uuid) to authenticated;
