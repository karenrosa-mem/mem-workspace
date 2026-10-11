// Regras do M4 · Ouvir o mercado (Especificação V1 do M4 e Modelo por movimento, M4).
import type { DadosJornada, Registro } from "./jornada";
import { ativosEscolhidos, dadosHipotese, fraseTexto, quemMaisDe, type Hipotese, type QuemMais } from "./m3";

export const DEFINICAO_EVIDENCIA = "Evidência é o que as pessoas fizeram, não o que elas acham.";

export const ROTEIRO = [
  "Me conta a última vez que [o problema] aconteceu com você.",
  "O que você fez nessa hora?",
  "Já tentou resolver isso de algum jeito? Como?",
  "Já pagou por alguma coisa para resolver? O quê?",
];
export const ROTEIRO_APROFUNDAR = "Quanto isso te custa hoje, de tempo, de dinheiro, de desgaste? (só depois de um caso concreto, e se fizer sentido)";
export const ROTEIRO_NUNCA = ["O que você acha da minha ideia?", "Você compraria?", "Quanto pagaria?"];

export const PUBLICO = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "em_parte", rotulo: "Em parte" },
  { valor: "nao", rotulo: "Não" },
] as const;

export const RECONHECEU = [
  { valor: "caso", rotulo: "Sim, com um caso concreto", detalhe: "contou uma vez que aconteceu" },
  { valor: "geral", rotulo: "Sim, mas só em geral", detalhe: "“isso acontece muito”, sem um caso" },
  { valor: "nao", rotulo: "Não", detalhe: "não reconheceu o problema" },
] as const;

export type Conversa = {
  publico?: "sim" | "em_parte" | "nao";
  reconheceu?: "caso" | "geral" | "nao";
  tentou?: boolean;
  tentou_como?: string;
  pagou?: boolean;
  pagou_oque?: string;
  ideia_antes?: boolean;
  falas?: string[];
  percebi?: string;
};

export type RevisaoConversa = { nota?: string; conta_publico?: boolean; falas_opiniao?: number[] };
export type Frente = { checagem?: "sim" | "nao"; checagem_links?: string[]; sem_acesso?: string };
export type FrenteMentora = { meta?: number; resultado?: "segue" | "volta" | "guardada"; razao?: string; condicao_volta?: string };

export function frentes(d: DadosJornada): Registro[] {
  return d.registros.filter((r) => r.tipo === "frente");
}

export function hipoteseDaFrente(d: DadosJornada, f: Registro): Registro | undefined {
  const id = f.origem_id;
  return d.registros.find((r) => r.id === id);
}

export function conversasDe(d: DadosJornada, f: Registro): Registro[] {
  return d.registros.filter((r) => r.tipo === "conversa" && r.origem_id === f.id);
}

export function ideiasDe(d: DadosJornada, f: Registro): Registro[] {
  return d.registros.filter((r) => r.tipo === "ideia_nova" && r.origem_id === f.id);
}

export function meta(f: Registro): number {
  return Number((f.conteudo_mentora as FrenteMentora).meta ?? 3) || 3;
}

// Conta para a frente? "Em parte do público" espera a Karen.
export function situacaoPublico(r: Registro): "conta" | "nao_conta" | "a_avaliar" {
  const c = r.conteudo as Conversa;
  const m = r.conteudo_mentora as RevisaoConversa;
  if (c.publico === "sim") return "conta";
  if (c.publico === "em_parte") return m.conta_publico === true ? "conta" : m.conta_publico === false ? "nao_conta" : "a_avaliar";
  return "nao_conta";
}

// O que a conversa demonstra (sem nota): só a partir das escolhas, nunca das falas.
export function demonstra(r: Registro): string[] {
  const c = r.conteudo as Conversa;
  const out: string[] = [];
  if (c.reconheceu === "caso" && !c.ideia_antes) out.push("Relatou caso concreto");
  if (c.reconheceu === "caso" && c.ideia_antes) out.push("Contou um caso, mas depois de ouvir a sua ideia: não conta");
  if (c.reconheceu === "geral") out.push("Reconheceu só em geral");
  if (c.reconheceu === "nao") out.push("Não reconheceu o problema");
  if (c.tentou) out.push(`Já tentou resolver${c.tentou_como?.trim() ? `: ${c.tentou_como.trim()}` : ""}`);
  if (c.pagou) out.push(`Já pagou por${c.pagou_oque?.trim() ? `: ${c.pagou_oque.trim()}` : " algo"}`);
  return out;
}

export type Contagem = {
  total: number;
  doPublico: number;
  caso: number;
  tentou: number;
  pagou: string[];
  naoReconheceu: number;
  naoContam: number;
  aAvaliar: number;
};

export function contagem(d: DadosJornada, f: Registro): Contagem {
  const lista = conversasDe(d, f);
  const validas = lista.filter((r) => situacaoPublico(r) === "conta");
  const c = (r: Registro) => r.conteudo as Conversa;
  return {
    total: lista.length,
    doPublico: validas.length,
    caso: validas.filter((r) => c(r).reconheceu === "caso" && !c(r).ideia_antes).length,
    tentou: validas.filter((r) => c(r).tentou).length,
    pagou: validas.filter((r) => c(r).pagou).map((r) => c(r).pagou_oque?.trim() || "algo"),
    naoReconheceu: validas.filter((r) => c(r).reconheceu === "nao").length,
    naoContam: lista.filter((r) => situacaoPublico(r) === "nao_conta").length,
    aAvaliar: lista.filter((r) => situacaoPublico(r) === "a_avaliar").length,
  };
}

