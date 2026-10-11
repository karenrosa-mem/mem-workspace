// Regras do M5 · Escolher onde apostar (Especificação V1 do M5 e Modelo por movimento, M5).
// Anti-score: o Workspace nunca soma, conta ou ordena quantos critérios cada hipótese "levou".
import type { DadosJornada, Registro } from "./jornada";
import { VONTADE, reacaoDe, type Reacao } from "./m2";
import { LASTRO, ativosEscolhidos, dadosHipotese, type Hipotese } from "./m3";
import {
  contagem,
  conversasDe,
  decisaoM4,
  frentes,
  hipoteseDaFrente,
  pesquisa,
  podeSeguir,
  relatoConta,
  relatosDe,
  sinaisMercadoDe,
  situacaoPublico,
  ONDE_SINAL,
  TEMPO,
  type Conversa,
  type Frente,
  type FrenteMentora,
  type RevisaoConversa,
  type Relato,
  type SinalMercado,
} from "./m4";

export type ChaveCriterio = "peso" | "repete" | "dinheiro" | "desejada" | "testar";

export const CRITERIOS: { chave: ChaveCriterio; pergunta: string; serve: string; exemplo: string; exemploPorque: string; naoSabemos: string }[] = [
  {
    chave: "peso",
    exemploPorque: "Pagaram e inventaram solução: pesa mais.",
    pergunta: "O problema pesa?",
    serve: "Pesa quando a pessoa já fez alguma coisa por causa dele: tentou resolver, inventou um jeito, pagou alguém.",
    exemplo: "Hipótese 2: um pagou advogado e o outro criou uma reunião só para isso. Pesa mais.",
    naoSabemos: "Se o problema pesa o bastante para a pessoa agir.",
  },
  {
    chave: "repete",
    exemploPorque: "Apareceu em três empresas diferentes.",
    pergunta: "Se repete?",
    serve: "O mesmo problema aparecendo em pessoas e lugares diferentes, não só no seu círculo.",
    exemplo: "Hipótese 1: três pessoas, em três empresas diferentes.",
    naoSabemos: "Se o problema se repete fora do círculo de quem você já conhece.",
  },
  {
    chave: "dinheiro",
    exemploPorque: "Alguém já gastou de verdade com isso.",
    pergunta: "Há dinheiro em torno?",
    serve: "Alguém já pagou para resolver isso, ou já existe quem venda solução para esse problema há meses.",
    exemplo: "Hipótese 2: alguém já gastou de verdade com isso.",
    naoSabemos: "Se alguém paga para resolver esse problema.",
  },
  {
    chave: "desejada",
    exemploPorque: "Os dois públicos falaram da mudança com as mesmas palavras.",
    pergunta: "A transformação é desejada?",
    serve: "As pessoas falam, com as palavras delas, que querem a mudança que você sabe provocar.",
    exemplo: "As duas: os dois públicos querem a mudança.",
    naoSabemos: "Se as pessoas querem a mudança que você provoca.",
  },
  {
    chave: "testar",
    exemploPorque: "Chego nessas pessoas fácil, pelos colegas.",
    pergunta: "Dá para testar logo?",
    serve: "Quão rápido você chega nessas pessoas para oferecer algo nas próximas semanas.",
    exemplo: "Hipótese 1: consegui as conversas em 4 dias, por colegas e LinkedIn.",
    naoSabemos: "Se você consegue chegar rápido nesse público.",
  },
];

export const ESCALA = "Se isso cresce além dos primeiros clientes.";

export type Leitura = { escolha?: string; porque?: string; em?: string };
export type ParaVoce = "sim_quero" | "sem_vontade" | "nao_sei" | "nao";
export type Comparacao = { criterios?: Partial<Record<ChaveCriterio, Leitura>>; para_voce?: Record<string, ParaVoce> };
export type ComparacaoMentora = { conversa_feita?: Record<string, boolean> };

