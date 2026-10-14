// Regras do M10 · Aprender e Decidir (Especificação V2 do M10). Call 10. Fecha a jornada.
import type { DadosJornada, Registro } from "./jornada";
import { decisaoM5, type DecisaoM5 } from "./m5";
import { aposta, mentoraOportunidade, valorItem } from "./m6";
import { ativoAConfirmar, dadosOferta } from "./m7";
import { dadosHipotese, fraseTexto, hipoteses } from "./m3";
import { dadosTeste, mentoraTeste } from "./m9";

export type Decisao10 = "continuar" | "ajustar" | "investigar" | "retornar" | "abandonar";
export type Estatuto = "validada" | "fortalecida" | "enfraquecida" | "nao_testada";
export type CapKey = "reconstruir" | "distinguir" | "justificar" | "proximo";
export type DecisaoM10 = {
  aconteceu?: string;
  sugere?: string;
  aprendi?: { texto: string; muda: string | string[] }[]; // muda: uma ou mais partes (antes era uma só)
  decisao?: Decisao10;
  porque?: string;
  nao_sabe?: string;
  revisao?: string;
  estatuto?: Estatuto;
  retorno?: { para?: string; o_que?: string };
  investigacao?: { pergunta?: string; hipotese?: string; evidencia?: string; limite?: string };
  historico?: { acreditava?: string; aconteceu?: string; acredita?: string };
  ativo?: { criterio?: string; status?: "confirmado" | "nao_confirmado" | "a_confirmar" };
  plano?: { acao?: string; pergunta?: string; evidencia?: string; revisitar?: string };
  reflexao?: string;
};
export type Capacidade = { demonstrada?: boolean; perguntas?: { texto: string; tipo: "esclarecimento" | "conducao" }[]; faltou?: string; na_conversa?: boolean };
export type DecisaoM10Mentora = {
  reserva?: { atingida?: boolean; evidencia?: string };
  comprador?: { sustenta?: string; contradiz?: string; desconhecido?: string };
  ativo?: { criterio_aceito?: boolean; criterio_em?: string; status?: string };
  termos?: Partial<Record<"t1" | "t2" | "t3" | "t4" | "t5", boolean>>;
  parte_a?: Partial<Record<"a1" | "a2" | "a3" | "a4" | "a5" | "a6", boolean>>;
  capacidades?: Partial<Record<CapKey, Capacidade>>;
  leitura_final?: string;
  discordancia_estatuto?: string;
  estatuto_registrado?: Estatuto;
  status_jornada?: "demonstrada" | "parcial" | "nao_demonstrada";
  gate_em?: string;
  conversa_em?: string;
};

export const DECISOES_10: { valor: Decisao10; rotulo: string; detalhe: string }[] = [
  { valor: "continuar", rotulo: "Continuar", detalhe: "o que aconteceu basta para seguir sem mudar a estrutura agora" },
  { valor: "ajustar", rotulo: "Ajustar", detalhe: "sei o ponto que travou e mudo só ele" },
  { valor: "investigar", rotulo: "Investigar", detalhe: "vi um sinal, mas ainda não sei a causa" },
  { valor: "retornar", rotulo: "Voltar um passo", detalhe: "algo que eu tinha assumido antes não se sustentou" },
  { valor: "abandonar", rotulo: "Arquivar esta aposta", detalhe: "continuar não é a escolha mais racional hoje, ou eu não quero mais" },
];

export const ESTATUTOS: { valor: Estatuto; rotulo: string; detalhe: string }[] = [
  { valor: "validada", rotulo: "Validada para continuar sob as condições testadas", detalhe: "compras de várias pessoas compatíveis, pelo mesmo motivo, sem nada contra; só com o teste lido como favorável" },
  { valor: "fortalecida", rotulo: "Fortalecida, não validada", detalhe: "o teste deu sinais a favor, mas ainda não basta" },
  { valor: "enfraquecida", rotulo: "Enfraquecida", detalhe: "o teste deu sinais contra" },
  { valor: "nao_testada", rotulo: "Não testada o suficiente", detalhe: "poucas pessoas ou mudanças demais" },
];
export function rotuloEstatuto(v?: string) {
  return ESTATUTOS.find((e) => e.valor === v)?.rotulo ?? "—";
}
export function rotuloDecisao(v?: string) {
  return DECISOES_10.find((e) => e.valor === v)?.rotulo ?? "—";
}

