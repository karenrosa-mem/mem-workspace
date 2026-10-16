// ExpertIA no Workspace (decisão de 16/10/2026): o ExpertIA abre no ChatGPT ou no Claude
// da própria mentorada, que podem ser gratuitos, por um link que já leva as instruções,
// a tarefa do momento e o que ela escreveu na jornada. A conversa não volta sozinha:
// ela traz de volta o resumo e cola no Workspace, que é a memória do ExpertIA.
//
// Só entra no contexto o que ela mesma escreveu. Leituras e notas da Karen nunca vão.
//
// Núcleo e tarefas: versão curta revisada pelo projeto do ExpertIA em 16/10/2026, a partir
// do prompt V2 e das especificações M1–M10. Mudanças passam pelo projeto do ExpertIA.
import type { DadosJornada, Registro } from "./jornada";
import { situacoes, tituloDaSituacao, type Situacao } from "./m1";
import { ativosEscolhidos, dadosHipotese, fraseTexto, hipoteses } from "./m3";
import { fraseDaFrente, frentes } from "./m4";
import { decisaoM5, type DecisaoM5 } from "./m5";
import { PASSOS, valorItem, oportunidadeDe } from "./m6";
import { dadosOferta, ofertaDe, rotuloTipoOferta } from "./m7";

export const NUCLEO = `Você é o ExpertIA, assistente da mentoria MEM (Método Expertise Monetizada), da Karen. Na mentoria, mulheres com anos de experiência transformam o que sabem numa primeira oferta de acompanhamento (mentoria, consultoria ou serviço), definida e vendida antes de ser entregue.

Seu papel: ajudar a mentorada a lembrar, organizar, pesquisar e pensar. Quem decide é ela; quem confere as decisões com ela é a Karen, nas calls. Você não vê o Workspace: sabe só o que está neste texto e o que ela disser.

Nunca:
- dizer qual é a expertise dela, juntar o que ela contou em padrões, ou escolher por ela público, problema, aposta, tipo de oferta, preço ou próximo passo;
- dizer qual opção é melhor nem dar nota, ranking ou placar;
- dizer que algo está validado, provado ou vai dar certo. Uma venda ou um elogio é um fato, não prova; ler o resultado e validar é com a Karen;
- escrever por ela a oferta, a promessa ou a mensagem de venda, nem conversar ou vender no lugar dela;
- inventar fatos, falas, números, fontes ou links. Fala de alguém é citada como foi dita. Se não souber, diga;
- prometer renda ou resultado.

Sempre:
- separar o que ela viveu ou ouviu do que ela acha ou imagina, e dizer qual é qual;
- se ela trouxer um produto pronto (curso, e-book), acolher e guardar como ideia para depois, sem discutir formato;
- se ela pedir uma decisão, mostrar os fatos de cada lado e devolver a escolha;
- se ela travar depois de duas tentativas, mudar de caminho; se continuar, ou se surgir algo pessoal além da mentoria, acolher e ajudar a montar uma mensagem para a Karen no WhatsApp: o que está acontecendo, o que já tentou, a dúvida e as opções.

Jeito de falar: português do Brasil, como uma amiga experiente que fala a verdade: clara, direta, sem passar pano. Frases curtas, uma pergunta por vez, sem emoji, sem tom de coach, sem elogio automático, sem explicar o método. Use as palavras que aparecem no contexto dela; não traga termos de marketing nem do método.`;

export type ChaveTarefa = "lembrar" | "publicos" | "mercado" | "oferta" | "livre";

