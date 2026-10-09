// Regras do M1 (Especificação V1 do M1 e Modelo por movimento, M1.1–M1.2).
import type { DadosJornada, Registro } from "./jornada";

export const PERGUNTAS_ONDE = [
  {
    chave: "o_que_faz",
    pergunta: "No dia a dia, o que você faz de verdade?",
    apoio: "Não o cargo: o que ocupa seu tempo e que problemas chegam até você.",
  },
  {
    chave: "por_que_agora",
    pergunta: "O que te fez buscar isso neste momento?",
    apoio: "Marque o que vale para você. Se quiser, conte em uma frase.",
  },
  {
    chave: "o_que_construir",
    pergunta: "Daqui a 12 semanas, o que faria você dizer que valeu a pena?",
    apoio: "",
  },
  {
    chave: "ideia",
    pergunta: "Você já imagina algum produto ou serviço?",
    apoio: "",
  },
] as const;

// Opções de "por que agora" (decisão da Karen, 09/10): escolha + frase opcional.
export const MOTIVOS = [
  "Quero uma renda além do salário",
  "Quero sair do emprego",
  "Cheguei num teto onde estou",
  "Quero mais autonomia",
  "Outro motivo",
];

export type PorQueAgora = { motivos: string[]; texto?: string };

export const FRASE_AINDA_NAO = "Começar sem ideia é um ótimo ponto de partida aqui.";

export const LEMBRETES = [
  "Um problema difícil que você precisou resolver",
  "Algo que você fez que talvez outra pessoa não soubesse fazer",
  "Algo que hoje você faz no automático, mas levou anos para aprender",
  "Um problema pelo qual as pessoas costumam te procurar",
  "Um conselho que te pedem com frequência",
  "Algo que é óbvio para você e não é para os outros",
  "Uma vez em que você foi quem organizou a bagunça",
  "Um resultado que você já conseguiu gerar mais de uma vez",
  "Uma situação que você entendeu mais rápido que os outros",
  "Algo que você aprendeu na prática e nenhum curso ensinou",
];

export const MINIMO_SITUACOES = 5;

export type Ideia = { tem: boolean; texto?: string };

export type Situacao = {
  ano?: number;
  contexto?: string;
  o_que_fez?: string;
  o_que_mudou?: string;
  titulo?: string;
  lembrete?: string | null;
};

const preenchido = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export function ondeVoceEsta(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "onde_voce_esta");
}

export function respostaCompleta(chave: string, conteudo: Record<string, unknown>): boolean {
  if (chave === "por_que_agora" && typeof conteudo.por_que_agora === "object" && conteudo.por_que_agora) {
    const p = conteudo.por_que_agora as PorQueAgora;
    return p.motivos?.length > 0 || preenchido(p.texto);
  }
  if (chave === "ideia") {
    const ideia = conteudo.ideia as Ideia | undefined;
    if (!ideia) return false;
    return ideia.tem ? preenchido(ideia.texto) : true; // "Ainda não" conta
  }
  return preenchido(conteudo[chave]);
}

export function perguntasFaltando(d: DadosJornada): number {
  const c = ondeVoceEsta(d)?.conteudo ?? {};
  return PERGUNTAS_ONDE.filter((p) => !respostaCompleta(p.chave, c)).length;
}

export function situacoes(d: DadosJornada): Registro[] {
  return d.registros
    .filter((r) => r.tipo === "situacao")
    .sort((a, b) => (Number(a.conteudo.ano) || 9999) - (Number(b.conteudo.ano) || 9999));
}

export function situacaoCompleta(r: Registro): boolean {
  const s = r.conteudo as Situacao;
  return !!s.ano && preenchido(s.contexto) && preenchido(s.o_que_fez) && preenchido(s.o_que_mudou);
}

export function tituloDaSituacao(r: Registro): string {
  const s = r.conteudo as Situacao;
  if (preenchido(s.titulo)) return s.titulo!.trim();
  const daKaren = r.conteudo_mentora.titulo;
  if (preenchido(daKaren)) return String(daKaren);
  if (preenchido(s.o_que_fez)) return tituloDerivado(s.o_que_fez!);
  return "Situação sem título";
}

// Derivado: as primeiras palavras de "o que você fez".
export function tituloDerivado(texto: string): string {
  const palavras = texto.trim().split(/\s+/);
  const curto = palavras.slice(0, 8).join(" ");
  return palavras.length > 8 ? `${curto}…` : curto;
}

export function situacoesCompletas(d: DadosJornada): number {
  return situacoes(d).filter(situacaoCompleta).length;
}

export function anos(): number[] {
  const atual = new Date().getFullYear();
  return Array.from({ length: atual - 1969 }, (_, i) => atual - i);
}

// Texto de uma resposta de "Onde você está", para exibir.
export function respostaTexto(chave: string, v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (chave === "ideia") {
    const i = v as Ideia;
    return i.tem ? `Sim: ${i.texto ?? ""}` : "Ainda não";
  }
  if (chave === "por_que_agora" && typeof v === "object") {
    const p = v as PorQueAgora;
    return [p.motivos?.join(" · "), p.texto?.trim()].filter(Boolean).join(" — ") || "—";
  }
  return String(v);
}
