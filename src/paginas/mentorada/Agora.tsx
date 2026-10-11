import { Link } from "react-router-dom";
import { useJornada } from "../../lib/useJornada";
import { MOVIMENTOS, SEMANAS_DA_JORNADA } from "../../lib/metodo";
import FaixaPilar from "../../componentes/FaixaPilar";
import { DEFINICAO_HIPOTESE, ativosEscolhidos, ativosSemHipotese, hipoteses, hipotesesCompletas, quemMaisRespondido } from "../../lib/m3";
import { call, leitura, movimentoAtual, type DadosJornada } from "../../lib/jornada";
import { MINIMO_SITUACOES, perguntasFaltando, situacoes, situacaoCompleta, situacoesCompletas } from "../../lib/m1";
import { dataCurta, dataHora, diasEntre, diaDaSemana, hojeBrasilia, horasAte, somarHoras } from "../../lib/datas";
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
  return {
    titulo: `Pronta para ${dia}. A Karen está lendo seu material.`,
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
      porque: `Na ${dia}, vocês decidem quais você leva ao mercado.`,
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
  return { titulo: `Pronta para ${dia}. Vamos decidir quais ativos você vai investigar no mercado.` };
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
      porque: `Na ${dia}, vocês decidem quais você leva para conversar com pessoas reais.`,
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
    return { titulo: `Você tem ${total}. Na ${dia}, vocês escolhem até 5.`, porque: "Nada é bloqueado.", acao: { rotulo: "Ver", para: "/jornada/3#hipoteses" } };
  return { titulo: `Pronta para ${dia}.`, porque: "Vocês vão decidir quais hipóteses vão a campo.", acao: { rotulo: "Rever", para: "/jornada/3#hipoteses" } };
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
  const passo = atual === 1 ? passoM1(dados) : atual === 2 ? passoM2(dados) : atual === 3 ? passoM3(dados) : null;
  const ultimaLeitura =
    atual === 2
      ? leitura(dados, "mapa_ativos") ?? leituraCall1
      : atual === 3
        ? leitura(dados, "call_2")
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
      callsPorSemana.set(s, [...(callsPorSemana.get(s) ?? []), e.numero ?? 0]);
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
              <span className="mem-body-sm mem-muted">{calls ? calls.map((n) => `Call ${n}`).join(" · ") : ""}</span>
            </li>
          );
        })}
      </ol>
      <p className="mem-body-sm">
        Termina em <strong>{dataCurta(jornada.data_limite)}</strong> · Folga: <strong>{folgaRestante} dias</strong>
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
