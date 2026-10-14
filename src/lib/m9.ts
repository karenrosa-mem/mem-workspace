// Regras do M9 · Teste Comercial (Arquitetura V1 revisada do M9). Call 9.
// Registro metodológico, não CRM: sem nomes. Contar fatos é permitido; dar nota, não.
import type { DadosJornada, Registro } from "./jornada";
import { diasEntre, hojeBrasilia } from "./datas";
import { mentoraOportunidade, valorItem } from "./m6";
import { clientesSimultaneos, dadosOferta } from "./m7";
import { ROTAS, dadosPreparo } from "./m8";

export type Ponto = "nao_evidencia" | "fraca" | "intermediaria" | "forte";
export type Teste = {
  desenho?: { fonte?: string; proximas?: string; inicio?: string; fim?: string };
  contagem?: Record<string, { tentados?: number; alcancados?: number }>;
  mudancas?: { tipo: string; o_que: string; em: string }[];
  encerramento?: { criterio?: string; em?: string };
  leitura?: { variaveis?: Record<string, string>; geral?: string; sintese?: string; limites?: string; abertas?: string };
};
export type TesteMentora = {
  conferencia?: { texto?: string; em?: string };
  revisao?: { texto?: string; em?: string };
  leitura_karen?: { geral?: string; porque?: string };
  verificacao?: Partial<Record<"v1" | "v2" | "v3" | "v4" | "v5" | "v6", boolean>>;
  gate_em?: string;
  leitura_registrada?: string;
};
export type Exposicao = {
  perfil?: string;
  compativel?: "sim" | "em_parte" | "nao";
  proxima?: boolean;
  rota?: string;
  comportamento?: string;
  ponto?: Ponto;
  motivo?: string;
  fala?: string;
  preco?: string;
  retomadas?: number;
  comprador?: "pretendido" | "outro";
  entrega?: boolean;
};

export const COMPORTAMENTOS: { valor: string; rotulo: string; ponto: Ponto }[] = [
  { valor: "elogiou", rotulo: "Só elogiou, curtiu ou disse que compraria", ponto: "nao_evidencia" },
  { valor: "respondeu", rotulo: "Respondeu ou pediu “me conta mais”", ponto: "fraca" },
  { valor: "pergunta", rotulo: "Fez pergunta específica (como funciona, quando começa, parcelas)", ponto: "intermediaria" },
  { valor: "proposta", rotulo: "Pediu a proposta", ponto: "intermediaria" },
  { valor: "objecao", rotulo: "Levantou uma objeção concreta", ponto: "intermediaria" },
  { valor: "negociou", rotulo: "Negociou condição ou preço", ponto: "intermediaria" },
  { valor: "sim_data", rotulo: "Disse sim, com data", ponto: "intermediaria" },
  { valor: "iniciou_pagamento", rotulo: "Começou a pagar e não concluiu", ponto: "intermediaria" },
  { valor: "pagou", rotulo: "Pagou (ou pagou sinal ou reserva)", ponto: "forte" },
];

export const PONTOS: Record<Ponto, string> = {
  nao_evidencia: "Não conta como evidência",
  fraca: "Fraca",
  intermediaria: "Intermediária",
  forte: "Forte",
};

export const MOTIVOS: { valor: string; rotulo: string; variavel: string }[] = [
  { valor: "nao_entendi", rotulo: "“Não entendi bem o que é”", variavel: "compreensao" },
  { valor: "sem_problema", rotulo: "“Não tenho esse problema” / “não é prioridade”", variavel: "problema" },
  { valor: "nao_ajuda", rotulo: "“Não vejo como isso me ajuda”", variavel: "promessa" },
  { valor: "caro", rotulo: "“É caro” / “não tenho esse dinheiro agora”", variavel: "preco" },
  { valor: "confianca", rotulo: "“Não sei se confio” / “não te conheço”", variavel: "confianca" },
  { valor: "nao_decido", rotulo: "“Não sou eu quem decide ou paga”", variavel: "comprador" },
  { valor: "depois", rotulo: "“Mais pra frente”", variavel: "timing" },
  { valor: "sumiu", rotulo: "Sem motivo / sumiu", variavel: "nenhuma" },
];

export const PRECO = [
  { valor: "aceito", rotulo: "Aceito", detalhe: "pagou sem questionar o valor" },
  { valor: "questionado", rotulo: "Questionado", detalhe: "perguntou ou hesitou, mas seguiu" },
  { valor: "negociado", rotulo: "Negociado", detalhe: "pediu desconto ou outra condição" },
  { valor: "rejeitado", rotulo: "Rejeitado", detalhe: "disse que o preço é o motivo" },
  { valor: "nao_chegou", rotulo: "Não chegou ao preço", detalhe: "parou antes" },
];

export const CRITERIOS_FIM = [
  { valor: "suficiencia", rotulo: "As respostas começaram a se repetir", detalhe: "novas exposições não acrescentariam" },
  { valor: "capacidade", rotulo: "A capacidade se preencheu" },
  { valor: "teto", rotulo: "Chegou a 20 contatos tentados" },
  { valor: "janela", rotulo: "A janela de 14 dias acabou" },
  { valor: "interrupcao", rotulo: "Precisou interromper", detalhe: "problema na oferta ou na promessa" },
];