export const MUDA = [
  { valor: "problema", rotulo: "O problema" },
  { valor: "comprador", rotulo: "Quem compra" },
  { valor: "promessa", rotulo: "A promessa" },
  { valor: "apresentacao", rotulo: "A apresentação" },
  { valor: "oferta", rotulo: "A oferta" },
  { valor: "preco", rotulo: "O preço" },
  { valor: "caminho", rotulo: "O caminho até pagar" },
  { valor: "capacidade", rotulo: "A capacidade" },
  { valor: "oportunidade", rotulo: "A oportunidade" },
];

// O que um aprendizado muda: pode ser mais de uma parte. Aceita o formato antigo (uma só).
export function mudasDe(a: { muda?: string | string[] }): string[] {
  return Array.isArray(a.muda) ? a.muda : a.muda ? [a.muda] : [];
}
export function alternarMuda(a: { muda?: string | string[] }, v: string): string[] {
  const m = mudasDe(a);
  return m.includes(v) ? m.filter((x) => x !== v) : [...m, v];
}
export function rotuloMudas(a: { muda?: string | string[] }): string {
  return mudasDe(a).map((v) => MUDA.find((z) => z.valor === v)?.rotulo.toLowerCase() ?? v).join(", ") || "—";
}

export const RETORNOS = [
  { valor: "M8_comunicacao", rotulo: "Explicar melhor", detalhe: "as pessoas não entenderam algo que a oferta já entrega (Movimento 8)" },
  { valor: "M8_apresentacao", rotulo: "Reorganizar a apresentação, o caminho ou a condição", detalhe: "Movimento 8" },
  { valor: "M8_promessa", rotulo: "Mudar a promessa", detalhe: "Movimento 8" },
  { valor: "M7", rotulo: "Refazer uma parte da oferta", detalhe: "entrega, forma, capacidade ou preço (Movimento 7)" },
  { valor: "M6", rotulo: "Rever a oportunidade", detalhe: "problema, para quem, situação ou caminho (Movimento 6)" },
  { valor: "MAPA", rotulo: "Rever a aposta", detalhe: "primeiro, a reserva do Movimento 5, se a condição foi atingida" },
];

export const CAPACIDADES: { chave: CapKey; titulo: string; abertura: string; observa: string }[] = [
  { chave: "reconstruir", titulo: "Reconstruir o caminho", abertura: "Me conta, sem olhar, como você saiu da sua história e chegou a esta oferta.", observa: "Uma cadeia de decisões com razões, não uma lista de etapas." },
  { chave: "distinguir", titulo: "Distinguir fato, inferência e hipótese", abertura: "Destas conclusões suas, qual é fato, qual é interpretação e qual ainda é hipótese?", observa: "Separa o que aconteceu do que interpreta, sem ser conduzida." },
  { chave: "justificar", titulo: "Justificar a decisão", abertura: "Por que essa decisão, e não as outras?", observa: "Cita a evidência e reconhece o que não sabe." },
  { chave: "proximo", titulo: "Definir o próximo passo e o que a faria mudar", abertura: "Qual é o próximo passo, e o que faria você mudar de ideia?", observa: "Formula a condição de revisão sozinha." },
];

export const TERMOS = [
  { k: "t1", t: "Comportamento de compra não isolado, consistente e convergente (outras pessoas compatíveis compraram ou avançaram pelos mesmos motivos e condições)" },
  { k: "t2", t: "Compras de pessoas compatíveis (“sim”), não próximas, dentro do limite de retomadas, sem entendimento errado da promessa" },
  { k: "t3", t: "Sem contradição relevante: nenhum motivo recorrente contra problema, promessa, comprador ou preço" },
  { k: "t4", t: "Não depende de explicação desconhecida: compraram pelo que a oferta diz resolver" },
  { k: "t5", t: "Sob as condições testadas: compras sob as mesmas condições (cada lado de uma mudança lido separado)" },
] as const;

