// Regras do M7 · Desenhar a Oferta (Especificação V1 fechada do M7 e Modelo por movimento, M7).
// Ordem fixa: entrega → como → forma → capacidade → preço. Nada vem preenchido.
import type { DadosJornada, Registro } from "./jornada";
import type { Situacao } from "./m1";
import { situacoesDoPadrao } from "./m2";
import { ativosEscolhidos, dadosHipotese, type Hipotese } from "./m3";
import { conversasDe, sinaisMercadoDe, situacaoPublico, type Conversa, type SinalMercado } from "./m4";
import { aposta, mentoraOportunidade, valorItem } from "./m6";

export type Oferta = {
  entrega?: { texto?: string; cobre?: string; fora?: string };
  como?: { etapas?: string[]; diferencial?: string; competencia?: Record<string, { qual?: string; ja_fez?: string }> };
  forma?: { tipo?: TipoOferta; texto?: string; porque?: string; inclui?: string; exclui?: string };
  capacidade?: { horas_semana?: number; horas_cliente?: number; limites?: string; pronto_antes?: string };
  preco?: { valor?: number; condicao?: string; racional?: string };
  transversal?: string;
  anotacoes_m8?: string;
};
export type OfertaMentora = {
  competencia?: Record<string, { limite?: string; observacao?: string }>;
  hipoteses?: string[];
  recomendacoes?: { texto: string; concordou?: boolean }[];
  verificacao?: Partial<Record<"v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7", boolean>>;
  assumida_em?: string;
  clientes_simultaneos?: number;
};

// Premissa do MEM (15/10): o primeiro produto é uma oferta de acompanhamento,
// definida e vendida antes de ser entregue. Mentoria por padrão; consultoria ou serviço quando
// o que ela sabe é fazer, não ensinar.
export type TipoOferta = "mentoria" | "consultoria" | "servico";
export const TIPOS_OFERTA: { valor: TipoOferta; rotulo: string; detalhe: string }[] = [
  { valor: "mentoria", rotulo: "Mentoria", detalhe: "você ensina a pessoa a fazer, acompanhando de perto" },
  { valor: "consultoria", rotulo: "Consultoria", detalhe: "você analisa e diz o que fazer; ela executa" },
  { valor: "servico", rotulo: "Serviço", detalhe: "você faz por ela, com começo e fim definidos" },
];
export function rotuloTipoOferta(v?: string): string | undefined {
  return TIPOS_OFERTA.find((t) => t.valor === v)?.rotulo;
}

export type ChaveDecisao = "entrega" | "como" | "forma" | "capacidade" | "preco";
export const DECISOES: { chave: ChaveDecisao; n: number; titulo: string; pergunta: string }[] = [
  { chave: "entrega", n: 1, titulo: "O que a pessoa leva", pergunta: "Ao final, o que estará concretamente diferente para essa pessoa?" },
  { chave: "como", n: 2, titulo: "Como você faz", pergunta: "Por quais etapas a pessoa passa, e o que você faz em cada uma?" },
  { chave: "forma", n: 3, titulo: "Como acontece na prática", pergunta: "Formato, duração, frequência e suporte. E o que fica de fora?" },
  { chave: "capacidade", n: 4, titulo: "O que você consegue sustentar", pergunta: "Quanto tempo você tem, de verdade, por semana? Quanto cada cliente toma?" },
  { chave: "preco", n: 5, titulo: "Por quanto", pergunta: "Por quanto você começa, e por quê? Como a pessoa paga?" },
];

export const HIPOTESE_FIXA = "Isso ainda é hipótese. O teste vai mostrar se funciona.";
export const TRANSVERSAL_M7 = "Em uma ou duas frases: por que a sua oferta é assim, e não de outro jeito?";

export function ofertaDe(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "oferta");
}
export function dadosOferta(d: DadosJornada): Oferta {
  return (ofertaDe(d)?.conteudo ?? {}) as Oferta;
}
export function mentoraOferta(d: DadosJornada): OfertaMentora {
  return (ofertaDe(d)?.conteudo_mentora ?? {}) as OfertaMentora;
}