export const MUDANCAS = [
  { valor: "explicacao", rotulo: "Explicação", detalhe: "palavras, ordem, exemplo; só se 2 pessoas não entenderam" },
  { valor: "rota", rotulo: "Por onde as pessoas conhecem", detalhe: "só se não estiver alcançando quem compra" },
  { valor: "condicao", rotulo: "Condição de pagamento", detalhe: "por exemplo, parcelamento" },
] as const;

export const LEITURAS = [
  { valor: "favoravel", rotulo: "Evidência favorável", detalhe: "mais de uma compra de pessoas compatíveis (não próximas), ou uma compra com avanços que se repetem; quem não seguiu não aponta contra a promessa ou o problema" },
  { valor: "parcial", rotulo: "Evidência parcial ou mista", detalhe: "avanços que se repetem com compras ausentes ou isoladas; ou compras de fora de quem você esperava; ou um motivo concentrado" },
  { valor: "inconclusiva", rotulo: "Evidência inconclusiva", detalhe: "poucas exposições (acesso ou tempo), ou muitas pessoas próximas, ou mudança que impede comparar" },
  { valor: "desfavoravel", rotulo: "Evidência desfavorável", detalhe: "exposições suficientes, nenhum avanço intermediário ou forte, motivos convergindo para “não tenho esse problema” ou “não vejo como ajuda”" },
] as const;
export function rotuloLeitura(v?: string): string {
  return LEITURAS.find((l) => l.valor === v)?.rotulo ?? "—";
}

export const VARIAVEIS = [
  { chave: "problema", rotulo: "O problema" },
  { chave: "promessa", rotulo: "A promessa" },
  { chave: "compreensao", rotulo: "A explicação" },
  { chave: "comprador", rotulo: "Quem compra" },
  { chave: "preco", rotulo: "Preço e condição" },
  { chave: "rota", rotulo: "Por onde as pessoas conheceram" },
  { chave: "caminho", rotulo: "O caminho até pagar" },
  { chave: "entrega", rotulo: "A entrega" },
] as const;

export function testeDe(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "teste");
}
export function dadosTeste(d: DadosJornada): Teste {
  return (testeDe(d)?.conteudo ?? {}) as Teste;
}
export function mentoraTeste(d: DadosJornada): TesteMentora {
  return (testeDe(d)?.conteudo_mentora ?? {}) as TesteMentora;
}
export function exposicoes(d: DadosJornada): Registro[] {
  return d.registros.filter((r) => r.tipo === "exposicao");
}
export const ex = (r: Registro) => r.conteudo as Exposicao;

export function rotaInicial(d: DadosJornada): string {
  return dadosPreparo(d).rota?.tipo ?? "conversa";
}
export function rotuloRota(v?: string): string {
  return ROTAS.find((r) => r.valor === v)?.rotulo ?? v ?? "—";
}
export function rotasEmUso(d: DadosJornada): string[] {
  const t = dadosTeste(d);
  const mud = (t.mudancas ?? []).filter((m) => m.tipo === "rota");
  const outras = Object.keys(t.contagem ?? {});
  return Array.from(new Set([rotaInicial(d), ...outras, ...mud.map((m) => m.o_que.split(":")[0]).filter((x) => ROTAS.some((r) => r.valor === x))]));
}

export function capacidade(d: DadosJornada): number | null {
  return clientesSimultaneos(dadosOferta(d));
}

export function desenhoFeito(t: Teste): boolean {
  return !!t.desenho?.fonte?.trim() && !!t.desenho?.inicio && !!t.desenho?.fim;
}

export function diaDaJanela(t: Teste): { dia: number; total: number } | null {
  if (!t.desenho?.inicio || !t.desenho?.fim) return null;
  const hoje = hojeBrasilia();
  return { dia: Math.max(0, diasEntre(t.desenho.inicio, hoje) + 1), total: diasEntre(t.desenho.inicio, t.desenho.fim) + 1 };
}

// Resumo factual (contagens são fatos, não nota).
export function resumoFatos(d: DadosJornada) {
  const lista = exposicoes(d).map(ex);
  const t = dadosTeste(d);
  const porPonto: Record<Ponto, number> = { nao_evidencia: 0, fraca: 0, intermediaria: 0, forte: 0 };
  lista.forEach((e) => e.ponto && porPonto[e.ponto]++);
  const motivos: Record<string, number> = {};
  lista.forEach((e) => e.motivo && (motivos[e.motivo] = (motivos[e.motivo] ?? 0) + 1));
  const precos: Record<string, number> = {};
  lista.forEach((e) => e.preco && (precos[e.preco] = (precos[e.preco] ?? 0) + 1));
  const compras = lista.filter((e) => e.ponto === "forte");
  const tentados = Object.values(t.contagem ?? {}).reduce((s, c) => s + (c.tentados ?? 0), 0);
  const alcancados = Object.values(t.contagem ?? {}).reduce((s, c) => s + (c.alcancados ?? 0), 0);
  return {
    total: lista.length,
    porPonto,
    motivos,
    precos,
    compras: compras.length,
    comprasPretendido: compras.filter((e) => e.comprador !== "outro" && !e.proxima).length,
    comprasFora: compras.filter((e) => e.comprador === "outro").length,
    comprasProximas: compras.filter((e) => e.proxima).length,
    proximas: lista.filter((e) => e.proxima).length,
    compativeis: lista.filter((e) => e.compativel !== "nao").length,
    entregas: lista.filter((e) => e.entrega).length,
    tentados,
    alcancados,
  };
}

