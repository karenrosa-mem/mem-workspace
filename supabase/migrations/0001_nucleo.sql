-- =====================================================================
-- Workspace MEM · V1 · 0001 — Núcleo comum
-- Fonte: "Núcleo comum do modelo (consolidado)", seções 1–8, e decisões
-- de 09/10 registradas no índice canônico (fim da jornada com pacote de
-- saída e apagamento em 60 dias; a mentora perde o acesso no fim).
--
-- Princípios aplicados aqui:
--  · A conta é da mentorada. A mentoria (notas privadas, rascunhos de
--    leitura) é da mentora e nunca aparece para a mentorada.
--  · A mentora só enxerga uma jornada enquanto a mentoria está ativa
--    (mentoria.acesso_ate vazio ou no futuro).
--  · Autoria por campo: `conteudo` é escrito pela mentorada,
--    `conteudo_mentora` pela mentora. Uma não altera o campo da outra.
--  · Registro fechado não se edita: muda por nova versão, com motivo.
--  · Ações que mexem em várias tabelas de uma vez (iniciar jornada,
--    publicar leitura, remarcar encontro, nova versão) são funções.
--
-- Aplicar uma única vez no Supabase: SQL Editor → colar → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_autora      as enum ('mentorada', 'mentora', 'workspace');
create type public.estado_jornada    as enum ('em_andamento', 'concluida', 'encerrada_antes');
create type public.status_autonomia  as enum ('demonstrada', 'parcial', 'nao_demonstrada');
create type public.estado_movimento  as enum ('nao_iniciado', 'aberto', 'fechado');
create type public.estado_edicao     as enum ('aberto', 'fechado');
create type public.motivo_versao     as enum ('correcao', 'atualizacao_prevista', 'retorno', 'protecao_de_dados');
create type public.tipo_ligacao      as enum ('origem', 'apoio', 'versao');
create type public.estado_encontro   as enum ('marcado', 'realizado', 'cancelado');
create type public.motivo_remarcacao as enum ('pedido_mentorada', 'pedido_mentora', 'retorno');
create type public.resultado_gate    as enum ('passou', 'nao_passou');

-- ---------------------------------------------------------------------
-- 1. Identidade e estrutura
-- ---------------------------------------------------------------------

-- Pessoa: quem entra no Workspace. Criada automaticamente no primeiro
-- acesso (gatilho em auth.users, no fim deste arquivo).
create table public.pessoa (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null,
  email       text,
  e_mentora   boolean not null default false,
  criada_em   timestamptz not null default now()
);

-- Conta: o espaço da mentorada. Apagada 60 dias depois do fim (apagar_em).
create table public.conta (
  id          uuid primary key default gen_random_uuid(),
  titular_id  uuid not null unique references public.pessoa (id) on delete cascade,
  criada_em   timestamptz not null default now(),
  apagar_em   date
);

-- Jornada: uma passagem pelo MEM. Máximo de 12 semanas (84 dias).
create table public.jornada (
  id                  uuid primary key default gen_random_uuid(),
  conta_id            uuid not null references public.conta (id) on delete cascade,
  metodologia_versao  text not null default 'MEM V1',
  estado              public.estado_jornada not null default 'em_andamento',
  data_inicio         date not null,
  data_limite         date generated always as (data_inicio + 84) stored,
  folga_total_dias    integer not null default 7 check (folga_total_dias >= 0),
  encerrada_em        timestamptz,
  status_autonomia    public.status_autonomia,
  criada_em           timestamptz not null default now()
);
create index on public.jornada (conta_id);
create unique index jornada_uma_em_andamento
  on public.jornada (conta_id) where estado = 'em_andamento';

-- Mentoria: o acompanhamento humano. A mentora vê a jornada enquanto
-- acesso_ate estiver vazio ou no futuro.
create table public.mentoria (
  id            uuid primary key default gen_random_uuid(),
  jornada_id    uuid not null unique references public.jornada (id) on delete cascade,
  mentora_id    uuid not null references public.pessoa (id),
  iniciada_em   timestamptz not null default now(),
  acesso_ate    timestamptz
);
create index on public.mentoria (mentora_id);

