import type { Registro } from "../lib/jornada";
import { dataCurta } from "../lib/datas";
import { DEFINICAO_ATIVO } from "../lib/m2";

// MentorNote do kit: a voz da mentora em serif, com assinatura.
const SECOES: [string, string][] = [
  ["o_que_decidimos", "O que decidimos"],
  ["o_que_investigamos", "O que investigamos"],
  ["o_que_e_ativo", "O que é um ativo"],
  ["o_que_fazer_agora", "O que fazer agora"],
  ["o_que_levamos", "O que levamos"],
  ["o_que_assumimos", "O que assumimos"],
  ["o_que_estamos_apostando", "O que estamos apostando"],
  ["o_que_foi_construido", "O que foi construído"],
  ["o_que_e_hipotese", "O que é hipótese"],
  ["o_que_segue_m8", "O que segue para o próximo movimento"],
  ["o_que_preparamos", "O que preparamos"],
  ["o_que_aconteceu", "O que aconteceu"],
  ["a_leitura", "A leitura"],
  ["o_que_vem", "O que vem agora"],
  ["o_que_nao_sabemos", "O que ainda não sabemos"],
  ["o_que_muda", "O que muda a partir de agora"],
];

const TITULOS: Record<string, string> = {
  call_1: "Leitura da Call 1",
  mensagem_abertura: "Mensagem da Karen",
  mapa_ativos: "Leitura com os seus padrões",
  call_2: "Leitura da Call 2",
  call_3: "Leitura da Call 3",
  passagem_norte: "Do MAPA para o NORTE",
  call_5: "Leitura da Call 5",
  call_6: "Leitura da Call 6",
  call_8: "Leitura da Call 8",
  call_9: "Leitura da Call 9",
};

export default function LeituraKaren({ registro }: { registro: Registro }) {
  const tipo = String(registro.conteudo_mentora.tipo_leitura ?? "");
  // Na leitura da Call 1, a definição de ativo entra sempre igual (decisão de 11/10).
  const c =
    tipo === "call_1" && !registro.conteudo_mentora.o_que_e_ativo
      ? { ...registro.conteudo_mentora, o_que_e_ativo: DEFINICAO_ATIVO }
      : registro.conteudo_mentora;
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