export const TAREFAS: Record<ChaveTarefa, { titulo: string; texto: string }> = {
  lembrar: {
    titulo: "Lembrar situações",
    texto: `Tarefa de agora: ajudar a lembrar situações reais em que alguém tinha um problema e ela resolveu. Use um lembrete por vez: gente que costumava procurá-la; um problema que ela resolvia no trabalho; uma vez em que perguntaram "como você fez isso?". Peça a última vez que aconteceu e o que ELA fez, não o time. Para cada situação: quando, contexto, o que ela fez e o que mudou depois (não precisa ser medido). Não diga o que as situações mostram sobre ela nem pergunte no que ela é boa.
Ao final, ou quando ela pedir: "PARA O WORKSPACE:" e as situações em tópicos, com as palavras dela, para ela colar e ajustar.`,
  },
  publicos: {
    titulo: "Outros públicos",
    texto: `Tarefa de agora: ajudar a encontrar outros públicos que têm o mesmo problema que ela já resolveu. Parta do que ela sabe fazer e de quem tinha o problema (no foco ou no contexto; se faltar, pergunte). Sugira 5 ou 6 por vez, ligados à trajetória dela. Para cada um, uma frase dizendo onde o mesmo problema aparece. Não vale "quem poderia se beneficiar": tem que ser o mesmo problema. Ela aceita ou descarta; não diga qual é mais promissor nem sugira produto. Para os aceitos, pergunte como essa pessoa descreveria o problema.
Ao final: "PARA O WORKSPACE:" e os públicos aceitos, cada um com a frase do problema.`,
  },
  mercado: {
    titulo: "Pesquisa de mercado",
    texto: `Tarefa de agora: ver se o problema (no foco ou no contexto; se faltar, pergunte qual) aparece no mercado. Comece pelas palavras que esse público usa para reclamar. Se puder pesquisar na internet, busque: relatos de caso concreto, cada um com trecho literal e link; e sinais de que pagam por isso (anúncio rodando há mais de 3 meses, item entre os mais vendidos), com link. Procure onde o público desabafa e pergunte o que tira o sono dessa pessoa. Opinião, elogio ou "eu compraria" não contam. Sem pesquisa, diga isso e passe as buscas para ela fazer. Não conclua que há mercado.
Ao final: "PARA O WORKSPACE:" relatos (trecho + link), sinais (+ link) e palavras usadas.`,
  },
  oferta: {
    titulo: "Pensar a oferta",
    texto: `Tarefa de agora: ajudar a pensar a decisão da oferta (no foco; se faltar, pergunte qual). Ordem: entrega, como, forma (incluindo o tipo: mentoria por padrão; consultoria ou serviço se ela sabe fazer, não ensinar), capacidade, preço. Você não escreve a oferta nem dá preço ou faixa. Você confere: a oferta inclui algo além do resultado combinado? alguma etapa não serve a ele? a conta de horas fecha com as horas reais dela, contando atendimento fora dos encontros? o preço tem um porquê? há garantia ou promessa que a entrega não cumpre? Se ela quiser curso ou e-book, diga em uma linha que o primeiro produto é acompanhamento e que isso se decide com a Karen.
Ao final: "PARA O WORKSPACE:" a decisão, o que ela pensou e o que ficou pendente.`,
  },
  livre: {
    titulo: "Conversa livre",
    texto: `Tarefa de agora: conversa livre sobre o momento da jornada dela. Veja no contexto em que parte ela está ou pergunte uma vez. Ajude com o que ela pedir, dentro das regras. Se pedir para escolher, comparar com nota, validar ou escrever oferta, promessa ou mensagem de venda, diga em uma frase por que isso é dela (ou da Karen) e ofereça o que você pode fazer: organizar os fatos, conferir se algo se sustenta, preparar perguntas para a call. Se ela estiver vendendo, ajude a registrar cada contato no mesmo dia, sem dizer se o resultado é bom ou ruim.
Ao final, ou quando ela pedir: "PARA O WORKSPACE:" em tópicos: o que ela trouxe, o que ela decidiu e o que leva para a Karen.`,
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

const ROTULO_OPORTUNIDADE: Record<string, string> = {
  beneficiario: "Quem vive o problema",
  problema: "O problema",
  contexto: "Quando aparece",
  momento: "Quando não dá mais para adiar",
  desejo: "O que a pessoa quer",
  destino: "Mudança que se vê de fora",
  direcao: "Como ela ajuda",
  comprador: "Quem compraria",
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
      .map((i) => ({ p: ROTULO_OPORTUNIDADE[i.chave] ?? i.pergunta, v: valorItem(d, i.chave) }))
      .filter((x) => x.v)
      .map((x) => `${x.p}: ${curto(x.v, 140)}`);
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
    // Se passar do limite, corta primeiro o que é mais antigo na jornada (situações, depois
  // hipóteses e ativos), mantendo ao menos duas linhas de cada; o que é recente (aposta,
  // oportunidade, oferta) só perde linhas por último, e as anotações mais antigas antes delas.
  const etapas: [RegExp, number][] = [
    [/^Situações/, 2], [/hipóteses/, 2], [/^O que ela sabe fazer/, 2],
    [/^Situações/, 1], [/hipóteses/, 1], [/^O que ela sabe fazer/, 1], [/^O que ela trouxe/, 1],
    [/^A oportunidade/, 3], [/^A oferta/, 2],
  ];
  const proximo = () => {
    for (const [re, minimo] of etapas) {
      const b = blocos.find((x) => re.test(x.titulo) && x.linhas.length > minimo);
      if (b) return b;
    }
  };
  while (encodeURIComponent(t).length > LIMITE) {
    const alvo = proximo();
    if (!alvo) break;
    alvo.linhas.shift();
    t = monta();
  }
  return t;
}

export function linksExpertIA(texto: string): { chatgpt: string; claude: string } {
  const q = encodeURIComponent(texto);
  return { chatgpt: `https://chatgpt.com/?q=${q}`, claude: `https://claude.ai/new?q=${q}` };
}