export const PARTE_A = [
  { k: "a1", t: "A evidência do M9 foi interpretada com limites claros" },
  { k: "a2", t: "As conclusões que sustentam a decisão foram classificadas (fato, inferência, hipótese, desconhecido)" },
  { k: "a3", t: "Hipóteses fortalecidas e enfraquecidas e os desconhecidos estão explícitos; aprendizados específicos" },
  { k: "a4", t: "A decisão é explícita e proporcional à evidência, com fundamento, limite, condição de revisão e retorno quando preciso" },
  { k: "a5", t: "Reserva do M5, comprador crítico do M6 e ativo a confirmar foram considerados" },
  { k: "a6", t: "Nenhuma opinião tratada como comportamento, nenhuma evidência contrária ignorada, nada de “continuar porque quero”" },
] as const;

export function decisaoM10De(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "decisao_m10");
}
export function dadosM10(d: DadosJornada): DecisaoM10 {
  return (decisaoM10De(d)?.conteudo ?? {}) as DecisaoM10;
}
export function mentoraM10(d: DadosJornada): DecisaoM10Mentora {
  return (decisaoM10De(d)?.conteudo_mentora ?? {}) as DecisaoM10Mentora;
}

export function leituraGate7(d: DadosJornada): string | undefined {
  return mentoraTeste(d).leitura_registrada ?? dadosTeste(d).leitura?.geral;
}

export function reservaM5(d: DadosJornada): { frase: string; condicao: string } | null {
  const dec = decisaoM5(d);
  const c = dec?.conteudo_mentora as DecisaoM5 | undefined;
  if (!c?.reserva) return null;
  const h = hipoteses(d).find((x) => x.id === c.reserva);
  return { frase: h ? fraseTexto(d, dadosHipotese(h)) : "—", condicao: c.reserva_condicao ?? "—" };
}

export function competenciasAConfirmar(d: DadosJornada): string[] {
  const comp = Object.values(dadosOferta(d).como?.competencia ?? {})
    .map((c) => c.qual?.trim())
    .filter(Boolean) as string[];
  if (comp.length) return comp;
  if (ativoAConfirmar(d)) {
    const a = aposta(d);
    return a ? [valorItem(d, "direcao") || "o seu ativo"] : [];
  }
  return [];
}

export function compradorCriticoM6(d: DadosJornada): boolean {
  return !!mentoraOportunidade(d).comprador_critico;
}

const t = (v?: string) => !!v?.trim();
export function quatroFeitas(x: DecisaoM10): boolean {
  return t(x.aconteceu) && t(x.sugere) && (x.aprendi ?? []).some((a) => t(a.texto) && mudasDe(a).length > 0);
}
export function decisaoFeita(x: DecisaoM10): boolean {
  if (!x.decisao || !t(x.porque) || !t(x.nao_sabe) || !t(x.revisao) || !x.estatuto) return false;
  if ((x.decisao === "ajustar" || x.decisao === "retornar") && (!x.retorno?.para || !t(x.retorno.o_que))) return false;
  if (x.decisao === "investigar" && (!t(x.investigacao?.pergunta) || !t(x.investigacao?.evidencia) || !t(x.investigacao?.limite))) return false;
  return true;
}
export function planoFeito(x: DecisaoM10): boolean {
  return t(x.plano?.acao) && t(x.plano?.pergunta) && !!x.plano?.revisitar;
}
export function prontaCall10(d: DadosJornada): boolean {
  const x = dadosM10(d);
  return quatroFeitas(x) && decisaoFeita(x) && planoFeito(x);
}
export function faltaEnvioM10(d: DadosJornada): string[] {
  const x = dadosM10(d);
  const f: string[] = [];
  if (!quatroFeitas(x)) f.push("as três primeiras perguntas");
  if (!decisaoFeita(x)) f.push("a decisão");
  if (!planoFeito(x)) f.push("o plano depois da jornada");
  if (competenciasAConfirmar(d).length && !t(x.ativo?.criterio)) f.push("o que mostraria que você sabe fazer o que ainda está a confirmar");
  return f;
}

export function rotuloStatusJornada(s?: string): string {
  if (s === "demonstrada") return "Jornada concluída · autonomia demonstrada";
  if (s === "parcial") return "Jornada concluída · autonomia parcial";
  if (s === "nao_demonstrada") return "Jornada concluída · autonomia ainda não demonstrada";
  return "—";
}
