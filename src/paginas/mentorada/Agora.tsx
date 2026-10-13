import { Link } from "react-router-dom";
import { useJornada } from "../../lib/useJornada";
import { MOVIMENTOS, SEMANAS_DA_JORNADA, movimentosDaCall } from "../../lib/metodo";
import FaixaPilar from "../../componentes/FaixaPilar";
import { enviadoEm } from "../../lib/envio";
import { DEFINICAO_EVIDENCIA, frentes, prontaFrente, proximoPasso } from "../../lib/m4";
import {
  comparacaoLiberada,
  comparadas,
  criteriosFaltando,
  dadosComparacao,
  decisaoM5,
  duvidas,
  investigacaoAberta,
  paraVoceFaltando,
  porqueDaAposta,
  rotuloParaVoce,
  soUma,
  type DecisaoM5,
} from "../../lib/m5";
import { dadosHipotese, hipoteses as todasHipoteses } from "../../lib/m3";
import { capacidadeNaoFecha, dadosOferta, ofertaDe, proximaDecisao } from "../../lib/m7";
import { PASSOS as PASSOS_M6, carregado as carregadoM6, dadosOportunidade, mentoraOportunidade, oportunidadeDe, passoFeito, prontaCall5 } from "../../lib/m6";
import { DEFINICAO_HIPOTESE, ativosEscolhidos, ativosSemHipotese, hipoteses, hipotesesCompletas, quemMaisRespondido } from "../../lib/m3";
import { call, leitura, movimentoAtual, type DadosJornada } from "../../lib/jornada";
import { MINIMO_SITUACOES, perguntasFaltando, situacoes, situacaoCompleta, situacoesCompletas } from "../../lib/m1";
import { dataCurta, dataHora, diasEntre, diaDaSemana, hojeBrasilia, horasAte, naDia, somarHoras } from "../../lib/datas";
import { decisaoM2, escolhaDois, padroes, padroesFaltando, precisaEscolherDois } from "../../lib/m2";
import Aviso from "../../componentes/Aviso";
import LeituraKaren from "../../componentes/LeituraKaren";

type Passo = {
  titulo: string;
  porque?: string;
  acao?: { rotulo: string; para: string };
  extra?: string;
};

// Agora no M1 (Modelo por movimento, M1.2 — "O Agora no M1").
function passoM1(d: DadosJornada): Passo {
  const c1 = call(d, 1);
  const dia = c1 ? diaDaSemana(c1.data_atual) : "a Call 1";
  const faltamPerguntas = perguntasFaltando(d);
  const faltamSituacoes = Math.max(0, MINIMO_SITUACOES - situacoesCompletas(d));
  const nadaAinda = !d.registros.some((r) => r.autora_papel === "mentorada");

  if (c1?.estado === "realizado") {
    const prazo = somarHoras(c1.data_realizada ?? c1.data_atual, 48);
    return {
      titulo: `Aguardando a leitura da Karen, até ${dataHora(prazo)}.`,
      porque: "Nada a fazer até lá.",
    };
  }
  if (nadaAinda) {
    return {
      titulo: "Comece por: Onde você está · ~10 min",
      porque: "Quatro perguntas curtas, uma de cada vez.",
      acao: { rotulo: "Começar", para: "/jornada/1#onde" },
    };
  }
  if (faltamPerguntas > 0) {
    return {
      titulo: `Continue: ${faltamPerguntas === 1 ? "falta 1 pergunta" : `faltam ${faltamPerguntas} perguntas`}.`,
      porque: `A Karen usa isso para preparar a conversa de ${dia}.`,
      acao: { rotulo: "Continuar", para: "/jornada/1#onde" },
    };
  }
  if (faltamSituacoes > 0) {
    const perto = c1 && horasAte(c1.data_atual) <= 48;
    return perto
      ? {
          titulo: `Para ${dia}, ${faltamSituacoes === 1 ? "falta 1 situação" : `faltam ${faltamSituacoes} situações`}.`,
          porque: "Com 5, a Karen consegue investigar.",
          acao: { rotulo: "Contar uma situação", para: "/jornada/1?contar=1" },
        }
      : {
          titulo: `Conte uma situação · ~6 min · ${faltamSituacoes === 1 ? "falta 1" : `faltam ${faltamSituacoes}`} para o mínimo`,
          porque: "Situações reais, de momentos diferentes da sua carreira.",
          acao: { rotulo: "Contar uma situação", para: "/jornada/1?contar=1" },
        };
  }
  if (!enviadoEm(d, 1))
    return {
      titulo: `Tudo pronto para ${dia}. Envie para a Karen.`,
      porque: "Ela lê tudo antes da call. Depois de enviar, ainda dá para ajustar.",
      acao: { rotulo: "Enviar", para: "/jornada/1#envio" },
    };
  return {
    titulo: `Enviado. A Karen está lendo seu material para ${dia}.`,
    extra: "Se lembrar de mais uma situação, ela ajuda.",
    acao: { rotulo: "Contar mais uma", para: "/jornada/1?contar=1" },
  };
}

