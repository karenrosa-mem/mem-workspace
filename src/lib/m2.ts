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

export const RECONHECE = [
  { valor: "reconheco", rotulo: "Reconheço" },
  { valor: "em_parte", rotulo: "Em parte" },
  { valor: "nao_reconheco", rotulo: "Não reconheço" },
] as const;

export const COMO_SABE = [
  { grupo: "De fora", opcoes: [
    { valor: "numero_documento", rotulo: "Tem número ou documento" },
    { valor: "alguem_reconheceu", rotulo: "Alguém reconheceu" },
  ] },
  { grupo: "De dentro", opcoes: [{ valor: "eu_percebi", rotulo: "Eu percebi" }] },
  { grupo: "", opcoes: [{ valor: "ainda_nao_sei", rotulo: "Ainda não sei" }] },
] as const;

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
  como_sabe?: string;
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
    { nome: "Sabe fazer", presente: !!dados.sabe_fazer },
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
      nome: "Alguém tem o problema",
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
    !!r.como_sabe &&
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
