import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, leitura, type DadosJornada, type Registro } from "../../lib/jornada";
import { type Situacao } from "../../lib/m1";
import { ROTULOS, decisaoM2, porqueDaDecisao, tituloDaSituacao } from "../../lib/m2";
import {
  DEFINICAO_HIPOTESE,
  LASTRO,
  ROTULO_ORIGEM,
  ativosEscolhidos,
  ativosSemHipotese,
  dadosHipotese,
  decisaoM3,
  disputaPublico,
  frase,
  fraseTexto,
  hipoteseCompleta,
  hipoteses,
  hipotesesCompletas,
  publicos,
  quemMaisDe,
  quemMaisRespondido,
  situacoesDoAtivo,
  type Ativo,
  type DecisaoM3,
  type Hipotese,
  type QuemMais,
} from "../../lib/m3";
import { dataHora, diaBrasilia, hojeBrasilia } from "../../lib/datas";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";

// M3 · Formular hipóteses — tela da mentorada.
export default function M3() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;

  const decisao = decisaoM3(dados);
  const c3 = call(dados, 3);
  const ativos = ativosEscolhidos(dados);
  const porqueM2 = porqueDaDecisao(decisaoM2(dados)).texto;
  const leituraC3 = leitura(dados, "call_3");

  return (
    <>
      <span className="mem-label mem-muted">Movimento 3 · Formular hipóteses</span>
      <h1 className="mem-h1">Para quem isso pode valer</h1>

      {decisao && <DecisaoCall3 dados={dados} decisao={decisao} aoSalvar={recarregar} />}
      {leituraC3 && <LeituraKaren registro={leituraC3} />}

      {!decisao && (
        <section className="ws-bloco ws-como">
          <p className="mem-label mem-muted">O que fazer aqui</p>
          <ol className="ws-como__passos">
            <li className="mem-body">Para cada ativo, responda quem mais passa pelo mesmo problema. ~5 min por ativo.</li>
            <li className="mem-body">Monte de 3 a 5 hipóteses no total. ~10 min cada.</li>
            <li className="mem-body">
              Vocês decidem juntas quais vão a campo{c3 ? ` na Call 3 (${dataHora(c3.data_atual)})` : " na Call 3"}.
            </li>
          </ol>
          <p className="mem-body-sm mem-muted ws-measure">{DEFINICAO_HIPOTESE}</p>
        </section>
      )}

      <section className="ws-bloco">
        <p className="mem-label mem-muted">Seus ativos · escolhidos por você na Call 2</p>
        {porqueM2 && <p className="mem-body ws-serif">“{porqueM2}”</p>}
        <ul className="ws-lista-simples mem-body">
          {ativos.map((a) => (
            <li key={a.id}>
              <strong>{a.nome}</strong> <span className="mem-muted">· {ROTULOS[a.rotulo].toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>

      {decisao ? (
        <details className="ws-bloco">
          <summary className="mem-label">Quem mais passa por isso · suas respostas</summary>
          {ativos.map((a) => (
            <QuemMaisAtivo key={a.id} dados={dados} ativo={a} travado aoSalvar={recarregar} />
          ))}
        </details>
      ) : (
      <section className="ws-etapa" id="quem-mais">
        <div className="ws-etapa__cabeca">
          <span
            className={`ws-etapa__n ${ativos.every((a) => quemMaisRespondido(dados, a.id)) ? "ws-etapa__n--feito" : "ws-etapa__n--agora"}`}
            aria-hidden="true"
          >
            {ativos.every((a) => quemMaisRespondido(dados, a.id)) ? "✓" : 1}
          </span>
          <div className="ws-etapa__titulos">
            <span className="mem-label mem-muted">Parte 1 · ~5 min por ativo</span>
            <h2 className="mem-h3 ws-etapa__titulo">Quem mais passa por isso?</h2>
          </div>
        </div>
        <div className="ws-etapa__corpo">
          {ativos.map((a) => (
            <QuemMaisAtivo key={a.id} dados={dados} ativo={a} travado={false} aoSalvar={recarregar} />
          ))}
        </div>
      </section>
      )}

      <Hipoteses dados={dados} travado={!!decisao} aoSalvar={recarregar} />
    </>
  );
}

// ---------------------------------------------------------------------
function QuemMaisAtivo({
  dados,
  ativo,
  travado,
  aoSalvar,
}: {
  dados: DadosJornada;
  ativo: Ativo;
  travado: boolean;
  aoSalvar: () => Promise<void>;
}) {
  const { pessoa } = useSessao();
  const registro = quemMaisDe(dados, ativo.id);
  const inicial = (registro?.conteudo ?? {}) as QuemMais;
  const [q, setQ] = useState<QuemMais>(inicial);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const alemDe = ativo.quemTinha ? `, além de ${ativo.quemTinha.charAt(0).toLowerCase()}${ativo.quemTinha.slice(1)},` : "";

  async function salvar() {
    if (!supabase || !pessoa) return;
    setEstado("salvando");
    const conteudo = { ...q, ativo: ativo.id };
    const r = registro
      ? await supabase.from("registro").update({ conteudo }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 3,
          tipo: "quem_mais",
          origem_id: ativo.id,
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    if (r.error) return setEstado("erro");
    setEstado("salvo");
    await aoSalvar();
  }

  const doAtivo = publicos(dados).filter((p) => p.ativo === ativo.id && p.origem !== "novo");

  return (
    <article className="mem-card ws-padrao">
      <span className="mem-label mem-muted">Ativo</span>
      <h3 className="mem-h3 ws-padrao__nome">{ativo.nome}</h3>
      <Pergunta n={1} feita={!!q.ja_ajudei?.trim()} titulo="Quem você já ajudou nisso, mesmo sem cobrar, fora do trabalho?">
        <textarea
          className="mem-input"
          rows={2}
          aria-label="Quem você já ajudou nisso"
          disabled={travado}
          value={q.ja_ajudei ?? ""}
          onChange={(e) => {
            setQ({ ...q, ja_ajudei: e.target.value });
            setEstado("");
          }}
        />
        <Colinha
          serve="Perfis, não nomes. Um por linha. Amigas, parentes, colegas de outra área: vale tudo em que você usou isso de verdade."
          exemplo={"Uma amiga dona de clínica com duas sócias que não se falavam\nO cunhado com a equipe da loja"}
        />
      </Pergunta>
      <Pergunta n={2} feita={!!q.outro_tipo?.trim()} titulo={`Que outro tipo de pessoa${alemDe} passa por esse mesmo problema?`}>
        <textarea
          className="mem-input"
          rows={2}
          aria-label="Que outro tipo de pessoa passa pelo mesmo problema"
          disabled={travado}
          value={q.outro_tipo ?? ""}
          onChange={(e) => {
            setQ({ ...q, outro_tipo: e.target.value });
            setEstado("");
          }}
        />
        <Colinha
          serve="Quem sofre exatamente desse problema, em outro lugar. Não basta alguém que poderia se beneficiar: precisa ter o mesmo problema. Um por linha."
          exemplo={"Donas de pequenos negócios com sócias\nGerentes de clínica"}
        />
      </Pergunta>
      {doAtivo.length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Sua lista de públicos deste ativo</p>
          <ul className="ws-chips">
            {doAtivo.map((p) => (
              <li key={p.descricao} className="ws-chip">
                {p.descricao} <span className="mem-muted">· {ROTULO_ORIGEM[p.origem]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!travado && (
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" disabled={estado === "salvando"} onClick={salvar}>
            Salvar
          </button>
          {estado === "salvo" && <span className="mem-body-sm mem-muted">Salvo. Os públicos entraram na sua lista.</span>}
          {estado === "erro" && <span className="mem-body-sm">Não foi possível salvar. Tente de novo.</span>}
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------
function Hipoteses({ dados, travado, aoSalvar }: { dados: DadosJornada; travado: boolean; aoSalvar: () => Promise<void> }) {
  const lista = hipoteses(dados);
  const completas = hipotesesCompletas(dados);
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const semHipotese = ativosSemHipotese(dados);
  const c3 = call(dados, 3);
  const diaDaCall = !!c3 && hojeBrasilia() >= diaBrasilia(c3.data_atual);

  return (
    <section className="ws-etapa" id="hipoteses">
      <div className="ws-etapa__cabeca">
        <span className={`ws-etapa__n ${completas >= 3 ? "ws-etapa__n--feito" : "ws-etapa__n--agora"}`} aria-hidden="true">
          {completas >= 3 ? "✓" : 2}
        </span>
        <div className="ws-etapa__titulos">
          <span className="mem-label mem-muted">
            Parte 2 · {completas} de 3 a 5 completas
          </span>
          <h2 className="mem-h3 ws-etapa__titulo">Suas hipóteses</h2>
        </div>
      </div>
      <div className="ws-etapa__corpo">
        {lista.length > 5 && !travado && (
          <p className="mem-body-sm">Você tem {lista.length}. Na Call 3, vocês escolhem até 5. Nada é bloqueado.</p>
        )}
        {lista.map((h, i) =>
          editando === h.id ? (
            <EditorHipotese
              key={h.id}
              dados={dados}
              registro={h}
              reformular={diaDaCall}
              aoFechar={() => setEditando(null)}
              aoSalvar={aoSalvar}
            />
          ) : (
            <CartaoHipotese key={h.id} dados={dados} registro={h} n={i + 1} podeEditar={!travado} aoEditar={() => setEditando(h.id)} />
          ),
        )}
        {!travado &&
          (editando === "nova" ? (
            <EditorHipotese dados={dados} reformular={false} aoFechar={() => setEditando(null)} aoSalvar={aoSalvar} />
          ) : (
            <div>
              <button type="button" className="mem-btn mem-btn--primary" onClick={() => setEditando("nova")}>
                {lista.length ? "Nova hipótese" : "Montar a primeira hipótese"}
              </button>
            </div>
          ))}
        {!travado && lista.length > 0 && semHipotese.map((a) => <MotivoSemHipotese key={a.id} dados={dados} ativo={a} aoSalvar={aoSalvar} />)}
      </div>
    </section>
  );
}

function Frase({ dados, h }: { dados: DadosJornada; h: Hipotese }) {
  return (
    <p className="mem-body-lg ws-serif ws-frase">
      {frase(dados, h).partes.map((p, i) =>
        p.lacuna ? (
          <span key={i} className="ws-frase__lacuna">
            {p.texto}
          </span>
        ) : (
          <span key={i}>{p.texto}</span>
        ),
      )}
    </p>
  );
}

function CartaoHipotese({
  dados,
  registro,
  n,
  podeEditar,
  aoEditar,
}: {
  dados: DadosJornada;
  registro: Registro;
  n: number;
  podeEditar: boolean;
  aoEditar: () => void;
}) {
  const h = dadosHipotese(registro);
  const status = (registro.conteudo_mentora as { status?: string; razao?: string; condicao_volta?: string });
  const disputa = disputaPublico(dados, registro);
  const lastro = LASTRO.find((l) => l.valor === h.lastro);
  return (
    <article className="mem-card ws-padrao">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">Hipótese {n}</span>
        {status.status === "vai_a_campo" && <span className="mem-tag mem-tag--decisao">Vai a campo</span>}
        {status.status === "guardada" && <span className="mem-tag mem-tag--relato">Guardada</span>}
        {!status.status && (hipoteseCompleta(h) ? <span className="mem-tag mem-tag--evidencia">Completa</span> : <span className="mem-tag mem-tag--pendencia">Falta completar</span>)}
        {lastro && <span className="mem-tag mem-tag--relato">{lastro.rotulo}</span>}
        {(registro.versao_atual ?? 1) > 1 && <span className="mem-label mem-muted">reformulada</span>}
      </div>
      <Frase dados={dados} h={h} />
      {disputa > 0 && <p className="mem-body-sm mem-muted">Mesmo público de outra hipótese. Tudo bem: vocês olham isso na call.</p>}
      {status.status === "guardada" && (
        <p className="mem-body-sm">
          {status.razao && <>Por que ficou guardada: {status.razao}. </>}
          {status.condicao_volta && <>Pode voltar se: {status.condicao_volta}.</>}
        </p>
      )}
      {podeEditar && (
        <div>
          <button type="button" className="mem-btn mem-btn--quiet" onClick={aoEditar}>
            Editar
          </button>
        </div>
      )}
    </article>
  );
}

function EditorHipotese({
  dados,
  registro,
  reformular,
  aoFechar,
  aoSalvar,
}: {
  dados: DadosJornada;
  registro?: Registro;
  reformular: boolean;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const { pessoa } = useSessao();
  const ativos = ativosEscolhidos(dados);
  const [h, setH] = useState<Hipotese>(() => ({ ...(registro ? dadosHipotese(registro) : {}), ...(ativos.length === 1 && !registro ? { ativo: ativos[0].id } : {}) }));
  const [outro, setOutro] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [apagar, setApagar] = useState(false);
  useEffect(() => setErro(null), [h]);

  const lista = publicos(dados);
  const ativo = ativos.find((a) => a.id === h.ativo);
  const daLista = lista.some((p) => p.descricao === h.publico);

  async function salvar() {
    if (!supabase || !pessoa || !h.ativo) return;
    setSalvando(true);
    const conteudo = { ...h, publico: h.publico?.trim() };
    let falha: string | null = null;
    if (registro && reformular && registro.conteudo && JSON.stringify(registro.conteudo) !== JSON.stringify(conteudo)) {
      const r = await supabase.rpc("reformular_hipotese", { p_registro: registro.id, p_conteudo: conteudo });
      falha = r.error?.message ?? null;
    } else if (registro) {
      const r = await supabase.from("registro").update({ conteudo }).eq("id", registro.id);
      falha = r.error ? "Não foi possível salvar." : null;
    } else {
      const r = await supabase.from("registro").insert({
        conta_id: dados.jornada.conta_id,
        jornada_id: dados.jornada.id,
        movimento_codigo: 3,
        tipo: "hipotese",
        origem_id: h.ativo,
        conteudo,
        autora_papel: "mentorada",
        autora_id: pessoa.id,
      });
      falha = r.error ? "Não foi possível salvar." : null;
    }
    setSalvando(false);
    if (falha) return setErro(falha);
    await aoSalvar();
    aoFechar();
  }

  async function remover() {
    if (!supabase || !registro) return;
    const r = await supabase.from("registro").delete().eq("id", registro.id);
    if (r.error) return setErro("Não foi possível apagar.");
    await aoSalvar();
    aoFechar();
  }

  const completa = hipoteseCompleta(h);
  let k = 0;

  return (
    <article className="mem-card ws-padrao ws-editor-hipotese">
      <span className="mem-label mem-muted">{registro ? "Editando hipótese" : "Nova hipótese"}</span>
      {reformular && registro && (
        <p className="mem-body-sm">Hoje é dia da Call 3: ao salvar, a versão anterior fica guardada.</p>
      )}
      <div className="ws-frase-viva">
        <p className="mem-label mem-muted">Sua frase</p>
        <Frase dados={dados} h={h} />
      </div>

      <Pergunta n={++k} feita={!!h.ativo} titulo="De qual ativo nasce esta hipótese?">
        <Opcoes rotulo="Ativo" opcoes={ativos.map((a) => ({ valor: a.id, rotulo: a.nome }))} valor={h.ativo} aoEscolher={(v) => setH({ ...h, ativo: v })} />
        {ativo && (
          <details className="ws-referencia">
            <summary className="mem-body-sm">Ver suas situações deste ativo</summary>
            <ul className="ws-padrao__sits">
              {situacoesDoAtivo(dados, ativo).map((s) => {
                const c = s.conteudo as Situacao;
                return (
                  <li key={s.id}>
                    <span className="mem-data">{c.ano ?? "—"}</span>
                    <span className="mem-body-sm">
                      {tituloDaSituacao(s)}
                      {c.o_que_mudou && <span className="mem-muted"> · mudou: {c.o_que_mudou}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </Pergunta>

      <Pergunta n={++k} feita={!!h.publico?.trim()} titulo="Para quem?">
        {lista.length > 0 && (
          <Opcoes
            rotulo="Público"
            opcoes={lista.map((p) => ({ valor: p.descricao, rotulo: p.descricao }))}
            valor={outro ? undefined : h.publico}
            aoEscolher={(v) => {
              setOutro(false);
              setH({ ...h, publico: v });
            }}
          />
        )}
        {outro || (!daLista && !!h.publico) || lista.length === 0 ? (
          <input className="mem-input" aria-label="Outro público" placeholder="Descreva o público" value={h.publico ?? ""} onChange={(e) => setH({ ...h, publico: e.target.value })} />
        ) : (
          <div>
            <button
              type="button"
              className="mem-btn mem-btn--quiet"
              onClick={() => {
                setOutro(true);
                setH({ ...h, publico: "" });
              }}
            >
              Outro público
            </button>
          </div>
        )}
        <Colinha serve="É quem você vai procurar para conversar no próximo movimento. Quanto mais específico, mais fácil encontrar." />
      </Pergunta>

      <Pergunta n={++k} feita={!!h.problema?.trim()} titulo="Que problema essa pessoa tem?">
        <input className="mem-input" aria-label="Problema" value={h.problema ?? ""} onChange={(e) => setH({ ...h, problema: e.target.value })} />
        <Colinha serve="Complete a frase “…que sofre com ___”, como essa pessoa diria, não como você diria." exemplo="ter que cobrar quem até ontem era colega" />
      </Pergunta>

      <Pergunta n={++k} feita={!!h.contexto?.trim()} titulo="Em que momento ou situação isso aparece?">
        <input className="mem-input" aria-label="Contexto" value={h.contexto ?? ""} onChange={(e) => setH({ ...h, contexto: e.target.value })} />
        <Colinha serve="Complete a frase “…em ___”. Diz onde encontrar essas pessoas." exemplo="nos primeiros seis meses depois da promoção" />
      </Pergunta>

      <Pergunta n={++k} feita={!!h.transformacao?.trim()} titulo="O que muda para ela, de um jeito que dá para ver?">
        <input className="mem-input" aria-label="Transformação" value={h.transformacao ?? ""} onChange={(e) => setH({ ...h, transformacao: e.target.value })} />
        <Colinha
          serve="Complete a frase “…a alcançar ___”. Uma mudança que alguém de fora perceberia; evite só sentimentos como “mais confiança”."
          exemplo="um time que cumpre o combinado sem escalar para o chefe"
        />
      </Pergunta>

      <Pergunta n={++k} feita={!!h.lastro} titulo="Você já viu esse público com esse problema?">
        <Opcoes rotulo="Lastro" opcoes={LASTRO} valor={h.lastro} aoEscolher={(v) => setH({ ...h, lastro: v })} />
        <Colinha serve="As três valem. “Imagino” não é pior: só avisa que vai ser preciso encontrar pessoas que você ainda não conhece." />
      </Pergunta>

      {completa && (
        <div className="ws-pauta">
          <p className="mem-label">Antes de salvar</p>
          <p className="mem-body-sm">
            Leia a frase inteira: “{fraseTexto(dados, h)}” Essa frase só poderia ser sua? Se servisse para qualquer pessoa, ainda está genérica.
          </p>
        </div>
      )}

      {erro && (
        <Aviso variante="danger" titulo="Não salvo">
          {erro}
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!h.ativo || salvando} onClick={salvar}>
          {salvando ? "Salvando" : "Salvar hipótese"}
        </button>
        <button type="button" className="mem-btn mem-btn--quiet" onClick={aoFechar}>
          Cancelar
        </button>
        {registro && (registro.versao_atual ?? 1) === 1 && (
          apagar ? (
            <button type="button" className="mem-btn mem-btn--quiet" onClick={remover}>
              Confirmar: apagar
            </button>
          ) : (
            <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setApagar(true)}>
              Apagar
            </button>
          )
        )}
      </div>
      {!completa && <p className="mem-body-sm mem-muted">Pode salvar pela metade e voltar depois.</p>}
    </article>
  );
}

function MotivoSemHipotese({ dados, ativo, aoSalvar }: { dados: DadosJornada; ativo: Ativo; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const registro = quemMaisDe(dados, ativo.id);
  const [motivo, setMotivo] = useState("");

  async function salvar() {
    if (!supabase || !pessoa || !motivo.trim()) return;
    const conteudo = { ...((registro?.conteudo ?? {}) as QuemMais), ativo: ativo.id, motivo_sem_hipotese: motivo.trim() };
    const r = registro
      ? await supabase.from("registro").update({ conteudo }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 3,
          tipo: "quem_mais",
          origem_id: ativo.id,
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    if (!r.error) await aoSalvar();
  }

  return (
    <div className="ws-bloco">
      <p className="mem-body">
        <strong>{ativo.nome}</strong> ainda não tem hipótese. Não é obrigatório: se nenhuma fizer sentido, diga o motivo em uma frase.
      </p>
      <div className="ws-acoes">
        <input className="mem-input ws-flex" aria-label={`Por que ${ativo.nome} fica sem hipótese`} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <button type="button" className="mem-btn mem-btn--secondary" disabled={!motivo.trim()} onClick={salvar}>
          Salvar motivo
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function DecisaoCall3({ dados, decisao, aoSalvar }: { dados: DadosJornada; decisao: Registro; aoSalvar: () => Promise<void> }) {
  const c = decisao.conteudo_mentora as DecisaoM3;
  const dela = decisao.conteudo as { porque?: string };
  const [ajustando, setAjustando] = useState(false);
  const [porque, setPorque] = useState(dela.porque ?? c.porque ?? "");
  const nome = (id: string) => {
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
    <section className="ws-bloco">
      <span className="mem-label mem-muted">Decisão da Call 3 · sua</span>
      <p className="mem-h3">Vão a campo</p>
      <ul className="ws-lista-simples mem-body">
        {(c.vao ?? []).map((id) => (
          <li key={id}>{nome(id)}</li>
        ))}
      </ul>
      {(c.guardadas ?? []).length > 0 && (
        <>
          <p className="mem-label mem-muted">Ficaram guardadas</p>
          <ul className="ws-lista-simples mem-body-sm">
            {(c.guardadas ?? []).map((g) => (
              <li key={g.hipotese}>
                {nome(g.hipotese)}
                {g.razao ? <span className="mem-muted"> — {g.razao}</span> : null}
                {g.condicao_volta ? <span className="mem-muted">. Pode voltar se {g.condicao_volta}</span> : null}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="ws-porque">
        <p className="mem-label mem-muted">{dela.porque ? "Por que você escolheu · ajustado por você" : "Por que você escolheu · suas palavras na call"}</p>
        {ajustando ? (
          <div className="ws-form">
            <input className="mem-input" aria-label="Por que você escolheu" value={porque} onChange={(e) => setPorque(e.target.value)} />
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
            <p className="mem-body-lg ws-serif">“{dela.porque || c.porque}”</p>
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
  );
}
