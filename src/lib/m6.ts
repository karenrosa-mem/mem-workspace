// Regras do M6 · Navegação (Especificação V1 consolidada do M6 e Modelo por movimento, M6).
// Regra soberana: o que o MAPA definiu é carregado sem reescrita; o que só tem
// matéria-prima ela escreve com o material à vista; o resto vira desconhecido.
// O Workspace e a Karen nunca redigem definições.
import type { DadosJornada, Registro } from "./jornada";
import type { Situacao } from "./m1";
import { situacoesDoPadrao } from "./m2";
import { ativosEscolhidos, dadosHipotese, fraseTexto, hipoteses, type Hipotese } from "./m3";
import { conversasDe, frentes, relatoConta, relatosDe, sinaisMercadoDe, situacaoPublico, type Conversa, type Relato, type RevisaoConversa, type SinalMercado } from "./m4";
import { decisaoM5, type DecisaoM5 } from "./m5";

export type ChaveItem = "beneficiario" | "problema" | "contexto" | "momento" | "desejo" | "destino" | "direcao" | "comprador";
export type Escolha = "mantenho" | "ajusto" | "escrito" | "sem_material";
export type Item = {
  escolha?: Escolha;
  valor?: string;
  conversa?: string;
  fica_de_fora?: string;
  tipo?: "mesma" | "outra";
  quem?: string;
  porque?: string;
};
export type Oportunidade = { itens?: Partial<Record<ChaveItem, Item>>; transversal?: string };
export type Destino = "aposta" | "observar" | "nao_agora" | "retorno";
export type OportunidadeMentora = {
  niveis?: Partial<Record<ChaveItem, 1 | 2 | 3>>;
  comprador_critico?: boolean;
  ativo_dependencia?: boolean;
  ativo_observacao?: string;
  incertezas?: { texto: string; destino: Destino }[];
  limites?: string[];
  concorda_limites?: boolean;
  recomendacao?: string;
  concordou_recomendacao?: boolean;
  verificacao?: { beneficiario_ouvido?: boolean; problema_ouvido?: boolean; apostas_declaradas?: boolean; caminho?: boolean };
  assumida_em?: string;
};

export const DESTINOS: { valor: Destino; rotulo: string; detalhe: string }[] = [
  { valor: "aposta", rotulo: "Aposta assumida", detalhe: "o M7 precisa disso para construir; o NORTE testa" },
  { valor: "observar", rotulo: "Observar no NORTE", detalhe: "não muda a definição, mas precisa ser acompanhado" },
  { valor: "nao_agora", rotulo: "Não precisamos saber agora", detalhe: "não afeta nada neste momento" },
  { valor: "retorno", rotulo: "Condição de retorno", detalhe: "se acontecer, derruba a aposta" },
];

export const NIVEIS = [
  { valor: "1", rotulo: "Nível 1", detalhe: "linguagem e precisão; livre", paraEla: "ajuste de linguagem" },
  { valor: "2", rotulo: "Nível 2", detalhe: "recorte apoiado nos fatos do M4", paraEla: "ajuste apoiado no que você ouviu" },
  { valor: "3", rotulo: "Nível 3", detalhe: "pessoa ou problema que não foi ouvido: é retorno, não ajuste", paraEla: "mudança que pede voltar ao MAPA" },
] as const;

// Os seis passos que ela vê. Os itens carregados vêm da hipótese escolhida no M5.
export type Passo = {
  n: number;
  titulo: string;
  itens: {
    chave: ChaveItem;
    pergunta: string;
    carregaDe?: keyof Hipotese;
    semMaterial?: string; // rótulo da opção sem material
    serve: string;
    exemplo: string;
  }[];
};

