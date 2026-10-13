// Regras do M8 · Preparar para o Mercado (Arquitetura revisada do M8). Calls 7 e 8.
// O M8 muda como a oferta é dita, nunca o que ela é.
import type { DadosJornada, Registro } from "./jornada";
import { call } from "./jornada";
import { aposta, valorItem } from "./m6";
import { conversasDe, situacaoPublico, type Conversa, type RevisaoConversa } from "./m4";
import { clientesSimultaneos, dadosOferta, limitesDaOferta, reais } from "./m7";

export type PassoCaminho = "interesse" | "aceite" | "pagamento" | "inicio";
export type Preparo = {
  promessa?: { texto?: string; cumprimento?: "sim" | "so_se" | "depende"; origem?: "contida" | "acrescenta" };
  abordagem?: { texto?: string; mecanismo?: string; nome?: string };
  resumo?: string;
  falada?: { ensaiada_em?: string };
  rota?: { tipo?: "conversa" | "mensagem" | "grupo" | "pagina"; porque?: string };
  caminho?: Partial<Record<PassoCaminho, { como?: string; percorrido?: boolean }>>;
};
export type PreparoMentora = {
  objecoes?: { texto: string; origem: string; resposta: string }[];
  ajustes?: { nivel: string; o_que: string; razao: string }[];
  hipoteses?: string[];
  recomendacoes?: { texto: string; concordou?: boolean }[];
  verificacao?: Partial<Record<"compreensao" | "contencao" | "caminho" | "continuidade" | "proporcionalidade", boolean>>;
  handoff?: { materiais?: string; decidir_no_m9?: string };
  assumida_em?: string;
};

export const DECISOES_M8 = [
  { n: 1, chave: "promessa", titulo: "A promessa", pergunta: "Que mudança a pessoa vai perceber depois de receber o que você entrega?" },
  { n: 2, chave: "abordagem", titulo: "Por que do seu jeito", pergunta: "Por que esta forma de ajudar, e não o que essa pessoa já tentou?" },
  { n: 3, chave: "apresentacao", titulo: "A apresentação", pergunta: "Como você diria isso em um minuto, e como alguém leria sozinho?" },
  { n: 4, chave: "rota", titulo: "Por onde as pessoas vão conhecer", pergunta: "Por qual caminho as pessoas vão conhecer a oferta nesse primeiro teste?" },
] as const;
export type ChaveM8 = (typeof DECISOES_M8)[number]["chave"];

export const CUMPRIMENTO = [
  { valor: "sim", rotulo: "Sim", detalhe: "recebendo exatamente o que eu entrego, ela reconhece" },
  { valor: "so_se", rotulo: "Só se acontecer mais alguma coisa", detalhe: "a promessa precisa encolher" },
  { valor: "depende", rotulo: "Depende de algo que eu ainda não fiz de verdade", detalhe: "a promessa não pode depender disso" },
] as const;
export const ORIGEM = [
  { valor: "contida", rotulo: "Já está no que eu entrego" },
  { valor: "acrescenta", rotulo: "Estou acrescentando uma mudança", detalhe: "a promessa precisa encolher" },
] as const;

export const ROTAS = [
  { valor: "conversa", rotulo: "Conversa direta", detalhe: "individual, por indicação, pela sua rede", exige: "Apresentação falada + resumo escrito para enviar depois" },
  { valor: "mensagem", rotulo: "Mensagem escrita", detalhe: "sem conversa antes", exige: "Resumo escrito que se sustenta sozinho" },
  { valor: "grupo", rotulo: "Apresentação para um grupo", detalhe: "uma turma, um evento, uma comunidade", exige: "Apresentação falada um pouco mais longa + resumo escrito" },
  { valor: "pagina", rotulo: "Página pública", detalhe: "só se as outras não alcançam quem compra", exige: "Uma página com os sete elementos" },
] as const;

export const CAMINHO: { chave: PassoCaminho; titulo: string; pergunta: string; exemplo: string }[] = [
  { chave: "interesse", titulo: "Interesse", pergunta: "Como a pessoa diz que quer saber mais?", exemplo: "Responde a mensagem ou pede para conversar pelo WhatsApp." },
  { chave: "aceite", titulo: "Aceite", pergunta: "Como ela confirma que quer avançar?", exemplo: "Recebe a proposta por mensagem e responde “quero”." },
  { chave: "pagamento", titulo: "Pagamento", pergunta: "Como ela paga?", exemplo: "Pix ou link de cartão em até 3 vezes (já testei os dois)." },
  { chave: "inicio", titulo: "Início", pergunta: "O que acontece depois de pagar?", exemplo: "Recebe a mensagem de boas-vindas e marca a primeira sessão na semana seguinte." },
];

const VOCAB_MEM = /\b(ativos?|destino|entrega|hip[oó]teses?|oportunidade|benefici[aá]rio|MEM|movimento|MAPA|NORTE|comprador pretendido)\b/gi;
export function vocabularioMem(texto?: string): string[] {
  return Array.from(new Set((texto ?? "").match(VOCAB_MEM) ?? [])).map((x) => x.toLowerCase());
}

