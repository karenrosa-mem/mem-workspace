-- =====================================================================
-- Workspace MEM · V1 · 0008 — M5 · Escolher onde apostar
--
-- Registros novos (tabelas do núcleo):
--   comparacao      — um por jornada, autora a mentorada (movimento 5).
--                     conteudo.criterios.<peso|repete|dinheiro|desejada|testar>
--                       = { escolha: <id da hipótese> | 'empatam' | 'nao_da', porque, em }
--                     conteudo.para_voce.<id da hipótese>
--                       = 'sim_quero' | 'sem_vontade' | 'nao_sei' | 'nao'
--                     conteudo_mentora.conversa_feita.<id da hipótese> = true
--                     Ela compara antes da Call 4 (o M5 ainda não abriu);
--                     leituras sobre uma frente retirada ficam guardadas.
--   decisao_m5      — a aposta, registrada pela Karen na Call 4 (2ª parte).
--                     conteudo_mentora: aposta, reserva, reserva_condicao,
--                     recomendacao { aposta, reserva, texto }, porque,
--                     razao_estrategica, condicao_revisao, exigir_estrategica,
--                     nao_sabemos [texto], fora [{ hipotese, razao, condicao_volta }].
--                     conteudo.porque: ela pode ajustar com as palavras dela.
--   investigacao_m5 — empate sem saída: "voltamos ao campo só para entender
--                     [critério]". Gate 4 fica "não passou". Conversas novas
--                     entram na frente com movimento_codigo 5.
--
-- Pode ser colado no SQL Editor mais de uma vez: não apaga dados.
-- =====================================================================

