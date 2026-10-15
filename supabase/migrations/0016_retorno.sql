-- =====================================================================
-- Workspace MEM · V1 · 0016 — Retorno único no M6 (decisões de 09/10 e 15/10)
--
-- Na Call 5, se uma mudança é de nível 3 (pessoa ou problema que não foi
-- ouvido) ou a condição da reserva foi atingida, a mentorada decide voltar,
-- com recomendação explícita da Karen. Um único retorno por jornada:
--   · reserva: a aposta passa a ser a reserva do M5; ela refaz a oportunidade;
--   · campo:   ela volta a ouvir pessoas, registrando as conversas no M6.
-- Ela tem uma semana; a decisão da oportunidade é refeita por escrito, sem
-- call (a Karen registra com assumir_oportunidade). As Calls 6 a 10 andam
-- uma semana e o retorno consome 7 dias de folga; sem folga, não há retorno.
-- Registro novo: "retorno" (autora a mentora, movimento 6).
-- Pode ser colado no SQL Editor mais de uma vez.
-- =====================================================================

create or replace function public.acionar_retorno(
  p_oportunidade  uuid,
  p_caminho       text,
  p_motivo        text,
  p_recomendacao  text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  o          public.registro;
  d5         public.registro;
  v_ret      uuid;
  v_folga    integer;
  v_mentora  uuid;
  e          public.encontro;
begin
  select * into o from public.registro where id = p_oportunidade for update;
  if o.id is null or o.tipo <> 'oportunidade' or not public.eh_mentora_ativa(o.jornada_id) then
    raise exception 'Oportunidade não encontrada.';
  end if;
  if not exists (select 1 from public.movimento where jornada_id = o.jornada_id and codigo = 6 and estado = 'aberto') then
    raise exception 'O retorno só acontece com o M6 aberto.';
  end if;
  if o.conteudo_mentora ->> 'assumida_em' is not null then
    raise exception 'A oportunidade já foi assumida.';
  end if;
  if exists (select 1 from public.registro where jornada_id = o.jornada_id and tipo = 'retorno') then
    raise exception 'Esta jornada já usou o seu retorno único.';
  end if;
  if coalesce(p_caminho, '') not in ('reserva', 'campo') then
    raise exception 'Escolha o caminho: reserva ou voltar a ouvir pessoas.';
  end if;
  if nullif(trim(p_motivo), '') is null or nullif(trim(p_recomendacao), '') is null then
    raise exception 'O retorno precisa do motivo e da sua recomendação, por escrito.';
  end if;

  select folga_restante_dias into v_folga from public.jornada_cronograma where jornada_id = o.jornada_id;
  if coalesce(v_folga, 0) < 7 then
    raise exception 'Não há folga para o retorno: a jornada não se estende.';
  end if;

  select * into d5 from public.registro where jornada_id = o.jornada_id and tipo = 'decisao_m5' for update;
  if p_caminho = 'reserva' and (d5.id is null or d5.conteudo_mentora ->> 'reserva' is null) then
    raise exception 'Não há reserva registrada no M5.';
  end if;

  select mentora_id into v_mentora from public.mentoria where jornada_id = o.jornada_id;

  insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo, conteudo_mentora,
                               autora_papel, autora_id, estado_edicao)
  values (o.conta_id, o.jornada_id, 6, 'retorno', '{}'::jsonb,
          jsonb_build_object('caminho', p_caminho, 'motivo', trim(p_motivo), 'recomendacao', trim(p_recomendacao),
                             'acionado_em', now(), 'prazo', now() + interval '7 days',
                             'aposta_anterior', d5.conteudo_mentora ->> 'aposta'),
          'mentora', v_mentora, 'fechado')
  returning id into v_ret;

  if p_caminho = 'reserva' then
    -- A reserva vira a aposta; a aposta anterior fica registrada.
    update public.registro
       set conteudo_mentora = conteudo_mentora
             || jsonb_build_object('aposta', conteudo_mentora ->> 'reserva', 'reserva', null,
                                   'aposta_anterior', conteudo_mentora ->> 'aposta', 'retorno_id', v_ret)
     where id = d5.id;
    -- A oportunidade recomeça a partir da nova aposta; o que ela escreveu fica guardado.
    update public.registro
       set conteudo_mentora = jsonb_build_object('anterior', jsonb_build_object('conteudo', conteudo, 'conteudo_mentora', conteudo_mentora),
                                                 'retorno_id', v_ret),
           conteudo = '{}'::jsonb
     where id = o.id;
  else
    update public.registro
       set conteudo_mentora = conteudo_mentora || jsonb_build_object('retorno_id', v_ret)
     where id = o.id;
  end if;

  -- As Calls 6 a 10 andam uma semana. Só a primeira conta na folga (7 dias).
  for e in select * from public.encontro
            where jornada_id = o.jornada_id and tipo = 'call' and numero >= 6 and estado = 'marcado'
            order by numero loop
    insert into public.encontro_remarcacao (encontro_id, data_anterior, data_nova, motivo, dias_folga, registrada_por)
    values (e.id, e.data_atual, e.data_atual + interval '7 days', 'retorno',
            case when e.numero = (select min(numero) from public.encontro
                                   where jornada_id = o.jornada_id and tipo = 'call' and numero >= 6 and estado = 'marcado')
                 then 7 else 0 end,
            auth.uid());
    update public.encontro set data_atual = e.data_atual + interval '7 days' where id = e.id;
  end loop;

  return v_ret;
end $$;

revoke all on function public.acionar_retorno(uuid, text, text, text) from public, anon;
grant execute on function public.acionar_retorno(uuid, text, text, text) to authenticated;
