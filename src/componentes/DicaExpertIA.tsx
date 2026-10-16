import { useState } from "react";
import type { DadosJornada } from "../lib/jornada";
import { linksExpertIA, montarTexto, type ChaveTarefa } from "../lib/expertia";

// Dica discreta de quando o ExpertIA ajuda (decisão de 11/10/2026). Com `tarefa`,
// a dica abre o ExpertIA no ChatGPT ou no Claude da mentorada, já com as instruções
// e o que ela escreveu (decisão de 16/10/2026). O Workspace funciona sem ele.
export default function DicaExpertIA({
  children,
  dados,
  tarefa,
  foco,
}: {
  children: React.ReactNode;
  dados?: DadosJornada;
  tarefa?: ChaveTarefa;
  foco?: string;
}) {
  return (
    <aside className="ws-dica-expertia">
      <span className="mem-label">Com o ExpertIA</span>
      <p className="mem-body-sm">{children}</p>
      {dados && tarefa && <AbrirExpertIA dados={dados} tarefa={tarefa} foco={foco} compacto />}
    </aside>
  );
}

export function AbrirExpertIA({
  dados,
  tarefa,
  foco,
  pergunta,
  compacto = false,
}: {
  dados: DadosJornada;
  tarefa: ChaveTarefa;
  foco?: string;
  pergunta?: string;
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const texto = () => montarTexto(dados, tarefa, foco, pergunta);
  const abrir = (onde: "chatgpt" | "claude") => window.open(linksExpertIA(texto())[onde], "_blank", "noopener");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto());
      setCopiado(true);
    } catch {
      window.prompt("Copie o texto abaixo e cole numa conversa nova:", texto());
    }
  }

  return (
    <div className="ws-expertia">
      <div className="ws-acoes">
        <button type="button" className={`mem-btn ${compacto ? "mem-btn--secondary" : "mem-btn--primary"}`} onClick={() => abrir("chatgpt")}>
          Abrir no ChatGPT
        </button>
        <button type="button" className="mem-btn mem-btn--quiet" onClick={() => abrir("claude")}>
          Abrir no Claude
        </button>
      </div>
      <p className="mem-body-sm mem-muted">
        {compacto
          ? "Abre numa aba nova, com o que você já escreveu na jornada. "
          : "Abre numa aba nova, com o que você já escreveu na jornada. As anotações da Karen não vão junto. No Claude, aparece um aviso pedindo cuidado: é o padrão para textos que chegam por link, pode enviar. "}
        <button type="button" className="ws-link-botao" onClick={copiar}>
          {copiado ? "Copiado: cole numa conversa nova" : "Não abriu? Copiar o texto"}
        </button>
      </p>
    </div>
  );
}