create or replace function public.registrar_aposta_m5(p_decisao uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d          public.registro;
  c          jsonb;   -- conteudo_mentora da decisão
  v_comp     public.registro;
  v_mentora  uuid;
  v_aposta   text;
  v_reserva  text;
  v_rec      text;
  v_resp     text;
  v_comparadas text[];
  v_h        text;
  item       jsonb;
begin
  select * into d from public.registro where id = p_decisao for update;
  if d.id is null or d.tipo <> 'decisao_m5' or not public.eh_mentora_ativa(d.jornada_id) then
    raise exception 'Decisão não encontrada.';
  end if;
  if not d.pendente_publicacao then
    raise exception 'Esta aposta já foi registrada.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = d.jornada_id and codigo = 5 and estado = 'aberto') then
    raise exception 'O M5 abre quando a decisão do M4 é registrada.';
  end if;

  c         := d.conteudo_mentora;
  v_aposta  := nullif(c ->> 'aposta', '');
  v_reserva := nullif(c ->> 'reserva', '');
  v_rec     := nullif(c #>> '{recomendacao,aposta}', '');
  select * into v_comp from public.registro
   where jornada_id = d.jornada_id and tipo = 'comparacao' order by criado_em limit 1;

  -- Só entra quem chegou pelo critério do M4.
  v_comparadas := array(
    select f.origem_id::text from public.registro f
     where f.jornada_id = d.jornada_id and f.tipo = 'frente'
       and f.conteudo_mentora ->> 'resultado' = 'segue');

  if v_aposta is null or not (v_aposta = any(v_comparadas)) then
    raise exception 'Escolha onde apostar entre as hipóteses que seguiram para comparação.';
  end if;

  v_resp := v_comp.conteudo #>> array['para_voce', v_aposta];
  if v_resp is null then
    raise exception 'Ela ainda não respondeu “é para você?” sobre esta hipótese.';
  end if;
  if v_resp = 'nao' then
    raise exception 'Ela respondeu que esta hipótese não é para ela. Não pode ser a aposta.';
  end if;
  if v_resp in ('sem_vontade', 'nao_sei')
     and coalesce(v_comp.conteudo_mentora #>> array['conversa_feita', v_aposta], 'false') <> 'true' then
    raise exception 'Marque a conversa sobre “é para você?” como feita antes de registrar.';
  end if;

  if nullif(trim(c ->> 'porque'), '') is null then
    raise exception 'Registre por que esta, agora, nas palavras dela.';
  end if;
  if v_rec is null then
    raise exception 'Registre a sua recomendação, concordando ou não.';
  end if;
  if (v_rec <> v_aposta or coalesce((c ->> 'exigir_estrategica')::boolean, false))
     and (nullif(trim(c ->> 'razao_estrategica'), '') is null
          or nullif(trim(c ->> 'condicao_revisao'), '') is null) then
    raise exception 'A escolha pede razão estratégica e condição de revisão.';
  end if;
  if jsonb_array_length(coalesce(c -> 'nao_sabemos', '[]'::jsonb)) = 0
     or not exists (select 1 from jsonb_array_elements_text(c -> 'nao_sabemos') x where trim(x) <> '') then
    raise exception 'Registre o que ainda não sabemos.';
  end if;

  if v_reserva is not null then
    if v_reserva = v_aposta or not (v_reserva = any(v_comparadas)) then
      raise exception 'A reserva precisa ser outra hipótese comparada.';
    end if;
    if v_comp.conteudo #>> array['para_voce', v_reserva] = 'nao' then
      raise exception 'Ela respondeu que a reserva não é para ela.';
    end if;
    if nullif(trim(c ->> 'reserva_condicao'), '') is null then
      raise exception 'Escreva em que condição a reserva entra.';
    end if;
  end if;

  foreach v_h in array v_comparadas loop
    continue when v_h = v_aposta or v_h is not distinct from v_reserva;
    item := null;
    select x into item from jsonb_array_elements(coalesce(c -> 'fora', '[]'::jsonb)) x
     where x ->> 'hipotese' = v_h limit 1;
    if item is null or nullif(trim(item ->> 'razao'), '') is null
       or nullif(trim(item ->> 'condicao_volta'), '') is null then
      raise exception 'Cada hipótese que fica de fora precisa de razão e condição para voltar.';
    end if;
  end loop;

  update public.registro
     set conteudo_mentora = conteudo_mentora || jsonb_build_object('concordou', v_rec = v_aposta),
         pendente_publicacao = false
   where id = d.id;

  select mentora_id into v_mentora from public.mentoria where jornada_id = d.jornada_id;
  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, decisao_id, verificado_por)
  values (d.jornada_id, 5, 'gate_4', 'passou',
          jsonb_build_array(
            jsonb_build_object('condicao', 'a aposta chegou pelo critério do M4', 'atendida', true),
            jsonb_build_object('condicao', '“é para você?” não é “não”; dúvida conversada', 'atendida', true),
            jsonb_build_object('condicao', 'porquê escrito; razão estratégica quando exigida', 'atendida', true),
            jsonb_build_object('condicao', 'o que ainda não sabemos registrado', 'atendida', true),
            jsonb_build_object('condicao', 'recomendação da Karen registrada', 'atendida', true)),
          d.id, v_mentora);

  perform public.fechar_movimento(d.jornada_id, 5::smallint);

  -- O porquê continua dela: pode ajustar com as próprias palavras.
  update public.registro set estado_edicao = 'aberto' where id = d.id;
end $$;

-- Empate que não se resolve nem por "dá para testar logo?".
create or replace function public.registrar_investigacao_m5(p_jornada uuid, p_criterio text, p_texto text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_mentora uuid;
  v_conta   uuid;
  v_reg     uuid;
begin
  if not public.eh_mentora_ativa(p_jornada) then
    raise exception 'Jornada não encontrada.';
  end if;
  if not exists (select 1 from public.movimento
                 where jornada_id = p_jornada and codigo = 5 and estado = 'aberto') then
    raise exception 'O M5 não está aberto.';
  end if;
  if p_criterio not in ('peso', 'repete', 'dinheiro', 'desejada', 'testar') then
    raise exception 'Critério desconhecido.';
  end if;
  if nullif(trim(p_texto), '') is null then
    raise exception 'Escreva o que ela vai investigar.';
  end if;
  if exists (select 1 from public.registro where jornada_id = p_jornada and tipo = 'investigacao_m5'
             and coalesce(conteudo_mentora ->> 'encerrada', 'false') <> 'true') then
    raise exception 'Já existe uma investigação curta em andamento.';
  end if;

  select conta_id into v_conta from public.jornada where id = p_jornada;
  select mentora_id into v_mentora from public.mentoria where jornada_id = p_jornada;

  insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora,
                               autora_papel, autora_id)
  values (v_conta, p_jornada, 5, 'investigacao_m5',
          jsonb_build_object('criterio', p_criterio, 'texto', trim(p_texto)),
          'mentora', auth.uid())
  returning id into v_reg;

  insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado,
                                    condicoes, encaminhamento, decisao_id, verificado_por)
  values (p_jornada, 5, 'gate_4', 'nao_passou',
          jsonb_build_array(jsonb_build_object('condicao', 'empate resolvido', 'atendida', false)),
          'voltamos ao campo só para entender: ' || trim(p_texto), v_reg, v_mentora);

  return v_reg;
end $$;

revoke all on function public.registrar_aposta_m5(uuid) from public, anon;
revoke all on function public.registrar_investigacao_m5(uuid, text, text) from public, anon;
grant execute on function public.registrar_aposta_m5(uuid),
                          public.registrar_investigacao_m5(uuid, text, text)
  to authenticated;
