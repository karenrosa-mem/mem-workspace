-- =====================================================================
-- Workspace MEM · V1 · 0010 — M7 · Desenhar a Oferta
--
-- Registro novo:
--   oferta — um por jornada, autora a mentorada (movimento 7). Nada vem preenchido.
--     conteudo.entrega    = { texto, cobre, fora }
--     conteudo.como       = { etapas [texto], diferencial, competencia { <índice>: { qual, ja_fez } } }
--     conteudo.forma      = { texto, porque, inclui, exclui }
--     conteudo.capacidade = { horas_semana, horas_cliente, limites, pronto_antes }
--     conteudo.preco      = { valor (número), condicao, racional }
--     conteudo.transversal, conteudo.anotacoes_m8
--     conteudo_mentora: competencia { <índice>: { limite, observacao } }, hipoteses [texto],
--       recomendacoes [{ texto, concordou }], verificacao { v1..v7 }, assumida_em.
--
-- Gate 5 (passagem do M7): sete verificações da Karen; quem assume é ela.
-- Pode ser colado no SQL Editor mais de uma vez: não apaga dados.
-- =====================================================================

create or replace function public.assumir_oferta(p_registro uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o         public.registro;
  c         jsonb;
  m         jsonb;
  v_mentora uuid;
  v_etapas  int;
  v_hs      numeric;
  v_hc      numeric;
  v_falhas  text[] := '{}';
  v_k       text;
  v_rotulo  text;
begin
  select * into o from public.registro where id = p_registro for update;
  if o.id is null or o.tipo <> 'oferta' or not public.eh_mentora_ativa(o.jornada_id) then
    raise exception 'Oferta não encontrada.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = o.jornada_id and codigo = 7 and estado = 'aberto') then
    raise exception 'O M7 não está aberto.';
  end if;
  c := o.conteudo;
  m := o.conteudo_mentora;

  -- As cinco decisões não aceitam "não sei".
  if nullif(trim(c #>> '{entrega,texto}'), '') is null
     or nullif(trim(c #>> '{entrega,cobre}'), '') is null
     or nullif(trim(c #>> '{entrega,fora}'), '') is null then
    raise exception 'Falta a entrega e que parte do destino ela cobre e deixa de fora.';
  end if;
  select count(*) into v_etapas from jsonb_array_elements_text(coalesce(c #> '{como,etapas}', '[]'::jsonb)) e where trim(e) <> '';
  if v_etapas < 3 or v_etapas > 5 then
    raise exception 'O como precisa de três a cinco etapas.';
  end if;
  if nullif(trim(c #>> '{como,diferencial}'), '') is null then
    raise exception 'Falta o diferencial.';
  end if;
  if nullif(trim(c #>> '{forma,texto}'), '') is null or nullif(trim(c #>> '{forma,inclui}'), '') is null then
    raise exception 'Falta a forma ou o que ela inclui.';
  end if;
  if nullif(trim(c #>> '{forma,exclui}'), '') is null then
    raise exception 'A forma precisa dizer o que não está incluído.';
  end if;
  v_hs := nullif(c #>> '{capacidade,horas_semana}', '')::numeric;
  v_hc := nullif(c #>> '{capacidade,horas_cliente}', '')::numeric;
  if v_hs is null or v_hc is null or v_hs <= 0 or v_hc <= 0 then
    raise exception 'Faltam as horas da capacidade.';
  end if;
  if nullif(trim(c #>> '{capacidade,pronto_antes}'), '') is null then
    raise exception 'Falta o que precisa estar pronto antes da primeira venda.';
  end if;
  if jsonb_typeof(c #> '{preco,valor}') <> 'number' or (c #>> '{preco,valor}')::numeric <= 0 then
    raise exception 'O preço precisa ser um valor (não uma faixa).';
  end if;
  if nullif(trim(c #>> '{preco,condicao}'), '') is null or nullif(trim(c #>> '{preco,racional}'), '') is null then
    raise exception 'Faltam a condição de pagamento ou o racional do preço.';
  end if;
  if nullif(trim(c ->> 'transversal'), '') is null then
    raise exception 'Falta a resposta “por que a sua oferta é assim, e não de outro jeito?”.';
  end if;

  -- Sete verificações (a conta de capacidade é conferida aqui também).
  if floor(v_hs / v_hc) < 1 then
    v_falhas := array_append(v_falhas, 'a conta de capacidade não fecha para um cliente');
  end if;
  foreach v_k in array array['v1','v2','v3','v4','v5','v6','v7'] loop
    if coalesce((m #>> array['verificacao', v_k])::boolean, false) is not true then
      v_rotulo := case v_k
        when 'v1' then 'não preserva a oportunidade do M6'
        when 'v2' then 'entrega fora do destino ou com promessa maior'
        when 'v3' then 'o como não produz a entrega'
        when 'v4' then 'forma não executável'
        when 'v5' then 'capacidade não fechada'
        when 'v6' then 'dependência de competência escondida ou na entrega principal'
        else 'preço, condição ou racional ausentes' end;
      v_falhas := array_append(v_falhas, v_rotulo);
    end if;
  end loop;

  select mentora_id into v_mentora from public.mentoria where jornada_id = o.jornada_id;

  if array_length(v_falhas, 1) > 0 then
    insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                      condicoes, encaminhamento, decisao_id, verificado_por)
    values (o.jornada_id, 7, 'gate_5', 'nao_passou',
            (select jsonb_agg(jsonb_build_object('condicao', f, 'atendida', false)) from unnest(v_falhas) f),
            'ajustar a oferta: ' || array_to_string(v_falhas, '; '), o.id, v_mentora);
    return 'nao_passou';
  end if;

  update public.registro
     set conteudo_mentora = conteudo_mentora || jsonb_build_object(
           'assumida_em', now(),
           'clientes_simultaneos', floor(v_hs / v_hc))
   where id = o.id;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (o.jornada_id, 7, 'gate_5', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'preserva a oportunidade', 'atendida', true),
            jsonb_build_object('condicao', 'entrega contida no destino', 'atendida', true),
            jsonb_build_object('condicao', 'o como produz a entrega', 'atendida', true),
            jsonb_build_object('condicao', 'forma executável', 'atendida', true),
            jsonb_build_object('condicao', 'capacidade fechada para pelo menos um cliente', 'atendida', true),
            jsonb_build_object('condicao', 'dependências de competência explicitadas', 'atendida', true),
            jsonb_build_object('condicao', 'preço inicial, condição e racional', 'atendida', true)),
          o.id, v_mentora);

  perform public.fechar_movimento(o.jornada_id, 7::smallint);
  return 'passou';
end $$;

revoke all on function public.assumir_oferta(uuid) from public, anon;
grant execute on function public.assumir_oferta(uuid) to authenticated;
