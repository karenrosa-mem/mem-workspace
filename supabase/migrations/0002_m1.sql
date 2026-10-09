-- =====================================================================
-- Workspace MEM · V1 · 0002 — Ajustes para o M1
-- Fonte: Especificação V1 do M1 e "Modelo por movimento", seção M1.
--
--  · Campos da mentora que a mentorada só vê depois da leitura
--    (ex.: candidatas e nomes provisórios) ficam num rascunho da
--    mentoria e só passam ao registro quando a leitura é publicada.
--  · Registros criados pela mentora na call (situações novas) ficam
--    ocultos para a mentorada até a leitura ser publicada.
--  · A mensagem de abertura é publicada ao iniciar a jornada.
--  · Publicar a leitura de passagem fecha o movimento e abre o seguinte.
--
-- Aplicar uma única vez no Supabase, depois da 0001: SQL Editor → Run.
-- =====================================================================

-- Registros ocultos até a próxima leitura publicada
alter table public.registro
  add column pendente_publicacao boolean not null default false;

drop policy registro_ver on public.registro;
create policy registro_ver on public.registro for select to authenticated using (
  public.pode_ver_jornada(jornada_id)
  and (not pendente_publicacao or public.eh_mentora_ativa(jornada_id))
);

drop policy registro_criar on public.registro;
create policy registro_criar on public.registro for insert to authenticated with check (
  tipo <> 'leitura'
  and autora_id = auth.uid()
  and publicada_por is null
  and versao_atual = 1
  and (
    (autora_papel = 'mentorada' and public.eh_titular_da_jornada(jornada_id)
       and conteudo_mentora = '{}'::jsonb and not pendente_publicacao)
    or (autora_papel = 'mentora' and public.eh_mentora_ativa(jornada_id))
  )
  and conta_id = (select j.conta_id from public.jornada j where j.id = jornada_id)
);

-- A mentorada não muda a marca de pendência
create or replace function public.proteger_registro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.conta_id is distinct from old.conta_id
     or new.jornada_id is distinct from old.jornada_id
     or new.tipo is distinct from old.tipo
     or new.autora_papel is distinct from old.autora_papel
     or new.autora_id is distinct from old.autora_id
     or new.publicada_por is distinct from old.publicada_por
     or new.origem_id is distinct from old.origem_id
     or new.criado_em is distinct from old.criado_em
     or new.versao_atual is distinct from old.versao_atual
     or new.movimento_codigo is distinct from old.movimento_codigo
     or new.pendente_publicacao is distinct from old.pendente_publicacao then
    raise exception 'A proveniência de um registro não pode ser alterada.';
  end if;

  if public.eh_titular_da_jornada(old.jornada_id) then
    if new.conteudo_mentora is distinct from old.conteudo_mentora
       or new.estado_edicao is distinct from old.estado_edicao
       or new.status_metodologico is distinct from old.status_metodologico then
      raise exception 'A mentorada só edita os campos dela.';
    end if;
  elsif public.eh_mentora_ativa(old.jornada_id) then
    if new.conteudo is distinct from old.conteudo then
      raise exception 'A mentora não edita os campos da mentorada.';
    end if;
  end if;

  return new;
end $$;

-- Campos da mentora ainda não publicados (domínio da mentoria)
create table public.campo_mentora_rascunho (
  registro_id    uuid primary key references public.registro (id) on delete cascade,
  jornada_id     uuid not null references public.jornada (id) on delete cascade,
  campos         jsonb not null default '{}'::jsonb,
  atualizado_em  timestamptz not null default now()
);
create index on public.campo_mentora_rascunho (jornada_id);
alter table public.campo_mentora_rascunho enable row level security;

create policy campo_rascunho_mentora on public.campo_mentora_rascunho for all to authenticated
  using (public.eh_mentora_ativa(jornada_id))
  with check (
    public.eh_mentora_ativa(jornada_id)
    and exists (select 1 from public.registro r where r.id = registro_id and r.jornada_id = jornada_id)
  );

create trigger campo_rascunho_atualizado before update on public.campo_mentora_rascunho
  for each row execute function public.tocar_atualizado_em();

