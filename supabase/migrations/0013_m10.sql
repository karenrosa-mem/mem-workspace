-- =====================================================================
-- Workspace MEM · V1 · 0013 — M10 · Aprender e Decidir (Call 10)
--
-- Registro novo:
--   decisao_m10 — um por jornada, autora a mentorada (movimento 10).
--     conteudo: aconteceu, sugere, aprendi [{ texto, muda }], decisao, porque, nao_sabe,
--       revisao, estatuto ('validada'|'fortalecida'|'enfraquecida'|'nao_testada'),
--       retorno { para, o_que }, investigacao { pergunta, hipotese, evidencia, limite },
--       historico { acreditava, aconteceu, acredita }, ativo { criterio, status },
--       plano { acao, pergunta, evidencia, revisitar }, reflexao.
--     conteudo_mentora: reserva { atingida, evidencia }, comprador { sustenta, contradiz, desconhecido },
--       ativo { criterio_aceito, criterio_em, status }, termos { t1..t5 }, parte_a { a1..a6 },
--       capacidades { reconstruir|distinguir|justificar|proximo: { demonstrada, perguntas [{texto, tipo}], faltou } },
--       leitura_final, estatuto_registrado, discordancia_estatuto, status_jornada, gate_em, conversa_em.
--
-- Gate 8: parte A (qualidade da decisão) e parte B (autonomia), registradas separadamente.
-- "Validada para continuar sob as condições testadas" só com Gate 7 favorável e os cinco
-- termos verificados pela Karen; senão o estatuto registrado é "fortalecida, não validada".
-- Pode ser colado no SQL Editor mais de uma vez: não apaga dados.
-- =====================================================================

create or replace function public.m10_status_jornada(p_cap jsonb) returns text
language sql immutable set search_path = '' as $$
  select case
    when n = 4 then 'demonstrada'
    when n = 0 then 'nao_demonstrada'
    else 'parcial' end
  from (select count(*) filter (where coalesce((p_cap -> k ->> 'demonstrada')::boolean, false)) as n
          from unnest(array['reconstruir','distinguir','justificar','proximo']) k) x;
$$;

