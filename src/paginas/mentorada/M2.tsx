import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { leitura, call, type DadosJornada, type Registro } from "../../lib/jornada";
import { situacaoCompleta, situacoes, type Situacao } from "../../lib/m1";
import {
  COMO_SABE,
  DEFINICAO_ATIVO,
  alternarComoSabe,
  listaComoSabe,
  textoComoSabe,
  OUTRAS_VEZES,
  RECONHECE,
  ROTULOS,
  VONTADE,
  anosDoPadrao,
  dadosPadrao,
  decisaoM2,
  escolhaDois,
  faltaEnvioM2,
  nomePadrao,
  porqueDaDecisao,
  outrasExperiencias,
  padroes,
  precisaEscolherDois,
  reacaoCompleta,
  reacaoDe,
  sinais,
  situacoesDoPadrao,
  tempoDePratica,
  tituloDaSituacao,
  type Reacao,
  type Rotulo,
} from "../../lib/m2";
import { dataHora } from "../../lib/datas";
import Aviso from "../../componentes/Aviso";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import Provas from "../../componentes/Provas";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";

// M2 · Enxergar seus ativos — tela da mentorada.
export default function M2() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;

  const mapa = leitura(dados, "mapa_ativos");
  const curta = leitura(dados, "call_2");
  const decisao = decisaoM2(dados);
  const aCompletar = situacoes(dados).filter((s) => !situacaoCompleta(s)).length;
  const c2 = call(dados, 2);

  return (
    <>
      <span className="mem-label mem-muted">Movimento 2 · Enxergar seus ativos</span>
      <h1 className="mem-h1">O que se repete na sua história</h1>

      {decisao && curta && <Decisao dados={dados} decisao={decisao} leituraCurta={curta} aoSalvar={recarregar} />}

      {!mapa ? (
        <section className="ws-bloco">
          {aCompletar > 0 ? (
            <>
              <p className="mem-h3">
                Primeiro: complete {aCompletar === 1 ? "a situação" : `as ${aCompletar} situações`} que você contou na call.
              </p>
              <div>
                <Link className="mem-btn mem-btn--primary" to="/jornada/1#situacoes">
                  Completar
                </Link>
              </div>
            </>
          ) : (
            <p className="mem-body-lg">
              A Karen está juntando suas pistas em possíveis ativos. Quando ela publicar, eles aparecem aqui.
            </p>
          )}
        </section>
      ) : (
        <>
          <LeituraKaren registro={mapa} />
          {!decisao && (
          <section className="ws-bloco ws-como">
            <p className="mem-label mem-muted">O que fazer aqui</p>
            <ol className="ws-como__passos">
              <li className="mem-body">
                Leia cada possível ativo que a Karen encontrou nas suas situações.
              </li>
              <li className="mem-body">Responda as perguntas de cada um. Leva uns 5 minutos por possível ativo.</li>
              <li className="mem-body">
                O que é ativo de verdade, vocês decidem juntas
                {c2 ? ` na Call 2 (${dataHora(c2.data_atual)})` : " na Call 2"}.
              </li>
            </ol>
            <p className="mem-body-sm mem-muted ws-measure">{DEFINICAO_ATIVO}</p>
          </section>
          )}

          {padroes(dados).map((p, i, todos) => (
            <BlocoPadrao key={p.id} dados={dados} padrao={p} indice={i + 1} total={todos.length} aoSalvar={recarregar} travado={!!decisao} />
          ))}

          <OutrasExperiencias dados={dados} />

          {precisaEscolherDois(dados) && !decisao && <EscolhaDois dados={dados} aoSalvar={recarregar} />}

          {!decisao && (
            <div id="envio">
              <EnviarParaKaren dados={dados} movimento={2} numeroCall={2} falta={faltaEnvioM2(dados)} aoSalvar={recarregar} />
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function BlocoPadrao({
  dados,
  padrao,
  indice,
  total,
  aoSalvar,
  travado,
}: {
  dados: DadosJornada;
  padrao: Registro;
  indice: number;
  total: number;
  aoSalvar: () => Promise<void>;
  travado: boolean;
}) {
  const info = dadosPadrao(padrao);
  const sits = situacoesDoPadrao(dados, padrao);
  const registroReacao = reacaoDe(dados, padrao);
  const reacaoSalva = registroReacao?.conteudo as Reacao | undefined;
  const anos = anosDoPadrao(dados, padrao);
  const tempo = tempoDePratica(anos);
  const completa = reacaoCompleta(reacaoSalva, sits.length === 1);
  const [editando, setEditando] = useState(!completa);
  const rotulo = (info.rotulo_final ?? info.rotulo) as Rotulo | undefined;
  const listaSinais = sinais(dados, padrao, reacaoSalva);

  return (
    <section className="mem-card ws-padrao" id={`padrao-${padrao.id}`}>
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">
          Possível ativo {indice} de {total} · a Karen identificou
        </span>
        {info.status === "nao_seguiu" && <span className="mem-tag mem-tag--relato">Não seguiu</span>}
        {info.status === "escolhido" && <span className="mem-tag mem-tag--decisao">Decisão · segue</span>}
        {completa && !info.status && <span className="mem-tag mem-tag--evidencia">Respondido</span>}
      </div>
      <h2 className="mem-h2 ws-padrao__nome">{info.nome}</h2>
      {info.rotulo_final && rotulo && <p className="mem-label ws-candidata">{ROTULOS[rotulo]}</p>}

      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">
          Onde isso aparece na sua história{anos.length ? ` · ${anos.join(" · ")}` : ""}
          {tempo ? ` · ${tempo} de prática` : ""}
        </p>
        <ul className="ws-padrao__sits">
          {sits.map((s) => {
            const c = s.conteudo as Situacao;
            return (
              <li key={s.id}>
                <span className="mem-data">{c.ano ?? "—"}</span>
                <span className="mem-body">{tituloDaSituacao(s)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">O que suas situações já mostram</p>
        <ul className="ws-sinais-linha">
          {listaSinais.map((s) => (
            <li key={s.nome} className={`ws-sinal ${s.presente ? "" : "ws-sinal--ainda"}`}>
              <span className={`mem-marker mem-marker--${s.presente ? "done" : "next"}`} aria-hidden="true" />
              <span className="mem-body-sm">
                {s.nome}
                {s.detalhe && <span className="mem-muted"> · {s.detalhe}</span>}
                <span className="ws-sr"> {s.presente ? "(aparece)" : "(ainda não aparece)"}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mem-body-sm mem-muted">
          São as quatro partes de um ativo. O que ainda não aparece, vocês olham juntas na call.
        </p>
      </div>

      {info.status === "nao_seguiu" && (info.razao || info.condicao_volta) && (
        <p className="mem-body-sm ws-measure">
          {info.razao && <>Por que não seguiu: {info.razao}. </>}
          {info.condicao_volta && <>Pode voltar se: {info.condicao_volta}.</>}
        </p>
      )}

      {travado || !editando ? (
        <ResumoReacao reacao={reacaoSalva} podeEditar={!travado} aoEditar={() => setEditando(true)} />
      ) : (
        <FormReacao
          dados={dados}
          padrao={padrao}
          registro={registroReacao}
          umaSituacao={sits.length === 1}
          aoSalvar={async () => {
            await aoSalvar();
            setEditando(false);
          }}
        />
      )}
    </section>
  );
}

function rotuloDe(lista: readonly { valor: string; rotulo: string }[], v?: string) {
  return lista.find((o) => o.valor === v)?.rotulo ?? "—";
}

function ResumoReacao({ reacao, podeEditar, aoEditar }: { reacao?: Reacao; podeEditar: boolean; aoEditar: () => void }) {
  if (!reacao) return null;
  const linhas: [string, string][] = [
    ["Você se vê nisso?", `${rotuloDe(RECONHECE, reacao.reconhece)}${reacao.frase ? ` — ${reacao.frase}` : ""}`],
    ["Quem tinha o problema", reacao.quem_tinha ?? "—"],
    ["Sinais de que deu resultado", textoComoSabe(reacao)],
    ["Vontade nos próximos 5 a 10 anos", rotuloDe(VONTADE, reacao.vontade)],
  ];
  if (reacao.outras_vezes) linhas.push(["Outras vezes", rotuloDe(OUTRAS_VEZES, reacao.outras_vezes)]);
  if (reacao.provas?.length) linhas.push(["Provas anexadas", reacao.provas.map((p) => p.nome).join(" · ")]);
  return (
    <div className="ws-padrao__parte">
      <p className="mem-label mem-muted">Suas respostas</p>
      <dl className="ws-resumo">
        {linhas.map(([k, v]) => (
          <div key={k}>
            <dt className="mem-body-sm mem-muted">{k}</dt>
            <dd className="mem-body">{v}</dd>
          </div>
        ))}
      </dl>
      {podeEditar && (
        <div>
          <button type="button" className="mem-btn mem-btn--quiet" onClick={aoEditar}>
            Mudar respostas
          </button>
        </div>
      )}
    </div>
  );
}

function FormReacao({
  dados,
  padrao,
  registro,
  umaSituacao,
  aoSalvar,
}: {
  dados: DadosJornada;
  padrao: Registro;
  registro?: Registro;
  umaSituacao: boolean;
  aoSalvar: () => Promise<void>;
}) {
  const { pessoa } = useSessao();
  const preenchido = dadosPadrao(padrao).quem_tinha_o_problema ?? "";
  const inicial = (registro?.conteudo as Reacao | undefined) ?? {};
  const [r, setR] = useState<Reacao>({
    ...inicial,
    quem_tinha: inicial.quem_tinha ?? preenchido,
    quem_tinha_veio_preenchido: inicial.quem_tinha_veio_preenchido ?? !!preenchido,
  });
  const [salvando, setSalvando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [r]);

  async function salvar() {
    if (!supabase || !pessoa) return;
    setSalvando(true);
    const conteudo = { ...r, padrao: padrao.id, quem_tinha_confirmado: !!r.quem_tinha?.trim() };
    const resposta = registro
      ? await supabase.from("registro").update({ conteudo }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 2,
          tipo: "reacao_padrao",
          origem_id: padrao.id,
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    setSalvando(false);
    if (resposta.error) return setFalhou(true);
    await aoSalvar();
  }

  const nome = dadosPadrao(padrao).nome ?? "isto";
  const pergunta1 =
    r.reconhece === "nao_reconheco"
      ? "O que não bate?"
      : r.reconhece === "em_parte"
        ? "O que combina com você e o que não combina?"
        : "O que mais combina com você aqui?";
  const sinaisMarcados = listaComoSabe(r);
  const algo = !!(r.reconhece || r.frase || sinaisMarcados.length || r.vontade);
  let n = 0;

  return (
    <div className="ws-form ws-reacao">
      <p className="mem-label mem-muted">Suas respostas · ~5 min</p>

      <Pergunta n={++n} feita={!!r.reconhece && !!r.frase?.trim()} titulo="Você se vê nisso?">
        <Opcoes rotulo="Você se vê nisso?" opcoes={RECONHECE} valor={r.reconhece} aoEscolher={(v) => setR({ ...r, reconhece: v })} />
        {r.reconhece && (
          <div className="mem-field">
            <label className="mem-field__label" htmlFor={`frase-${padrao.id}`}>
              {pergunta1}
            </label>
            <input id={`frase-${padrao.id}`} className="mem-input" value={r.frase ?? ""} onChange={(e) => setR({ ...r, frase: e.target.value })} />
            <Colinha
              serve="Uma linha, com as suas palavras. Não precisa dar outro nome: diga o que você reconhece (ou não) nas situações acima."
              exemplo={r.reconhece === "nao_reconheco" ? "Eu fiz, mas foi por obrigação; não é o que eu faço bem." : "O momento em que eu faço as duas partes se ouvirem antes de alguém decidir."}
            />
          </div>
        )}
      </Pergunta>

      <Pergunta
        n={++n}
        feita={!!r.quem_tinha?.trim() && (!!inicial.quem_tinha_confirmado || r.quem_tinha !== preenchido)}
        titulo="Quem tinha o problema que você resolvia?">
        <input
          id={`quem-${padrao.id}`}
          aria-label="Quem tinha o problema"
          className="mem-input"
          value={r.quem_tinha ?? ""}
          onChange={(e) => setR({ ...r, quem_tinha: e.target.value })}
        />
        <Colinha
          serve={
            preenchido
              ? "A Karen sugeriu isto a partir das suas situações. Se estiver certo, deixe como está; se não, corrija com as suas palavras."
              : "Quem estava do outro lado com o problema. Seja específica: quem e em que momento."
          }
          exemplo="Gestores promovidos de dentro do time, no primeiro ano no cargo."
        />
      </Pergunta>

      <Pergunta n={++n} feita={sinaisMarcados.length > 0} titulo={`Que sinais você tem de que “${nome}” deu resultado?`}>
        <p className="mem-body-sm mem-muted ws-pergunta-bloco__nota">Marque todos que valem.</p>
        <Opcoes
          rotulo="Sinais de resultado"
          opcoes={COMO_SABE}
          marcados={sinaisMarcados}
          aoEscolher={(v) => setR({ ...r, como_sabe: alternarComoSabe(sinaisMarcados, v) })}
        />
        <Provas jornadaId={dados.jornada.id} pasta={padrao.id} valor={r.provas ?? []} aoMudar={(provas) => setR({ ...r, provas })} />
        <Colinha
          serve="Opcional. Se você tem um print, um e-mail, um número ou um certificado que mostra o resultado, anexe. A Karen vê; ninguém mais."
          exemplo="O print da mensagem do gestor agradecendo pela conversa que evitou a saída do time."
        />
      </Pergunta>

      <Pergunta n={++n} feita={!!r.vontade} titulo="Quanta vontade você tem de trabalhar com isso nos próximos 5 a 10 anos?">
        <Opcoes rotulo="Vontade" opcoes={VONTADE} valor={r.vontade} aoEscolher={(v) => setR({ ...r, vontade: v })} />
        <Colinha serve="A única opinião que pedimos aqui. Dá para saber fazer muito bem uma coisa e não querer fazer mais: seja honesta." />
      </Pergunta>

      {umaSituacao && (
        <Pergunta n={++n} feita={!!r.outras_vezes} titulo="Isso aconteceu outras vezes, além da situação acima?">
          <Opcoes rotulo="Outras vezes" opcoes={OUTRAS_VEZES} valor={r.outras_vezes} aoEscolher={(v) => setR({ ...r, outras_vezes: v })} />
        </Pergunta>
      )}

      {falhou && (
        <Aviso variante="danger" titulo="Não foi possível salvar">
          Suas respostas continuam aqui. Tente de novo.
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!algo || salvando} onClick={salvar}>
          {salvando ? "Salvando" : "Salvar respostas"}
        </button>
        <span className="mem-body-sm mem-muted">Pode salvar pela metade e voltar depois.</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function OutrasExperiencias({ dados }: { dados: DadosJornada }) {
  const lista = outrasExperiencias(dados);
  if (!lista.length) return null;
  return (
    <section className="ws-bloco">
      <span className="mem-label mem-muted">Outras experiências</span>
      <ul className="ws-situacoes">
        {lista.map((s) => (
          <li key={s.id} className="ws-situacao">
            <p className="mem-body ws-situacao__titulo">{tituloDaSituacao(s)}</p>
            <p className="mem-body-sm mem-muted">
              {String((s.conteudo_mentora as { outra_experiencia: { motivo?: string } }).outra_experiencia.motivo ?? "")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EscolhaDois({ dados, aoSalvar }: { dados: DadosJornada; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const registro = escolhaDois(dados);
  const inicial = (registro?.conteudo ?? {}) as { padroes?: string[]; linha?: string };
  const [escolhidos, setEscolhidos] = useState<string[]>(inicial.padroes ?? []);
  const [linha, setLinha] = useState(inicial.linha ?? "");
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");

  async function salvar() {
    if (!supabase || !pessoa) return;
    setEstado("salvando");
    const conteudo = { padroes: escolhidos, linha: linha.trim() };
    const r = registro
      ? await supabase.from("registro").update({ conteudo }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 2,
          tipo: "escolha_dois",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    if (r.error) return setEstado("erro");
    setEstado("salvo");
    await aoSalvar();
  }

  return (
    <section className="ws-bloco" id="escolha">
      <span className="mem-label mem-muted">Última coisa</span>
      <p className="mem-h3">Se só pudesse levar dois adiante, quais?</p>
      <Colinha serve="Escolha dois, sem pensar muito: é a sua preferência antes da conversa. A decisão de verdade vocês tomam juntas na Call 2." />
      <div className="ws-escolha">
        {padroes(dados).map((p) => {
          const marcado = escolhidos.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={marcado}
              disabled={!marcado && escolhidos.length >= 2}
              className={`mem-btn ${marcado ? "mem-btn--primary" : "mem-btn--secondary"}`}
              onClick={() => {
                setEstado("");
                setEscolhidos(marcado ? escolhidos.filter((x) => x !== p.id) : [...escolhidos, p.id]);
              }}
            >
              {nomePadrao(dados, p.id)}
            </button>
          );
        })}
      </div>
      <input
        className="mem-input ws-measure"
        aria-label="Por quê, em uma linha (opcional)"
        placeholder="Por quê, em uma linha (opcional)"
        value={linha}
        onChange={(e) => {
          setLinha(e.target.value);
          setEstado("");
        }}
      />
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={escolhidos.length !== 2 || estado === "salvando"} onClick={salvar}>
          Salvar escolha
        </button>
        {estado === "salvo" && <span className="mem-body-sm mem-muted">Escolha salva.</span>}
        {estado === "erro" && <span className="mem-body-sm">Não foi possível salvar.</span>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
function Decisao({
  dados,
  decisao,
  leituraCurta,
  aoSalvar,
}: {
  dados: DadosJornada;
  decisao: Registro;
  leituraCurta: Registro;
  aoSalvar: () => Promise<void>;
}) {
  const c = decisao.conteudo_mentora as {
    escolhidos?: { padrao: string; rotulo: Rotulo }[];
    nao_seguiram?: { padrao: string; razao?: string; condicao_volta?: string }[];
  };
  const dela = decisao.conteudo as { porque?: string };
  const { naCall } = porqueDaDecisao(decisao);
  const escolhidos = c.escolhidos ?? [];
  const [ajustando, setAjustando] = useState(false);
  const [porque, setPorque] = useState(dela.porque ?? naCall);
  const semFrase = !dela.porque && !naCall;
  const [erro, setErro] = useState(false);

  async function salvar() {
    if (!supabase) return;
    setErro(false);
    const r = await supabase.from("registro").update({ conteudo: { ...dela, porque: porque.trim() } }).eq("id", decisao.id);
    if (r.error) return setErro(true);
    setAjustando(false);
    await aoSalvar();
  }

  return (
    <>
      <LeituraKaren registro={leituraCurta} />
      <section className="ws-bloco">
        <span className="mem-label mem-muted">Decisão da Call 2 · sua</span>
        <p className="mem-body-lg">
          Seguem:{" "}
          <strong>
            {escolhidos.map((e) => `${nomePadrao(dados, e.padrao)} (${ROTULOS[e.rotulo].toLowerCase()})`).join(" · ")}
          </strong>
        </p>
        {(c.nao_seguiram ?? []).length > 0 && (
          <ul className="ws-lista-simples mem-body-sm">
            {(c.nao_seguiram ?? []).map((n) => (
              <li key={n.padrao}>
                Não seguiu: <strong>{nomePadrao(dados, n.padrao)}</strong>
                {n.razao ? ` — ${n.razao}` : ""}
                {n.condicao_volta ? `. Pode voltar se ${n.condicao_volta}` : ""}
              </li>
            ))}
          </ul>
        )}
        <div className="ws-porque">
          <p className="mem-label mem-muted">
            {dela.porque ? "Por que você escolheu · suas palavras" : semFrase ? "Por que você escolheu" : "Por que você escolheu · suas palavras na call"}
          </p>
          {ajustando || semFrase ? (
            <div className="ws-form">
              <input className="mem-input" aria-label="Por que você escolheu" value={porque} onChange={(e) => setPorque(e.target.value)} />
              <Colinha
                serve={
                  semFrase
                    ? "Opcional. Em uma frase, com as suas palavras: por que esses e não os outros. Não muda a decisão."
                    : "Se a frase registrada na call não ficou do seu jeito, ajuste aqui. Não muda a decisão: só deixa o porquê com as suas palavras."
                }
              />
              {erro && (
                <Aviso variante="danger" titulo="Não foi possível salvar">
                  Tente de novo.
                </Aviso>
              )}
              <div className="ws-acoes">
                <button type="button" className="mem-btn mem-btn--primary" disabled={!porque.trim()} onClick={salvar}>
                  Salvar
                </button>
                {!semFrase && (
                  <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setAjustando(false)}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="mem-body-lg ws-serif">“{dela.porque || naCall}”</p>
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
      </section>
    </>
  );
}