export function etapas(o: Oferta): string[] {
  return (o.como?.etapas ?? []).map((e) => e.trim()).filter(Boolean);
}

export function clientesSimultaneos(o: Oferta): number | null {
  const hs = Number(o.capacidade?.horas_semana);
  const hc = Number(o.capacidade?.horas_cliente);
  if (!hs || !hc) return null;
  return Math.floor(hs / hc);
}

const t = (v?: string) => !!v?.trim();
export function decisaoFeita(o: Oferta, ch: ChaveDecisao): boolean {
  if (ch === "entrega") return t(o.entrega?.texto) && t(o.entrega?.cobre) && t(o.entrega?.fora);
  if (ch === "como") {
    const n = etapas(o).length;
    return n >= 3 && n <= 5 && t(o.como?.diferencial);
  }
  if (ch === "forma") return t(o.forma?.texto) && t(o.forma?.inclui) && t(o.forma?.exclui);
  if (ch === "capacidade") return clientesSimultaneos(o) !== null && t(o.capacidade?.pronto_antes);
  return typeof o.preco?.valor === "number" && o.preco.valor > 0 && t(o.preco?.condicao) && t(o.preco?.racional);
}

export function proximaDecisao(d: DadosJornada) {
  const o = dadosOferta(d);
  return DECISOES.find((x) => !decisaoFeita(o, x.chave));
}

export function prontaCall6(d: DadosJornada): boolean {
  return !proximaDecisao(d) && t(dadosOferta(d).transversal);
}

export function capacidadeNaoFecha(d: DadosJornada): boolean {
  const c = clientesSimultaneos(dadosOferta(d));
  return c !== null && c < 1;
}

export function faltaEnvioM7(d: DadosJornada): string[] {
  const o = dadosOferta(d);
  const f = DECISOES.filter((x) => !decisaoFeita(o, x.chave)).map((x) => `decisão ${x.n} (${x.titulo.toLowerCase()})`);
  if (!t(o.transversal)) f.push("a última pergunta: por que a oferta é assim");
  return f;
}

// "1.500", "R$ 1500,00" → 1500. Faixa ("1.000 a 1.500", "1000-1500") → null.
export function lerPreco(texto: string): number | null {
  const s = texto.trim();
  if (!s || /\d\s*(a|até|-|–|\/|ou)\s*\d/i.test(s)) return null;
  const limpo = s.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const v = Number(limpo);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function reais(v?: number): string {
  return typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }) : "—";
}

// Dependência de competência só se pergunta quando o ativo da aposta ainda está a confirmar.
export function ativoAConfirmar(d: DadosJornada): boolean {
  const a = aposta(d);
  if (!a) return false;
  const id = (dadosHipotese(a.hipotese) as Hipotese).ativo;
  return ativosEscolhidos(d).find((x) => x.id === id)?.rotulo === "ativo_a_confirmar";
}

// Limites: os do M6 + exclusões + os da competência.
export function limitesDaOferta(d: DadosJornada): string[] {
  const o = dadosOferta(d);
  const m = mentoraOferta(d);
  const out = [...(mentoraOportunidade(d).limites ?? []).filter((x) => x.trim())];
  if (t(o.forma?.exclui)) out.push(`Não inclui: ${o.forma!.exclui!.trim()}`);
  Object.values(m.competencia ?? {}).forEach((c) => c.limite?.trim() && out.push(c.limite.trim()));
  return out;
}