-- Movimento: M1–M10 dentro da jornada. Fecha só por evento (gate).
create table public.movimento (
  id          uuid primary key default gen_random_uuid(),
  jornada_id  uuid not null references public.jornada (id) on delete cascade,
  codigo      smallint not null check (codigo between 1 and 10),
  estado      public.estado_movimento not null default 'nao_iniciado',
  aberto_em   timestamptz,
  fechado_em  timestamptz,
  unique (jornada_id, codigo)
);

-- ---------------------------------------------------------------------
-- 2. Conteúdo
-- ---------------------------------------------------------------------

-- Registro: a unidade de conteúdo da conta (situação, hipótese, decisão,
-- conversa, leitura publicada...). Campos definidos pelo tipo.
create table public.registro (
  id                    uuid primary key default gen_random_uuid(),
  conta_id              uuid not null references public.conta (id) on delete cascade,
  jornada_id            uuid not null references public.jornada (id) on delete cascade,
  movimento_codigo      smallint check (movimento_codigo between 1 and 10),
  tipo                  text not null,
  conteudo              jsonb not null default '{}'::jsonb,  -- campos da mentorada
  conteudo_mentora      jsonb not null default '{}'::jsonb,  -- campos da mentora
  estado_edicao         public.estado_edicao not null default 'aberto',
  status_metodologico   text,
  autora_papel          public.papel_autora not null,
  autora_id             uuid references public.pessoa (id),
  publicada_por         uuid references public.pessoa (id),
  origem_id             uuid references public.registro (id),
  versao_atual          integer not null default 1,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);
create index on public.registro (jornada_id, movimento_codigo);
create index on public.registro (conta_id);

-- Versão: guarda o conteúdo anterior quando um registro fechado muda.
create table public.registro_versao (
  id                 uuid primary key default gen_random_uuid(),
  registro_id        uuid not null references public.registro (id) on delete cascade,
  numero             integer not null,
  conteudo           jsonb not null,
  conteudo_mentora   jsonb not null,
  status_metodologico text,
  motivo             public.motivo_versao not null,
  evento             text,
  autora_id          uuid references public.pessoa (id),
  criada_em          timestamptz not null default now(),
  unique (registro_id, numero)
);

-- Ligação: a cadeia do raciocínio dela (origem · apoio · versão).
create table public.ligacao (
  id         uuid primary key default gen_random_uuid(),
  de_id      uuid not null references public.registro (id) on delete cascade,
  para_id    uuid not null references public.registro (id) on delete cascade,
  tipo       public.tipo_ligacao not null,
  criada_em  timestamptz not null default now(),
  unique (de_id, para_id, tipo),
  check (de_id <> para_id)
);
create index on public.ligacao (para_id);

-- Gate: cada tentativa de passagem fica registrada (passou / não passou).
create table public.gate_registro (
  id               uuid primary key default gen_random_uuid(),
  jornada_id       uuid not null references public.jornada (id) on delete cascade,
  movimento_codigo smallint not null check (movimento_codigo between 1 and 10),
  identificacao    text not null check (identificacao in
                     ('gate_1','gate_2','gate_3','gate_4','passagem_m6',
                      'gate_5','gate_6','gate_7','gate_8')),
  resultado        public.resultado_gate not null,
  condicoes        jsonb not null default '[]'::jsonb,
  encaminhamento   text,
  decisao_id       uuid references public.registro (id),
  verificado_por   uuid not null references public.pessoa (id),
  registrado_em    timestamptz not null default now(),
  check (resultado = 'passou' or encaminhamento is not null)
);
create index on public.gate_registro (jornada_id, movimento_codigo);

-- ---------------------------------------------------------------------
-- 3. Mentoria (domínio da mentora — nunca visível para a mentorada)
-- ---------------------------------------------------------------------