// Agora no M2 (Modelo por movimento, M2.2 — "O Agora no M2").
function passoM2(d: DadosJornada): Passo {
  const aCompletar = situacoes(d).filter((r) => !situacaoCompleta(r)).length;
  const c2 = call(d, 2);
  const dia = c2 ? diaDaSemana(c2.data_atual) : "a Call 2";
  const mapa = leitura(d, "mapa_ativos");
  const curta = leitura(d, "call_2");
  const decisao = decisaoM2(d);

  if (c2?.estado === "realizado") {
    const prazo = somarHoras(c2.data_realizada ?? c2.data_atual, 48);
    return { titulo: `Aguardando a leitura da Karen, até ${dataHora(prazo)}.`, porque: "Nada a fazer até lá." };
  }
  if (aCompletar > 0)
    return {
      titulo: `Complete ${aCompletar === 1 ? "a situação" : `as ${aCompletar} situações`} que você contou na call.`,
      porque: "Os títulos já estão lá, anotados pela Karen.",
      acao: { rotulo: "Completar", para: "/jornada/1#situacoes" },
    };
  if (!mapa) {
    const prazo = leitura(d, "call_1")?.conteudo_mentora.prazo_padroes as string | undefined;
    return {
      titulo: `Aguardando a Karen organizar suas pistas de ativo${prazo ? `, até ${dataCurta(prazo)}` : ""}.`,
      porque: "Nada a fazer até lá.",
    };
  }
  const total = padroes(d).length;
  const faltam = padroesFaltando(d);
  const perto = c2 && horasAte(c2.data_atual) <= 24;
  if (faltam > 0 && perto)
    return {
      titulo: `Para ${dia}, o essencial é dizer se você se vê em cada possível ativo.`,
      acao: { rotulo: "Responder", para: "/jornada/2" },
    };
  if (faltam === total)
    return {
      titulo: `Responda sobre cada possível ativo · ${total} no total · ~5 min cada`,
      porque: `${naDia(dia)}, vocês decidem quais você leva ao mercado.`,
      acao: { rotulo: "Começar", para: "/jornada/2" },
    };
  if (faltam > 0)
    return {
      titulo: faltam === 1 ? "Falta responder 1 possível ativo." : `Falta responder ${faltam} possíveis ativos.`,
      acao: { rotulo: "Continuar", para: "/jornada/2" },
    };
  if (precisaEscolherDois(d) && !escolhaDois(d))
    return {
      titulo: "Última coisa: se só pudesse levar dois, quais?",
      acao: { rotulo: "Escolher", para: "/jornada/2#escolha" },
    };
  if (!enviadoEm(d, 2))
    return {
      titulo: `Tudo pronto para ${dia}. Envie para a Karen.`,
      porque: "Na call, vocês decidem quais ativos você leva ao mercado.",
      acao: { rotulo: "Enviar", para: "/jornada/2#envio" },
    };
  return { titulo: `Enviado. ${naDia(dia)}, vocês decidem quais ativos você leva ao mercado.` };
}

