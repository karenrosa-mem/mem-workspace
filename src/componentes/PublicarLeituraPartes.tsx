import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { dataHora } from "../lib/datas";
import Aviso from "./Aviso";
import Colinha from "./Colinha";
import { Pergunta } from "./Perguntas";

export type ParteLeitura = { chave: string; rotulo: string; exemplo: string };

// Leitura da Karen em partes fixas (passagem MAPA → NORTE, leitura curta da Call 5…).
// Cada chave precisa estar nas seções de LeituraKaren.
export default function PublicarLeituraPartes({
  mentoriaId,
  movimento,
  tipo,
  partes,
  inicial = {},
  prazo,
  rotuloBotao,
  aoPublicar,
}: {
  mentoriaId: string;
  movimento: number;
  tipo: string;
  partes: readonly ParteLeitura[];
  inicial?: Record<string, string>;
  prazo?: string | null;
  rotuloBotao: string;
  aoPublicar: () => Promise<void>;
}) {
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>(inicial);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("leitura_rascunho")
      .select("id, campos")
      .eq("mentoria_id", mentoriaId)
      .eq("movimento_codigo", movimento)
      .eq("tipo_leitura", tipo)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRascunhoId(data.id as string);
        setCampos((x) => ({ ...x, ...(data.campos as Record<string, string>) }));
      });
  }, [mentoriaId, movimento, tipo]);

  async function salvar(): Promise<string | null> {
    if (!supabase) return null;
    if (rascunhoId) {
      const r = await supabase.from("leitura_rascunho").update({ campos }).eq("id", rascunhoId);
      return r.error ? null : rascunhoId;
    }
    const r = await supabase
      .from("leitura_rascunho")
      .insert({ mentoria_id: mentoriaId, movimento_codigo: movimento, tipo_leitura: tipo, campos })
      .select("id")
      .single();
    if (r.error) return null;
    setRascunhoId(r.data.id as string);
    return r.data.id as string;
  }

  async function publicar() {
    if (!supabase) return;
    setErro(null);
    const id = await salvar();
    if (!id) return setErro("Não foi possível salvar o rascunho.");
    const r = await supabase.rpc("publicar_leitura", { p_rascunho: id, p_fecha_movimento: false });
    if (r.error) return setErro(r.error.message);
    await aoPublicar();
  }

  const completa = partes.every((p) => (campos[p.chave] ?? "").trim());
  return (
    <div className="ws-bloco ws-form">
      {prazo && <p className="mem-body-sm mem-muted">Até {dataHora(prazo)}.</p>}
      {partes.map((p, i) => (
        <Pergunta key={p.chave} n={i + 1} feita={!!(campos[p.chave] ?? "").trim()} titulo={p.rotulo}>
          <textarea
            className="mem-input ws-serif"
            rows={3}
            aria-label={p.rotulo}
            value={campos[p.chave] ?? ""}
            onChange={(e) => setCampos({ ...campos, [p.chave]: e.target.value })}
            onBlur={salvar}
          />
          <Colinha serve="Curto, na linguagem dela. Nunca “melhor”, “vencedora” ou “validada”." exemplo={p.exemplo} />
        </Pergunta>
      ))}
      {erro && (
        <Aviso variante="danger" titulo="Não publicada">
          {erro}
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!completa} onClick={publicar}>
          {rotuloBotao}
        </button>
      </div>
    </div>
  );
}