create or replace function public.registrar_gate8(p_registro uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o         public.registro;
  c         jsonb;
  m         jsonb;
  v_mentora uuid;
  v_dec     text;
  v_est     text;
  v_falhas  text[] := '{}';
  v_k       text;
  v_g7      text;
  v_status  text;
begin
  select * into o from public.registro where id = p_registro for update;
  if o.id is null or o.tipo <> 'decisao_m10' or not public.eh_mentora_ativa(o.jornada_id) then
    raise exception 'Decisão não encontrada.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = o.jornada_id and codigo = 10 and estado = 'aberto') then
    raise exception 'O M10 não está aberto.';
  end if;
  c := o.conteudo;
  m := o.conteudo_mentora;
  v_dec := c ->> 'decisao';
  v_est := c ->> 'estatuto';

  -- As quatro perguntas, a decisão e o plano.
  if nullif(trim(c ->> 'aconteceu'), '') is null or nullif(trim(c ->> 'sugere'), '') is null then
    raise exception 'Faltam “o que aconteceu” e “o que isso sugere”.';
  end if;
  if not exists (select 1 from jsonb_array_elements(coalesce(c -> 'aprendi', '[]'::jsonb)) a
                 where nullif(trim(a ->> 'texto'), '') is not null and nullif(trim(a ->> 'muda'), '') is not null) then
    raise exception 'Falta pelo menos um aprendizado, com o que ele muda.';
  end if;
  if coalesce(v_dec, '') not in ('continuar', 'ajustar', 'investigar', 'retornar', 'abandonar') then
    raise exception 'Falta a decisão.';
  end if;
  if nullif(trim(c ->> 'porque'), '') is null or nullif(trim(c ->> 'nao_sabe'), '') is null
     or nullif(trim(c ->> 'revisao'), '') is null then
    raise exception 'A decisão precisa de fundamento, do que ainda não se sabe e da condição de revisão.';
  end if;
  if v_dec in ('ajustar', 'retornar') and (nullif(c #>> '{retorno,para}', '') is null or nullif(trim(c #>> '{retorno,o_que}'), '') is null) then
    raise exception 'Defina o menor retorno: para onde e o quê.';
  end if;
  if v_dec = 'investigar' and (nullif(trim(c #>> '{investigacao,pergunta}'), '') is null
       or nullif(trim(c #>> '{investigacao,evidencia}'), '') is null or nullif(trim(c #>> '{investigacao,limite}'), '') is null) then
    raise exception 'A investigação precisa de pergunta, evidência necessária e limite.';
  end if;
  if coalesce(v_est, '') not in ('validada', 'fortalecida', 'enfraquecida', 'nao_testada') then
    raise exception 'Falta o estatuto da hipótese comercial.';
  end if;
  if nullif(trim(c #>> '{plano,acao}'), '') is null or nullif(trim(c #>> '{plano,pergunta}'), '') is null
     or nullif(c #>> '{plano,revisitar}', '') is null then
    raise exception 'O plano de continuidade precisa da próxima ação, da próxima pergunta e de quando revisitar.';
  end if;

  -- Validação: só com Gate 7 favorável e os cinco termos verificados; senão, "fortalecida".
  select g.condicoes -> -1 ->> 'condicao' into v_g7 from public.gate_registro g
   where g.jornada_id = o.jornada_id and g.identificacao = 'gate_7' and g.resultado = 'passou'
   order by g.registrado_em desc limit 1;
  if v_est = 'validada' then
    if coalesce(v_g7, '') <> 'leitura: favoravel'
       or exists (select 1 from unnest(array['t1','t2','t3','t4','t5']) k
                  where coalesce((m #>> array['termos', k])::boolean, false) is not true) then
      v_est := 'fortalecida';
      m := m || jsonb_build_object('discordancia_estatuto',
             coalesce(nullif(trim(m ->> 'discordancia_estatuto'), ''), 'Os termos da validação não foram todos atendidos.'));
    end if;
  end if;

  -- Combinações incoerentes.
  if v_est = 'validada' and v_dec in ('retornar', 'investigar') then
    raise exception 'Validada não combina com retornar nem com investigar.';
  end if;

  -- Parte A (qualidade da decisão).
  foreach v_k in array array['a1','a2','a3','a4','a5','a6'] loop
    if coalesce((m #>> array['parte_a', v_k])::boolean, false) is not true then
      v_falhas := array_append(v_falhas, case v_k
        when 'a1' then 'evidência interpretada sem limites claros'
        when 'a2' then 'conclusões que sustentam a decisão não classificadas'
        when 'a3' then 'hipóteses fortalecidas, enfraquecidas e desconhecidos não identificados'
        when 'a4' then 'decisão desproporcional à evidência'
        when 'a5' then 'reserva, comprador e ativo não considerados'
        else 'opinião tratada como comportamento ou evidência contrária ignorada' end);
    end if;
  end loop;
  -- Parte B: cada capacidade marcada como demonstrada ou não.
  foreach v_k in array array['reconstruir','distinguir','justificar','proximo'] loop
    if (m -> 'capacidades' -> v_k ->> 'demonstrada') is null then
      raise exception 'Marque se cada uma das quatro capacidades foi demonstrada.';
    end if;
  end loop;

  select mentora_id into v_mentora from public.mentoria where jornada_id = o.jornada_id;

  if array_length(v_falhas, 1) > 0 then
    insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                      condicoes, encaminhamento, decisao_id, verificado_por)
    values (o.jornada_id, 10, 'gate_8', 'nao_passou',
            (select jsonb_agg(jsonb_build_object('condicao', f, 'atendida', false)) from unnest(v_falhas) f),
            'rever na call: ' || array_to_string(v_falhas, '; '), o.id, v_mentora);
    return 'nao_passou';
  end if;

  v_status := public.m10_status_jornada(m -> 'capacidades');

  update public.registro
     set conteudo_mentora = m || jsonb_build_object('gate_em', now(), 'estatuto_registrado', v_est, 'status_jornada', v_status)
   where id = o.id;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (o.jornada_id, 10, 'gate_8', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'parte A: decisão ' || v_dec || ', estatuto ' || v_est, 'atendida', true),
            jsonb_build_object('condicao', 'parte B: autonomia ' || v_status, 'atendida', v_status = 'demonstrada')),
          o.id, v_mentora);

  perform public.fechar_movimento(o.jornada_id, 10::smallint);
  update public.jornada
     set estado = 'concluida', encerrada_em = now(), status_autonomia = v_status::public.status_autonomia
   where id = o.jornada_id;
  return 'passou';
end $$;

-- Conversa de fechamento excepcional: uma vez, até 14 dias depois da Call 10,
-- só nas capacidades que não foram demonstradas.
create or replace function public.registrar_conversa_fechamento(p_registro uuid, p_capacidades jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o        public.registro;
  m        jsonb;
  v_k      text;
  v_cap    jsonb;
  v_status text;
begin
  select * into o from public.registro where id = p_registro for update;
  if o.id is null or o.tipo <> 'decisao_m10' or not public.eh_mentora_ativa(o.jornada_id) then
    raise exception 'Decisão não encontrada.';
  end if;
  m := o.conteudo_mentora;
  if m ->> 'gate_em' is null then
    raise exception 'A conversa de fechamento só acontece depois do Gate 8.';
  end if;
  if m ->> 'conversa_em' is not null then
    raise exception 'A conversa de fechamento já aconteceu.';
  end if;
  if m ->> 'status_jornada' = 'demonstrada' then
    raise exception 'A autonomia já foi demonstrada.';
  end if;
  if now() > (m ->> 'gate_em')::timestamptz + interval '14 days' then
    raise exception 'O prazo de 14 dias depois da Call 10 terminou.';
  end if;

  v_cap := m -> 'capacidades';
  foreach v_k in array array['reconstruir','distinguir','justificar','proximo'] loop
    if not coalesce((v_cap -> v_k ->> 'demonstrada')::boolean, false) and p_capacidades ? v_k then
      v_cap := jsonb_set(v_cap, array[v_k], (v_cap -> v_k) || (p_capacidades -> v_k) || jsonb_build_object('na_conversa', true));
    end if;
  end loop;
  v_status := public.m10_status_jornada(v_cap);

  update public.registro
     set conteudo_mentora = m || jsonb_build_object('capacidades', v_cap, 'status_jornada', v_status, 'conversa_em', now())
   where id = o.id;
  update public.jornada set status_autonomia = v_status::public.status_autonomia where id = o.jornada_id;
  return v_status;
end $$;

revoke all on function public.registrar_gate8(uuid) from public, anon;
revoke all on function public.registrar_conversa_fechamento(uuid, jsonb) from public, anon;
grant execute on function public.registrar_gate8(uuid), public.registrar_conversa_fechamento(uuid, jsonb) to authenticated;