function passoM3(d: DadosJornada): Passo {
  const c3 = call(d, 3);
  const dia = c3 ? diaDaSemana(c3.data_atual) : "a Call 3";
  const ativos = ativosEscolhidos(d);
  const semQuemMais = ativos.find((a) => !quemMaisRespondido(d, a.id));
  const total = hipoteses(d).length;
  const completas = hipotesesCompletas(d);
  const perto = c3 && horasAte(c3.data_atual) <= 24;

  if (semQuemMais)
    return {
      titulo: `Quem mais passa por isso? · 2 perguntas sobre ${semQuemMais.nome} · ~5 min`,
      porque: DEFINICAO_HIPOTESE,
      acao: { rotulo: "Responder", para: "/jornada/3#quem-mais" },
    };
  if (completas < 3 && perto)
    return { titulo: `Para ${dia}, o essencial são 3 hipóteses completas.`, acao: { rotulo: "Continuar", para: "/jornada/3#hipoteses" } };
  if (total === 0)
    return {
      titulo: "Escolha um público e monte a primeira hipótese · ~5 min",
      porque: `${naDia(dia)}, vocês decidem quais você leva para conversar com pessoas reais.`,
      acao: { rotulo: "Começar", para: "/jornada/3#hipoteses" },
    };
  if (completas < 3)
    return {
      titulo: 3 - completas === 1 ? "Falta 1 hipótese completa para o mínimo de 3." : `Faltam ${3 - completas} hipóteses completas para o mínimo de 3.`,
      acao: { rotulo: "Continuar", para: "/jornada/3#hipoteses" },
    };
  const sem = ativosSemHipotese(d)[0];
  if (sem)
    return {
      titulo: `${sem.nome} ainda não tem hipótese.`,
      porque: "Não é obrigatório: se nenhuma fizer sentido, diga o motivo em uma frase.",
      acao: { rotulo: "Responder", para: "/jornada/3#hipoteses" },
    };
  if (total > 5)
    return { titulo: `Você tem ${total}. ${naDia(dia)}, vocês escolhem até 5.`, porque: "Nada é bloqueado.", acao: { rotulo: "Ver", para: "/jornada/3#hipoteses" } };
  if (!enviadoEm(d, 3))
    return {
      titulo: `Tudo pronto para ${dia}. Envie para a Karen.`,
      porque: "Na call, vocês escolhem quais hipóteses você vai testar em conversas.",
      acao: { rotulo: "Enviar", para: "/jornada/3#envio" },
    };
  return { titulo: `Enviado. ${naDia(dia)}, vocês escolhem quais hipóteses você vai testar em conversas.`, acao: { rotulo: "Rever", para: "/jornada/3#hipoteses" } };
}

function passoM4(d: DadosJornada): Passo {
  const c4 = call(d, 4);
  const dia = c4 ? diaDaSemana(c4.data_atual) : "a Call 4";
  const lista = frentes(d);
  const conversas = d.registros.filter((r) => r.tipo === "conversa" || r.tipo === "relato" || r.tipo === "sinal_mercado");
  const semTrilha = lista.find((f) => !(f.conteudo as { trilha?: string }).trilha);
  if (semTrilha)
    return {
      titulo: "Escolha como investigar cada hipótese: pesquisando sozinha, conversando com pessoas, ou as duas.",
      porque: DEFINICAO_EVIDENCIA,
      acao: { rotulo: "Escolher", para: `/jornada/4#frente-${semTrilha.id}` },
    };
  if (conversas.length === 0) {
    const primeira = lista[0];
    return {
      titulo: primeira ? proximoPasso(d, primeira, naDia(dia).toLowerCase()) : "Comece pela primeira hipótese.",
      porque: DEFINICAO_EVIDENCIA,
      acao: { rotulo: "Começar", para: "/jornada/4" },
    };
  }
  const revisadas = conversas.some((r) => !!(r.conteudo_mentora as { nota?: string }).nota?.trim());
  const naoProntas = lista.filter((f) => !prontaFrente(d, f));
  const perto = c4 && horasAte(c4.data_atual) <= 24;
  if (perto && comparacaoLiberada(d)) return passoComparacao(d);
  if (naoProntas.length && perto)
    return {
      titulo: `Para ${dia}, o essencial é ter pelo menos 2 conversas por hipótese.`,
      porque: "Se não conseguiu acesso, tudo bem: vira conversa com a Karen.",
      acao: { rotulo: "Continuar", para: "/jornada/4" },
    };
  if (naoProntas.length) {
    const f = naoProntas[0];
    return {
      titulo: proximoPasso(d, f, naDia(dia).toLowerCase()),
      porque: revisadas ? "A Karen deixou notas nas suas conversas: vale ler antes da próxima." : conversas.length <= 2 ? "A Karen vai olhar suas primeiras conversas em até 48 h. Pode seguir conversando." : undefined,
      extra: comparacaoLiberada(d) ? "Já dá para começar a comparar as hipóteses que têm o que precisa, no Movimento 5." : undefined,
      acao: { rotulo: "Continuar", para: `/jornada/4#frente-${f.id}` },
    };
  }
  if (comparacaoLiberada(d)) return passoComparacao(d);
  if (!enviadoEm(d, 4))
    return {
      titulo: `Tudo pronto para ${dia}. Envie para a Karen.`,
      porque: "Na call, vocês olham o que cada hipótese mostrou.",
      acao: { rotulo: "Enviar", para: "/jornada/4#envio" },
    };
  return { titulo: `Enviado. ${naDia(dia)}, vocês olham o que cada hipótese mostrou.` };
}

