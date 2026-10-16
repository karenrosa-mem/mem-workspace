// ExpertIA no Workspace (decisão de 16/10/2026): o ExpertIA abre no ChatGPT ou no Claude
// da própria mentorada, que podem ser gratuitos, por um link que já leva as instruções,
// a tarefa do momento e o que ela escreveu na jornada. A conversa não volta sozinha:
// ela traz de volta o resumo e cola no Workspace, que é a memória do ExpertIA.
//
// Só entra no contexto o que ela mesma escreveu. Leituras e notas da Karen nunca vão.
//
// PROVISÓRIO: o núcleo e as tarefas abaixo foram extraídos do Prompt de Produção do
// ExpertIA (doc 07, Blocos 0, 1, 2.1 e 12) até o projeto do ExpertIA entregar a versão curta.
import type { DadosJornada, Registro } from "./jornada";
import { situacoes, tituloDaSituacao, type Situacao } from "./m1";
import { ativosEscolhidos, dadosHipotese, fraseTexto, hipoteses } from "./m3";
import { fraseDaFrente, frentes } from "./m4";
import { decisaoM5, type DecisaoM5 } from "./m5";
import { PASSOS, valorItem, oportunidadeDe } from "./m6";
import { dadosOferta, ofertaDe, rotuloTipoOferta } from "./m7";

export const NUCLEO = `Você é o ExpertIA, assistente da mentoria MEM (Método Expertise Monetizada), da mentora Karen. A mentoria ajuda mulheres com anos de experiência a transformar o que sabem em um primeiro produto digital: uma mentoria, consultoria ou serviço online, definido e vendido antes de ser entregue.

Seu papel: ajudar a mentorada a lembrar, explorar, organizar e pesquisar. Quem decide é ela. Quem valida é a Karen, nas aulas e nas calls.

Regras que você nunca quebra:
- Não diga qual é a expertise dela, nem escolha público, problema, produto ou preço por ela. Você pode mostrar opções e perguntar; a escolha é dela.
- Nunca diga que uma ideia "está validada", "vai dar certo" ou "é ótima". Validação só acontece com a Karen.
- Separe sempre o que ela viveu ou viu (fato) do que ela acha ou imagina (hipótese). Quando for hipótese, diga que é.
- Se ela chegar com um formato pronto ("quero vender um curso"), trate como ideia a testar, não como decisão.
- Nunca invente fatos sobre a vida dela, depoimentos, números ou fontes. Se não souber, diga.
- Não prometa renda nem resultado.

Jeito de falar: português do Brasil, frases curtas, direto e acolhedor, como alguém experiente e honesto. Sem emoji, sem tom de coach, sem frases motivacionais. Uma pergunta por vez. Não use termos internos do método.`;

export type ChaveTarefa = "lembrar" | "publicos" | "mercado" | "oferta" | "livre";