export function preparoDe(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "preparo");
}
export function dadosPreparo(d: DadosJornada): Preparo {
  return (preparoDe(d)?.conteudo ?? {}) as Preparo;
}
export function mentoraPreparo(d: DadosJornada): PreparoMentora {
  return (preparoDe(d)?.conteudo_mentora ?? {}) as PreparoMentora;
}

const t = (v?: string) => !!v?.trim();
export function decisaoM8Feita(p: Preparo, ch: ChaveM8): boolean {
  if (ch === "promessa") return t(p.promessa?.texto) && p.promessa?.cumprimento === "sim" && p.promessa?.origem === "contida";
  if (ch === "abordagem") return t(p.abordagem?.texto);
  if (ch === "apresentacao") return t(p.resumo) && !!p.falada?.ensaiada_em;
  return !!p.rota?.tipo && t(p.rota?.porque);
}

export function caminhoPronto(p: Preparo): boolean {
  return CAMINHO.every((c) => t(p.caminho?.[c.chave]?.como) && p.caminho?.[c.chave]?.percorrido);
}

export function call7Feita(d: DadosJornada): boolean {
  return call(d, 7)?.estado === "realizado";
}

export function prontaCall7(d: DadosJornada): boolean {
  const p = dadosPreparo(d);
  return DECISOES_M8.every((x) => decisaoM8Feita(p, x.chave));
}

export function faltaEnvioM8(d: DadosJornada): string[] {
  const p = dadosPreparo(d);
  const f: string[] = DECISOES_M8.filter((x) => !decisaoM8Feita(p, x.chave)).map((x) => `${x.titulo.toLowerCase()}`);
  if (call7Feita(d)) CAMINHO.forEach((c) => (!t(p.caminho?.[c.chave]?.como) || !p.caminho?.[c.chave]?.percorrido) && f.push(`caminho: ${c.titulo.toLowerCase()}`));
  return f;
}

// Os sete elementos, montados com o que já foi decidido (ela ajusta a linguagem).
export function resumoMontado(d: DadosJornada, p: Preparo): string {
  const o = dadosOferta(d);
  const momento = valorItem(d, "momento") || valorItem(d, "contexto");
  const linhas = [
    `Para ${valorItem(d, "beneficiario") || "[para quem]"}${momento ? `, ${momento}` : ""}.`,
    p.promessa?.texto?.trim() || "[a promessa]",
    p.abordagem?.texto?.trim() || "[por que do seu jeito]",
    `O que você recebe: ${o.forma?.texto?.trim() || "[a forma]"}.`,
    `Não inclui: ${o.forma?.exclui?.trim() || "[o que não está incluído]"}.`,
    `Investimento: ${reais(o.preco?.valor)}${o.preco?.condicao ? `, ${o.preco.condicao.trim()}` : ""}.`,
    `Próximo passo: ${p.caminho?.interesse?.como?.trim() || "[como a pessoa diz que quer saber mais]"}.`,
  ];
  return linhas.join("\n\n");
}

export function falasDesejo(d: DadosJornada): string[] {
  const a = aposta(d);
  if (!a?.frente) return [];
  return conversasDe(d, a.frente)
    .filter((r) => situacaoPublico(r) === "conta")
    .flatMap((r) => {
      const op = (r.conteudo_mentora as RevisaoConversa).falas_opiniao ?? [];
      return ((r.conteudo as Conversa).falas ?? []).filter((x, k) => x.trim() && !op.includes(k)).map((x) => `“${x}”`);
    });
}

export function tentativas(d: DadosJornada): string[] {
  const a = aposta(d);
  if (!a?.frente) return [];
  return conversasDe(d, a.frente)
    .filter((r) => situacaoPublico(r) === "conta" && (r.conteudo as Conversa).tentou)
    .map((r) => (r.conteudo as Conversa).tentou_como?.trim() || "tentou resolver");
}

export function hipotesesM9(d: DadosJornada): string[] {
  const o = dadosOferta(d);
  const p = dadosPreparo(d);
  const h: string[] = [];
  if (p.promessa?.texto) h.push(`Se as pessoas acreditam na promessa: “${p.promessa.texto.trim()}”.`);
  const comp = valorItem(d, "comprador");
  if (comp) h.push(`Se quem compra é: ${comp}.`);
  if (o.preco?.valor) h.push(`Se aceitam ${reais(o.preco.valor)}${o.preco.condicao ? `, ${o.preco.condicao.trim()}` : ""}.`);
  const rota = ROTAS.find((r) => r.valor === p.rota?.tipo);
  if (rota) h.push(`Se a rota “${rota.rotulo.toLowerCase()}” alcança pessoas que podem comprar.`);
  h.push("Se alguém percorre o caminho até pagar.");
  Object.values(o.como?.competencia ?? {}).forEach((c) => c.qual?.trim() && h.push(`Se a competência “${c.qual.trim()}” se sustenta na entrega.`));
  return h;
}

export const DECIDIR_NO_M9 = "Quem abordar; quantas pessoas; por quanto tempo; o que observar e como registrar.";

export function limitesDoTeste(d: DadosJornada): string[] {
  const cs = clientesSimultaneos(dadosOferta(d));
  return [...(cs ? [`Até ${cs} ${cs === 1 ? "cliente" : "clientes"} ao mesmo tempo`] : []), ...limitesDaOferta(d)];
}

