// Regras do M2 (Especificação V1 do M2 e Modelo por movimento, M2.1–M2.2).
import type { DadosJornada, Registro } from "./jornada";
import { situacoes, tituloDaSituacao, type Situacao } from "./m1";

export type Rotulo = "ativo" | "ativo_a_confirmar" | "outra_experiencia";

export const ROTULOS: Record<Rotulo, string> = {
  ativo: "Ativo",
  ativo_a_confirmar: "Ativo a confirmar",
  outra_experiencia: "Outra experiência",
};

export type Padrao = {
  nome?: string;
  situacoes?: string[];
  quem_tinha_o_problema?: string;
  sabe_fazer?: boolean;
  rotulo?: Rotulo; // provisório até a Call 2
  status?: "escolhido" | "nao_seguiu"; // depois da decisão
  rotulo_final?: Rotulo;
  razao?: string;
  condicao_volta?: string;
};

// Textos da mentorada revistos pela Karen em 11/10 (os valores gravados não mudam).
export const RECONHECE = [
  { valor: "reconheco", rotulo: "Sim, sou eu" },
  { valor: "em_parte", rotulo: "Em parte" },
  { valor: "nao_reconheco", rotulo: "Não me vejo nisso" },
] as const;

// Sinal de resultado: registro e reconhecimento são sinais de fora; "eu percebi" é percepção.
export const COMO_SABE = [
  { valor: "numero_documento", rotulo: "Tenho registro", detalhe: "um número, relatório, e-mail ou avaliação" },
  { valor: "alguem_reconheceu", rotulo: "Alguém me disse", detalhe: "um chefe, cliente ou colega reconheceu" },
  { valor: "eu_percebi", rotulo: "Eu percebi", detalhe: "notei a diferença, mas ninguém registrou" },
  { valor: "ainda_nao_sei", rotulo: "Ainda não sei", detalhe: "vira pergunta para a call" },
] as const;

// Pode marcar mais de um sinal; "Ainda não sei" exclui os outros.
export function listaComoSabe(r?: Reacao): string[] {
  const v = r?.como_sabe;
  return Array.isArray(v) ? v : v ? [v] : [];
}

export function alternarComoSabe(atual: string[], valor: string): string[] {
  if (atual.includes(valor)) return atual.filter((x) => x !== valor);
  if (valor === "ainda_nao_sei") return [valor];
  return [...atual.filter((x) => x !== "ainda_nao_sei"), valor];
}

export function textoComoSabe(r?: Reacao): string {
  const l = listaComoSabe(r).map((v) => COMO_SABE.find((o) => o.valor === v)?.rotulo ?? v);
  return l.length ? l.join(" · ") : "—";
}

export const VONTADE = [
  { valor: "muita", rotulo: "Muita" },
  { valor: "alguma", rotulo: "Alguma" },
  { valor: "pouca", rotulo: "Pouca" },
] as const;

export const OUTRAS_VEZES = [
  { valor: "so_essa", rotulo: "Só essa vez" },
  { valor: "algumas", rotulo: "Algumas vezes" },
  { valor: "sempre", rotulo: "Faço sempre" },
] as const;

export type Reacao = {
  reconhece?: string;
  frase?: string;
  quem_tinha?: string;
  quem_tinha_confirmado?: boolean;
  quem_tinha_veio_preenchido?: boolean;
  como_sabe?: string | string[]; // lista desde 11/10; respostas antigas guardam um valor só
  vontade?: string;
  outras_vezes?: string;
};

export const DEFINICAO_ATIVO =
  "Um ativo é algo que você sabe fazer, já fez mais de uma vez, gera resultado e resolve o problema de alguém.";

export function padroes(d: DadosJornada): Registro[] {
  return d.registros.filter((r) => r.tipo === "padrao");
}

export function dadosPadrao(r: Registro): Padrao {
  return r.conteudo_mentora as Padrao;
}

export function situacoesDoPadrao(d: DadosJornada, p: Registro): Registro[] {
  const ids = dadosPadrao(p).situacoes ?? [];
  return situacoes(d).filter((s) => ids.includes(s.id));
}

export function reacaoDe(d: DadosJornada, p: Registro): Registro | undefined {
  return d.registros.find((r) => r.tipo === "reacao_padrao" && origem(r) === p.id);
}

// origem_id não vem na consulta geral; a reação guarda o padrão também no conteúdo.
function origem(r: Registro): string | undefined {
  return (r.conteudo as { padrao?: string }).padrao;
}

export function escolhaDois(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "escolha_dois");
}

export function decisaoM2(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "decisao_m2");
}

export function outrasExperiencias(d: DadosJornada): Registro[] {
  return situacoes(d).filter((s) => !!(s.conteudo_mentora as { outra_experiencia?: unknown }).outra_experiencia);
}

// --- Sinais derivados (sinais do que ela contou, nunca prova) ---
export type Sinal = { nome: string; presente: boolean; detalhe?: string };

export function anosDoPadrao(d: DadosJornada, p: Registro): number[] {
  const anos = situacoesDoPadrao(d, p)
    .map((s) => Number((s.conteudo as Situacao).ano))
    .filter((a) => a > 0);
  return [...new Set(anos)].sort((a, b) => a - b);
}

export function listaAnos(anos: number[]): string {
  if (anos.length <= 1) return String(anos[0] ?? "");
  return `${anos.slice(0, -1).join(", ")} e ${anos[anos.length - 1]}`;
}