export const TAREFAS: Record<ChaveTarefa, { titulo: string; texto: string }> = {
  lembrar: {
    titulo: "Lembrar situações",
    texto: `Tarefa de agora: ajudar a mentorada a lembrar situações reais da trajetória dela em que alguém tinha um problema e ela resolveu. Pergunte por fases da carreira, pessoas que a procuravam, coisas que ela fazia sem esforço e que outros achavam difícil. Para cada situação, ajude a deixar claro: quando foi, qual era o contexto, o que ela fez e o que mudou. Não tire conclusão sobre o que essas situações dizem dela.
Ao final, ou quando ela pedir, entregue as situações em tópicos curtos, começando com a linha "PARA O WORKSPACE:", para ela colar no Workspace e escrever do jeito dela.`,
  },
  publicos: {
    titulo: "Outros públicos",
    texto: `Tarefa de agora: ajudar a mentorada a encontrar outros tipos de pessoa que vivem exatamente o mesmo problema que ela já resolveu, em outros lugares. Não basta alguém que poderia se beneficiar: precisa ter o mesmo problema. Sugira tipos de pessoa e, para cada um, diga em uma frase por que teria o mesmo problema. Ela fica só com os que reconhece.
Ao final, entregue a lista em tópicos, começando com a linha "PARA O WORKSPACE:".`,
  },
  mercado: {
    titulo: "Pesquisa de mercado",
    texto: `Tarefa de agora: ajudar a mentorada a pesquisar se este problema aparece no mercado. Comece pelas palavras que este público usaria para buscar o problema, do jeito que ele fala, não do jeito técnico. Se você puder pesquisar na internet, procure relatos reais (comentários, avaliações, perguntas em fóruns) e ofertas que já existem para esse problema. Cada item precisa vir com o link, para ela conferir. Nunca invente citações, números ou links. Diga com clareza o que é relato real, o que é sinal de mercado e o que é suposição sua.
Ao final, entregue em tópicos, começando com a linha "PARA O WORKSPACE:": palavras-chave; relatos com link; ofertas encontradas com link.`,
  },
  oferta: {
    titulo: "Pensar a oferta",
    texto: `Tarefa de agora: ajudar a mentorada a pensar uma decisão da oferta dela (abaixo). Mostre caminhos possíveis, com o que cada um exige dela e o que deixa de fora, e faça perguntas que ajudem a escolher. Não escolha por ela. Não sugira preço sem dizer que é hipótese, e lembre que o teste com pessoas reais é que vai mostrar.
Ao final, entregue em tópicos, começando com a linha "PARA O WORKSPACE:", os caminhos que ela considerou e o que pesou para cada um.`,
  },
  livre: {
    titulo: "Conversa livre",
    texto: `Tarefa de agora: a mentorada quer conversar sobre o momento da jornada dela (abaixo). Ajude com o que ela pedir, dentro das regras. Se ela pedir uma decisão, devolva as opções e as perguntas; a decisão é dela, e a validação é com a Karen.
Ao final, ou quando ela pedir, entregue um resumo curto em tópicos, começando com a linha "PARA O WORKSPACE:".`,
  },
};

// Anotações que ela trouxe de conversas anteriores com o ExpertIA.
export function notasExpertIA(d: DadosJornada): Registro[] {
  return d.registros.filter((r) => r.tipo === "nota_expertia").sort((a, b) => a.criado_em.localeCompare(b.criado_em));
}

// Movimento em que ela está: o aberto; se nenhum, o último fechado.
export function movimentoDaConversa(d: DadosJornada): number {
  const aberto = d.movimentos.find((m) => m.estado === "aberto")?.codigo;
  if (aberto) return aberto;
  const fechados = d.movimentos.filter((m) => m.estado === "fechado").map((m) => m.codigo);
  return fechados.length ? Math.max(...fechados) : 1;
}