// Agora no M5 (Modelo por movimento, M5.2). Começa antes da Call 4, com o M4 ainda aberto.
function passoComparacao(d: DadosJornada): Passo {
  const c4 = call(d, 4);
  const dia = c4 ? diaDaSemana(c4.data_atual) : "a Call 4";
  const inv = investigacaoAberta(d);
  if (inv)
    return {
      titulo: `Mais uma ou duas conversas, só para entender: ${String((inv.conteudo_mentora as { texto?: string }).texto ?? "")}`,
      porque: "Uma ou duas conversas a mais. Não é fracasso: é a pergunta que faltava antes de escolher.",
      acao: { rotulo: "Registrar conversa", para: "/jornada/5" },
    };
  const faltamCriterios = criteriosFaltando(d);
  const semResposta = paraVoceFaltando(d);
  const nada = !soUma(d) && faltamCriterios === 5 && semResposta.length === comparadas(d).length;
  const perto = c4 && horasAte(c4.data_atual) <= 24;
  const duv = duvidas(d).find((x) => !x.feita);
  const pv = dadosComparacao(d).para_voce ?? {};
  const msgDuvida = duv
    ? `Sobre ${duv.c.nome}, você marcou “${rotuloParaVoce(pv[duv.c.hipotese.id]).toLowerCase()}”. A gente conversa sobre isso ${naDia(dia).toLowerCase()}.`
    : undefined;

  if (soUma(d) && semResposta.length)
    return {
      titulo: "Uma pergunta sobre a hipótese que chegou até aqui: é para você? · ~5 min",
      porque: `${naDia(dia)}, vocês escolhem onde apostar.`,
      acao: { rotulo: "Responder", para: "/jornada/5#para-voce" },
    };
  if (nada)
    return {
      titulo: `Agora você compara o que ouviu · 5 perguntas e uma para cada hipótese · ~30 min`,
      porque: `Ninguém ganha por pontos: você escolhe e explica por quê. ${naDia(dia)}, vocês escolhem onde apostar.`,
      acao: { rotulo: "Comparar", para: "/jornada/5#comparar" },
    };
  if ((faltamCriterios || semResposta.length) && perto)
    return {
      titulo: `Para ${dia}, o essencial é responder “é para você?” em cada hipótese.`,
      acao: { rotulo: "Responder", para: "/jornada/5#para-voce" },
    };
  if (faltamCriterios)
    return {
      titulo: faltamCriterios === 1 ? "Falta 1 pergunta da comparação." : `Faltam ${faltamCriterios} perguntas da comparação.`,
      porque: `Você está comparando as hipóteses. ${naDia(dia)}, vocês escolhem onde apostar.`,
      acao: { rotulo: "Continuar", para: "/jornada/5#comparar" },
    };
  if (semResposta.length)
    return {
      titulo: `Falta responder “é para você?” sobre ${semResposta[0].nome}.`,
      acao: { rotulo: "Responder", para: `/jornada/5#para-voce-${semResposta[0].hipotese.id}` },
    };
  if (!enviadoEm(d, 5))
    return {
      titulo: `Pronta para ${dia}. Vamos escolher onde apostar.`,
      porque: msgDuvida ?? "Envie para a Karen: ela lê a sua comparação antes da call.",
      extra: msgDuvida ? "Envie para a Karen: ela lê a sua comparação antes da call." : undefined,
      acao: { rotulo: "Enviar", para: "/jornada/5#envio" },
    };
  return { titulo: `Pronta para ${dia}. Vamos escolher onde apostar.`, porque: msgDuvida ?? "Enviado para a Karen." };
}