export function sinais(d: DadosJornada, p: Registro, reacao?: Reacao): Sinal[] {
  const dados = dadosPadrao(p);
  const sits = situacoesDoPadrao(d, p);
  const anos = anosDoPadrao(d, p);
  const declarado = sits.length === 1 && (reacao?.outras_vezes === "algumas" || reacao?.outras_vezes === "sempre");
  return [
    { nome: "Você sabe fazer", presente: !!dados.sabe_fazer },
    {
      nome: "Já fez mais de uma vez",
      presente: anos.length >= 2 || declarado,
      detalhe: anos.length >= 2 ? `aparece em ${listaAnos(anos)}` : declarado ? "declarado por você" : undefined,
    },
    {
      nome: "Gera resultado",
      presente: sits.some((s) => !!(s.conteudo as Situacao).o_que_mudou?.trim()),
    },
    {
      nome: "Alguém tinha o problema",
      presente: !!reacao?.quem_tinha_confirmado && !!reacao?.quem_tinha?.trim(),
    },
  ];
}

export function tempoDePratica(anos: number[]): string | null {
  if (anos.length < 2) return null;
  const n = anos[anos.length - 1] - anos[0];
  return n === 1 ? "1 ano" : `${n} anos`;
}

export function reacaoCompleta(r: Reacao | undefined, umaSituacao: boolean): boolean {
  if (!r) return false;
  return (
    !!r.reconhece &&
    !!r.frase?.trim() &&
    !!r.quem_tinha_confirmado &&
    listaComoSabe(r).length > 0 &&
    !!r.vontade &&
    (!umaSituacao || !!r.outras_vezes)
  );
}

export function padroesFaltando(d: DadosJornada): number {
  return padroes(d).filter(
    (p) => !reacaoCompleta(reacaoDe(d, p)?.conteudo as Reacao | undefined, situacoesDoPadrao(d, p).length === 1),
  ).length;
}

export function precisaEscolherDois(d: DadosJornada): boolean {
  return padroes(d).length >= 3;
}

export function nomePadrao(d: DadosJornada, id: string): string {
  const p = d.registros.find((r) => r.id === id);
  return p ? dadosPadrao(p).nome ?? "Padrão" : "Padrão";
}

export { tituloDaSituacao };

// O que vale levar para a Call 2, a partir das respostas dela (só a mentora vê).
export function pautaDoPadrao(dados: DadosJornada, p: Registro, r?: Reacao): string[] {
  if (!r || !r.reconhece) return ["Ela ainda não respondeu este."];
  const pts: string[] = [];
  const info = dadosPadrao(p);
  const umaSituacao = situacoesDoPadrao(dados, p).length === 1;
  const sinaisDela = listaComoSabe(r);
  const soPercepcao = sinaisDela.length > 0 && sinaisDela.every((v) => v === "eu_percebi" || v === "ainda_nao_sei");
  if (r.reconhece === "em_parte") pts.push("Ela se vê só em parte: comece pelo que não combina.");
  if (r.reconhece === "nao_reconheco") pts.push("Ela não se vê nisso: entenda por quê antes de decidir.");
  if (soPercepcao) pts.push("Nenhum sinal de fora (registro ou alguém que reconheceu): peça um exemplo concreto.");
  if (r.vontade === "pouca") pts.push("Pouca vontade: pode ser prova boa sem desejo — talvez não siga.");
  if (r.vontade === "muita" && soPercepcao) pts.push("Muita vontade e pouca prova: candidato a “ativo a confirmar”.");
  const sugerido = info.quem_tinha_o_problema?.trim();
  if (sugerido && r.quem_tinha?.trim() && r.quem_tinha.trim() !== sugerido) pts.push(`Ela corrigiu quem tinha o problema (você sugeriu “${sugerido}”).`);
  if (umaSituacao && r.outras_vezes === "so_essa") pts.push("Aconteceu uma vez só: ainda não há repetição.");
  const faltando = sinais(dados, p, r).filter((x) => !x.presente).map((x) => x.nome.toLowerCase());
  if (faltando.length) pts.push(`Ainda não aparece: ${faltando.join(", ")}.`);
  return pts.length ? pts : ["Nada pede atenção especial: confirme e siga."];
}


// O porquê da decisão do M2: o ajuste dela, senão o que a Karen registrou na call.
// Jornadas destravadas em 11/10 receberam um texto técnico no lugar; ele não conta como porquê.
const SEM_PORQUE = "registrado antes da mudança de 11/10";
export function porqueDaDecisao(decisao?: Registro): { dela: string; naCall: string; texto: string } {
  const dela = String((decisao?.conteudo as { porque?: string } | undefined)?.porque ?? "").trim();
  const bruto = String((decisao?.conteudo_mentora as { porque?: string } | undefined)?.porque ?? "").trim();
  const naCall = bruto === SEM_PORQUE ? "" : bruto;
  return { dela, naCall, texto: dela || naCall };
}

// O que falta para ela enviar o M2 para a Karen.
export function faltaEnvioM2(d: DadosJornada): string[] {
  const f = padroesFaltando(d);
  return [
    f > 0 && (f === 1 ? "responder 1 possível ativo" : `responder ${f} possíveis ativos`),
    precisaEscolherDois(d) && !escolhaDois(d) && "escolher os dois que levaria adiante",
  ].filter(Boolean) as string[];
}
