-- =====================================================================
-- Workspace MEM · V1 · 0009 — M6 · Navegação
--
-- Registro novo:
--   oportunidade — um por jornada, autora a mentorada (movimento 6).
--     conteudo.itens.<beneficiario|problema|contexto|momento|desejo|destino|direcao|comprador>
--       = { escolha: 'mantenho' | 'ajusto' | 'escrito' | 'sem_material', valor,
--           conversa (beneficiário ajustado), fica_de_fora (beneficiário),
--           tipo 'mesma' | 'outra', quem, porque (comprador) }
--     conteudo.transversal — o que manteve e o que o campo fez mudar.
--     conteudo_mentora: niveis { item: 1|2|3 }, comprador_critico, ativo_dependencia,
--       ativo_observacao, incertezas [{ texto, destino }], limites [texto],
--       concorda_limites, recomendacao, concordou_recomendacao,
--       verificacao { beneficiario_ouvido, problema_ouvido, apostas_declaradas, caminho },
--       assumida_em.
--
-- Gate de passagem do M6 (sem número para a mentorada; 'passagem_m6' no banco):
-- impedem a passagem — beneficiário fora de quem foi ouvido, problema diferente
-- do ouvido, aposta importante não declarada (e direção que virou formato, T6.6).
-- A Karen verifica; quem assume é ela.
--
-- Pode ser colado no SQL Editor mais de uma vez: não apaga dados.
-- =====================================================================

create or replace function public.assumir_oportunidade(p_registro uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o         public.registro;
  c         jsonb;   -- conteudo (dela)
  m         jsonb;   -- conteudo_mentora
  v_mentora uuid;
  v_item    text;
  it        jsonb;
  v_falhas  text[] := '{}';
begin
  select * into o from public.registro where id = p_registro for update;
  if o.id is null or o.tipo <> 'oportunidade' or not public.eh_mentora_ativa(o.jornada_id) then
    raise exception 'Oportunidade não encontrada.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = o.jornada_id and codigo = 6 and estado = 'aberto') then
    raise exception 'O M6 não está aberto.';
  end if;

  c := o.conteudo;
  m := o.conteudo_mentora;

  -- Completo: os seis passos e a pergunta transversal.
  foreach v_item in array array['beneficiario','problema','contexto','momento','desejo','destino','direcao','comprador'] loop
    it := c -> 'itens' -> v_item;
    if it is null or coalesce(it ->> 'escolha', '') not in ('mantenho', 'ajusto', 'escrito', 'sem_material') then
      raise exception 'Falta responder um dos seis passos.';
    end if;
    if it ->> 'escolha' in ('ajusto', 'escrito') and nullif(trim(it ->> 'valor'), '') is null
       and v_item <> 'comprador' then
      raise exception 'Uma definição está sem texto.';
    end if;
  end loop;
  if c #>> '{itens,beneficiario,escolha}' = 'ajusto' and nullif(c #>> '{itens,beneficiario,conversa}', '') is null then
    raise exception 'O beneficiário foi ajustado: falta apontar a conversa que mostrou isso.';
  end if;
  if c #>> '{itens,comprador,escolha}' <> 'sem_material'
     and (coalesce(c #>> '{itens,comprador,tipo}', '') not in ('mesma', 'outra')
          or nullif(trim(c #>> '{itens,comprador,porque}'), '') is null
          or (c #>> '{itens,comprador,tipo}' = 'outra' and nullif(trim(c #>> '{itens,comprador,quem}'), '') is null)) then
    raise exception 'O comprador pretendido está incompleto.';
  end if;
  if nullif(trim(c ->> 'transversal'), '') is null then
    raise exception 'Falta a resposta “o que você manteve e o que o campo te fez mudar?”.';
  end if;

  -- O que a Karen registra na call.
  if jsonb_array_length(coalesce(m -> 'limites', '[]'::jsonb)) = 0
     or not exists (select 1 from jsonb_array_elements_text(m -> 'limites') x where trim(x) <> '') then
    raise exception 'Registre o que a oferta não poderá prometer.';
  end if;
  if coalesce((m ->> 'concorda_limites')::boolean, false) is not true then
    raise exception 'Ela precisa concordar com os limites (ou ajustá-los com você).';
  end if;

  -- Condições que impedem a passagem.
  if coalesce((m #>> '{verificacao,beneficiario_ouvido}')::boolean, false) is not true
     or exists (select 1 from jsonb_each_text(coalesce(m -> 'niveis', '{}'::jsonb)) n
                where n.key = 'beneficiario' and n.value = '3') then
    v_falhas := array_append(v_falhas, 'beneficiário fora de quem foi ouvido');
  end if;
  if coalesce((m #>> '{verificacao,problema_ouvido}')::boolean, false) is not true
     or exists (select 1 from jsonb_each_text(coalesce(m -> 'niveis', '{}'::jsonb)) n
                where n.key = 'problema' and n.value = '3') then
    v_falhas := array_append(v_falhas, 'problema diferente do ouvido');
  end if;
  if coalesce((m #>> '{verificacao,apostas_declaradas}')::boolean, false) is not true then
    v_falhas := array_append(v_falhas, 'aposta importante não declarada');
  end if;
  if coalesce((m #>> '{verificacao,caminho}')::boolean, false) is not true then
    v_falhas := array_append(v_falhas, 'direção da solução virou formato, preço ou ferramenta');
  end if;

  select mentora_id into v_mentora from public.mentoria where jornada_id = o.jornada_id;

  if array_length(v_falhas, 1) > 0 then
    insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                      condicoes, encaminhamento, decisao_id, verificado_por)
    values (o.jornada_id, 6, 'passagem_m6', 'nao_passou',
            (select jsonb_agg(jsonb_build_object('condicao', f, 'atendida', false)) from unnest(v_falhas) f),
            'ajustar na call: ' || array_to_string(v_falhas, '; '), o.id, v_mentora);
    return 'nao_passou';
  end if;

  update public.registro
     set conteudo_mentora = conteudo_mentora || jsonb_build_object('assumida_em', now())
   where id = o.id;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (o.jornada_id, 6, 'passagem_m6', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'beneficiário dentro de quem foi ouvido', 'atendida', true),
            jsonb_build_object('condicao', 'problema é o que foi ouvido', 'atendida', true),
            jsonb_build_object('condicao', 'apostas importantes declaradas', 'atendida', true),
            jsonb_build_object('condicao', 'direção é caminho, não formato', 'atendida', true)),
          o.id, v_mentora);

  perform public.fechar_movimento(o.jornada_id, 6::smallint);
  return 'passou';
end $$;

revoke all on function public.assumir_oportunidade(uuid) from public, anon;
grant execute on function public.assumir_oportunidade(uuid) to authenticated;
