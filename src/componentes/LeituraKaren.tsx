import type { Registro } from "../lib/jornada";
import { dataCurta } from "../lib/datas";

// MentorNote do kit: a voz da mentora em serif, com assinatura.
const SECOES: [string, string][] = [
  ["o_que_investigamos", "O que investigamos"],
  ["o_que_e_ativo", "O que é um ativo"],
  ["o_que_fazer_agora", "O que fazer agora"],
];

const TITULOS: Record<string, string> = {
  call_1: "Leitura da Call 1",
  mensagem_abertura: "Mensagem da Karen",
};

export default function LeituraKaren({ registro }: { registro: Registro }) {
  const c = registro.conteudo_mentora;
  const tipo = String(c.tipo_leitura ?? "");
  return (
    <section className="mem-mentor ws-measure">
      <span className="mem-label mem-muted">
        {TITULOS[tipo] ?? "Leitura da Karen"} · {dataCurta(registro.criado_em)}
      </span>
      {SECOES.filter(([k]) => typeof c[k] === "string" && (c[k] as string).trim()).map(([k, rotulo]) => (
        <div key={k} className="ws-leitura__secao">
          <p className="mem-label">{rotulo}</p>
          <p className="mem-mentor__text">{String(c[k])}</p>
        </div>
      ))}
      {typeof c.texto === "string" && c.texto.trim() && <p className="mem-mentor__text">{c.texto}</p>}
      <span className="mem-mentor__sig">— Karen, mentora</span>
    </section>
  );
}
