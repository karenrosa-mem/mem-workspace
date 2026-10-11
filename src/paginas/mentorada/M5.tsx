import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, type DadosJornada, type Registro } from "../../lib/jornada";
import { dataHora, diaDaSemana, naDia } from "../../lib/datas";
import { fraseTexto, dadosHipotese, hipoteses } from "../../lib/m3";
import { fraseDaFrente } from "../../lib/m4";
import {
  CRITERIOS,
  PARA_VOCE,
  ativoDa,
  comparacaoDe,
  comparacaoLiberada,
  comparadas,
  dadosComparacao,
  decisaoM5,
  duvidas,
  fatos,
  faltaEnvioM5,
  investigacaoAberta,
  leituraValida,
  nomeEscolha,
  porqueDaAposta,
  rotuloParaVoce,
  soUma,
  type ChaveCriterio,
  type Comparacao,
  type Comparada,
  type DecisaoM5,
  type ParaVoce,
} from "../../lib/m5";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import { FormConversa } from "./M4";

// M5 · Escolher onde apostar — tela da mentorada.
export default function M5() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;

  const c4 = call(dados, 4);
  const dia = c4 ? naDia(diaDaSemana(c4.data_atual)).toLowerCase() : "na Call 4";
  const decisao = decisaoM5(dados);
  const registrada = !!decisao && !decisao.pendente_publicacao;
  const lista = comparadas(dados);
  const travada = comparacaoDe(dados)?.estado_edicao === "fechado";

  return (
    <>
      <span className="mem-label mem-muted">Movimento 5 · Escolher onde apostar</span>
      <h1 className="mem-h1">Onde vale apostar agora?</h1>

      {!comparacaoLiberada(dados) ? (
        <p className="mem-body ws-measure mem-muted">
          A comparação abre quando pelo menos uma hipótese tiver o que precisa no Movimento 4.{" "}
          <Link className="ws-link" to="/jornada/4">
            Ver o Movimento 4
          </Link>
        </p>
      ) : (
        <>
          {registrada && decisao && <Aposta dados={dados} decisao={decisao} aoSalvar={recarregar} />}

          {!registrada && (
            <section className="ws-bloco ws-como">
              <p className="mem-label mem-muted">O que fazer aqui · ~30 min</p>
              <ol className="ws-como__passos">
                {soUma(dados) ? (
                  <li className="mem-body">
                    Só uma hipótese chegou até aqui, então não há o que comparar. Releia o que ela mostrou e responda “é para você?”.
                  </li>
                ) : (
                  <li className="mem-body">
                    Cinco perguntas, uma de cada vez. Em cada uma, você vê o que cada hipótese mostrou no Movimento 4 e diz onde aquilo
                    aparece com mais clareza, com uma linha de porquê.
                  </li>
                )}
                <li className="mem-body">Para cada hipótese, responda: é para você?</li>
                <li className="mem-body">
                  Na Call 4{c4 ? ` (${dataHora(c4.data_atual)})` : ""}, vocês escolhem juntas onde apostar. A escolha é sua.
                </li>
              </ol>
              {!soUma(dados) && (
                <p className="mem-body-sm mem-muted">
                  Ninguém ganha por pontos: não existe nota para somar. O que conta é o seu porquê. Se uma hipótese sair no início da
                  call, ela sai daqui, e o que você escreveu sobre ela fica guardado.
                </p>
              )}
            </section>
          )}

          <Investigacao dados={dados} aoSalvar={recarregar} />

          {registrada ? (
            <details className="ws-bloco">
              <summary className="mem-label">Sua comparação</summary>
              <ResumoComparacao dados={dados} />
            </details>
          ) : (
            <>
              {!soUma(dados) && (
                <section className="ws-secao" id="comparar">
                  <h2 className="mem-h2">Parte 1 · Comparar</h2>
                  <Criterios dados={dados} travada={travada} aoSalvar={recarregar} />
                </section>
              )}
              <section className="ws-secao" id="para-voce">
                <h2 className="mem-h2">{soUma(dados) ? "É para você?" : "Parte 2 · É para você?"}</h2>
                <p className="mem-body ws-measure mem-muted">
                  Não é sobre qual hipótese mostrou mais. É sobre você: se consegue e se quer trabalhar com isso nos próximos meses.
                  Só você responde.
                </p>
                {lista.map((c) => (
                  <ParaVoceCartao key={c.hipotese.id} dados={dados} c={c} dia={dia} travada={travada} aoSalvar={recarregar} />
                ))}
              </section>
              <div id="envio">
                <EnviarParaKaren dados={dados} movimento={5} numeroCall={4} falta={faltaEnvioM5(dados)} aoSalvar={recarregar} tambem={4} />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// Grava a comparação (um registro por jornada).
function useSalvarComparacao(dados: DadosJornada, aoSalvar: () => Promise<void>) {
  const { pessoa } = useSessao();
  return async (mudar: (c: Comparacao) => Comparacao): Promise<boolean> => {
    if (!supabase || !pessoa) return false;
    const atual = comparacaoDe(dados);
    const conteudo = mudar(dadosComparacao(dados));
    const r = atual
      ? await supabase.from("registro").update({ conteudo }).eq("id", atual.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 5,
          tipo: "comparacao",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    if (r.error) return false;
    await aoSalvar();
    return true;
  };
}

// Fatos lado a lado, em ordem fixa (a das hipóteses). Sem destaque, sem cor de intensidade.
export function ColunasFatos({ dados, chave }: { dados: DadosJornada; chave: ChaveCriterio }) {
  return (
    <div className="ws-colunas">
      {comparadas(dados).map((c) => (
        <div key={c.hipotese.id} className="ws-coluna">
          <p className="mem-label mem-muted">{c.nome}</p>
          <ul className="ws-lista-simples mem-body-sm">
            {fatos(dados, c, chave).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Criterios({ dados, travada, aoSalvar }: { dados: DadosJornada; travada: boolean; aoSalvar: () => Promise<void> }) {
  const [mudando, setMudando] = useState<ChaveCriterio | null>(null);
  const atual = CRITERIOS.find((c) => !leituraValida(dados, c.chave))?.chave;
  const aberto = mudando ?? atual;
  return (
    <>
      {CRITERIOS.map((cr, i) => {
        const l = leituraValida(dados, cr.chave);
        const abrir = !travada && aberto === cr.chave;
        return (
          <article key={cr.chave} className="mem-card ws-padrao" id={`criterio-${cr.chave}`}>
            <span className="mem-label mem-muted">
              Pergunta {i + 1} de {CRITERIOS.length}
            </span>
            <h3 className="mem-h3">{cr.pergunta}</h3>
            {abrir ? (
              <LeituraForm dados={dados} chave={cr.chave} aoSalvar={aoSalvar} aoFechar={() => setMudando(null)} />
            ) : l ? (
              <div className="ws-sua-leitura">
                <p className="mem-label mem-muted">Sua leitura</p>
                <p className="mem-body">
                  <strong>{nomeEscolha(dados, l.escolha)}</strong> — {l.porque}
                </p>
                {!travada && (
                  <div>
                    <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setMudando(cr.chave)}>
                      Mudar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mem-body-sm mem-muted">Depois da pergunta anterior.</p>
            )}
          </article>
        );
      })}
    </>
  );
}

function LeituraForm({
  dados,
  chave,
  aoSalvar,
  aoFechar,
}: {
  dados: DadosJornada;
  chave: ChaveCriterio;
  aoSalvar: () => Promise<void>;
  aoFechar: () => void;
}) {
  const cr = CRITERIOS.find((c) => c.chave === chave)!;
  const salvo = dadosComparacao(dados).criterios?.[chave];
  const [escolha, setEscolha] = useState(leituraValida(dados, chave)?.escolha ?? salvo?.escolha);
  const [porque, setPorque] = useState(salvo?.porque ?? "");
  const [erro, setErro] = useState(false);
  const salvar = useSalvarComparacao(dados, aoSalvar);
  const opcoes = [
    ...comparadas(dados).map((c) => ({ valor: c.hipotese.id, rotulo: c.nome })),
    { valor: "empatam", rotulo: "Empatam", detalhe: "aparece com a mesma clareza" },
    { valor: "nao_da", rotulo: "Ainda não dá para dizer", detalhe: "o que você ouviu não basta" },
  ];

  async function guardar() {
    setErro(false);
    const ok = await salvar((c) => ({
      ...c,
      criterios: { ...(c.criterios ?? {}), [chave]: { escolha, porque: porque.trim(), em: new Date().toISOString() } },
    }));
    if (!ok) return setErro(true);
    aoFechar();
  }

  return (
    <>
      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">O que o Movimento 4 mostrou</p>
        <ColunasFatos dados={dados} chave={chave} />
      </div>
      <div className="ws-sua-leitura ws-form">
        <p className="mem-label mem-muted">Sua leitura</p>
        <Pergunta n={1} feita={!!escolha} titulo="Onde isso aparece com mais clareza?">
          <Opcoes rotulo="Onde aparece com mais clareza" opcoes={opcoes} valor={escolha} aoEscolher={setEscolha} />
          <Colinha serve={cr.serve} exemplo={cr.exemplo} />
        </Pergunta>
        <Pergunta n={2} feita={!!porque.trim()} titulo="Por quê? Uma linha">
          <input className="mem-input" aria-label="Por quê" value={porque} onChange={(e) => setPorque(e.target.value)} />
          <Colinha
            serve="Diga o fato que sustenta a sua leitura. Sem o porquê, a escolha não vale. Se não der para dizer, explique o que faltou."
            exemplo={escolha === "nao_da" ? "Ninguém falou disso nas conversas." : cr.exemploPorque}
          />
        </Pergunta>
        {erro && <p className="mem-body-sm">Não foi possível guardar. Tente de novo.</p>}
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--primary" disabled={!escolha || !porque.trim()} onClick={guardar}>
            Guardar e seguir
          </button>
        </div>
      </div>
    </>
  );
}

function ParaVoceCartao({
  dados,
  c,
  dia,
  travada,
  aoSalvar,
}: {
  dados: DadosJornada;
  c: Comparada;
  dia: string;
  travada: boolean;
  aoSalvar: () => Promise<void>;
}) {
  const salvar = useSalvarComparacao(dados, aoSalvar);
  const resp = dadosComparacao(dados).para_voce?.[c.hipotese.id];
  const ativo = ativoDa(dados, c);
  const duvida = duvidas(dados).find((x) => x.c.hipotese.id === c.hipotese.id);

  return (
    <article className="mem-card ws-padrao" id={`para-voce-${c.hipotese.id}`}>
      <span className="mem-label mem-muted">{c.nome}</span>
      <p className="mem-body ws-serif ws-frase">{fraseDaFrente(dados, c.frente)}</p>
      {soUma(dados) && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">O que o Movimento 4 mostrou</p>
          <ul className="ws-lista-simples mem-body-sm">
            {CRITERIOS.flatMap((cr) => fatos(dados, c, cr.chave).filter((t) => t !== "Nada registrado sobre isso")).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      <Pergunta n={1} feita={!!resp} titulo={`Você consegue e quer entregar isso, usando “${ativo.nome}”?`}>
        {ativo.vontade && (
          <p className="mem-body-sm mem-muted">No Movimento 2, você disse que tinha {ativo.vontade} vontade de trabalhar com isso.</p>
        )}
        {travada ? (
          <p className="mem-body">{rotuloParaVoce(resp)}</p>
        ) : (
          <Opcoes
            rotulo="É para você"
            opcoes={PARA_VOCE}
            valor={resp}
            aoEscolher={(v) => salvar((x) => ({ ...x, para_voce: { ...(x.para_voce ?? {}), [c.hipotese.id]: v as ParaVoce } }))}
          />
        )}
        <Colinha serve="É sobre você, não sobre o mercado. Uma hipótese com bons sinais que você não quer entregar vira peso daqui a dois meses. “Ainda não sei” é uma resposta honesta." />
      </Pergunta>
      {duvida && !duvida.feita && (
        <p className="mem-body-sm">
          Você marcou “{rotuloParaVoce(resp).toLowerCase()}”. A gente conversa sobre isso {dia}.
        </p>
      )}
      {resp === "nao" && <p className="mem-body-sm">Esta não vai ser a aposta. Ela continua guardada na sua jornada.</p>}
    </article>
  );
}

// ---------------------------------------------------------------------
function Investigacao({ dados, aoSalvar }: { dados: DadosJornada; aoSalvar: () => Promise<void> }) {
  const inv = investigacaoAberta(dados);
  const [registrando, setRegistrando] = useState<string | null>(null);
  if (!inv) return null;
  const texto = String((inv.conteudo_mentora as { texto?: string }).texto ?? "");
  return (
    <section className="ws-bloco ws-pauta">
      <p className="mem-label">Voltamos ao campo só para entender uma coisa</p>
      <p className="mem-body-lg">{texto}</p>
      <p className="mem-body-sm">
        Uma ou duas conversas a mais, nesta semana. Não é fracasso: é a pergunta que faltava responder antes de escolher.
      </p>
      {comparadas(dados).map((c) => {
        const novas = dados.registros.filter((r) => r.tipo === "conversa" && r.origem_id === c.frente.id && r.movimento_codigo === 5);
        return (
          <div key={c.frente.id} className="ws-padrao__parte">
            <p className="mem-body-sm">
              <strong>{c.nome}</strong>
              {novas.length ? ` · ${novas.length} ${novas.length === 1 ? "conversa nova" : "conversas novas"}` : ""}
            </p>
            {registrando === c.frente.id ? (
              <FormConversa dados={dados} frente={c.frente} movimento={5} aoFechar={() => setRegistrando(null)} aoSalvar={aoSalvar} />
            ) : (
              <div>
                <button type="button" className="mem-btn mem-btn--secondary" onClick={() => setRegistrando(c.frente.id)}>
                  Registrar conversa
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------------
function ResumoComparacao({ dados }: { dados: DadosJornada }) {
  const pv = dadosComparacao(dados).para_voce ?? {};
  return (
    <>
      {!soUma(dados) && (
        <ul className="ws-lista-simples mem-body-sm">
          {CRITERIOS.map((cr) => {
            const l = leituraValida(dados, cr.chave);
            return (
              <li key={cr.chave}>
                {cr.pergunta} <strong>{l ? nomeEscolha(dados, l.escolha) : "—"}</strong>
                {l?.porque ? ` — ${l.porque}` : ""}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mem-label mem-muted">É para você?</p>
      <ul className="ws-lista-simples mem-body-sm">
        {comparadas(dados).map((c) => (
          <li key={c.hipotese.id}>
            {c.nome}: <strong>{rotuloParaVoce(pv[c.hipotese.id])}</strong>
          </li>
        ))}
      </ul>
    </>
  );
}

// A aposta, como ela vê depois da Call 4. Nunca "melhor", "vencedora" ou "validada".
function Aposta({ dados, decisao, aoSalvar }: { dados: DadosJornada; decisao: Registro; aoSalvar: () => Promise<void> }) {
  const c = decisao.conteudo_mentora as DecisaoM5;
  const dela = decisao.conteudo as { porque?: string };
  const [ajustando, setAjustando] = useState(false);
  const [porque, setPorque] = useState(porqueDaAposta(decisao));
  const nome = (id?: string | null) => {
    const h = hipoteses(dados).find((x) => x.id === id);
    return h ? fraseTexto(dados, dadosHipotese(h)) : "Hipótese";
  };

  async function salvar() {
    if (!supabase) return;
    const r = await supabase.from("registro").update({ conteudo: { ...dela, porque: porque.trim() } }).eq("id", decisao.id);
    if (r.error) return;
    setAjustando(false);
    await aoSalvar();
  }

  return (
    <section className="ws-bloco ws-aposta">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">Onde apostar agora</span>
        <span className="mem-tag mem-tag--decisao">Aposta</span>
      </div>
      <p className="mem-body-lg ws-serif ws-frase">{nome(c.aposta)}</p>

      <div className="ws-porque">
        <p className="mem-label mem-muted">{dela.porque ? "Por que esta, agora · ajustado por você" : "Por que esta, agora · suas palavras na call"}</p>
        {ajustando ? (
          <div className="ws-form">
            <textarea className="mem-input" rows={3} aria-label="Por que esta, agora" value={porque} onChange={(e) => setPorque(e.target.value)} />
            <div className="ws-acoes">
              <button type="button" className="mem-btn mem-btn--primary" disabled={!porque.trim()} onClick={salvar}>
                Salvar
              </button>
              <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setAjustando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mem-body-lg ws-serif">“{porqueDaAposta(decisao)}”</p>
            {decisao.estado_edicao === "aberto" && (
              <div>
                <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setAjustando(true)}>
                  Ajustar com as minhas palavras
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {c.razao_estrategica?.trim() && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Razão estratégica</p>
          <p className="mem-body">{c.razao_estrategica}</p>
          {c.condicao_revisao && <p className="mem-body-sm">Revemos a aposta se {c.condicao_revisao}</p>}
        </div>
      )}

      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">O que ainda não sabemos · é isso que os próximos movimentos vão testar</p>
        <ul className="ws-lista-simples mem-body">
          {(c.nao_sabemos ?? []).filter((x) => x.trim()).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>

      {c.reserva && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Reserva</p>
          <p className="mem-body">{nome(c.reserva)}</p>
          {c.reserva_condicao && <p className="mem-body-sm">Entra se {c.reserva_condicao}</p>}
        </div>
      )}

      {(c.fora ?? []).length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Ficaram de fora, por enquanto</p>
          <ul className="ws-lista-simples mem-body-sm">
            {(c.fora ?? []).map((f) => (
              <li key={f.hipotese}>
                {nome(f.hipotese)}
                <span className="mem-muted">
                  {" "}
                  — {f.razao}. Pode voltar se {f.condicao_volta}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mem-body-sm mem-muted">
        Apostar não é ter certeza. É escolher a hipótese que, com o que você ouviu até agora, merece as próximas semanas.
      </p>
    </section>
  );
}
