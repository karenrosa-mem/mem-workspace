-- =====================================================================
-- Workspace MEM · V1 · 0017 — Acesso por código, sem e-mail (decisão de 15/10)
--
-- A mentora inicia a jornada só com nome e e-mail; não cadastra nada no
-- Supabase. O Workspace gera um código de acesso (uso único, 7 dias), que a
-- mentora manda pelo WhatsApp. A mentorada entra com e-mail + código e cria
-- a própria senha. Esqueceu a senha: a mentora gera um código novo.
-- Nenhum e-mail é enviado. O código é guardado só como hash.
--
-- Requer no Supabase: Authentication → Sign In / Providers → Email →
-- "Confirm email" DESLIGADO.
-- Pode ser colado no SQL Editor mais de uma vez.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- A conta pode existir antes de ela entrar pela primeira vez.
alter table public.conta alter column titular_id drop not null;
alter table public.conta add column if not exists nome text;
alter table public.conta add column if not exists email_convite text;

create table if not exists public.codigo_acesso (
  id           uuid primary key default gen_random_uuid(),
  conta_id     uuid not null references public.conta (id) on delete cascade,
  email        text not null,
  codigo_hash  text not null,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null default now() + interval '7 days',
  usado_em     timestamptz,
  tentativas   integer not null default 0,
  criado_por   uuid references public.pessoa (id)
);
create index if not exists codigo_acesso_email on public.codigo_acesso (lower(email));
alter table public.codigo_acesso enable row level security;
-- Ninguém lê a tabela pelo app: só as funções abaixo.

-- ---------------------------------------------------------------------
-- Iniciar jornada: agora com o nome e sem exigir cadastro prévio.
-- ---------------------------------------------------------------------
drop function if exists public.iniciar_jornada(text, date, timestamptz[], text);