export const PARA_VOCE: { valor: ParaVoce; rotulo: string; detalhe?: string }[] = [
  { valor: "sim_quero", rotulo: "Sim, e quero" },
  { valor: "sem_vontade", rotulo: "Sim, mas sem vontade", detalhe: "conseguiria, mas não me anima" },
  { valor: "nao_sei", rotulo: "Ainda não sei" },
  { valor: "nao", rotulo: "Não", detalhe: "não consigo ou não quero" },
];

export function rotuloParaVoce(v?: string): string {
  return PARA_VOCE.find((p) => p.valor === v)?.rotulo ?? "—";
}

export type DecisaoM5 = {
  aposta?: string;
  reserva?: string | null;
  reserva_condicao?: string;
  recomendacao?: { aposta?: string; reserva?: string | null; texto?: string };
  porque?: string;
  razao_estrategica?: string;
  condicao_revisao?: string;
  exigir_estrategica?: boolean;
  nao_sabemos?: string[];
  fora?: { hipotese: string; razao: string; condicao_volta: string }[];
  concordou?: boolean;
};

// Uma hipótese na comparação: a frente do M4 e a hipótese do M3.
export type Comparada = { frente: Registro; hipotese: Registro; n: number; nome: string };

// Quem entra na comparação. Antes do registro do M4: as frentes que já cumprem
// o critério (ela compara antes da call). Depois: só as que seguiram.
// Ordem fixa: a das hipóteses (nunca por "desempenho").
export function comparadas(d: DadosJornada): Comparada[] {
  const registrada = decisaoM4(d) && !decisaoM4(d)!.pendente_publicacao;
  const lista = frentes(d).filter((f) =>
    registrada ? (f.conteudo_mentora as FrenteMentora).resultado === "segue" : podeSeguir(d, f),
  );
  return lista
    .map((f) => {
      const h = hipoteseDaFrente(d, f);
      if (!h) return null;
      const n = frentes(d).indexOf(f) + 1;
      const pub = dadosHipotese(h).publico?.trim() || "público";
      return { frente: f, hipotese: h, n, nome: `Hipótese ${n} · ${pub}` };
    })
    .filter(Boolean) as Comparada[];
}

// A comparação está liberada? (pelo menos uma hipótese chegou)
export function comparacaoLiberada(d: DadosJornada): boolean {
  const m5 = d.movimentos.find((m) => m.codigo === 5)?.estado;
  if (m5 === "aberto" || m5 === "fechado") return true;
  return d.movimentos.find((m) => m.codigo === 4)?.estado === "aberto" && comparadas(d).length > 0;
}

export function comparacaoDe(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "comparacao");
}

export function dadosComparacao(d: DadosJornada): Comparacao {
  return (comparacaoDe(d)?.conteudo ?? {}) as Comparacao;
}

// Uma leitura vale se aponta para uma hipótese que ainda está na comparação.
export function leituraValida(d: DadosJornada, ch: ChaveCriterio): Leitura | undefined {
  const l = dadosComparacao(d).criterios?.[ch];
  if (!l?.escolha || !l.porque?.trim()) return undefined;
  if (l.escolha === "empatam" || l.escolha === "nao_da") return l;
  return comparadas(d).some((c) => c.hipotese.id === l.escolha) ? l : undefined;
}

export function soUma(d: DadosJornada): boolean {
  return comparadas(d).length === 1;
}

export function criteriosFaltando(d: DadosJornada): number {
  if (soUma(d)) return 0;
  return CRITERIOS.filter((c) => !leituraValida(d, c.chave)).length;
}

export function paraVoceFaltando(d: DadosJornada): Comparada[] {
  const pv = dadosComparacao(d).para_voce ?? {};
  return comparadas(d).filter((c) => !pv[c.hipotese.id]);
}

export function prontaCall4M5(d: DadosJornada): boolean {
  return comparadas(d).length > 0 && criteriosFaltando(d) === 0 && paraVoceFaltando(d).length === 0;
}

