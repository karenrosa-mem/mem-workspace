-- 0018 · Senha mais forte (decisão de 19/10/2026).
-- O plano gratuito do Supabase não confere senhas vazadas; no lugar disso, o Workspace
-- exige pelo menos 8 caracteres, com letras e números, e recusa as senhas mais comuns.
-- A mesma regra está no app (src/lib/senha.ts). Pode ser rodado mais de uma vez.

create or replace function public.senha_forte(p text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(length(p), 0) >= 8
     and p ~ '[A-Za-zÀ-ÿ]'
     and p ~ '[0-9]'
     and lower(p) not in ('12345678', '123456789', '1234567890', 'senha123', 'senha1234', 'senha12345', 'password1', 'password123', 'qwerty123', 'abc12345', 'abcd1234', 'mudar123', 'brasil123', 'mem12345', 'mentoria1', 'mentoria123', '10203040', '1q2w3e4r', '1q2w3e4r5t', 'a1b2c3d4', 'iloveyou1', 'deus1234', 'jesus123', 'flamengo1', '12341234', 'admin123', 'teste123', 'teste1234', 'amor1234', 'familia1')
     and p !~ '^(.)\1+$';
$$;
revoke all on function public.senha_forte(text) from public, anon, authenticated;

create or replace function public.definir_senha_com_codigo(p_email text, p_codigo text, p_senha text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  k       public.codigo_acesso;
  v_user  uuid;
begin
  if not public.senha_forte(p_senha) then
    raise exception 'A senha precisa ter pelo menos 8 caracteres, com letras e números, e não pode ser uma senha comum.';
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

revoke all on function public.definir_senha_com_codigo(text, text, text) from public;
grant execute on function public.definir_senha_com_codigo(text, text, text) to anon, authenticated;