export const PASSOS: Passo[] = [
  {
    n: 1,
    titulo: "Para quem",
    itens: [
      {
        chave: "beneficiario",
        pergunta: "Quem vive o problema?",
        carregaDe: "publico",
        serve: "Dá para recortar, mas só dentro de quem você ouviu. Se recortar, aponte a conversa ou o relato que mostrou isso.",
        exemplo: "Gestores promovidos de dentro do próprio time (e não qualquer gestor novo).",
      },
    ],
  },
  {
    n: 2,
    titulo: "Qual problema",
    itens: [
      {
        chave: "problema",
        pergunta: "Qual é o problema, do jeito que as pessoas falaram?",
        carregaDe: "problema",
        serve: "Use as palavras de quem você ouviu, não o nome técnico. As falas estão ao lado.",
        exemplo: "“Não consigo cobrar quem até ontem era meu colega.”",
      },
    ],
  },
  {
    n: 3,
    titulo: "Quando aparece",
    itens: [
      {
        chave: "contexto",
        pergunta: "Em que situação o problema aparece?",
        carregaDe: "contexto",
        serve: "O momento ou a situação em que os casos aconteceram.",
        exemplo: "Nos primeiros seis meses depois da promoção.",
      },
      {
        chave: "momento",
        pergunta: "Quando não dá mais para adiar?",
        semMaterial: "O campo não mostrou isso",
        serve: "O ponto em que a pessoa sente que precisa resolver já. Olhe os casos: o que aconteceu logo antes de ela agir?",
        exemplo: "Quando alguém do time ignora uma cobrança na frente dos outros.",
      },
    ],
  },
  {
    n: 4,
    titulo: "O que muda",
    itens: [
      {
        chave: "desejo",
        pergunta: "O que essa pessoa quer que mude?",
        semMaterial: "O campo não mostrou isso",
        serve: "Nas palavras dela. Pode juntar várias falas numa frase, desde que quem leu as conversas reconheça ali o que foi ouvido.",
        exemplo: "Cobrar sem se sentir traidora.",
      },
      {
        chave: "destino",
        pergunta: "Qual mudança alguém de fora perceberia?",
        carregaDe: "transformacao",
        serve: "A mudança observável que vale perseguir. Não acrescente uma mudança que ninguém falou.",
        exemplo: "Um time que cumpre o combinado sem escalar para o chefe.",
      },
    ],
  },
  {
    n: 5,
    titulo: "Por qual caminho você entra",
    itens: [
      {
        chave: "direcao",
        pergunta: "Por qual caminho a sua experiência entra para resolver isso?",
        semMaterial: "Ainda não sei",
        serve: "Uma frase sobre o caminho, a partir do que você já fez de verdade. Ainda não é o formato: nada de curso, mentoria, quantas semanas, preço ou ferramenta.",
        exemplo: "Ensinando a conversa de cobrança que eu já conduzi com gestores que vieram do próprio time.",
      },
    ],
  },
  {
    n: 6,
    titulo: "Quem compraria",
    itens: [
      {
        chave: "comprador",
        pergunta: "Quem você aposta que compraria isso?",
        semMaterial: "Ainda não sei",
        serve: "Isso ainda é uma aposta. Só o teste vai mostrar quem compra de verdade.",
        exemplo: "Outra pessoa: o RH da empresa. Porque uma das pessoas contou que o RH pagou um curso parecido.",
      },
    ],
  },
];

export const TODOS_ITENS = PASSOS.flatMap((p) => p.itens);

export const TRANSVERSAL = "Em uma ou duas frases: o que você está mantendo da sua aposta, e o que o campo te fez mudar?";

// A aposta do M5 (hipótese e frente).
export function aposta(d: DadosJornada): { hipotese: Registro; frente?: Registro; decisao: Registro } | undefined {
  const dec = decisaoM5(d);
  if (!dec || dec.pendente_publicacao) return undefined;
  const id = (dec.conteudo_mentora as DecisaoM5).aposta;
  const h = hipoteses(d).find((x) => x.id === id);
  if (!h) return undefined;
  return { hipotese: h, frente: frentes(d).find((f) => f.origem_id === h.id), decisao: dec };
}

export function fraseOriginal(d: DadosJornada): string {
  const a = aposta(d);
  return a ? fraseTexto(d, dadosHipotese(a.hipotese)) : "";
}

export function carregado(d: DadosJornada, chave: ChaveItem): string | undefined {
  const a = aposta(d);
  const campo = TODOS_ITENS.find((i) => i.chave === chave)?.carregaDe;
  if (!a || !campo) return undefined;
  const v = (dadosHipotese(a.hipotese) as Record<string, unknown>)[campo];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function oportunidadeDe(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "oportunidade");
}

export function dadosOportunidade(d: DadosJornada): Oportunidade {
  return (oportunidadeDe(d)?.conteudo ?? {}) as Oportunidade;
}

export function mentoraOportunidade(d: DadosJornada): OportunidadeMentora {
  return (oportunidadeDe(d)?.conteudo_mentora ?? {}) as OportunidadeMentora;
}