// Agora no M6 (Modelo por movimento, M6.2).
function passoM6(d: DadosJornada): Passo {
  const c5 = call(d, 5);
  const dia = c5 ? diaDaSemana(c5.data_atual) : "a Call 5";
  const nada = !oportunidadeDe(d);
  const perto = c5 && horasAte(c5.data_atual) <= 24;
  const prox = PASSOS_M6.find((p) => !passoFeito(d, p));
  if (nada)
    return {
      titulo: "Defina a sua oportunidade · 6 passos · ~30–45 min",
      porque: `Muita coisa já vem pronta do caminho até aqui. ${naDia(dia)}, vocês leem juntas e você assume.`,
      acao: { rotulo: "Começar", para: "/jornada/6#passo-1" },
    };
  if (prox && perto)
    return { titulo: `Para ${dia}, o essencial são os passos 1, 2 e 4.`, acao: { rotulo: "Continuar", para: `/jornada/6#passo-${prox.n}` } };
  if (prox) {
    const pronto = prox.itens.some((i) => carregadoM6(d, i.chave));
    return {
      titulo: `Passo ${prox.n} de 6: ${prox.itens[0].pergunta}`,
      porque: pronto ? "Já vem pronto do caminho até aqui: você mantém ou ajusta." : "Escreva olhando o que você ouviu, que fica ao lado.",
      acao: { rotulo: "Continuar", para: `/jornada/6#passo-${prox.n}` },
    };
  }
  if (!dadosOportunidade(d).transversal?.trim())
    return { titulo: "Última coisa: o que você manteve e o que mudou por causa do que você ouviu?", acao: { rotulo: "Responder", para: "/jornada/6#transversal" } };
  const titulo = `Pronta para ${dia}. Você vai explicar a sua oportunidade com as suas palavras, antes de ler.`;
  if (prontaCall5(d) && !enviadoEm(d, 6))
    return { titulo, porque: "Envie para a Karen: ela lê antes da call.", acao: { rotulo: "Enviar", para: "/jornada/6#envio" } };
  return { titulo, porque: "Enviado para a Karen." };
}

// Depois da Call 5: aguarda a leitura; depois, o M7 (Modelo por movimento, M7.2).
function passoM7(d: DadosJornada): Passo {
  const c5 = call(d, 5);
  if (!leitura(d, "call_5"))
    return {
      titulo: `Aguardando a leitura da Karen sobre a Call 5${c5 ? `, até ${dataHora(somarHoras(c5.data_realizada ?? c5.data_atual, 48))}` : ""}.`,
      porque: "Nada a fazer até lá. A sua oportunidade já está registrada.",
      acao: { rotulo: "Ver a oportunidade", para: "/jornada/6" },
    };
  const c6 = call(d, 6);
  const dia = c6 ? diaDaSemana(c6.data_atual) : "a Call 6";
  const o = dadosOferta(d);
  const prox = proximaDecisao(d);
  if (!ofertaDe(d))
    return {
      titulo: "Desenhe a sua oferta · 5 decisões · ~45–60 min",
      porque: `Comece pelo que a pessoa vai ter de diferente no final. ${naDia(dia)}, você explica e assume.`,
      acao: { rotulo: "Começar", para: "/jornada/7#decisao-1" },
    };
  if (capacidadeNaoFecha(d))
    return {
      titulo: `Do jeito que está, a oferta toma mais tempo do que você tem. Ajuste a forma ou leve isso para ${dia}.`,
      acao: { rotulo: "Ver", para: "/jornada/7#decisao-4" },
    };
  if (prox)
    return { titulo: `Decisão ${prox.n} de 5: ${prox.pergunta}`, porque: "A sua oportunidade fica ao lado.", acao: { rotulo: "Continuar", para: `/jornada/7#decisao-${prox.n}` } };
  if (!o.transversal?.trim())
    return { titulo: "Última coisa: por que a sua oferta é assim, e não de outro jeito?", acao: { rotulo: "Responder", para: "/jornada/7#transversal" } };
  const titulo = `Pronta para ${dia}. Você vai explicar como a oferta funciona, com as suas palavras.`;
  if (!enviadoEm(d, 7)) return { titulo, porque: "Envie para a Karen: ela lê antes da call.", acao: { rotulo: "Enviar", para: "/jornada/7#envio" } };
  return { titulo, porque: "Enviado para a Karen." };
}