create table public.nota_privada (
  id                uuid primary key default gen_random_uuid(),
  mentoria_id       uuid not null references public.mentoria (id) on delete cascade,
  movimento_codigo  smallint check (movimento_codigo between 1 and 10),
  conteudo          text not null,
  referencias       uuid[] not null default '{}',
  autora_id         uuid not null references public.pessoa (id),
  criada_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index on public.nota_privada (mentoria_id);

-- Rascunho de leitura: vive na mentoria até ser publicado. Ao publicar,
-- vira um registro da conta do tipo "leitura" (função publicar_leitura).
create table public.leitura_rascunho (
  id                     uuid primary key default gen_random_uuid(),
  mentoria_id            uuid not null references public.mentoria (id) on delete cascade,
  movimento_codigo       smallint check (movimento_codigo between 1 and 10),
  tipo_leitura           text not null,
  conteudo               text not null default '',
  referencias            uuid[] not null default '{}',
  publicada_registro_id  uuid references public.registro (id) on delete set null,
  criada_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);
create index on public.leitura_rascunho (mentoria_id);

-- Encontro: calls e conversas. Guarda a data planejada original para
-- calcular a folga com justiça (núcleo, seção 8).
create table public.encontro (
  id                       uuid primary key default gen_random_uuid(),
  jornada_id               uuid not null references public.jornada (id) on delete cascade,
  tipo                     text not null check (tipo in
                             ('call','conversa_extra_m2','desbloqueio_m9','fechamento_excepcional_m10')),
  numero                   smallint check (numero between 1 and 10),
  movimentos               smallint[],
  data_planejada_original  timestamptz not null,
  data_atual               timestamptz not null,
  data_realizada           timestamptz,
  estado                   public.estado_encontro not null default 'marcado',
  check (tipo <> 'call' or numero is not null)
);
create index on public.encontro (jornada_id, data_atual);

create table public.encontro_remarcacao (
  id              uuid primary key default gen_random_uuid(),
  encontro_id     uuid not null references public.encontro (id) on delete cascade,
  data_anterior   timestamptz not null,
  data_nova       timestamptz not null,
  motivo          public.motivo_remarcacao not null,
  dias_folga      integer not null default 0 check (dias_folga >= 0),
  registrada_por  uuid not null references public.pessoa (id),
  criada_em       timestamptz not null default now(),
  -- Atraso causado pela mentora nunca é cobrado da mentorada.
  check (motivo <> 'pedido_mentora' or dias_folga = 0)
);
create index on public.encontro_remarcacao (encontro_id);

-- ---------------------------------------------------------------------
-- 4. Dados pessoais e métricas
-- ---------------------------------------------------------------------

create table public.solicitacao_dados (
  id                  uuid primary key default gen_random_uuid(),
  conta_id            uuid not null references public.conta (id) on delete cascade,
  solicitante         text not null,
  pedido              text not null,
  registros_afetados  uuid[] not null default '{}',
  criada_em           timestamptz not null default now(),
  atendida_em         timestamptz,
  resultado           text
);

-- Métricas anonimizadas: sem nenhuma ligação com pessoa, conta ou jornada.
-- Nenhum acesso pelo app; preenchidas por rotina da plataforma.
create table public.metrica_anonima (
  id                  uuid primary key default gen_random_uuid(),
  metodologia_versao  text not null,
  movimento_codigo    smallint check (movimento_codigo between 1 and 10),
  dias_no_movimento   integer,
  registrada_em       date not null default current_date
);

-- ---------------------------------------------------------------------
-- Funções de apoio às regras de acesso
-- (security definer para não depender das próprias regras ao consultar)
-- ---------------------------------------------------------------------

create function public.eh_mentora() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select e_mentora from public.pessoa where id = auth.uid()), false);
$$;

create function public.eh_titular_da_jornada(j uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jornada jo
    join public.conta c on c.id = jo.conta_id
    where jo.id = j and c.titular_id = auth.uid());
$$;

create function public.eh_mentora_ativa(j uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mentoria m
    where m.jornada_id = j and m.mentora_id = auth.uid()
      and (m.acesso_ate is null or m.acesso_ate > now()));
$$;

