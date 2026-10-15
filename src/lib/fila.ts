// Fila da mentora: o que a Karen precisa fazer, em todas as mentoradas,
// derivado dos registros (nada é cadastrado à parte).
import { call, leitura, movimentoAtual, type DadosJornada } from "./jornada";
import { enviadoEm, mudouDepoisDoEnvio } from "./envio";
import { somarHoras } from "./datas";
import { CALLS_DO_MOVIMENTO, MOVIMENTOS } from "./metodo";
import { dadosTeste, desenhoFeito, exposicoes, mentoraTeste } from "./m9";
import { mentoraM10 } from "./m10";
import { mentoraOportunidade, retornoDe } from "./m6";

export type ItemFila = {
  jornadaId: string;
  nome: string;
  titulo: string;
  detalhe?: string;
  prazo?: string; // ISO; sem prazo = quando puder
  para: string;
};

// Leitura esperada depois de cada call (a Call 7 e a Call 10 não têm leitura própria).
export const LEITURA_DA_CALL: Record<number, string> = {
  1: "call_1",
  2: "call_2",
  3: "call_3",
  4: "passagem_norte",
  5: "call_5",
  6: "call_6",
  8: "call_8",
  9: "call_9",
};

export function itensDaFila(d: DadosJornada, nome: string): ItemFila[] {
  const id = d.jornada.id;
  const pagina = `/mentoradas/${id}`;
  const itens: ItemFila[] = [];

  // 1. Leituras pendentes depois de calls realizadas (prazo de 48 h).
  for (const e of d.encontros) {
    if (e.tipo !== "call" || e.estado !== "realizado" || !e.numero) continue;
    const tipo = LEITURA_DA_CALL[e.numero];
    if (!tipo || leitura(d, tipo)) continue;
    itens.push({
      jornadaId: id,
      nome,
      titulo: `Publicar a leitura da Call ${e.numero}`,
      prazo: somarHoras(e.data_realizada ?? e.data_atual, 48),
      para: pagina,
    });
  }

  // 2. Padrões do M2, depois da leitura da Call 1.
  const l1 = leitura(d, "call_1");
  if (l1 && !leitura(d, "mapa_ativos")) {
    const prazo = l1.conteudo_mentora.prazo_padroes as string | undefined;
    itens.push({ jornadaId: id, nome, titulo: "Publicar os padrões que você enxergou", prazo: prazo ? `${prazo}T23:59:00-03:00` : undefined, para: pagina });
  }

  // 3. Ela enviou a parte dela: ler antes da próxima call.
  const atual = movimentoAtual(d);
  if (atual) {
    const env = enviadoEm(d, atual);
    const numero = CALLS_DO_MOVIMENTO[atual]?.decide;
    const c = numero ? call(d, numero) : undefined;
    if (env && c && c.estado !== "realizado") {
      itens.push({
        jornadaId: id,
        nome,
        titulo: `Ler o que ela enviou e preparar a Call ${numero}`,
        detalhe: `Movimento ${atual} · ${MOVIMENTOS[atual]}${mudouDepoisDoEnvio(d, atual) ? " · ela mudou algo depois de enviar" : ""}`,
        prazo: c.data_atual,
        para: `/mentoradas/${id}/call/${numero}`,
      });
    }
  }

  // 3b. Retorno único: depois que ela refaz, você confere e registra por escrito.
  const ret = retornoDe(d);
  if (ret && atual === 6 && !mentoraOportunidade(d).assumida_em) {
    const env = enviadoEm(d, 6);
    if (env && ret.acionado_em && env > ret.acionado_em)
      itens.push({ jornadaId: id, nome, titulo: "Conferir a oportunidade refeita e registrar por escrito", detalhe: "Retorno único, sem call", prazo: somarHoras(env, 48), para: pagina });
  }

  // 4. Teste comercial: conferência do desenho e revisão das duas primeiras exposições (48 h).
  if (atual === 9) {
    const t = dadosTeste(d);
    const m = mentoraTeste(d);
    const ex = exposicoes(d);
    if (desenhoFeito(t) && !m.conferencia?.texto) itens.push({ jornadaId: id, nome, titulo: "Conferir o desenho do teste, por escrito", para: pagina });
    if (ex.length >= 2 && !m.revisao?.texto)
      itens.push({ jornadaId: id, nome, titulo: "Revisar as duas primeiras exposições", prazo: somarHoras(ex[1].criado_em, 48), para: pagina });
  }

  // 5. Conversa de fechamento opcional (até 14 dias depois da Call 10).
  const m10 = mentoraM10(d);
  if (m10.gate_em && m10.status_jornada !== "demonstrada" && !m10.conversa_em) {
    const prazo = somarHoras(m10.gate_em, 24 * 14);
    if (new Date(prazo) > new Date())
      itens.push({ jornadaId: id, nome, titulo: "Conversa de fechamento (opcional)", detalhe: "Só as capacidades que faltaram", prazo, para: pagina });
  }

  return itens;
}