create or replace function public.iniciar_jornada(
  p_email        text,
  p_data_inicio  date,
  p_calls        timestamptz[],
  p_mensagem     text default null,
  p_nome         text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email   text := lower(trim(p_email));
  v_pessoa  uuid;
  v_conta   uuid;
  v_jornada uuid;
  i         integer;
begin
  if not public.eh_mentora() then
    raise exception 'Só a mentora inicia uma jornada.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Confira o e-mail.';
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

  select id into v_pessoa from public.pessoa where lower(email) = v_email;
  if v_pessoa = auth.uid() then
    raise exception 'A mentora não pode ser a mentorada da própria jornada.';
  end if;

  if v_pessoa is not null then
    insert into public.conta (titular_id, nome, email_convite) values (v_pessoa, nullif(trim(p_nome), ''), v_email)
    on conflict (titular_id) do update set apagar_em = null, nome = coalesce(excluded.nome, public.conta.nome)
    returning id into v_conta;
  else
    select id into v_conta from public.conta where titular_id is null and lower(email_convite) = v_email;
    if v_conta is null then
      insert into public.conta (titular_id, nome, email_convite) values (null, nullif(trim(p_nome), ''), v_email)
      returning id into v_conta;
    else
      update public.conta set nome = coalesce(nullif(trim(p_nome), ''), nome) where id = v_conta;
    end if;
  end if;

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
-- Código de acesso: gerado pela mentora; vale uma vez, por 7 dias.
-- Serve para o primeiro acesso e para criar uma senha nova.
-- ---------------------------------------------------------------------
create or replace function public.gerar_codigo_acesso(p_jornada uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_conta  uuid;
  v_email  text;
  v_codigo text := '';
  v_letras text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes  bytea := extensions.gen_random_bytes(8);
  i        integer;
begin
  if not public.eh_mentora_ativa(p_jornada) then
    raise exception 'Só a mentora desta jornada gera o código.';
  end if;
  select c.id, lower(coalesce(p.email, c.email_convite)) into v_conta, v_email
    from public.jornada j join public.conta c on c.id = j.conta_id
    left join public.pessoa p on p.id = c.titular_id
   where j.id = p_jornada;
  if v_email is null then
    raise exception 'Esta mentorada não tem e-mail registrado.';
  end if;

  for i in 0..7 loop
    v_codigo := v_codigo || substr(v_letras, (get_byte(v_bytes, i) % length(v_letras)) + 1, 1);
  end loop;
  v_codigo := substr(v_codigo, 1, 4) || '-' || substr(v_codigo, 5, 4);

  -- Um código válido por vez.
  update public.codigo_acesso set expira_em = least(expira_em, now())
   where conta_id = v_conta and usado_em is null and expira_em > now();
  insert into public.codigo_acesso (conta_id, email, codigo_hash, criado_por)
  values (v_conta, v_email, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), auth.uid());
  return v_codigo;
end $$;

-- Confere o código e devolve a linha (uso interno).
create or replace function public.conferir_codigo(p_email text, p_codigo text) returns public.codigo_acesso
language plpgsql security definer set search_path = '' as $$
declare
  k public.codigo_acesso;
begin
  select * into k from public.codigo_acesso
   where lower(email) = lower(trim(p_email)) and usado_em is null and expira_em > now()
   order by criado_em desc limit 1 for update;
  if k.id is null then
    raise exception 'Código inválido ou vencido. Peça um código novo à Karen.';
  end if;
  if k.tentativas >= 5 then
    raise exception 'Muitas tentativas com este código. Peça um código novo à Karen.';
  end if;
  if k.codigo_hash <> extensions.crypt(upper(replace(trim(p_codigo), ' ', '')), k.codigo_hash) then
    update public.codigo_acesso set tentativas = tentativas + 1 where id = k.id;
    return null;
  end if;
  return k;
end $$;

-- Primeiro acesso ou senha nova, sem estar logada.
-- 'pronto' = a senha foi definida, é só entrar; 'criar' = ainda não há
-- login com esse e-mail: o app cria (signUp) e chama vincular_conta.
create or replace function public.definir_senha_com_codigo(p_email text, p_codigo text, p_senha text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  k       public.codigo_acesso;
  v_user  uuid;
begin
  if length(coalesce(p_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.';
  end if;
  k := public.conferir_codigo(p_email, p_codigo);
  if k.id is null then
    return 'codigo_errado'; -- sem exceção, para a tentativa ficar contada
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    return 'criar';
  end if;

  update public.pessoa p set nome = c.nome from public.conta c
   where c.id = k.conta_id and p.id = v_user and nullif(trim(c.nome), '') is not null and p.nome = split_part(p.email, '@', 1);
  update auth.users
     set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf', 10)),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = v_user;
  -- Quem estivesse logado com esse e-mail sai: a senha agora é só dela.
  begin
    execute 'delete from auth.sessions where user_id = $1' using v_user;
  exception when undefined_table then null;
  end;
  update public.conta set titular_id = v_user where id = k.conta_id and titular_id is null;
  update public.codigo_acesso set usado_em = now() where id = k.id;
  return 'pronto';
end $$;

-- Depois do signUp, já logada: o código liga a conta a ela.
create or replace function public.vincular_conta(p_codigo text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  k       public.codigo_acesso;
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'Entre primeiro.';
  end if;
  k := public.conferir_codigo(v_email, p_codigo);
  if k.id is null then
    return 'codigo_errado';
  end if;
  update public.conta set titular_id = auth.uid() where id = k.conta_id and titular_id is null;
  update public.pessoa p set nome = c.nome from public.conta c
   where c.id = k.conta_id and p.id = auth.uid() and nullif(trim(c.nome), '') is not null;
  update public.codigo_acesso set usado_em = now() where id = k.id;
  return 'pronto';
end $$;

-- A mentora vê se ela já entrou e se há código válido.
create or replace function public.situacao_acesso(p_jornada uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not public.eh_mentora_ativa(p_jornada) then null else
    jsonb_build_object(
      'entrou', c.titular_id is not null,
      'codigo_valido_ate', (select max(expira_em) from public.codigo_acesso k
                             where k.conta_id = c.id and k.usado_em is null and k.expira_em > now()))
  end
  from public.jornada j join public.conta c on c.id = j.conta_id where j.id = p_jornada;
$$;

revoke all on function public.iniciar_jornada(text, date, timestamptz[], text, text) from public, anon;
revoke all on function public.gerar_codigo_acesso(uuid) from public, anon;
revoke all on function public.conferir_codigo(text, text) from public, anon, authenticated;
revoke all on function public.definir_senha_com_codigo(text, text, text) from public;
revoke all on function public.vincular_conta(text) from public, anon;
revoke all on function public.situacao_acesso(uuid) from public, anon;
grant execute on function public.iniciar_jornada(text, date, timestamptz[], text, text),
                          public.gerar_codigo_acesso(uuid),
                          public.vincular_conta(text),
                          public.situacao_acesso(uuid) to authenticated;
grant execute on function public.definir_senha_com_codigo(text, text, text) to anon, authenticated;