// Resumo factual: contar fatos é permitido; pontuar não.
export function resumo(d: DadosJornada, f: Registro): string {
  const k = contagem(d, f);
  if (k.total === 0) return "Nenhuma conversa ainda";
  const p = [`${k.doPublico} ${k.doPublico === 1 ? "conversa" : "conversas"} do público`];
  if (k.caso) p.push(`${k.caso} ${k.caso === 1 ? "relatou" : "relataram"} caso concreto`);
  if (k.tentou) p.push(`${k.tentou} já ${k.tentou === 1 ? "tentou" : "tentaram"} resolver`);
  k.pagou.forEach((o) => p.push(`1 já pagou por: ${o}`));
  if (k.naoReconheceu) p.push(`${k.naoReconheceu} não ${k.naoReconheceu === 1 ? "reconheceu" : "reconheceram"} o problema`);
  if (k.naoContam) p.push(`${k.naoContam} não ${k.naoContam === 1 ? "conta" : "contam"}`);
  if (k.aAvaliar) p.push(`${k.aAvaliar} a avaliar pela Karen`);
  return p.join(" · ");
}

export function prontaFrente(d: DadosJornada, f: Registro): boolean {
  const k = contagem(d, f);
  const sem = (f.conteudo as Frente).sem_acesso?.trim();
  return k.doPublico >= meta(f) || k.caso >= 2 || !!sem;
}

function publicoDaFrente(d: DadosJornada, f: Registro): string {
  const h = hipoteseDaFrente(d, f);
  return h ? (dadosHipotese(h).publico ?? "pessoas do público") : "pessoas do público";
}

export function fraseDaFrente(d: DadosJornada, f: Registro): string {
  const h = hipoteseDaFrente(d, f);
  return h ? fraseTexto(d, dadosHipotese(h)) : "Hipótese";
}

// Próximo passo da frente (regra "Como a qualidade da evidência muda o próximo passo").
export function proximoPasso(d: DadosJornada, f: Registro, dia = "a call"): string {
  const lista = conversasDe(d, f);
  const k = contagem(d, f);
  const publico = publicoDaFrente(d, f).toLowerCase();
  const ultima = lista[lista.length - 1];
  const fr = f.conteudo as Frente;

  if (fr.sem_acesso?.trim()) return `Você registrou que não conseguiu acesso. Leve isso para a Karen ${dia}: vira conversa, não falha.`;
  if (lista.length === 0) {
    const h = hipoteseDaFrente(d, f);
    const ativo = h ? (dadosHipotese(h) as Hipotese).ativo : undefined;
    const ja = ativo ? ((quemMaisDe(d, ativo)?.conteudo as QuemMais | undefined)?.ja_ajudei ?? "") : "";
    const nomes = ja.split(/\n|;/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
    return nomes.length ? `Comece por quem você já ajudou: ${nomes.join("; ")}.` : `Comece por alguém próximo que seja ${publico}.`;
  }
  if (ultima && (ultima.conteudo as Conversa).ideia_antes)
    return "Na próxima, comece pela última vez que o problema aconteceu, antes de falar da sua ideia.";
  if (ultima && situacaoPublico(ultima) === "nao_conta" && k.doPublico < 2)
    return `Essa conversa não conta para esta frente. Procure alguém que seja ${publico}.`;
  if (k.doPublico <= 1) return `Ainda não dá para concluir nada. Próxima conversa: ${publico}.`;
  if (k.caso >= 1 && k.naoReconheceu >= 1)
    return "Algumas pessoas têm o problema e outras não. O que as que têm têm em comum? Se perceber algo, registre como ideia nova.";
  if (k.naoReconheceu >= 2)
    return `O problema não apareceu para essas pessoas. Isso não derruba a hipótese inteira: pode ser o público amplo demais, um contexto que diferencia quem sofre ou a forma de perguntar. Leve para a Karen ${dia}.`;
  if (k.caso >= 2) {
    const falta = !fr.checagem ? " Se quiser, falta uma coisa: alguém já cobra para resolver isso?" : "";
    return `O problema está aparecendo de novo. Você pode parar aqui ou aprofundar o que ainda não apareceu, por exemplo se alguém já tentou resolver ou pagou por algo.${falta}`;
  }
  if (k.doPublico >= meta(f)) return "As pessoas reconhecem, mas ninguém contou um caso concreto. Vale mais uma conversa ou falar com a Karen sobre o público.";
  return `Próxima conversa: ${publico}. Faltam ${meta(f) - k.doPublico} para a meta.`;
}

export function decisaoM4(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "decisao_m4");
}

export function faltaEnvioM4(d: DadosJornada): string[] {
  const nao = frentes(d).filter((f) => !prontaFrente(d, f));
  if (!nao.length) return [];
  return nao.map((f) => {
    const k = contagem(d, f);
    const h = hipoteseDaFrente(d, f);
    const nome = h ? (dadosHipotese(h).publico ?? "uma frente") : "uma frente";
    const faltam = meta(f) - k.doPublico;
    return `${nome}: ${faltam === 1 ? "1 conversa" : `${faltam} conversas`} do público (ou registrar que não conseguiu acesso)`;
  });
}

export { ativosEscolhidos };
