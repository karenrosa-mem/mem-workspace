import type { ReactNode } from "react";

// Peças de formulário guiado, usadas nas duas visões (mentorada e mentora).

export type Opcao = { valor: string; rotulo: string; detalhe?: string };

// Opções em cartões. Com `marcados`, aceita mais de uma resposta.
export function Opcoes({
  rotulo,
  opcoes,
  valor,
  marcados,
  aoEscolher,
}: {
  rotulo: string;
  opcoes: readonly Opcao[];
  valor?: string;
  marcados?: string[];
  aoEscolher: (v: string) => void;
}) {
  const varias = !!marcados;
  const marcado = (v: string) => (varias ? marcados.includes(v) : valor === v);
  return (
    <div
      className={`ws-opcoes ${opcoes.some((o) => o.detalhe) ? "ws-opcoes--grade" : ""}`}
      role={varias ? "group" : "radiogroup"}
      aria-label={rotulo}
    >
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role={varias ? "checkbox" : "radio"}
          aria-checked={marcado(o.valor)}
          className={`ws-opcao ${marcado(o.valor) ? "ws-opcao--marcada" : ""}`}
          onClick={() => aoEscolher(o.valor)}
        >
          <span className="ws-opcao__rotulo">{o.rotulo}</span>
          {o.detalhe && <span className="ws-opcao__detalhe">{o.detalhe}</span>}
        </button>
      ))}
    </div>
  );
}

// Pergunta numerada; o número vira ✓ quando respondida.
export function Pergunta({
  n,
  feita,
  titulo,
  children,
}: {
  n: number;
  feita: boolean;
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="ws-pergunta-bloco">
      <span className={`ws-pergunta-bloco__n ${feita ? "ws-pergunta-bloco__n--feita" : ""}`} aria-hidden="true">
        {feita ? "✓" : n}
      </span>
      <div className="ws-pergunta-bloco__corpo">
        <p className="mem-h4 ws-pergunta-bloco__titulo">{titulo}</p>
        {children}
      </div>
    </div>
  );
}
