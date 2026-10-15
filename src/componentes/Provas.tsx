import { useState } from "react";
import { supabase } from "../lib/supabase";

export type Prova = { caminho: string; nome: string };

const ACEITA = "application/pdf,image/png,image/jpeg,image/webp,image/heic";
const LIMITE = 10 * 1024 * 1024;

// Prova anexada (opcional): um print, um e-mail, um número, um certificado.
// O arquivo fica no Storage privado; só ela e a mentora abrem.
export default function Provas({
  jornadaId,
  pasta,
  valor,
  aoMudar,
  editavel = true,
}: {
  jornadaId: string;
  pasta: string;
  valor: Prova[];
  aoMudar?: (p: Prova[]) => void;
  editavel?: boolean;
}) {
  const [estado, setEstado] = useState<"" | "enviando" | "erro" | "grande">("");

  async function enviar(arquivos: FileList | null) {
    if (!supabase || !arquivos?.length || !aoMudar) return;
    const novos: Prova[] = [];
    for (const f of Array.from(arquivos)) {
      if (f.size > LIMITE) {
        setEstado("grande");
        continue;
      }
      setEstado("enviando");
      const limpo = f.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
      const caminho = `${jornadaId}/${pasta}/${Date.now()}-${limpo}`;
      const r = await supabase.storage.from("provas").upload(caminho, f, { contentType: f.type });
      if (r.error) {
        setEstado("erro");
        continue;
      }
      novos.push({ caminho, nome: f.name });
    }
    if (novos.length) {
      aoMudar([...valor, ...novos]);
      setEstado("");
    }
  }

  async function abrir(p: Prova) {
    if (!supabase) return;
    const r = await supabase.storage.from("provas").createSignedUrl(p.caminho, 120);
    if (r.data?.signedUrl) window.open(r.data.signedUrl, "_blank", "noopener");
  }

  async function tirar(p: Prova) {
    if (!supabase || !aoMudar) return;
    await supabase.storage.from("provas").remove([p.caminho]);
    aoMudar(valor.filter((x) => x.caminho !== p.caminho));
  }

  return (
    <div className="ws-provas">
      {valor.length > 0 && (
        <ul className="ws-lista-simples mem-body-sm">
          {valor.map((p) => (
            <li key={p.caminho}>
              <button type="button" className="ws-link" onClick={() => abrir(p)}>
                {p.nome}
              </button>
              {editavel && (
                <button type="button" className="mem-btn mem-btn--quiet" onClick={() => tirar(p)}>
                  Tirar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editavel && (
        <label className="mem-btn mem-btn--secondary ws-provas__enviar">
          {estado === "enviando" ? "Enviando" : "Anexar uma prova (opcional)"}
          <input type="file" accept={ACEITA} multiple hidden onChange={(e) => enviar(e.target.files)} />
        </label>
      )}
      {estado === "grande" && <p className="mem-body-sm mem-muted">Arquivo maior que 10 MB. Tire um print só da parte que importa.</p>}
      {estado === "erro" && <p className="mem-body-sm mem-muted">Não foi possível enviar. Tente de novo.</p>}
    </div>
  );
}