// Depois da Call 6: a oferta assumida.
function passoM8(d: DadosJornada): Passo {
  const c6 = call(d, 6);
  if (!leitura(d, "call_6"))
    return {
      titulo: `Aguardando a leitura da Karen sobre a Call 6${c6 ? `, até ${dataHora(somarHoras(c6.data_realizada ?? c6.data_atual, 48))}` : ""}.`,
      porque: "Nada a fazer até lá. A sua oferta já está registrada.",
      acao: { rotulo: "Ver a oferta", para: "/jornada/7" },
    };
  return {
    titulo: "Você assumiu a sua oferta.",
    porque: "Ela ainda é hipótese: o teste vai mostrar se funciona.",
    extra: "O próximo passo, preparar a oferta para o mercado, começa na próxima call com a Karen.",
    acao: { rotulo: "Ver a oferta", para: "/jornada/7" },
  };
}

// Depois da aposta: a passagem para o NORTE.
function passoPassagem(d: DadosJornada): Passo | null {
  const dec = decisaoM5(d);
  if (!dec || dec.pendente_publicacao) return null;
  const passagem = leitura(d, "passagem_norte");
  const c4 = call(d, 4);
  if (!passagem)
    return {
      titulo: `Aguardando a leitura da Karen sobre a passagem para o NORTE${c4 ? `, até ${dataHora(somarHoras(c4.data_realizada ?? c4.data_atual, 48))}` : ""}.`,
      porque: "Nada a fazer até lá. A sua aposta já está registrada.",
      acao: { rotulo: "Ver a aposta", para: "/jornada/5" },
    };
  if (passagem) return passoM6(d);
  const c = dec.conteudo_mentora as DecisaoM5;
  const h = todasHipoteses(d).find((x) => x.id === c.aposta);
  return {
    titulo: `Sua aposta: ${h ? (dadosHipotese(h).publico ?? "a hipótese escolhida") : "a hipótese escolhida"}`,
    porque: `“${porqueDaAposta(dec)}”`,
    extra: (c.nao_sabemos ?? []).length ? `O que ainda não sabemos: ${(c.nao_sabemos ?? []).join(" · ")} O NORTE começa na próxima call com a Karen.` : undefined,
    acao: { rotulo: "Ver a aposta", para: "/jornada/5" },
  };
}

export default function Agora() {
  const { dados, erro } = useJornada();

  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página. Se continuar, avise a Karen pelo WhatsApp.
      </Aviso>
    );
  if (dados === undefined) return null;
  if (dados === null)
    return (
      <>
        <span className="mem-label mem-muted">Agora</span>
        <h1 className="mem-h1">Sua jornada ainda não começou</h1>
        <p className="mem-body-lg ws-measure">
          A Karen abre a sua jornada aqui antes da primeira call. Quando isso acontecer, esta tela
          mostra onde você está e o que fazer em seguida.
        </p>
      </>
    );

  const atual = movimentoAtual(dados);
  const mensagem = leitura(dados, "mensagem_abertura");
  const leituraCall1 = leitura(dados, "call_1");
  const passo =
    atual === 1
      ? passoM1(dados)
      : atual === 2
        ? passoM2(dados)
        : atual === 3
          ? passoM3(dados)
          : atual === 4
            ? passoM4(dados)
            : atual === 5
              ? passoComparacao(dados)
              : atual === 6
                ? passoPassagem(dados)
                : atual === 7
                  ? passoM7(dados)
                  : atual === 8
                    ? passoM8(dados)
                    : null;
  const ultimaLeitura =
    atual === 2
      ? leitura(dados, "mapa_ativos") ?? leituraCall1
      : atual === 3
        ? leitura(dados, "call_2")
        : atual === 4
          ? leitura(dados, "call_3")
          : atual === 6
            ? leitura(dados, "passagem_norte")
            : atual === 7
              ? leitura(dados, "call_5")
              : atual === 8
                ? leitura(dados, "call_6")
                : undefined;
  const primeiroAcesso = atual === 1 && !dados.registros.some((r) => r.autora_papel === "mentorada");
  const proxima = dados.encontros.find((e) => e.tipo === "call" && e.estado === "marcado");

  return (
    <>
      <span className="mem-label mem-muted">
        Agora
        {atual ? ` · Movimento ${atual} de 10` : ""}
      </span>
      <h1 className="mem-h1">{atual ? MOVIMENTOS[atual] : "Sua jornada"}</h1>
      {atual && leituraCall1 && <FaixaPilar codigo={atual} compacta />}

      {primeiroAcesso && mensagem && (
        <section className="mem-mentor ws-measure">
          <span className="mem-label mem-muted">Mensagem da Karen</span>
          <p className="mem-mentor__text">{String(mensagem.conteudo_mentora.texto)}</p>
          <span className="mem-mentor__sig">— Karen, mentora</span>
        </section>
      )}

      {ultimaLeitura && <LeituraKaren registro={ultimaLeitura} />}

      {passo && (
        <section className="ws-bloco ws-passo">
          <span className="mem-label mem-muted">O que fazer agora · você</span>
          <p className="mem-h3">{passo.titulo}</p>
          {passo.porque && <p className="mem-body mem-muted">{passo.porque}</p>}
          {passo.acao && (
            <div>
              <Link className="mem-btn mem-btn--primary" to={passo.acao.para}>
                {passo.acao.rotulo}
              </Link>
            </div>
          )}
          {passo.extra && <p className="mem-body-sm mem-muted">{passo.extra}</p>}
        </section>
      )}

      {proxima && (
        <section className="ws-bloco">
          <span className="mem-label mem-muted">Próximo encontro · juntas</span>
          <p className="mem-body-lg">
            Call {proxima.numero} · {dataHora(proxima.data_atual)}
          </p>
        </section>
      )}

      <LinhaDaJornada dados={dados} primeiroAcesso={primeiroAcesso} />
    </>
  );
}