// O valor que vale para o item (o carregado, se ela manteve).
export function valorItem(d: DadosJornada, chave: ChaveItem): string {
  const it = dadosOportunidade(d).itens?.[chave];
  if (!it?.escolha) return "";
  if (it.escolha === "mantenho") return carregado(d, chave) ?? "";
  if (it.escolha === "sem_material") return "";
  if (chave === "comprador") return it.tipo === "mesma" ? "A mesma pessoa que vive o problema" : it.quem?.trim() ?? "";
  return it.valor?.trim() ?? "";
}

export function itemRespondido(d: DadosJornada, chave: ChaveItem): boolean {
  const it = dadosOportunidade(d).itens?.[chave];
  if (!it?.escolha) return false;
  if (it.escolha === "sem_material" || it.escolha === "mantenho") return true;
  if (chave === "comprador") return !!it.tipo && !!it.porque?.trim() && (it.tipo === "mesma" || !!it.quem?.trim());
  if (chave === "beneficiario" && it.escolha === "ajusto" && !it.conversa) return false;
  return !!it.valor?.trim();
}

export function passoFeito(d: DadosJornada, p: Passo): boolean {
  return p.itens.every((i) => itemRespondido(d, i.chave));
}

export function passosFaltando(d: DadosJornada): Passo[] {
  return PASSOS.filter((p) => !passoFeito(d, p));
}

export function prontaCall5(d: DadosJornada): boolean {
  return passosFaltando(d).length === 0 && !!dadosOportunidade(d).transversal?.trim();
}

export function faltaEnvioM6(d: DadosJornada): string[] {
  const f = passosFaltando(d).map((p) => `passo ${p.n} (${p.titulo.toLowerCase()})`);
  if (!dadosOportunidade(d).transversal?.trim()) f.push("a última pergunta: o que você manteve e o que mudou");
  return f;
}

// Estatuto de cada parte (para os dois lados).
export function estatuto(d: DadosJornada, chave: ChaveItem): { rotulo: string; tipo: "campo" | "aposta" | "desconhecido" } {
  const it = dadosOportunidade(d).itens?.[chave];
  if (it?.escolha === "sem_material") return { rotulo: "Ainda não sabemos", tipo: "desconhecido" };
  if (chave === "comprador") return { rotulo: "Aposta", tipo: "aposta" };
  if (chave === "direcao") return { rotulo: ativoConfirmar(d) ? "Apoiada na sua percepção" : "Apoiada no que você já fez", tipo: "campo" };
  return { rotulo: "Apoiada no que você ouviu", tipo: "campo" };
}

export function ativoConfirmar(d: DadosJornada): boolean {
  const a = aposta(d);
  if (!a) return false;
  const id = (dadosHipotese(a.hipotese) as Hipotese).ativo;
  return ativosEscolhidos(d).find((x) => x.id === id)?.rotulo === "ativo_a_confirmar";
}

// Tudo mantido? (sinal só para a Karen)
export function tudoMantido(d: DadosJornada): boolean {
  const itens = dadosOportunidade(d).itens ?? {};
  const carregaveis = TODOS_ITENS.filter((i) => i.carregaDe && carregado(d, i.chave));
  return carregaveis.length > 0 && carregaveis.every((i) => itens[i.chave]?.escolha === "mantenho");
}

// ---------------------------------------------------------------------
// Matéria-prima da frente escolhida, à vista em cada passo.
export type Fonte = { id: string; texto: string; tipo: "conversa" | "relato" };

export function fontes(d: DadosJornada): Fonte[] {
  const a = aposta(d);
  if (!a?.frente) return [];
  const conv = conversasDe(d, a.frente)
    .filter((r) => situacaoPublico(r) === "conta")
    .map((r, i) => {
      const c = r.conteudo as Conversa;
      const op = (r.conteudo_mentora as RevisaoConversa).falas_opiniao ?? [];
      const fala = (c.falas ?? []).find((x, k) => x.trim() && !op.includes(k));
      return { id: r.id, tipo: "conversa" as const, texto: `Conversa ${i + 1}${fala ? `: “${fala}”` : ""}` };
    });
  const rel = relatosDe(d, a.frente)
    .filter(relatoConta)
    .map((r, i) => ({ id: r.id, tipo: "relato" as const, texto: `Relato ${i + 1}: “${(r.conteudo as Relato).trecho?.trim() ?? ""}”` }));
  return [...conv, ...rel];
}