// Hipóteses que seguem para o M8 e o M9 (rascunho; a Karen completa).
export function hipotesesPadrao(d: DadosJornada): string[] {
  const o = dadosOferta(d);
  const comprador = valorItem(d, "comprador");
  const h = ["Se alguém compra."];
  if (o.preco?.valor) h.push(`Se compram por ${reais(o.preco.valor)}${o.preco.condicao ? `, ${o.preco.condicao.trim()}` : ""}.`);
  if (t(o.forma?.texto)) h.push(`Se aceitam a forma: ${o.forma!.texto!.trim()}.`);
  if (comprador) h.push(`Se quem paga é: ${comprador}.`);
  if (o.capacidade?.horas_cliente) h.push(`Se o tempo real por cliente é ${String(o.capacidade.horas_cliente).replace(".", ",")} h por semana.`);
  Object.entries(o.como?.competencia ?? {}).forEach(([i, c]) => {
    if (c.qual?.trim()) h.push(`Se a competência “${c.qual.trim()}” (etapa ${Number(i) + 1}) se sustenta na entrega.`);
  });
  return h;
}

// Material ao lado de cada decisão.
export function materialM7(d: DadosJornada, ch: ChaveDecisao): { titulo: string; itens: string[] }[] {
  const a = aposta(d);
  const g: { titulo: string; itens: string[] }[] = [];
  const op = (k: Parameters<typeof valorItem>[1]) => valorItem(d, k);
  if (ch === "entrega") {
    g.push({ titulo: "Destino (Movimento 6)", itens: [op("destino") || "—"] });
    g.push({ titulo: "O que a pessoa quer que mude", itens: [op("desejo") || "Não apareceu no que você ouviu"] });
  }
  if (ch === "como" && a) {
    g.push({ titulo: "Como você ajuda (Movimento 6)", itens: [op("direcao") || "—"] });
    const id = (dadosHipotese(a.hipotese) as Hipotese).ativo;
    const at = ativosEscolhidos(d).find((x) => x.id === id);
    const sits = at ? situacoesDoPadrao(d, at.registro).map((s) => (s.conteudo as Situacao).o_que_fez?.trim()).filter(Boolean) : [];
    g.push({ titulo: "O que você já fez", itens: (sits as string[]).length ? (sits as string[]) : ["—"] });
    const tent = a.frente
      ? conversasDe(d, a.frente)
          .filter((r) => situacaoPublico(r) === "conta" && (r.conteudo as Conversa).tentou)
          .map((r) => (r.conteudo as Conversa).tentou_como?.trim() || "tentou resolver")
      : [];
    g.push({ titulo: "O que as pessoas já tentaram e não resolveu", itens: tent.length ? tent : ["Nada registrado: o diferencial fica como hipótese"] });
  }
  if (ch === "forma") {
    const o = dadosOferta(d);
    g.push({ titulo: "O seu como", itens: etapas(o).map((e, i) => `${i + 1}. ${e}`) });
  }
  if (ch === "capacidade") {
    g.push({ titulo: "Para fazer a conta", itens: ["Horas que você tem hoje, com o emprego e a vida que você tem agora, não as que gostaria de ter."] });
  }
  if (ch === "preco" && a) {
    const o = dadosOferta(d);
    const c = clientesSimultaneos(o);
    g.push({ titulo: "Sua capacidade", itens: [c !== null ? `até ${c} ${c === 1 ? "cliente" : "clientes"} ao mesmo tempo` : "—"] });
    g.push({ titulo: "Quem você aposta que compra", itens: [op("comprador") || "Ainda não sabe"] });
    const pag = a.frente
      ? conversasDe(d, a.frente)
          .filter((r) => situacaoPublico(r) === "conta" && (r.conteudo as Conversa).pagou)
          .map((r) => (r.conteudo as Conversa).pagou_oque?.trim() || "pagou por algo")
      : [];
    const sin = a.frente
      ? sinaisMercadoDe(d, a.frente).map((r) => {
          const s = r.conteudo as SinalMercado;
          return `${s.nome?.trim() || "solução à venda"}${s.preco?.trim() ? ` · ${s.preco.trim()}` : ""}`;
        })
      : [];
    g.push({ titulo: "O que já pagaram ou o que já vende", itens: [...pag, ...sin].length ? [...pag, ...sin] : ["Nada registrado: o racional pode se apoiar no tempo e em quem paga"] });
  }
  return g;
}
