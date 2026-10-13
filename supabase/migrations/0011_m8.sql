-- =====================================================================
-- Workspace MEM · V1 · 0011 — M8 · Preparar para o Mercado (Calls 7 e 8)
--
-- Registro novo:
--   preparo — um por jornada, autora a mentorada (movimento 8).
--     conteudo.promessa  = { texto, cumprimento ('sim'|'so_se'|'depende'), origem ('contida'|'acrescenta') }
--     conteudo.abordagem = { texto, mecanismo, nome }
--     conteudo.resumo    — apresentação escrita (montada a partir do que já foi decidido; ela ajusta)
--     conteudo.falada    = { ensaiada_em }
--     conteudo.rota      = { tipo ('conversa'|'mensagem'|'grupo'|'pagina'), porque }
--     conteudo.caminho   = { interesse, aceite, pagamento, inicio: { como, percorrido } }
--     conteudo_mentora: objecoes [{ texto, origem, resposta }], ajustes [{ nivel, o_que, razao }],
--       hipoteses [texto], recomendacoes [{ texto, concordou }],
--       verificacao { compreensao, contencao, caminho, continuidade, proporcionalidade },
--       handoff { materiais, decidir_no_m9 }, assumida_em.
--
-- Gate 6: a Karen verifica no ensaio da Call 8; quem assume é ela.
-- Pode ser colado no SQL Editor mais de uma vez: não apaga dados.
-- =====================================================================

create or replace function public.assumir_preparo(p_registro uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o         public.registro;
  c         jsonb;
  m         jsonb;
  v_mentora uuid;
  v_passo   text;
  v_k       text;
  v_falhas  text[] := '{}';
  ob        jsonb;
begin
  select * into o from public.registro where id = p_registro for update;
  if o.id is null or o.tipo <> 'preparo' or not public.eh_mentora_ativa(o.jornada_id) then
    raise exception 'Preparação não encontrada.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = o.jornada_id and codigo = 8 and estado = 'aberto') then
    raise exception 'O M8 não está aberto.';
  end if;
  c := o.conteudo;
  m := o.conteudo_mentora;

  if nullif(trim(c #>> '{promessa,texto}'), '') is null then
    raise exception 'Falta a promessa.';
  end if;
  if nullif(trim(c #>> '{abordagem,texto}'), '') is null then
    raise exception 'Falta o “por que esta abordagem”.';
  end if;
  if nullif(trim(c ->> 'resumo'), '') is null then
    raise exception 'Falta a apresentação escrita.';
  end if;
  if nullif(c #>> '{falada,ensaiada_em}', '') is null then
    raise exception 'A apresentação falada ainda não foi ensaiada.';
  end if;
  if coalesce(c #>> '{rota,tipo}', '') not in ('conversa', 'mensagem', 'grupo', 'pagina')
     or nullif(trim(c #>> '{rota,porque}'), '') is null then
    raise exception 'Falta a rota inicial e o porquê.';
  end if;
  foreach v_passo in array array['interesse', 'aceite', 'pagamento', 'inicio'] loop
    if nullif(trim(c #>> array['caminho', v_passo, 'como']), '') is null then
      raise exception 'Falta descrever um dos quatro passos do caminho.';
    end if;
  end loop;
  if jsonb_array_length(coalesce(m -> 'objecoes', '[]'::jsonb)) > 3 then
    raise exception 'No máximo três objeções previsíveis.';
  end if;
  for ob in select * from jsonb_array_elements(coalesce(m -> 'objecoes', '[]'::jsonb)) loop
    if nullif(trim(ob ->> 'texto'), '') is not null and nullif(trim(ob ->> 'origem'), '') is null then
      raise exception 'Cada objeção precisa de origem (o que o mercado mostrou ou o ensaio).';
    end if;
  end loop;

  -- Bloqueios do Gate 6.
  foreach v_passo in array array['interesse', 'aceite', 'pagamento', 'inicio'] loop
    if coalesce((c #>> array['caminho', v_passo, 'percorrido'])::boolean, false) is not true then
      v_falhas := array_append(v_falhas, 'passo “' || v_passo || '” do caminho não percorrido');
    end if;
  end loop;
  foreach v_k in array array['compreensao', 'contencao', 'caminho', 'continuidade', 'proporcionalidade'] loop
    if coalesce((m #>> array['verificacao', v_k])::boolean, false) is not true then
      v_falhas := array_append(v_falhas, case v_k
        when 'compreensao' then 'apresentação incompreensível para alguém de fora'
        when 'contencao' then 'promessa maior que a entrega'
        when 'caminho' then 'caminho com improviso'
        when 'continuidade' then 'oferta diferente da do M7 sem razão registrada'
        else 'rota convida mais gente do que a capacidade comporta' end);
    end if;
  end loop;

  select mentora_id into v_mentora from public.mentoria where jornada_id = o.jornada_id;

  if array_length(v_falhas, 1) > 0 then
    insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                      condicoes, encaminhamento, decisao_id, verificado_por)
    values (o.jornada_id, 8, 'gate_6', 'nao_passou',
            (select jsonb_agg(jsonb_build_object('condicao', f, 'atendida', false)) from unnest(v_falhas) f),
            'ajustar antes do teste: ' || array_to_string(v_falhas, '; '), o.id, v_mentora);
    return 'nao_passou';
  end if;

  update public.registro
     set conteudo_mentora = conteudo_mentora || jsonb_build_object('assumida_em', now())
   where id = o.id;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (o.jornada_id, 8, 'gate_6', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'compreensível sem o vocabulário do MEM', 'atendida', true),
            jsonb_build_object('condicao', 'promessa contida na entrega', 'atendida', true),
            jsonb_build_object('condicao', 'quatro passos disponíveis e percorridos', 'atendida', true),
            jsonb_build_object('condicao', 'continuidade com o M7', 'atendida', true),
            jsonb_build_object('condicao', 'proporcional à capacidade', 'atendida', true)),
          o.id, v_mentora);

  perform public.fechar_movimento(o.jornada_id, 8::smallint);
  return 'passou';
end $$;

revoke all on function public.assumir_preparo(uuid) from public, anon;
grant execute on function public.assumir_preparo(uuid) to authenticated;
