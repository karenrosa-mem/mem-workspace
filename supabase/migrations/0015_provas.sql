-- =====================================================================
-- Workspace MEM · V1 · 0015 — Prova anexada no M2 (opcional)
--
-- Arquivos ficam no Storage, no bucket privado "provas", no caminho
-- <jornada_id>/<padrao_id>/<arquivo>. A mentorada envia e apaga os dela
-- enquanto tem acesso; a mentora vê. O caminho fica guardado na reação
-- (registro reacao_padrao, conteudo.provas).
-- Pode ser colado no SQL Editor mais de uma vez.
-- =====================================================================

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'Sem Storage neste banco (teste local): nada a fazer.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('provas', 'provas', false, 10485760,
          array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic'])
  on conflict (id) do update
     set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists provas_ver on storage.objects';
  execute 'drop policy if exists provas_enviar on storage.objects';
  execute 'drop policy if exists provas_apagar on storage.objects';

  execute $p$
    create policy provas_ver on storage.objects for select to authenticated using (
      bucket_id = 'provas'
      and public.pode_ver_jornada((case when split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(name, '/', 1)::uuid end)))
  $p$;
  execute $p$
    create policy provas_enviar on storage.objects for insert to authenticated with check (
      bucket_id = 'provas'
      and public.eh_titular_da_jornada((case when split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(name, '/', 1)::uuid end)))
  $p$;
  execute $p$
    create policy provas_apagar on storage.objects for delete to authenticated using (
      bucket_id = 'provas'
      and public.eh_titular_da_jornada((case when split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(name, '/', 1)::uuid end)))
  $p$;
end $$;