const curto = (t: unknown, n = 140) => {
  const s = String(t ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

// O que ela já escreveu, em blocos do mais antigo ao mais recente. Cada bloco é
// uma lista de linhas; o corte por tamanho tira linhas dos blocos mais antigos primeiro.
export function blocosDeContexto(d: DadosJornada): { titulo: string; linhas: string[] }[] {
  const b: { titulo: string; linhas: string[] }[] = [];
  const sit = situacoes(d).map((r) => {
    const s = r.conteudo as Situacao;
    return `${s.ano ? s.ano + " · " : ""}${curto(tituloDaSituacao(r), 80)}${s.o_que_mudou ? " · o que mudou: " + curto(s.o_que_mudou, 90) : ""}`;
  });
  if (sit.length) b.push({ titulo: "Situações da trajetória dela", linhas: sit });
  const at = ativosEscolhidos(d).map((a) => `${a.nome}${a.quemTinha ? " · quem tinha o problema: " + curto(a.quemTinha, 80) : ""}`);
  if (at.length) b.push({ titulo: "O que ela sabe fazer que resolve o problema de alguém", linhas: at });
  // Lacunas da frase ("[quando ou onde]") não vão para o ExpertIA.
  const semLacuna = (t: string) => t.replace(/,?\s*\[[^\]]*\]/g, "").replace(/\s+,/g, ",");
  const dec = decisaoM5(d);
  const ap = (dec?.conteudo_mentora as DecisaoM5 | undefined)?.aposta;
  const h = hipoteses(d).find((x) => x.id === ap);
  if (h) {
    // Depois da aposta, as outras hipóteses só atrapalham: vai só a escolhida.
    b.push({ titulo: "A aposta dela", linhas: [curto(semLacuna(fraseTexto(d, dadosHipotese(h))), 260)] });
  } else {
    const fr = frentes(d);
    const lista = fr.length ? fr.map((f) => fraseDaFrente(d, f)) : hipoteses(d).map((x) => fraseTexto(d, dadosHipotese(x)));
    if (lista.length)
      b.push({
        titulo: fr.length ? "O que ela levou para ouvir o mercado (hipóteses)" : "Ideias de público e problema (hipóteses)",
        linhas: lista.map((t) => curto(semLacuna(t), 220)),
      });
  }
  if (oportunidadeDe(d)) {
    const op = PASSOS.flatMap((p) => p.itens)
      .map((i) => ({ p: i.pergunta, v: valorItem(d, i.chave) }))
      .filter((x) => x.v)
      .map((x) => `${curto(x.p, 70)} ${curto(x.v, 140)}`);
    if (op.length) b.push({ titulo: "A oportunidade, como ela descreveu", linhas: op });
  }
  if (ofertaDe(d)) {
    const o = dadosOferta(d);
    const l: string[] = [];
    if (o.forma?.tipo) l.push(`Tipo: ${rotuloTipoOferta(o.forma.tipo)}`);
    if (o.entrega?.texto) l.push(`O que entrega: ${curto(o.entrega.texto, 160)}`);
    if (o.como?.etapas?.length) l.push(`Etapas: ${o.como.etapas.map((e) => curto(e, 50)).join(" · ")}`);
    if (o.forma?.texto) l.push(`Formato: ${curto(o.forma.texto, 140)}`);
    if (o.preco?.valor) l.push(`Preço pensado: R$ ${o.preco.valor}`);
    if (l.length) b.push({ titulo: "A oferta até agora", linhas: l });
  }
  const notas = notasExpertIA(d).map((r) => curto((r.conteudo as { texto?: string }).texto, 300));
  if (notas.length) b.push({ titulo: "O que ela trouxe de conversas anteriores com você", linhas: notas });
  return b;
}

function textoDoContexto(blocos: { titulo: string; linhas: string[] }[]): string {
  return blocos
    .filter((x) => x.linhas.length)
    .map((x) => `${x.titulo}:\n${x.linhas.map((l) => "- " + l).join("\n")}`)
    .join("\n\n");
}

// Links ficam abaixo deste tamanho (texto já codificado) para abrir com segurança.
const LIMITE = 7000;

export function montarTexto(d: DadosJornada, tarefa: ChaveTarefa, foco?: string, pergunta?: string): string {
  const blocos = blocosDeContexto(d).map((b) => ({ ...b, linhas: [...b.linhas] }));
  const monta = () =>
    [
      NUCLEO,
      "---",
      TAREFAS[tarefa].texto,
      foco ? `Foco desta conversa: ${foco}` : "",
      blocos.some((b) => b.linhas.length)
        ? `---\nO que ela já escreveu na jornada (use só como contexto; não repita tudo de volta):\n\n${textoDoContexto(blocos)}`
        : "",
      "---",
      pergunta?.trim() ? `Mensagem dela: ${pergunta.trim()}` : "Comece se apresentando em uma frase e fazendo a primeira pergunta.",
    ]
      .filter(Boolean)
      .join("\n\n");
  let t = monta();
    // Se passar do limite, corta uma linha do bloco mais longo (as anotações por último).
  const anotacoes = "O que ela trouxe de conversas anteriores com você";
  while (encodeURIComponent(t).length > LIMITE) {
    const candidatos = blocos.filter((b) => b.linhas.length > 1);
    if (!candidatos.length) break;
    const alvo = candidatos.filter((b) => b.titulo !== anotacoes).sort((a, z) => z.linhas.length - a.linhas.length)[0] ?? candidatos[0];
    alvo.linhas.shift();
    t = monta();
  }
  return t;
}

export function linksExpertIA(texto: string): { chatgpt: string; claude: string } {
  const q = encodeURIComponent(texto);
  return { chatgpt: `https://chatgpt.com/?q=${q}`, claude: `https://claude.ai/new?q=${q}` };
}