create function public.pode_ver_jornada(j uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.eh_titular_da_jornada(j) or public.eh_mentora_ativa(j);
$$;

create function public.eh_mentora_da_mentoria(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mentoria mt
    where mt.id = m and mt.mentora_id = auth.uid()
      and (mt.acesso_ate is null or mt.acesso_ate > now()));
$$;

-- ---------------------------------------------------------------------
-- Regras de acesso (RLS)
-- ---------------------------------------------------------------------
alter table public.pessoa              enable row level security;
alter table public.conta               enable row level security;
alter table public.jornada             enable row level security;
alter table public.mentoria            enable row level security;
alter table public.movimento           enable row level security;
alter table public.registro            enable row level security;
alter table public.registro_versao     enable row level security;
alter table public.ligacao             enable row level security;
alter table public.gate_registro       enable row level security;
alter table public.nota_privada        enable row level security;
alter table public.leitura_rascunho    enable row level security;
alter table public.encontro            enable row level security;
alter table public.encontro_remarcacao enable row level security;
alter table public.solicitacao_dados   enable row level security;
alter table public.metrica_anonima     enable row level security;

-- Pessoa: cada uma vê a si mesma; a mentora vê nome e contato das
-- mentoradas enquanto a mentoria está ativa; a mentorada vê a mentora.
create policy pessoa_ver on public.pessoa for select to authenticated using (
  id = auth.uid()
  or exists (select 1 from public.conta c join public.jornada j on j.conta_id = c.id
             where c.titular_id = pessoa.id and public.eh_mentora_ativa(j.id))
  or exists (select 1 from public.mentoria m join public.jornada j on j.id = m.jornada_id
             where m.mentora_id = pessoa.id and public.eh_titular_da_jornada(j.id))
);
create policy pessoa_editar on public.pessoa for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Conta, jornada, mentoria, movimento: só leitura pelo app.
-- Criação e mudanças de estado acontecem por funções.
create policy conta_ver on public.conta for select to authenticated using (
  titular_id = auth.uid()
  or exists (select 1 from public.jornada j where j.conta_id = conta.id and public.eh_mentora_ativa(j.id))
);
create policy jornada_ver on public.jornada for select to authenticated
  using (public.pode_ver_jornada(id));
create policy mentoria_ver on public.mentoria for select to authenticated
  using (public.pode_ver_jornada(jornada_id));
create policy movimento_ver on public.movimento for select to authenticated
  using (public.pode_ver_jornada(jornada_id));

-- Registro
create policy registro_ver on public.registro for select to authenticated
  using (public.pode_ver_jornada(jornada_id));

create policy registro_criar on public.registro for insert to authenticated with check (
  tipo <> 'leitura'                       -- leitura só nasce da publicação
  and autora_id = auth.uid()
  and publicada_por is null
  and versao_atual = 1
  and (
    (autora_papel = 'mentorada' and public.eh_titular_da_jornada(jornada_id)
       and conteudo_mentora = '{}'::jsonb)
    or (autora_papel = 'mentora' and public.eh_mentora_ativa(jornada_id))
  )
  and conta_id = (select j.conta_id from public.jornada j where j.id = jornada_id)
);

create policy registro_editar on public.registro for update to authenticated
  using (estado_edicao = 'aberto' and public.pode_ver_jornada(jornada_id))
  with check (public.pode_ver_jornada(jornada_id));

create policy registro_apagar on public.registro for delete to authenticated using (
  estado_edicao = 'aberto' and versao_atual = 1 and tipo <> 'leitura'
  and autora_id = auth.uid() and public.pode_ver_jornada(jornada_id)
);

-- Versões: só leitura pelo app (criadas pela função nova_versao).
create policy versao_ver on public.registro_versao for select to authenticated using (
  exists (select 1 from public.registro r where r.id = registro_id and public.pode_ver_jornada(r.jornada_id))
);

-- Ligações: criadas quando um registro nasce de outro; nunca editadas.
create policy ligacao_ver on public.ligacao for select to authenticated using (
  exists (select 1 from public.registro r where r.id = de_id and public.pode_ver_jornada(r.jornada_id))
);
create policy ligacao_criar on public.ligacao for insert to authenticated with check (
  exists (select 1 from public.registro a join public.registro b on b.conta_id = a.conta_id
          where a.id = de_id and b.id = para_id and public.pode_ver_jornada(a.jornada_id))
);

-- Gates: as duas veem (inclusive o "não passou"); só a mentora registra.
create policy gate_ver on public.gate_registro for select to authenticated
  using (public.pode_ver_jornada(jornada_id));
create policy gate_registrar on public.gate_registro for insert to authenticated with check (
  verificado_por = auth.uid() and public.eh_mentora_ativa(jornada_id)
);

-- Notas privadas e rascunhos de leitura: só a mentora, sempre.
create policy nota_mentora on public.nota_privada for all to authenticated
  using (public.eh_mentora_da_mentoria(mentoria_id))
  with check (public.eh_mentora_da_mentoria(mentoria_id) and autora_id = auth.uid());

create policy rascunho_mentora on public.leitura_rascunho for all to authenticated
  using (public.eh_mentora_da_mentoria(mentoria_id) and publicada_registro_id is null)
  with check (public.eh_mentora_da_mentoria(mentoria_id) and publicada_registro_id is null);

-- Encontros: as duas veem; a mentora cria e atualiza.
create policy encontro_ver on public.encontro for select to authenticated
  using (public.pode_ver_jornada(jornada_id));
create policy encontro_criar on public.encontro for insert to authenticated
  with check (public.eh_mentora_ativa(jornada_id) and data_atual = data_planejada_original);
create policy encontro_editar on public.encontro for update to authenticated
  using (public.eh_mentora_ativa(jornada_id)) with check (public.eh_mentora_ativa(jornada_id));

create policy remarcacao_ver on public.encontro_remarcacao for select to authenticated using (
  exists (select 1 from public.encontro e where e.id = encontro_id and public.pode_ver_jornada(e.jornada_id))
);

-- Solicitações de dados: a titular cria e acompanha as suas.
create policy solicitacao_ver on public.solicitacao_dados for select to authenticated using (
  exists (select 1 from public.conta c where c.id = conta_id and c.titular_id = auth.uid())
);
create policy solicitacao_criar on public.solicitacao_dados for insert to authenticated with check (
  exists (select 1 from public.conta c where c.id = conta_id and c.titular_id = auth.uid())
  and atendida_em is null and resultado is null
);

-- metrica_anonima: nenhuma regra = nenhum acesso pelo app.

-- ---------------------------------------------------------------------
-- Gatilhos de integridade
-- ---------------------------------------------------------------------

create function public.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create trigger registro_atualizado before update on public.registro
  for each row execute function public.tocar_atualizado_em();
create trigger nota_atualizada before update on public.nota_privada
  for each row execute function public.tocar_atualizado_em();
create trigger rascunho_atualizado before update on public.leitura_rascunho
  for each row execute function public.tocar_atualizado_em();

-- Autoria por campo e proveniência imutável no registro.
-- Vale só para quem usa o app (papel authenticated); as funções internas
-- rodam como dona do banco e seguem as próprias regras.
create function public.proteger_registro() returns trigger
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
     or new.movimento_codigo is distinct from old.movimento_codigo then
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

create trigger registro_protegido before update on public.registro
  for each row execute function public.proteger_registro();

-- A data planejada original de um encontro nunca muda; remarcar é pela função.
create function public.proteger_encontro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and (
       new.data_planejada_original is distinct from old.data_planejada_original
       or new.data_atual is distinct from old.data_atual
       or new.jornada_id is distinct from old.jornada_id) then
    raise exception 'Use remarcar_encontro para mudar a data de um encontro.';
  end if;
  return new;
end $$;

create trigger encontro_protegido before update on public.encontro
  for each row execute function public.proteger_encontro();

-- Ninguém se torna mentora pelo app.
create function public.proteger_pessoa() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and (
       new.e_mentora is distinct from old.e_mentora or new.id is distinct from old.id) then
    raise exception 'Papel de mentora não é alterado pelo app.';
  end if;
  return new;
end $$;

create trigger pessoa_protegida before update on public.pessoa
  for each row execute function public.proteger_pessoa();

-- Pessoa criada no primeiro acesso (convite por e-mail no Supabase).
create function public.criar_pessoa_no_cadastro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.pessoa (id, nome, email)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
          new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger pessoa_no_cadastro after insert on auth.users
  for each row execute function public.criar_pessoa_no_cadastro();

-- ---------------------------------------------------------------------
-- Ações (funções chamadas pelo app)
-- ---------------------------------------------------------------------

-- Iniciar jornada: a mentora cria conta (se não existir), jornada,
-- mentoria, os dez movimentos (M1 aberto) e as dez calls planejadas.
create function public.iniciar_jornada(
  p_email        text,
  p_data_inicio  date,
  p_calls        timestamptz[]
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
    raise exception 'Nenhuma pessoa com o e-mail %. Convide-a primeiro.', p_email;
  end if;
  if v_pessoa = auth.uid() then
    raise exception 'A mentora não pode ser a mentorada da própria jornada.';
  end if;

  insert into public.conta (titular_id) values (v_pessoa)
  on conflict (titular_id) do update set apagar_em = null
  returning id into v_conta;

  insert into public.jornada (conta_id, data_inicio)
  values (v_conta, p_data_inicio) returning id into v_jornada;

  insert into public.mentoria (jornada_id, mentora_id) values (v_jornada, auth.uid());

  insert into public.movimento (jornada_id, codigo, estado, aberto_em)
  select v_jornada, g, case when g = 1 then 'aberto'::public.estado_movimento
                            else 'nao_iniciado'::public.estado_movimento end,
         case when g = 1 then now() end
  from generate_series(1, 10) g;

  insert into public.encontro (jornada_id, tipo, numero, data_planejada_original, data_atual)
  select v_jornada, 'call', g, p_calls[g], p_calls[g]
  from generate_series(1, 10) g;

  return v_jornada;
end $$;

-- Publicar leitura: o rascunho da mentoria vira registro da conta.
create function public.publicar_leitura(p_rascunho uuid) returns uuid
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
  if length(trim(r.conteudo)) = 0 then
    raise exception 'A leitura está vazia.';
  end if;

  select m.jornada_id, j.conta_id into v_jornada, v_conta
  from public.mentoria m join public.jornada j on j.id = m.jornada_id
  where m.id = r.mentoria_id;

  insert into public.registro (conta_id, jornada_id, movimento_codigo, tipo,
                               conteudo_mentora, estado_edicao, autora_papel,
                               autora_id, publicada_por)
  values (v_conta, v_jornada, r.movimento_codigo, 'leitura',
          jsonb_build_object('tipo_leitura', r.tipo_leitura, 'texto', r.conteudo,
                             'referencias', to_jsonb(r.referencias)),
          'fechado', 'mentora', auth.uid(), auth.uid())
  returning id into v_reg;

  insert into public.ligacao (de_id, para_id, tipo)
  select v_reg, ref, 'apoio'
  from unnest(r.referencias) ref
  where exists (select 1 from public.registro x where x.id = ref and x.conta_id = v_conta)
  on conflict do nothing;

  update public.leitura_rascunho set publicada_registro_id = v_reg where id = r.id;
  return v_reg;
end $$;

-- Nova versão de um registro fechado (correção, atualização prevista,
-- retorno). Cada uma muda só os próprios campos. Proteção de dados é
-- operada pela plataforma, não pelo app.
create function public.nova_versao(
  p_registro          uuid,
  p_conteudo          jsonb,
  p_conteudo_mentora  jsonb,
  p_motivo            public.motivo_versao,
  p_evento            text default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r       public.registro;
  v_num   integer;
  v_e_tit boolean;
  v_e_men boolean;
begin
  select * into r from public.registro where id = p_registro for update;
  if r.id is null or not public.pode_ver_jornada(r.jornada_id) then
    raise exception 'Registro não encontrado.';
  end if;
  if r.estado_edicao <> 'fechado' then
    raise exception 'Registro aberto se edita direto, sem nova versão.';
  end if;
  if p_motivo = 'protecao_de_dados' then
    raise exception 'Proteção de dados é operada pela plataforma.';
  end if;

  v_e_tit := public.eh_titular_da_jornada(r.jornada_id);
  v_e_men := public.eh_mentora_ativa(r.jornada_id);

  if v_e_tit and p_conteudo_mentora is distinct from r.conteudo_mentora then
    raise exception 'A mentorada só corrige os campos dela.';
  end if;
  if v_e_men and not v_e_tit and p_conteudo is distinct from r.conteudo then
    raise exception 'A mentora só corrige os campos dela.';
  end if;
  if p_conteudo is not distinct from r.conteudo
     and p_conteudo_mentora is not distinct from r.conteudo_mentora then
    raise exception 'Nada mudou.';
  end if;

  v_num := r.versao_atual;
  insert into public.registro_versao (registro_id, numero, conteudo, conteudo_mentora,
                                      status_metodologico, motivo, evento, autora_id)
  values (r.id, v_num, r.conteudo, r.conteudo_mentora, r.status_metodologico,
          p_motivo, p_evento, auth.uid());

  update public.registro
     set conteudo = p_conteudo,
         conteudo_mentora = p_conteudo_mentora,
         versao_atual = v_num + 1
   where id = r.id;

  return v_num + 1;
end $$;

-- Remarcar encontro. Consome folga só quando a call vai para outra semana
-- a pedido da mentorada ou por retorno. Pedido da mentora nunca consome.
create function public.remarcar_encontro(
  p_encontro  uuid,
  p_nova_data timestamptz,
  p_motivo    public.motivo_remarcacao
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  e        public.encontro;
  v_dias   integer := 0;
begin
  select * into e from public.encontro where id = p_encontro for update;
  if e.id is null or not public.eh_mentora_ativa(e.jornada_id) then
    raise exception 'Só a mentora remarca encontros.';
  end if;
  if e.estado <> 'marcado' then
    raise exception 'Só encontros marcados podem ser remarcados.';
  end if;

  -- Semanas e dias contados no horário de Brasília.
  if p_motivo <> 'pedido_mentora'
     and date_trunc('week', p_nova_data at time zone 'America/Sao_Paulo')
       > date_trunc('week', e.data_atual at time zone 'America/Sao_Paulo') then
    v_dias := greatest(0, (p_nova_data at time zone 'America/Sao_Paulo')::date
                        - (e.data_atual at time zone 'America/Sao_Paulo')::date);
  end if;

  insert into public.encontro_remarcacao (encontro_id, data_anterior, data_nova,
                                          motivo, dias_folga, registrada_por)
  values (e.id, e.data_atual, p_nova_data, p_motivo, v_dias, auth.uid());

  update public.encontro set data_atual = p_nova_data where id = e.id;
  return v_dias;
end $$;

-- Cronograma: o que a linha das 12 semanas mostra.
create view public.jornada_cronograma with (security_invoker = true) as
select j.id as jornada_id,
       j.data_inicio,
       j.data_limite,
       j.folga_total_dias,
       coalesce(sum(r.dias_folga), 0)::integer as folga_usada_dias,
       greatest(0, j.folga_total_dias - coalesce(sum(r.dias_folga), 0))::integer as folga_restante_dias
from public.jornada j
left join public.encontro e on e.jornada_id = j.id
left join public.encontro_remarcacao r on r.encontro_id = e.id
group by j.id;

-- ---------------------------------------------------------------------
-- Permissões (o projeto não expõe tabelas novas automaticamente)
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to authenticated;

grant select on public.pessoa, public.conta, public.jornada, public.mentoria,
                public.movimento, public.registro, public.registro_versao,
                public.ligacao, public.gate_registro, public.nota_privada,
                public.leitura_rascunho, public.encontro, public.encontro_remarcacao,
                public.solicitacao_dados, public.jornada_cronograma
  to authenticated;

grant update (nome, email)                      on public.pessoa   to authenticated;
grant insert, update, delete                    on public.registro to authenticated;
grant insert                                    on public.ligacao, public.gate_registro,
                                                   public.solicitacao_dados to authenticated;
grant insert, update, delete                    on public.nota_privada, public.leitura_rascunho to authenticated;
grant insert, update                            on public.encontro to authenticated;

grant execute on function public.eh_mentora(), public.eh_titular_da_jornada(uuid),
                          public.eh_mentora_ativa(uuid), public.pode_ver_jornada(uuid),
                          public.eh_mentora_da_mentoria(uuid),
                          public.iniciar_jornada(text, date, timestamptz[]),
                          public.publicar_leitura(uuid),
                          public.nova_versao(uuid, jsonb, jsonb, public.motivo_versao, text),
                          public.remarcar_encontro(uuid, timestamptz, public.motivo_remarcacao)
  to authenticated;