export function material(d: DadosJornada, passo: number): { titulo: string; itens: string[] }[] {
  const a = aposta(d);
  if (!a?.frente) return [];
  const f = a.frente;
  const validas = conversasDe(d, f).filter((r) => situacaoPublico(r) === "conta");
  const c = (r: Registro) => r.conteudo as Conversa;
  const falas = validas.flatMap((r) => {
    const op = (r.conteudo_mentora as RevisaoConversa).falas_opiniao ?? [];
    return (c(r).falas ?? []).filter((x, k) => x.trim() && !op.includes(k)).map((x) => `“${x}”`);
  });
  const trechos = relatosDe(d, f)
    .filter(relatoConta)
    .map((r) => `“${(r.conteudo as Relato).trecho?.trim() ?? ""}” (relato)`);
  const tentativas = validas.filter((r) => c(r).tentou).map((r) => c(r).tentou_como?.trim() || "tentou resolver");
  const pagamentos = validas.filter((r) => c(r).pagou).map((r) => c(r).pagou_oque?.trim() || "pagou por algo");
  const sinais = sinaisMercadoDe(d, f).map((r) => (r.conteudo as SinalMercado).nome?.trim() || "solução à venda");
  const reconheceram = validas.filter((r) => c(r).reconheceu === "caso").length;
  const naoReconheceram = validas.filter((r) => c(r).reconheceu === "nao").length;

  const grupos: { titulo: string; itens: string[] }[] = [];
  if (passo === 1) {
    grupos.push({
      titulo: "Quem você ouviu",
      itens: [
        `${validas.length} ${validas.length === 1 ? "conversa" : "conversas"} do público · ${reconheceram} com caso concreto${naoReconheceram ? ` · ${naoReconheceram} não reconheceram` : ""}`,
        ...(trechos.length ? [`${trechos.length} ${trechos.length === 1 ? "relato encontrado" : "relatos encontrados"} com caso concreto`] : []),
      ],
    });
  }
  if (passo === 2 || passo === 4) grupos.push({ titulo: "O que as pessoas disseram", itens: [...falas, ...trechos] });
  if (passo === 3) grupos.push({ titulo: "Os casos", itens: [...falas, ...trechos, ...tentativas.map((t) => `Tentou: ${t}`)] });
  if (passo === 5) {
    const id = (dadosHipotese(a.hipotese) as Hipotese).ativo;
    const at = ativosEscolhidos(d).find((x) => x.id === id);
    const sits = at ? situacoesDoPadrao(d, at.registro).map((s) => (s.conteudo as Situacao).o_que_fez?.trim()).filter(Boolean) : [];
    grupos.push({ titulo: `O que você já fez${at ? ` (${at.nome})` : ""}`, itens: sits as string[] });
    grupos.push({ titulo: "O que as pessoas já tentaram e não resolveu", itens: tentativas });
  }
  if (passo === 6) {
    grupos.push({ titulo: "Quem já pagou por algo", itens: pagamentos });
    grupos.push({ titulo: "O que já vende sobre isso", itens: sinais });
  }
  return grupos.map((g) => ({ ...g, itens: g.itens.length ? g.itens : ["Nada registrado sobre isso"] }));
}

// Listas que ela vê: o que estamos apostando · o que ainda não sabemos.
export function listasIncertezas(d: DadosJornada): { apostando: string[]; naoSabemos: string[] } {
  const inc = mentoraOportunidade(d).incertezas ?? [];
  return {
    apostando: inc.filter((i) => i.destino === "aposta" && i.texto.trim()).map((i) => i.texto),
    naoSabemos: inc.filter((i) => i.destino !== "aposta" && i.texto.trim()).map((i) => i.texto),
  };
}

export function naoSabemosDoM5(d: DadosJornada): string[] {
  const a = aposta(d);
  return a ? ((a.decisao.conteudo_mentora as DecisaoM5).nao_sabemos ?? []).filter((x) => x.trim()) : [];
}

// Palavras de formato na direção da solução (só um alerta para a Karen; nada é bloqueado na escrita).
const FORMATO = /\b(curso|mentoria|workshop|e-?book|aula|aulas|semanas?|meses|m[oó]dulos?|encontros?|grupo|whatsapp|zoom|r\$|pre[cç]o|plataforma|app|consultoria|imers[aã]o)\b/i;
export function pareceFormato(texto?: string): boolean {
  return !!texto && FORMATO.test(texto);
}
