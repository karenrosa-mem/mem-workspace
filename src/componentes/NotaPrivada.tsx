import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useSessao } from "../lib/sessao";
import type { ReactNode } from "react";
import Colinha from "./Colinha";

export type CampoNota = { chave: string; rotulo: string; ajuda?: string; exemplo?: string; referencia?: ReactNode };

// Nota privada com estrutura fixa por movimento. Só a mentora vê (regra do banco).
export default function NotaPrivada({
  mentoriaId,
  movimento,
  campos,
}: {
  mentoriaId: string;
  movimento: number;
  campos: CampoNota[];
}) {
  const { pessoa } = useSessao();
  const [notaId, setNotaId] = useState<string | null>(null);
  const [nota, setNota] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("nota_privada")
      .select("id, conteudo")
      .eq("mentoria_id", mentoriaId)
      .eq("movimento_codigo", movimento)
      .order("criada_em")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setNotaId(data.id as string);
        try {
          setNota(JSON.parse(data.conteudo as string));
        } catch {
          setNota({ [campos[0].chave]: data.conteudo as string });
        }
      });
  }, [mentoriaId, movimento, campos]);

  async function salvar() {
    if (!supabase || !pessoa) return;
    setEstado("salvando");
    const conteudo = JSON.stringify(nota);
    const r = notaId
      ? await supabase.from("nota_privada").update({ conteudo }).eq("id", notaId)
      : await supabase
          .from("nota_privada")
          .insert({ mentoria_id: mentoriaId, movimento_codigo: movimento, conteudo, autora_id: pessoa.id })
          .select("id")
          .single();
    if (r.error) return setEstado("erro");
    if (!notaId && "data" in r && r.data) setNotaId((r.data as { id: string }).id);
    setEstado("salvo");
  }

  return (
    <details className="ws-bloco ws-privado">
      <summary className="mem-label">Nota privada · M{movimento} · só você vê</summary>
      <div className="ws-form">
        {campos.map((c) => (
          <div className="mem-field" key={c.chave}>
            <label className="mem-field__label" htmlFor={`nota${movimento}-${c.chave}`}>
              {c.rotulo}
            </label>
            <textarea
              id={`nota${movimento}-${c.chave}`}
              className="mem-input"
              rows={2}
              value={nota[c.chave] ?? ""}
              onChange={(e) => {
                setNota({ ...nota, [c.chave]: e.target.value });
                setEstado("");
              }}
            />
            {c.ajuda && <Colinha serve={c.ajuda} exemplo={c.exemplo} />}
            {c.referencia}
          </div>
        ))}
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={salvar} disabled={estado === "salvando"}>
            Salvar nota
          </button>
          {estado === "salvo" && <span className="mem-body-sm mem-muted">Nota salva.</span>}
          {estado === "erro" && <span className="mem-body-sm">Não foi possível salvar. Tente de novo.</span>}
        </div>
      </div>
    </details>
  );
}