-- Leitura com campos estruturados (ex.: "o que investigamos", "o que fazer agora")
alter table public.leitura_rascunho add column campos jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- Fechar um movimento e abrir o seguinte (uso interno das funções)
-- Janelas de edição (M1.2): "Onde você está" fecha com o M1;
-- situações ficam editáveis até o fechamento do M2.
-- ---------------------------------------------------------------------
create function public.fechar_movimento(p_jornada uuid, p_codigo smallint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.movimento
     set estado = 'fechado', fechado_em = now()
   where jornada_id = p_jornada and codigo = p_codigo and estado = 'aberto';
  if not found then
    raise exception 'O M% não está aberto.', p_codigo;
  end if;

  if p_codigo < 10 then
    update public.movimento
       set estado = 'aberto', aberto_em = now()
     where jornada_id = p_jornada and codigo = p_codigo + 1 and estado = 'nao_iniciado';
  end if;

  update public.registro
     set estado_edicao = 'fechado'
   where jornada_id = p_jornada and estado_edicao = 'aberto' and tipo <> 'leitura'
     and ((movimento_codigo = p_codigo and tipo <> 'situacao')
          or (p_codigo = 2 and tipo = 'situacao'));
end $$;

-- ---------------------------------------------------------------------
-- Publicar leitura (substitui a versão da 0001)
-- ---------------------------------------------------------------------
drop function public.publicar_leitura(uuid);

create function public.publicar_leitura(
  p_rascunho        uuid,
  p_fecha_movimento boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r         public.leitura_rascunho;
  v_jornada uuid;
  v_conta   uuid;
  v_reg     uuid;
begin
  select * into r from public.leitura_rascunho where id = p_rascunho for update;
  if r.id is null or not public.eh_mentora_da_mentoria(r.mentoria_id) then
    raise exception 'Rascunho não encontrado.';
  end if;
  if r.publicada_registro_id is not null then
    raise exception 'Esta leitura já foi publicada.';
  end if;
  if length(trim(r.conteudo)) = 0 and r.campos = '{}'::jsonb then
    raise exception 'A leitura está vazia.';
  end if;

  select m.jornada_id, j.conta_id into v_jornada, v_conta
  from public.mentoria m join public.jornada j on j.id = m.jornada_id
  where m.id = r.mentoria_id;

  if p_fecha_movimento and r.movimento_codigo = 1 and not exists (
       select 1 from public.encontro
       where jornada_id = v_jornada and tipo = 'call' and numero = 1 and estado = 'realizado') then
    raise exception 'Marque a Call 1 como realizada antes de publicar a leitura.';
  end if;

  insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo,
                               conteudo_mentora, estado_edicao, autora_papel,
                               autora_id, publicada_por)
  values (v_conta, v_jornada, r.movimento_codigo, 'leitura',
          r.campos || jsonb_build_object('tipo_leitura', r.tipo_leitura, 'texto', r.conteudo,
                                         'referencias', to_jsonb(r.referencias)),
          'fechado', 'mentora', auth.uid(), auth.uid())
  returning id into v_reg;

  insert into public.ligacao (de_id, para_id, tipo)
  select v_reg, ref, 'apoio'
  from unnest(r.referencias) ref
  where exists (select 1 from public.registro x where x.id = ref and x.conta_id = v_conta)
  on conflict do nothing;

  -- O que a mentora preparou passa a ser visível junto com a leitura
  update public.registro reg
     set conteudo_mentora = reg.conteudo_mentora || c.campos
    from public.campo_mentora_rascunho c
   where c.registro_id = reg.id and c.jornada_id = v_jornada;
  delete from public.campo_mentora_rascunho where jornada_id = v_jornada;

  update public.registro set pendente_publicacao = false
   where jornada_id = v_jornada and pendente_publicacao;

  update public.leitura_rascunho set publicada_registro_id = v_reg where id = r.id;

  if p_fecha_movimento then
    perform public.fechar_movimento(v_jornada, r.movimento_codigo);
  end if;

  return v_reg;
end $$;

-- ---------------------------------------------------------------------
-- Iniciar jornada com a mensagem de abertura (substitui a da 0001)
-- ---------------------------------------------------------------------
drop function public.iniciar_jornada(text, date, timestamptz[]);

create function public.iniciar_jornada(
  p_email        text,
  p_data_inicio  date,
  p_calls        timestamptz[],
  p_mensagem     text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_pessoa  uuid;
  v_conta   uuid;
  v_jornada uuid;
  i         integer;
begin
  if not public.eh_mentora() then
    raise exception 'Só a mentora inicia uma jornada.';
  end if;
  if coalesce(array_length(p_calls, 1), 0) <> 10 then
    raise exception 'Informe as datas planejadas das 10 calls.';
  end if;
  for i in 1..10 loop
    if (p_calls[i] at time zone 'America/Sao_Paulo')::date < p_data_inicio
       or (p_calls[i] at time zone 'America/Sao_Paulo')::date > p_data_inicio + 84 then
      raise exception 'A call % está fora das 12 semanas da jornada.', i;
    end if;
  end loop;

  select id into v_pessoa from public.pessoa where lower(email) = lower(trim(p_email));
  if v_pessoa is null then
    raise exception 'Nenhuma pessoa com o e-mail %. Cadastre-a primeiro no Supabase.', p_email;
  end if;
  if v_pessoa = auth.uid() then
    raise exception 'A mentora não pode ser a mentorada da própria jornada.';
  end if;

  insert into public.conta (titular_id) values (v_pessoa)
  on conflict (titular_id) do update set apagar_em = null
  returning id into v_conta;

  begin
    insert into public.jornada (conta_id, data_inicio)
    values (v_conta, p_data_inicio) returning id into v_jornada;
  exception when unique_violation then
    raise exception 'Esta mentorada já tem uma jornada em andamento.';
  end;

  insert into public.mentoria (jornada_id, mentora_id) values (v_jornada, auth.uid());

  insert into public.movimento (jornada_id, codigo, estado, aberto_em)
  select v_jornada, g, case when g = 1 then 'aberto'::public.estado_movimento
                            else 'nao_iniciado'::public.estado_movimento end,
         case when g = 1 then now() end
  from generate_series(1, 10) g;

  insert into public.encontro (jornada_id, tipo, numero, data_planejada_original, data_atual)
  select v_jornada, 'call', g, p_calls[g], p_calls[g]
  from generate_series(1, 10) g;

  if nullif(trim(p_mensagem), '') is not null then
    insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo, conteudo_mentora,
                                 estado_edicao, autora_papel, autora_id, publicada_por)
    values (v_conta, v_jornada, 1, 'leitura',
            jsonb_build_object('tipo_leitura', 'mensagem_abertura', 'texto', trim(p_mensagem)),
            'fechado', 'mentora', auth.uid(), auth.uid());
  end if;

  return v_jornada;
end $$;

-- ---------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------
revoke all on function public.fechar_movimento(uuid, smallint) from public, anon, authenticated;
revoke all on function public.publicar_leitura(uuid, boolean) from public, anon;
revoke all on function public.iniciar_jornada(text, date, timestamptz[], text) from public, anon;

grant select, insert, update, delete on public.campo_mentora_rascunho to authenticated;
grant execute on function public.publicar_leitura(uuid, boolean),
                          public.iniciar_jornada(text, date, timestamptz[], text)
  to authenticated;
