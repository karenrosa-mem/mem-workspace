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
  OUTRAS_VEZES,
  RECONHECE,
  ROTULOS,
  VONTADE,
  anosDoPadrao,
  dadosPadrao,
  decisaoM2,
  escolhaDois,
  nomePadrao,
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
import LeituraKaren from "../../componentes/LeituraKaren";

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
      <span className="mem-label mem-muted">M2 · Enxergar seus ativos</span>
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
              A Karen está organizando suas candidatas em padrões. Quando ela publicar, eles aparecem aqui.
            </p>
          )}
        </section>
      ) : (
        <>
          <LeituraKaren registro={mapa} />
          <p className="mem-body ws-measure ws-definicao">
            <strong>{DEFINICAO_ATIVO}</strong> Ao lado de cada padrão estão esses quatro sinais, acesos
            conforme o que você já contou. São sinais, não prova: o que é ativo, vocês decidem juntas
            {c2 ? ` na Call 2 (${dataHora(c2.data_atual)})` : " na Call 2"}.
          </p>

          {padroes(dados).map((p, i) => (
            <BlocoPadrao key={p.id} dados={dados} padrao={p} indice={i + 1} aoSalvar={recarregar} travado={!!decisao} />
          ))}

          <OutrasExperiencias dados={dados} />

          {precisaEscolherDois(dados) && !decisao && <EscolhaDois dados={dados} aoSalvar={recarregar} />}
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
  aoSalvar,
  travado,
}: {
  dados: DadosJornada;
  padrao: Registro;
  indice: number;
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

  return (
    <section className="ws-bloco ws-padrao" id={`padrao-${padrao.id}`}>
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">Padrão {indice}</span>
        {rotulo && (
          <span className="mem-label ws-candidata">
            {ROTULOS[rotulo]}
            {info.rotulo_final ? "" : " · provisório"}
          </span>
        )}
        {info.status === "nao_seguiu" && <span className="mem-tag mem-tag--relato">Não seguiu</span>}
        {info.status === "escolhido" && <span className="mem-tag mem-tag--decisao">Decisão · segue</span>}
      </div>
      <h2 className="mem-h2 ws-padrao__nome">{info.nome}</h2>

      <div className="ws-padrao__corpo">
        <div className="ws-padrao__situacoes">
          <p className="mem-label mem-muted">
            Suas situações{anos.length ? ` · ${anos.join(" · ")}` : ""}
            {tempo ? ` · ${tempo} de prática` : ""}
          </p>
          <ol className="ws-situacoes">
            {sits.map((s) => {
              const c = s.conteudo as Situacao;
              return (
                <li key={s.id} className="ws-situacao">
                  <span className="mem-data">{c.ano ?? "—"}</span>
                  <p className="mem-body ws-situacao__titulo">{tituloDaSituacao(s)}</p>
                  {c.o_que_mudou && <p className="mem-body-sm mem-muted">O que mudou: {c.o_que_mudou}</p>}
                </li>
              );
            })}
          </ol>
        </div>
        <aside className="ws-sinais" aria-label="Sinais de um ativo">
          <p className="mem-label mem-muted">Sinais de um ativo</p>
          <ul>
            {sinais(dados, padrao, reacaoSalva).map((s) => (
              <li key={s.nome} className="ws-sinal">
                <span className={`mem-marker mem-marker--${s.presente ? "done" : "next"}`} aria-hidden="true" />
                <span className="mem-body-sm">
                  {s.nome}
                  <span className="mem-muted">
                    {" "}
                    · {s.presente ? "aceso" : "ainda não"}
                    {s.detalhe ? ` · ${s.detalhe}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mem-body-sm mem-muted">Sinais do que você contou, não prova.</p>
        </aside>
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
  const comoSabe = COMO_SABE.flatMap((g) => g.opcoes as readonly { valor: string; rotulo: string }[]);
  return (
    <dl className="ws-respostas">
      <div className="ws-respostas__item">
        <dt className="mem-body-sm mem-muted">Você reconhece isso como seu?</dt>
        <dd className="mem-body">
          {rotuloDe(RECONHECE, reacao.reconhece)} — {reacao.frase}
        </dd>
      </div>
      <div className="ws-respostas__item">
        <dt className="mem-body-sm mem-muted">Quem tinha o problema</dt>
        <dd className="mem-body">{reacao.quem_tinha}</dd>
      </div>
      <div className="ws-respostas__item">
        <dt className="mem-body-sm mem-muted">Como você sabe que funcionava · vontade</dt>
        <dd className="mem-body">
          {rotuloDe(comoSabe, reacao.como_sabe)} · vontade: {rotuloDe(VONTADE, reacao.vontade).toLowerCase()}
          {reacao.outras_vezes && ` · ${rotuloDe(OUTRAS_VEZES, reacao.outras_vezes).toLowerCase()}`}
          {podeEditar && (
            <button type="button" className="mem-btn mem-btn--quiet ws-editar" onClick={aoEditar}>
              Editar
            </button>
          )}
        </dd>
      </div>
    </dl>
  );
}

function Opcoes({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
}: {
  rotulo: string;
  opcoes: readonly { valor: string; rotulo: string }[];
  valor?: string;
  aoEscolher: (v: string) => void;
}) {
  return (
    <div className="ws-escolha" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          className={`mem-btn ${valor === o.valor ? "mem-btn--primary" : "mem-btn--secondary"}`}
          onClick={() => aoEscolher(o.valor)}
        >
          {o.rotulo}
        </button>
      ))}
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

  const naoReconhece = r.reconhece === "nao_reconheco";
  const algo = !!(r.reconhece || r.frase || r.como_sabe || r.vontade);

  return (
    <div className="ws-form ws-reacao">
      <div className="mem-field">
        <span className="mem-field__label">Você reconhece isso como seu?</span>
        <Opcoes rotulo="Você reconhece isso como seu?" opcoes={RECONHECE} valor={r.reconhece} aoEscolher={(v) => setR({ ...r, reconhece: v })} />
      </div>
      {r.reconhece && (
        <div className="mem-field">
          <label className="mem-field__label" htmlFor={`frase-${padrao.id}`}>
            {naoReconhece ? "O que não bate?" : "Em uma frase, o que é isso nas suas palavras?"}
          </label>
          <input
            id={`frase-${padrao.id}`}
            className="mem-input"
            value={r.frase ?? ""}
            onChange={(e) => setR({ ...r, frase: e.target.value })}
          />
        </div>
      )}
      <div className="mem-field">
        <label className="mem-field__label" htmlFor={`quem-${padrao.id}`}>
          Quem tinha o problema que você resolvia?
        </label>
        <input
          id={`quem-${padrao.id}`}
          className="mem-input"
          value={r.quem_tinha ?? ""}
          onChange={(e) => setR({ ...r, quem_tinha: e.target.value })}
        />
        <span className="mem-field__help">
          {preenchido ? "A Karen sugeriu isto. Se estiver certo, deixe como está; se não, corrija." : "Quem estava do outro lado."}
        </span>
      </div>
      <div className="mem-field">
        <span className="mem-field__label">Como você sabe que isso funcionava?</span>
        {COMO_SABE.map((g) => (
          <div key={g.grupo || "outro"} className="ws-grupo">
            {g.grupo && <span className="mem-label mem-muted">{g.grupo}</span>}
            <Opcoes rotulo={g.grupo || "Outra"} opcoes={g.opcoes} valor={r.como_sabe} aoEscolher={(v) => setR({ ...r, como_sabe: v })} />
          </div>
        ))}
        <span className="mem-field__help">“Ainda não sei” é uma resposta válida: vira pergunta para a call.</span>
      </div>
      <div className="mem-field">
        <span className="mem-field__label">Quanta vontade você tem de trabalhar com isso nos próximos anos?</span>
        <Opcoes rotulo="Vontade" opcoes={VONTADE} valor={r.vontade} aoEscolher={(v) => setR({ ...r, vontade: v })} />
      </div>
      {umaSituacao && (
        <div className="mem-field">
          <span className="mem-field__label">Isso aconteceu outras vezes?</span>
          <Opcoes rotulo="Outras vezes" opcoes={OUTRAS_VEZES} valor={r.outras_vezes} aoEscolher={(v) => setR({ ...r, outras_vezes: v })} />
        </div>
      )}
      {falhou && (
        <Aviso variante="danger" titulo="Não foi possível salvar">
          Suas respostas continuam aqui. Tente de novo.
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!algo || salvando} onClick={salvar}>
          {salvando ? "Salvando" : "Salvar este padrão"}
        </button>
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
  const dela = decisao.conteudo as { porque?: string; justificativa?: string };
  const escolhidos = c.escolhidos ?? [];
  const [porque, setPorque] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function registrar() {
    if (!supabase) return;
    setErro(null);
    const r = await supabase.rpc("escrever_porque_m2", {
      p_decisao: decisao.id,
      p_porque: porque,
      p_justificativa: justificativa || null,
    });
    if (r.error) return setErro(r.error.message);
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
        {dela.porque ? (
          <p className="mem-body">
            Seu porquê: <em>{dela.porque}</em>
          </p>
        ) : (
          <div className="ws-form">
            <div className="mem-field">
              <label className="mem-field__label mem-h3" htmlFor="porque">
                Em uma frase: por que esses?
              </label>
              <input id="porque" className="mem-input" value={porque} onChange={(e) => setPorque(e.target.value)} />
              <span className="mem-field__help">
                Nas suas palavras. É a frase que você vai precisar repetir sozinha lá no fim.
              </span>
            </div>
            {escolhidos.length > 3 && (
              <div className="mem-field">
                <label className="mem-field__label" htmlFor="justificativa">
                  Por que mais de três?
                </label>
                <input id="justificativa" className="mem-input" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
              </div>
            )}
            {erro && (
              <Aviso variante="danger" titulo="Não registrado">
                {erro}
              </Aviso>
            )}
            <div>
              <button type="button" className="mem-btn mem-btn--primary" disabled={!porque.trim()} onClick={registrar}>
                Registrar e seguir para o M3
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