// Fatos por variável, para a leitura (ela e a Karen).
export function fatosVariavel(d: DadosJornada, chave: string): string[] {
  const r = resumoFatos(d);
  const m = (v: string) => r.motivos[v] ?? 0;
  const out: string[] = [];
  if (chave === "problema") {
    if (m("sem_problema")) out.push(`${m("sem_problema")} disseram que não têm o problema ou que não é prioridade`);
    out.push(`${r.porPonto.intermediaria + r.porPonto.forte} chegaram pelo menos a considerar comprar (intermediária ou forte)`);
  }
  if (chave === "promessa") out.push(`${m("nao_ajuda")} disseram que não veem como isso ajuda`);
  if (chave === "compreensao") out.push(`${m("nao_entendi")} disseram que não entenderam`);
  if (chave === "comprador") {
    out.push(`${r.comprasPretendido} ${r.comprasPretendido === 1 ? "compra" : "compras"} de quem você esperava (sem contar próximas)`);
    if (r.comprasFora) out.push(`${r.comprasFora} de fora de quem você esperava`);
    if (m("nao_decido")) out.push(`${m("nao_decido")} disseram que não são quem decide ou paga`);
  }
  if (chave === "preco") PRECO.forEach((p) => r.precos[p.valor] && out.push(`${p.rotulo}: ${r.precos[p.valor]}`));
  if (chave === "rota") out.push(`${r.tentados} contatos tentados → ${r.alcancados} responderam → ${r.total} exposições completas`);
  if (chave === "caminho") {
    const ini = exposicoes(d).filter((x) => ex(x).comportamento === "iniciou_pagamento").length;
    out.push(ini ? `${ini} começaram a pagar e não concluíram` : "Ninguém travou no pagamento");
  }
  if (chave === "entrega") out.push(r.entregas ? `${r.entregas} ${r.entregas === 1 ? "entrega começou" : "entregas começaram"}` : "Nenhuma entrega começou: sem evidência neste teste");
  return out.length ? out : ["Sem evidência neste teste"];
}

// Sinais que o Workspace mostra, sem bloquear nada.
export function sinais(d: DadosJornada): string[] {
  const t = dadosTeste(d);
  const r = resumoFatos(d);
  const cap = capacidade(d);
  const s: string[] = [];
  if (r.total >= 2 && r.proximas * 2 >= r.total) s.push("Pessoas próximas estão chegando à metade das exposições. Elas contam, mas não podem ser a maioria.");
  if (cap && r.compras >= cap) s.push(`A capacidade se preencheu (${cap}). Pare de fazer propostas: o teste termina por esse critério.`);
  if (r.tentados >= 20) s.push("Você chegou a 20 contatos tentados: é o teto. O teste termina aqui.");
  const relevantes = (t.mudancas ?? []).filter((m) => m.tipo !== "logistica");
  const tipos = new Set(relevantes.map((m) => m.tipo));
  if (relevantes.length > tipos.size) s.push("Cada tipo de mudança só pode acontecer uma vez no teste.");
  const j = diaDaJanela(t);
  if (j && j.dia >= j.total - 2 && !t.encerramento?.criterio) s.push(`A janela termina em ${Math.max(0, j.total - j.dia)} dias.`);
  return s;
}

// Exposição antes ou depois de uma mudança relevante (automático).
export function corte(d: DadosJornada, r: Registro): string | null {
  const muds = (dadosTeste(d).mudancas ?? []).filter((m) => m.tipo !== "logistica");
  const depois = muds.filter((m) => new Date(r.criado_em) > new Date(m.em));
  return depois.length ? `depois de: ${depois.map((m) => MUDANCAS.find((x) => x.valor === m.tipo)?.rotulo.toLowerCase() ?? m.tipo).join(", ")}` : null;
}

export function faltaEnvioM9(d: DadosJornada): string[] {
  const t = dadosTeste(d);
  const f: string[] = [];
  if (!desenhoFeito(t)) f.push("o desenho do teste");
  if (!t.encerramento?.criterio) f.push("encerrar o teste");
  if (!t.leitura?.geral) f.push("propor a leitura");
  if (t.leitura?.geral && (!t.leitura.sintese?.trim() || !t.leitura.limites?.trim())) f.push("o que sustenta a leitura e o que ela não permite dizer");
  return f;
}

export function compradorPretendido(d: DadosJornada): string {
  return valorItem(d, "comprador") || valorItem(d, "beneficiario") || "—";
}
export function compradorCritico(d: DadosJornada): boolean {
  return !!mentoraOportunidade(d).comprador_critico;
}
