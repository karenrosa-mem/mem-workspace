import { Link } from "react-router-dom";
import { useJornada } from "../../lib/useJornada";
import { MOVIMENTOS } from "../../lib/metodo";
import type { Movimento } from "../../lib/jornada";
import Aviso from "../../componentes/Aviso";

// Movimentos que já têm tela construída.
export const MOVIMENTOS_PRONTOS = new Set([1]);

// O mapa da jornada (JourneyTrail do kit). Para a mentorada, a passagem é
// "decisão com a Karen" — nunca "Gate N" (adaptação aprovada em 09/10).
export default function Jornada() {
  const { dados, erro } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (dados === undefined) return null;
  if (dados === null)
    return (
      <>
        <span className="mem-label mem-muted">Jornada</span>
        <h1 className="mem-h1">Sua jornada ainda não começou</h1>
      </>
    );

  return (
    <>
      <span className="mem-label mem-muted">Jornada</span>
      <h1 className="mem-h1">Seu caminho</h1>
      <p className="mem-body ws-measure">
        Dez movimentos, um de cada vez. O losango marca uma decisão que você toma com a Karen antes
        de seguir.
      </p>
      <Trilha movimentos={dados.movimentos} ligar={(n) => `/jornada/${n}`} />
    </>
  );
}

export function Trilha({ movimentos, ligar }: { movimentos: Movimento[]; ligar: (n: number) => string }) {
  const linhas = [
    movimentos.filter((m) => m.codigo <= 5),
    movimentos.filter((m) => m.codigo > 5),
  ];
  return (
    <nav className="mem-trail ws-trilha" aria-label="Trilha da jornada">
      {linhas.map((linha, i) => (
        <ol key={i} className="mem-trail__row ws-trilha__linha">
          {linha.map((m, j) => {
            const classe =
              m.estado === "fechado" ? "mem-stop--done" : m.estado === "aberto" ? "mem-stop--current" : "";
            const marcador =
              m.estado === "fechado" ? "done" : m.estado === "aberto" ? "current" : "next";
            const estado =
              m.estado === "fechado" ? "Concluído" : m.estado === "aberto" ? "Você está aqui" : "A seguir";
            const temDecisao = m.codigo >= 2; // M1 fecha por critério; do M2 em diante, por decisão
            const ultimoDaLinha = j === linha.length - 1;
            const caminho = m.estado === "fechado" ? "mem-path" : "mem-path mem-path--future";
            const clicavel = m.estado !== "nao_iniciado";
            const nome = `M${m.codigo} · ${MOVIMENTOS[m.codigo]}`;
            return (
              <li key={m.codigo} className={`mem-stop ${classe}`} aria-current={m.estado === "aberto" ? "step" : undefined}>
                <div className="mem-stop__track">
                  <span className={`mem-marker mem-marker--${marcador}`} aria-hidden="true" />
                  {(temDecisao || !ultimoDaLinha) && <span className={caminho} />}
                  {temDecisao && (
                    <span className="mem-marker mem-marker--gate" title="Decisão com a Karen" aria-hidden="true" />
                  )}
                  {temDecisao && !ultimoDaLinha && <span className={caminho} />}
                </div>
                <span className="mem-stop__state">
                  {estado}
                  {temDecisao && m.estado === "fechado" ? " · decidido" : ""}
                </span>
                {clicavel ? (
                  <Link className="mem-stop__name ws-trilha__link" to={ligar(m.codigo)}>
                    {nome}
                  </Link>
                ) : (
                  <span className="mem-stop__name">{nome}</span>
                )}
              </li>
            );
          })}
        </ol>
      ))}
      <p className="mem-body-sm mem-muted ws-trilha__legenda">
        <span className="mem-marker mem-marker--gate" aria-hidden="true" /> decisão com a Karen
      </p>
    </nav>
  );
}

export function MovimentoEmConstrucao({ codigo }: { codigo: number }) {
  return (
    <>
      <span className="mem-label mem-muted">M{codigo}</span>
      <h1 className="mem-h1">{MOVIMENTOS[codigo]}</h1>
      <p className="mem-body ws-measure mem-muted">
        A tela deste movimento ainda está em construção.
      </p>
    </>
  );
}
