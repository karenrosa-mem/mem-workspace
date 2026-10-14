-- =====================================================================
-- Workspace MEM · V1 · 0012 — M9 · Teste Comercial (Call 9)
--
-- Registros novos (movimento 9, autora a mentorada):
--   teste      — um por jornada. Registro metodológico, não CRM (sem nomes).
--     conteudo.desenho      = { fonte, proximas, inicio, fim }
--     conteudo.contagem     = { <rota>: { tentados, alcancados } }
--     conteudo.mudancas     = [{ tipo, o_que, em }]
--     conteudo.encerramento = { criterio, em }
--     conteudo.leitura      = { variaveis { <var>: texto }, geral, sintese, limites, abertas }
--     conteudo_mentora: conferencia { texto, em }, revisao { texto, em },
--       leitura_karen { geral, porque }, verificacao { v1..v6 }, gate_em.
--   exposicao  — uma por exposição qualificada; origem_id = teste.
--     conteudo = { perfil, compativel, proxima, rota, comportamento, ponto, motivo, fala,
--                  preco, retomadas, comprador, entrega }
--
-- Gate 7: ela propõe a leitura; a Karen verifica. Leitura inconclusiva passa.
-- "Validada" nunca aparece aqui: é decisão do M10.
-- Pode ser colado no SQL Editor mais de uma vez: não apaga dados.
-- =====================================================================

create or replace function public.registrar_gate7(p_teste uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o         public.registro;
  c         jsonb;
  m         jsonb;
  v_mentora uuid;
  v_k       text;
  v_falhas  text[] := '{}';
  v_geral   text;
begin
  select * into o from public.registro where id = p_teste for update;
  if o.id is null or o.tipo <> 'teste' or not public.eh_mentora_ativa(o.jornada_id) then
    raise exception 'Teste não encontrado.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = o.jornada_id and codigo = 9 and estado = 'aberto') then
    raise exception 'O M9 não está aberto.';
  end if;
  c := o.conteudo;
  m := o.conteudo_mentora;
  v_geral := c #>> '{leitura,geral}';

  if coalesce(c #>> '{encerramento,criterio}', '') not in ('suficiencia', 'capacidade', 'teto', 'janela', 'interrupcao') then
    raise exception 'O teste ainda não terminou por um critério de fim.';
  end if;
  if coalesce(v_geral, '') not in ('favoravel', 'parcial', 'inconclusiva', 'desfavoravel') then
    raise exception 'Falta a leitura proposta por ela.';
  end if;
  if nullif(trim(c #>> '{leitura,sintese}'), '') is null or nullif(trim(c #>> '{leitura,limites}'), '') is null then
    raise exception 'A leitura precisa dizer quais variáveis a sustentam e o que não permite dizer.';
  end if;
  if m ? 'leitura_karen' and nullif(m #>> '{leitura_karen,geral}', '') is not null
     and m #>> '{leitura_karen,geral}' <> v_geral
     and nullif(trim(m #>> '{leitura_karen,porque}'), '') is null then
    raise exception 'Se a sua leitura é diferente da dela, escreva o porquê.';
  end if;

  foreach v_k in array array['v1','v2','v3','v4','v5','v6'] loop
    if coalesce((m #>> array['verificacao', v_k])::boolean, false) is not true then
      v_falhas := array_append(v_falhas, case v_k
        when 'v1' then 'teste sem critério de fim'
        when 'v2' then 'exposições sem registro ou registradas de memória'
        when 'v3' then 'contatos e pessoas alcançadas não contados por rota'
        when 'v4' then 'mudança relevante sem ponto de corte'
        when 'v5' then 'evidência não organizada por variável'
        else 'leitura sem base nas regras' end);
    end if;
  end loop;

  select mentora_id into v_mentora from public.mentoria where jornada_id = o.jornada_id;

  if array_length(v_falhas, 1) > 0 then
    insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                      condicoes, encaminhamento, decisao_id, verificado_por)
    values (o.jornada_id, 9, 'gate_7', 'nao_passou',
            (select jsonb_agg(jsonb_build_object('condicao', f, 'atendida', false)) from unnest(v_falhas) f),
            'completar o registro: ' || array_to_string(v_falhas, '; '), o.id, v_mentora);
    return 'nao_passou';
  end if;

  update public.registro
     set conteudo_mentora = conteudo_mentora || jsonb_build_object('gate_em', now(), 'leitura_registrada', v_geral)
   where id = o.id;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (o.jornada_id, 9, 'gate_7', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'teste encerrado por critério de fim', 'atendida', true),
            jsonb_build_object('condicao', 'exposições registradas', 'atendida', true),
            jsonb_build_object('condicao', 'acesso contado por rota', 'atendida', true),
            jsonb_build_object('condicao', 'mudanças com ponto de corte', 'atendida', true),
            jsonb_build_object('condicao', 'evidência por variável', 'atendida', true),
            jsonb_build_object('condicao', 'leitura: ' || v_geral, 'atendida', true)),
          o.id, v_mentora);

  perform public.fechar_movimento(o.jornada_id, 9::smallint);
  return 'passou';
end $$;

revoke all on function public.registrar_gate7(uuid) from public, anon;
grant execute on function public.registrar_gate7(uuid) to authenticated;