function LinhaDaJornada({ dados, primeiroAcesso }: { dados: DadosJornada; primeiroAcesso: boolean }) {
  const { jornada, encontros, folgaRestante } = dados;
  const hoje = hojeBrasilia();
  const semanaDe = (data: string) => Math.floor(diasEntre(jornada.data_inicio, data) / 7) + 1;
  const antesDoInicio = hoje < jornada.data_inicio;
  const semanaAtual = Math.min(Math.max(semanaDe(hoje), 1), SEMANAS_DA_JORNADA);
  const callsPorSemana = new Map<number, number[]>();
  encontros
    .filter((e) => e.tipo === "call")
    .forEach((e) => {
      const s = semanaDe(e.data_atual.slice(0, 10));
      callsPorSemana.set(s, [...(callsPorSemana.get(s) ?? []), (e.numero ?? 0) * (e.estado === "realizado" ? -1 : 1)]);
    });

  return (
    <section className="ws-bloco" aria-labelledby="linha-12">
      <span className="mem-label mem-muted" id="linha-12">
        Linha da jornada ·{" "}
        {antesDoInicio ? `começa em ${dataCurta(jornada.data_inicio)}` : `semana ${semanaAtual} de ${SEMANAS_DA_JORNADA}`}
      </span>
      <ol className="ws-semanas">
        {Array.from({ length: SEMANAS_DA_JORNADA }, (_, i) => {
          const s = i + 1;
          const estado = antesDoInicio || s > semanaAtual ? "next" : s === semanaAtual ? "current" : "done";
          const calls = callsPorSemana.get(s);
          return (
            <li key={s} className="ws-semanas__item" aria-current={estado === "current" ? "step" : undefined}>
              <span className={`mem-marker mem-marker--${estado}`} aria-hidden="true" />
              <span className="mem-data">S{s}</span>
              <span className="mem-body-sm mem-muted">{calls ? calls.map((n) => (n < 0 ? `Call ${-n} ✓` : `Call ${n}`)).join(" · ") : ""}</span>
              {calls && (
                <span className="mem-body-sm mem-muted ws-semanas__mov">
                  {calls
                    .map((n) => movimentosDaCall(Math.abs(n)))
                    .filter((ms) => ms.length)
                    .map((ms) => `Mov. ${ms.join(" e ")}`)
                    .join(" · ")}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mem-body-sm">
        Termina em <strong>{dataCurta(jornada.data_limite)}</strong> · Folga: <strong>{folgaRestante} dias</strong>
      </p>
      <p className="mem-body-sm mem-muted">
        A linha conta as semanas do calendário. Embaixo de cada call, os movimentos que ela cobre. O seu avanço nos movimentos aparece em
        Jornada.
      </p>
      {primeiroAcesso && (
        <p className="mem-body-sm mem-muted ws-measure">
          A jornada tem até 12 semanas, com uma semana de folga para imprevistos. Adiar uma call para
          outra semana usa folga; quando a remarcação é da Karen, a sua folga não muda.
        </p>
      )}
    </section>
  );
}
