-- Destrava jornadas cuja decisão do M2 foi publicada pelo fluxo antigo
-- (antes de 11/10) e que ficaram esperando o porquê dela.
do $$
declare
  d record;
begin
  for d in
    select r.id, r.jornada_id, m.mentora_id
      from public.registro r
      join public.movimento mv on mv.jornada_id = r.jornada_id and mv.codigo = 2 and mv.estado = 'aberto'
      join public.mentoria m on m.jornada_id = r.jornada_id
     where r.tipo = 'decisao_m2' and not r.pendente_publicacao
  loop
    update public.registro
       set conteudo_mentora = conteudo_mentora || jsonb_build_object('porque',
             coalesce(nullif(trim(conteudo_mentora ->> 'porque'), ''), nullif(trim(conteudo ->> 'porque'), ''), 'registrado antes da mudança de 11/10'))
     where id = d.id;
    insert into public.gate_registro (jornada_id, movimento_codigo, identificacao, resultado, condicoes, decisao_id, verificado_por)
    values (d.jornada_id, 2, 'gate_1', 'passou',
            '[{"condicao":"decisão publicada antes da mudança de 11/10","atendida":true}]'::jsonb, d.id, d.mentora_id);
    perform public.fechar_movimento(d.jornada_id, 2::smallint);
    update public.registro set estado_edicao = 'aberto' where id = d.id;
  end loop;
end $$;
