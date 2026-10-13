import { Link } from "react-router-dom";
import { useJornada } from "../../lib/useJornada";
import { CALLS_DO_MOVIMENTO, MOVIMENTOS, PILARES } from "../../lib/metodo";
import { dataCurta } from "../../lib/datas";
import FaixaPilar from "../../componentes/FaixaPilar";
import { leitura } from "../../lib/jornada";
import type { Encontro, Movimento } from "../../lib/jornada";
import Aviso from "../../componentes/Aviso";

// Movimentos que já têm tela construída.
export const MOVIMENTOS_PRONTOS = new Set([1, 2, 3, 4, 5, 6]);

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
        de seguir. Movimento e call não são a mesma coisa: o movimento é o trabalho; a call é onde vocês
        decidem. Às vezes uma call cobre dois movimentos.
      </p>
      <Trilha
        movimentos={dados.movimentos}
        encontros={dados.encontros}
        ligar={(n) => `/jornada/${n}`}
        mostrarPilares={!!leitura(dados, "call_1")}
        paraMentorada
      />
    </>
  );
}

// Pilares (MAPA, NORTE) só aparecem para a mentorada depois da leitura da
// Call 1: antes disso, nenhuma palavra do método (especificação do M1, seção 14).
export function Trilha({
  movimentos,
  encontros = [],
  ligar,
  mostrarPilares = true,
  paraMentorada = false,
}: {
  movimentos: Movimento[];
  encontros?: Encontro[];
  ligar: (n: number) => string;
  mostrarPilares?: boolean;
  // Para a mentorada: "Movimento 1" por extenso; "M1" fica só nas telas da mentora.
  paraMentorada?: boolean;
}) {
  const atual = movimentos.find((m) => m.estado === "aberto")?.codigo ?? 0;
  return (
    <nav className="mem-trail ws-trilha" aria-label="Trilha da jornada">
      {PILARES.map((pilar) => {
        const linha = movimentos.filter((m) => m.codigo >= pilar.de && m.codigo <= pilar.ate);
        const aqui = atual >= pilar.de && atual <= pilar.ate;
        return (
        <div key={pilar.nome} className="ws-trilha__pilar">
        {mostrarPilares && <FaixaPilar codigo={pilar.de} atual={aqui} />}
        <ol className="mem-trail__row ws-trilha__linha">
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
            const nome = paraMentorada ? MOVIMENTOS[m.codigo] : `M${m.codigo} · ${MOVIMENTOS[m.codigo]}`;
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
                  {paraMentorada ? `Movimento ${m.codigo} · ` : ""}
                  {estado}
                  {temDecisao && m.estado === "fechado" ? " · decidido" : ""}
                </span>
                {(() => {
                  const cm = CALLS_DO_MOVIMENTO[m.codigo];
                  if (!cm) return null;
                  const c = encontros.find((e) => e.tipo === "call" && e.numero === cm.decide);
                  const quando = c ? (c.estado === "realizado" ? " ✓" : ` · ${dataCurta(c.data_atual)}`) : "";
                  const texto = cm.comeca
                    ? `Começa na Call ${cm.comeca} · decisão na Call ${cm.decide}${quando}`
                    : `${temDecisao ? "Decisão na" : "Fecha na"} Call ${cm.decide}${quando}`;
                  return <span className="mem-body-sm mem-muted ws-trilha__call">{texto}</span>;
                })()}
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
        </div>
        );
      })}
      <p className="mem-body-sm mem-muted ws-trilha__legenda">
        <span className="mem-marker mem-marker--gate" aria-hidden="true" /> decisão com a Karen
      </p>
    </nav>
  );
}

export function MovimentoEmConstrucao({ codigo }: { codigo: number }) {
  return (
    <>
      <span className="mem-label mem-muted">Movimento {codigo}</span>
      <h1 className="mem-h1">{MOVIMENTOS[codigo]}</h1>
      <p className="mem-body ws-measure mem-muted">
        A tela deste movimento ainda está em construção.
      </p>
    </>
  );
}