// "Sem vontade" ou "ainda não sei" viram conversa na call.
export function duvidas(d: DadosJornada): { c: Comparada; resposta: ParaVoce; feita: boolean }[] {
  const pv = dadosComparacao(d).para_voce ?? {};
  const feitas = ((comparacaoDe(d)?.conteudo_mentora ?? {}) as ComparacaoMentora).conversa_feita ?? {};
  return comparadas(d)
    .filter((c) => pv[c.hipotese.id] === "sem_vontade" || pv[c.hipotese.id] === "nao_sei")
    .map((c) => ({ c, resposta: pv[c.hipotese.id], feita: !!feitas[c.hipotese.id] }));
}

export function nomeEscolha(d: DadosJornada, escolha?: string): string {
  if (escolha === "empatam") return "Empatam";
  if (escolha === "nao_da") return "Ainda não dá para dizer";
  return comparadas(d).find((c) => c.hipotese.id === escolha)?.nome ?? "—";
}

// "O que ainda não sabemos" derivado: critérios "ainda não dá para dizer" + Escala.
export function naoSabemosDerivado(d: DadosJornada): string[] {
  const lista = CRITERIOS.filter((c) => dadosComparacao(d).criterios?.[c.chave]?.escolha === "nao_da").map((c) => c.naoSabemos);
  return [...lista, ESCALA];
}

// ---------------------------------------------------------------------
// Fatos por critério (só o que veio do M4; contar fatos é permitido).
// ---------------------------------------------------------------------
function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

function conversasValidas(d: DadosJornada, f: Registro): Registro[] {
  return conversasDe(d, f).filter((r) => situacaoPublico(r) === "conta");
}

function falasDe(r: Registro): string[] {
  const c = r.conteudo as Conversa;
  const op = (r.conteudo_mentora as RevisaoConversa).falas_opiniao ?? [];
  return (c.falas ?? []).filter((x, i) => x.trim() && !op.includes(i));
}

