import type { ReactNode } from "react";

// Roteiro de um movimento na tela da mentora: os passos em ordem, quem faz
// cada um e onde ela está. Responde "o que eu faço agora?" sem ler a página toda.

export type Quem = "Você" | "Ela" | "Juntas";
export type EstadoPasso = "feito" | "agora" | "depois" | "esperando";
export type Passo = { id: string; titulo: string; quem: Quem; estado: EstadoPasso; nota?: string };

const ROTULO_ESTADO: Record<EstadoPasso, string> = {
  feito: "Feito",
  agora: "Agora",
  depois: "Depois",
  esperando: "Esperando por ela",
};

export function Roteiro({ titulo, passos }: { titulo: string; passos: Passo[] }) {
  return (
    <nav className="ws-roteiro" aria-label={titulo}>
      <p className="mem-label mem-muted">{titulo}</p>
      <ol className="ws-roteiro__lista">
        {passos.map((p, i) => (
          <li key={p.id} className={`ws-roteiro__item ws-roteiro__item--${p.estado}`}>
            <span className="ws-roteiro__n" aria-hidden="true">
              {p.estado === "feito" ? "✓" : i + 1}
            </span>
            <a href={`#${p.id}`} className="ws-roteiro__link">
              <span className="mem-body-sm ws-roteiro__titulo">{p.titulo}</span>
              <span className="mem-body-sm mem-muted">
                {p.quem} · {ROTULO_ESTADO[p.estado]}
                {p.nota ? ` · ${p.nota}` : ""}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Um passo da página: número, quem faz, título, por que importa e o conteúdo.
export function Etapa({
  passo,
  n,
  porque,
  children,
  aberta = true,
}: {
  passo: Passo;
  n: number;
  porque?: string;
  children?: ReactNode;
  aberta?: boolean; // passos feitos podem ficar recolhidos
}) {
  const cabeca = (
    <div className="ws-etapa__cabeca">
      <span className={`ws-etapa__n ws-etapa__n--${passo.estado}`} aria-hidden="true">
        {passo.estado === "feito" ? "✓" : n}
      </span>
      <div className="ws-etapa__titulos">
        <span className="mem-label mem-muted">
          Passo {n} · {passo.quem} · {ROTULO_ESTADO[passo.estado]}
        </span>
        <h3 className="mem-h3 ws-etapa__titulo">{passo.titulo}</h3>
      </div>
    </div>
  );
  if (!aberta)
    return (
      <details className={`ws-etapa ws-etapa--${passo.estado}`} id={passo.id}>
        <summary>{cabeca}</summary>
        <div className="ws-etapa__corpo">
          {porque && <p className="mem-body mem-muted ws-measure">{porque}</p>}
          {children}
        </div>
      </details>
    );
  return (
    <section className={`ws-etapa ws-etapa--${passo.estado}`} id={passo.id}>
      {cabeca}
      <div className="ws-etapa__corpo">
        {porque && <p className="mem-body mem-muted ws-measure">{porque}</p>}
        {children}
      </div>
    </section>
  );
}