function diasEntreInstantes(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

const BASE: Record<string, string> = {
  conversas: "Chegou pelas conversas",
  pesquisa: "Chegou pela pesquisa de mercado",
  ambas: "Chegou pelas conversas e pela pesquisa",
};

export function fatos(d: DadosJornada, c: Comparada, ch: ChaveCriterio): string[] {
  const f = c.frente;
  const k = contagem(d, f);
  const q = pesquisa(d, f);
  const validas = conversasValidas(d, f);
  const conv = (r: Registro) => r.conteudo as Conversa;
  const out: string[] = [];

  if (ch === "peso") {
    if (k.caso) out.push(`${plural(k.caso, "pessoa contou", "pessoas contaram")} um caso concreto`);
    if (q.relatosCaso) out.push(`${plural(q.relatosCaso, "relato encontrado", "relatos encontrados")} com caso concreto`);
    const tent = validas.filter((r) => conv(r).tentou).map((r) => conv(r).tentou_como?.trim() || "tentou resolver");
    if (tent.length) out.push(`Já tentaram resolver: ${tent.join("; ")}`);
    if (k.pagou.length) out.push(`Já pagaram por: ${k.pagou.join("; ")}`);
    if (k.naoReconheceu) out.push(`${plural(k.naoReconheceu, "pessoa não reconheceu", "pessoas não reconheceram")} o problema`);
  }
  if (ch === "repete") {
    if (k.doPublico) out.push(`${k.caso} de ${plural(k.doPublico, "conversa", "conversas")} do público com caso concreto`);
    if (q.relatos) out.push(`${q.relatosCaso} de ${plural(q.relatos, "relato encontrado", "relatos encontrados")} com caso concreto`);
    const lugares = new Set(relatosDe(d, f).filter(relatoConta).map((r) => (r.conteudo as Relato).onde ?? "outro"));
    if (lugares.size > 1) out.push(`Relatos em ${lugares.size} tipos de lugar diferentes`);
    if (k.naoReconheceu) out.push(`${plural(k.naoReconheceu, "não reconheceu", "não reconheceram")}`);
  }
  if (ch === "dinheiro") {
    if (k.pagou.length) out.push(`Já pagaram por: ${k.pagou.join("; ")}`);
    sinaisMercadoDe(d, f).forEach((r) => {
      const s = r.conteudo as SinalMercado;
      const onde = ONDE_SINAL.find((o) => o.valor === s.onde)?.rotulo ?? "Sinal";
      const tempo = TEMPO.find((t) => t.valor === s.tempo)?.rotulo.toLowerCase();
      const partes = [
        `${onde}${s.nome?.trim() ? `: ${s.nome.trim()}` : ""}`,
        tempo && `há ${tempo}`,
        s.mais_vendidos && "entre os mais vendidos",
        s.preco?.trim() && `preço ${s.preco.trim()}`,
        s.anuncios ? plural(s.anuncios, "anúncio", "anúncios") : null,
      ].filter(Boolean);
      out.push(partes.join(" · "));
    });
    const fr = f.conteudo as Frente;
    if (fr.checagem === "sim" && fr.checagem_links?.length) out.push(`Quem já vende: ${fr.checagem_links.join("; ")}`);
    if (!k.pagou.length && !sinaisMercadoDe(d, f).length) out.push("Ninguém pagou e nenhum sinal de mercado registrado");
  }
  if (ch === "desejada") {
    const t = (dadosHipotese(c.hipotese) as Hipotese).transformacao?.trim();
    if (t) out.push(`A mudança que você escreveu: ${t}`);
    const falas = validas.flatMap(falasDe).slice(0, 4);
    falas.forEach((x) => out.push(`“${x}”`));
    relatosDe(d, f)
      .filter(relatoConta)
      .slice(0, 3)
      .forEach((r) => {
        const tr = (r.conteudo as Relato).trecho?.trim();
        if (tr) out.push(`“${tr}” (relato)`);
      });
  }
  if (ch === "testar") {
    const base = (f.conteudo_mentora as { base?: string }).base;
    if (base && BASE[base]) out.push(BASE[base]);
    const lista = conversasDe(d, f);
    if (lista.length) {
      const ultima = lista[lista.length - 1].criado_em;
      out.push(`${plural(lista.length, "conversa", "conversas")} em ${plural(diasEntreInstantes(f.criado_em, ultima), "dia", "dias")}`);
    }
    if (q.relatos) {
      const rel = relatosDe(d, f);
      out.push(`${plural(q.relatos, "relato encontrado", "relatos encontrados")} em ${plural(diasEntreInstantes(f.criado_em, rel[rel.length - 1].criado_em), "dia", "dias")}`);
    }
    const lastro = LASTRO.find((l) => l.valor === (dadosHipotese(c.hipotese) as Hipotese).lastro);
    if (lastro) out.push(`Quanto você já viu de perto: ${lastro.rotulo.toLowerCase()}`);
    const sem = (f.conteudo as Frente).sem_acesso?.trim();
    if (sem) out.push(`Sem acesso: ${sem}`);
  }
  return out.length ? out : ["Nada registrado sobre isso"];
}

// Para "é para você?": o ativo e a vontade declarada no M2.
export function ativoDa(d: DadosJornada, c: Comparada): { nome: string; vontade?: string } {
  const id = (dadosHipotese(c.hipotese) as Hipotese).ativo;
  const a = ativosEscolhidos(d).find((x) => x.id === id);
  if (!a) return { nome: "o seu ativo" };
  const v = (reacaoDe(d, a.registro)?.conteudo as Reacao | undefined)?.vontade;
  return { nome: a.nome, vontade: VONTADE.find((x) => x.valor === v)?.rotulo.toLowerCase() };
}

export function decisaoM5(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "decisao_m5");
}

export function investigacaoAberta(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "investigacao_m5" && (r.conteudo_mentora as { encerrada?: boolean }).encerrada !== true);
}

export function porqueDaAposta(dec: Registro): string {
  return ((dec.conteudo as { porque?: string }).porque ?? "").trim() || ((dec.conteudo_mentora as DecisaoM5).porque ?? "").trim();
}

export function faltaEnvioM5(d: DadosJornada): string[] {
  const f: string[] = [];
  const n = criteriosFaltando(d);
  if (n) f.push(n === 1 ? "1 pergunta da comparação" : `${n} perguntas da comparação`);
  paraVoceFaltando(d).forEach((c) => f.push(`“é para você?” sobre ${c.nome}`));
  return f;
}
