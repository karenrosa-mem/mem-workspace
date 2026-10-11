import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { call, leitura, type DadosJornada, type Registro } from "../../lib/jornada";
import { situacaoCompleta, situacoes, tituloDaSituacao, type Situacao } from "../../lib/m1";
import {
  COMO_SABE,
  OUTRAS_VEZES,
  RECONHECE,
  ROTULOS,
  VONTADE,
  anosDoPadrao,
  dadosPadrao,
  decisaoM2,
  escolhaDois,
  nomePadrao,
  padroes,
  reacaoDe,
  sinais,
  situacoesDoPadrao,
  type Padrao,
  type Reacao,
  type Rotulo,
} from "../../lib/m2";
import { dataCurta, dataHora } from "../../lib/datas";
import Aviso from "../../componentes/Aviso";
import LeituraKaren from "../../componentes/LeituraKaren";
import NotaPrivada from "../../componentes/NotaPrivada";
import Colinha from "../../componentes/Colinha";

const NOTA_M2 = [
  { chave: "tensoes", rotulo: "Tensões entre prova e vontade", ajuda: "Ex.: prova forte com pouca vontade; muita vontade com pouca prova." },
  { chave: "concordancia", rotulo: "Suspeita de concordância automática", ajuda: "Frases que só repetem o nome que você deu." },
  { chave: "perfil", rotulo: "Perfil" },
  { chave: "classificacao_fina", rotulo: "Classificação fina por padrão", ajuda: "Experiência, conhecimento, habilidade, ativo, ativo hipotético. Ela nunca vê." },
];

// Seção do M2 na página da mentorada, vista pela mentora.
export default function SecaoM2({
  dados,
  mentoriaId,
  recarregar,
}: {
  dados: DadosJornada;
  mentoriaId: string;
  recarregar: () => Promise<void>;
}) {
  const mapa = leitura(dados, "mapa_ativos");
  const curta = leitura(dados, "call_2");
  const decisao = decisaoM2(dados);
  const m2 = dados.movimentos.find((m) => m.codigo === 2);

  if (m2?.estado === "nao_iniciado") return null;

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M2 · Enxergar seus ativos</h2>
      {m2?.estado === "fechado" && decisao ? (
        <>
          <Aviso variante="done" titulo="M2 concluído">
            A decisão está registrada e ela escreveu o porquê: “{String((decisao.conteudo as { porque?: string }).porque ?? "")}”.
          </Aviso>
          <ResumoDecisao dados={dados} decisao={decisao} />
        </>
      ) : !mapa ? (
        <Agrupamento dados={dados} mentoriaId={mentoriaId} recarregar={recarregar} />
      ) : decisao && curta ? (
        <>
          <Aviso variante="warn" titulo="Aguardando o porquê dela">
            A decisão foi publicada. Quando ela escrever o porquê em uma frase, o M2 fecha e o M3 abre.
          </Aviso>
          <ResumoDecisao dados={dados} decisao={decisao} />
        </>
      ) : (
        <>
          <LeituraKaren registro={mapa} />
          <Reacoes dados={dados} />
          <NotaPrivada mentoriaId={mentoriaId} movimento={2} campos={NOTA_M2} />
          <RegistrarDecisao dados={dados} mentoriaId={mentoriaId} recarregar={recarregar} />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// Antes da leitura com os padrões: agrupar, separar outras experiências, publicar
// ---------------------------------------------------------------------
function Agrupamento({ dados, mentoriaId, recarregar }: { dados: DadosJornada; mentoriaId: string; recarregar: () => Promise<void> }) {
  const prazo = leitura(dados, "call_1")?.conteudo_mentora.prazo_padroes as string | undefined;
  const sits = situacoes(dados);
  const aCompletar = sits.filter((s) => !situacaoCompleta(s)).length;
  const lista = padroes(dados);
  const usadas = new Set(lista.flatMap((p) => dadosPadrao(p).situacoes ?? []));
  const candidatasFora = sits.filter((s) => s.conteudo_mentora.candidata === true && !usadas.has(s.id));
  const [editando, setEditando] = useState<string | "novo" | null>(lista.length ? null : "novo");

  return (
    <>
      <p className="mem-body ws-measure">
        Agrupe as candidatas em 3 a 5 padrões. Para cada um: nome, as situações dela, quem tinha o
        problema (ela confirma ou corrige) e se ela sabe fazer.
        {prazo ? ` Ela espera os padrões até ${dataCurta(prazo)}.` : ""}
      </p>
      {aCompletar > 0 && (
        <p className="mem-body-sm mem-muted">
          Ela ainda tem {aCompletar} situação{aCompletar > 1 ? "ões" : ""} da call para completar.
        </p>
      )}

      <div className="ws-padroes-lista">
        {lista.map((p) =>
          editando === p.id ? (
            <EditorPadrao key={p.id} dados={dados} registro={p} aoFechar={() => setEditando(null)} aoSalvar={recarregar} />
          ) : (
            <div key={p.id} className="ws-situacao">
              <p className="mem-body ws-situacao__titulo">{dadosPadrao(p).nome}</p>
              <p className="mem-body-sm mem-muted">
                {situacoesDoPadrao(dados, p).length === 1 ? "1 situação" : `${situacoesDoPadrao(dados, p).length} situações`} · {anosDoPadrao(dados, p).join(", ") || "sem ano"}
                {dadosPadrao(p).rotulo ? ` · ${ROTULOS[dadosPadrao(p).rotulo!]} (provisório)` : ""}
              </p>
              <button type="button" className="mem-btn mem-btn--quiet ws-editar" onClick={() => setEditando(p.id)}>
                Editar
              </button>
            </div>
          ),
        )}
        {editando === "novo" ? (
          <EditorPadrao dados={dados} aoFechar={() => setEditando(null)} aoSalvar={recarregar} />
        ) : (
          <div>
            <button type="button" className="mem-btn mem-btn--secondary" onClick={() => setEditando("novo")}>
              Novo padrão
            </button>
          </div>
        )}
      </div>

      {candidatasFora.length > 0 && (
        <div className="ws-bloco">
          <span className="mem-label mem-muted">Candidatas fora dos padrões · outras experiências</span>
          <p className="mem-body-sm mem-muted">
            Para cada uma, escreva por que ficou fora. Ela vê o motivo junto com os padrões.
          </p>
          <ul className="ws-situacoes">
            {candidatasFora.map((s) => (
              <OutraExperiencia key={s.id} situacao={s} jornadaId={dados.jornada.id} />
            ))}
          </ul>
        </div>
      )}

      <PublicarLeitura
        mentoriaId={mentoriaId}
        tipo="mapa_ativos"
        rotuloCampo="Sua leitura dos padrões"
        ajuda="Ela lê isto antes dos padrões. Conte quantos padrões você enxergou, qual parece mais forte e por quê, e o que ela deve olhar com atenção ao responder. Não diga ainda o que é ativo: isso se decide na Call 2."
        exemplo="Enxerguei quatro padrões na sua história. O que mais aparece é a mediação: está em três empresas diferentes, de 2016 a 2023. Ao responder, repare se você reconhece cada um como seu ou só como algo que fez por obrigação — as duas respostas valem."
        rotuloBotao="Publicar os padrões"
        aviso={lista.length < 3 || lista.length > 5 ? `${lista.length} padrões. A referência do método é de 3 a 5.` : null}
        bloqueio={lista.length === 0 ? "Crie pelo menos um padrão antes de publicar." : null}
        aoPublicar={recarregar}
      />
    </>
  );
}

function EditorPadrao({
  dados,
  registro,
  aoFechar,
  aoSalvar,
}: {
  dados: DadosJornada;
  registro?: Registro;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const { pessoa } = useSessao();
  const inicial = (registro?.conteudo_mentora ?? {}) as Padrao;
  const [p, setP] = useState<Padrao>({ situacoes: [], rotulo: "ativo", ...inicial });
  const [erro, setErro] = useState(false);
  const sits = situacoes(dados).sort((a, b) =>
    a.conteudo_mentora.candidata === b.conteudo_mentora.candidata ? 0 : a.conteudo_mentora.candidata ? -1 : 1,
  );

  async function salvar() {
    if (!supabase || !pessoa) return;
    const r = registro
      ? await supabase.from("registro").update({ conteudo_mentora: p }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 2,
          tipo: "padrao",
          conteudo_mentora: p,
          autora_papel: "mentora",
          autora_id: pessoa.id,
          pendente_publicacao: true,
        });
    if (r.error) return setErro(true);
    await aoSalvar();
    aoFechar();
  }

  const marcadas = p.situacoes ?? [];
  return (
    <div className="mem-card ws-form ws-cartao">
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="padrao-nome">
          Nome do padrão
        </label>
        <input id="padrao-nome" className="mem-input" value={p.nome ?? ""} onChange={(e) => setP({ ...p, nome: e.target.value })} />
      </div>
      <fieldset className="ws-calls">
        <legend className="mem-field__label">Situações dela neste padrão</legend>
        {sits.map((s) => (
          <label key={s.id} className="ws-marca__check mem-body-sm">
            <input
              type="checkbox"
              checked={marcadas.includes(s.id)}
              onChange={(e) =>
                setP({ ...p, situacoes: e.target.checked ? [...marcadas, s.id] : marcadas.filter((x) => x !== s.id) })
              }
            />
            <span>
              <span className="mem-data">{(s.conteudo as Situacao).ano ?? "—"}</span> · {tituloDaSituacao(s)}
              {s.conteudo_mentora.candidata === true && (
                <span className="mem-muted"> · candidata: {String(s.conteudo_mentora.nome_provisorio ?? "")}</span>
              )}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="padrao-quem">
          Quem tinha o problema · sua sugestão para ela
        </label>
        <input
          id="padrao-quem"
          className="mem-input"
          value={p.quem_tinha_o_problema ?? ""}
          onChange={(e) => setP({ ...p, quem_tinha_o_problema: e.target.value })}
        />
        <Colinha
          serve="Quem você leu, nas situações dela, que estava do outro lado com o problema que ela resolvia. É você quem escreve: ela recebe já preenchido e confirma ou corrige. Seja específica (quem, em que momento), não genérica (“empresas”, “pessoas”)."
          exemplo="Gestores prestes a perder pessoas-chave do time."
        />
      </div>
      <label className="ws-marca__check mem-body-sm">
        <input type="checkbox" checked={!!p.sabe_fazer} onChange={(e) => setP({ ...p, sabe_fazer: e.target.checked })} />
        Ela sabe fazer (sinal aceso)
      </label>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="padrao-rotulo">
          Rótulo provisório
        </label>
        <select
          id="padrao-rotulo"
          className="mem-input ws-input-curto"
          value={p.rotulo ?? "ativo"}
          onChange={(e) => setP({ ...p, rotulo: e.target.value as Rotulo })}
        >
          <option value="ativo">Ativo</option>
          <option value="ativo_a_confirmar">Ativo a confirmar</option>
        </select>
      </div>
      {erro && (
        <Aviso variante="danger" titulo="Não foi possível salvar">
          Tente de novo.
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!p.nome?.trim() || marcadas.length === 0} onClick={salvar}>
          Salvar padrão
        </button>
        <button type="button" className="mem-btn mem-btn--quiet" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function OutraExperiencia({ situacao, jornadaId }: { situacao: Registro; jornadaId: string }) {
  const [motivo, setMotivo] = useState("");
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("campo_mentora_rascunho")
      .select("campos")
      .eq("registro_id", situacao.id)
      .maybeSingle()
      .then(({ data }) => {
        const m = (data?.campos as { outra_experiencia?: { motivo?: string } } | undefined)?.outra_experiencia?.motivo;
        if (m) setMotivo(m);
      });
  }, [situacao.id]);

  async function salvar() {
    if (!supabase) return;
    const r = await supabase.from("campo_mentora_rascunho").upsert({
      registro_id: situacao.id,
      jornada_id: jornadaId,
      campos: { outra_experiencia: { motivo: motivo.trim() } },
    });
    setSalvo(!r.error);
  }

  return (
    <li className="ws-situacao">
      <p className="mem-body ws-situacao__titulo">
        {tituloDaSituacao(situacao)}
        <span className="mem-muted"> · {String(situacao.conteudo_mentora.nome_provisorio ?? "")}</span>
      </p>
      <div className="ws-acoes ws-marca">
        <input
          className="mem-input"
          aria-label="Por que ficou fora"
          placeholder="Por que ficou fora"
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            setSalvo(false);
          }}
        />
        <button type="button" className="mem-btn mem-btn--secondary" disabled={!motivo.trim()} onClick={salvar}>
          Salvar
        </button>
        {salvo && <span className="mem-body-sm mem-muted">Salvo.</span>}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------
function PublicarLeitura({
  mentoriaId,
  tipo,
  rotuloCampo,
  ajuda,
  rotuloBotao,
  aviso,
  bloqueio,
  aoPublicar,
  antesDePublicar,
  exemplo,
}: {
  mentoriaId: string;
  tipo: string;
  rotuloCampo: string;
  ajuda: string;
  exemplo?: string;
  rotuloBotao: string;
  aviso: string | null;
  bloqueio: string | null;
  aoPublicar: () => Promise<void>;
  antesDePublicar?: () => Promise<boolean>;
}) {
  const chave = tipo === "call_2" ? "o_que_decidimos" : "texto";
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("leitura_rascunho")
      .select("id, campos")
      .eq("mentoria_id", mentoriaId)
      .eq("movimento_codigo", 2)
      .eq("tipo_leitura", tipo)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRascunhoId(data.id as string);
        setTexto(String((data.campos as Record<string, string>)[chave] ?? ""));
      });
  }, [mentoriaId, tipo, chave]);

  async function salvar(): Promise<string | null> {
    if (!supabase) return null;
    setEstado("salvando");
    const campos = { [chave]: texto };
    if (rascunhoId) {
      const r = await supabase.from("leitura_rascunho").update({ campos }).eq("id", rascunhoId);
      setEstado(r.error ? "erro" : "salvo");
      return r.error ? null : rascunhoId;
    }
    const r = await supabase
      .from("leitura_rascunho")
      .insert({ mentoria_id: mentoriaId, movimento_codigo: 2, tipo_leitura: tipo, campos })
      .select("id")
      .single();
    if (r.error) {
      setEstado("erro");
      return null;
    }
    setRascunhoId(r.data.id as string);
    setEstado("salvo");
    return r.data.id as string;
  }

  async function publicar() {
    if (!supabase) return;
    setErro(null);
    if (antesDePublicar && !(await antesDePublicar())) return;
    const id = await salvar();
    if (!id) return;
    const r = await supabase.rpc("publicar_leitura", { p_rascunho: id, p_fecha_movimento: false });
    if (r.error) return setErro(r.error.message);
    await aoPublicar();
  }

  return (
    <div className="ws-bloco ws-form">
      <div className="mem-field">
        <label className="mem-field__label" htmlFor={`leitura-${tipo}`}>
          {rotuloCampo}
        </label>
        <textarea
          id={`leitura-${tipo}`}
          className="mem-input ws-serif"
          rows={4}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setEstado("");
          }}
        />
        <Colinha serve={ajuda} exemplo={exemplo} />
      </div>
      {aviso && (
        <Aviso variante="warn" titulo="Fora da referência">
          {aviso} Você pode publicar assim mesmo.
        </Aviso>
      )}
      {bloqueio && (
        <Aviso variante="warn" titulo="Ainda não dá para publicar">
          {bloqueio}
        </Aviso>
      )}
      {erro && (
        <Aviso variante="danger" titulo="Não publicado">
          {erro}
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!!bloqueio || !texto.trim() || estado === "salvando"} onClick={publicar}>
          {rotuloBotao}
        </button>
        <button type="button" className="mem-btn mem-btn--quiet" onClick={salvar} disabled={estado === "salvando"}>
          Salvar rascunho
        </button>
        {estado === "salvo" && <span className="mem-body-sm mem-muted">Rascunho salvo.</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Depois da leitura: reações dela, Call 2, decisão
// ---------------------------------------------------------------------
function rotuloDe(lista: readonly { valor: string; rotulo: string }[], v?: string) {
  return lista.find((o) => o.valor === v)?.rotulo ?? "—";
}

function Reacoes({ dados }: { dados: DadosJornada }) {
  const comoSabe = COMO_SABE.flatMap((g) => g.opcoes as readonly { valor: string; rotulo: string }[]);
  const escolha = escolhaDois(dados)?.conteudo as { padroes?: string[]; linha?: string } | undefined;
  return (
    <div className="ws-bloco">
      <span className="mem-label mem-muted">Reações dela</span>
      <div className="mem-table-wrap">
        <table className="mem-table">
          <thead>
            <tr>
              <th>Padrão</th>
              <th>Reconhece</th>
              <th>Quem tinha o problema</th>
              <th>Como sabe</th>
              <th>Vontade</th>
            </tr>
          </thead>
          <tbody>
            {padroes(dados).map((p) => {
              const r = reacaoDe(dados, p)?.conteudo as Reacao | undefined;
              const sugerido = dadosPadrao(p).quem_tinha_o_problema;
              const corrigiu = r?.quem_tinha && sugerido && r.quem_tinha.trim() !== sugerido.trim();
              return (
                <tr key={p.id}>
                  <td>
                    {dadosPadrao(p).nome}
                    <div className="mem-body-sm mem-muted">
                      {sinais(dados, p, r).filter((s) => s.presente).length} de 4 sinais acesos
                    </div>
                  </td>
                  <td>
                    {r ? (
                      <>
                        {rotuloDe(RECONHECE, r.reconhece)}
                        {r.frase && <div className="mem-body-sm">“{r.frase}”</div>}
                      </>
                    ) : (
                      <span className="mem-muted">ainda não respondeu</span>
                    )}
                  </td>
                  <td>
                    {r?.quem_tinha ?? "—"}
                    {corrigiu && <div className="mem-body-sm mem-muted">corrigiu o seu “{sugerido}”</div>}
                  </td>
                  <td>
                    {rotuloDe(comoSabe, r?.como_sabe)}
                    {r?.outras_vezes && <div className="mem-body-sm mem-muted">{rotuloDe(OUTRAS_VEZES, r.outras_vezes)}</div>}
                  </td>
                  <td>{rotuloDe(VONTADE, r?.vontade)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mem-body-sm">
        Se só pudesse levar dois:{" "}
        {escolha?.padroes?.length ? (
          <strong>{escolha.padroes.map((id) => nomePadrao(dados, id)).join(" e ")}</strong>
        ) : (
          <span className="mem-muted">ainda não escolheu</span>
        )}
        {escolha?.linha ? ` — “${escolha.linha}”` : ""}
      </p>
    </div>
  );
}

type Linha = { segue: boolean; rotulo: Rotulo; razao: string; condicao: string };

function RegistrarDecisao({ dados, mentoriaId, recarregar }: { dados: DadosJornada; mentoriaId: string; recarregar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const c2 = call(dados, 2);
  const lista = padroes(dados);
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(
      lista.map((p) => [p.id, { segue: false, rotulo: (dadosPadrao(p).rotulo ?? "ativo") as Rotulo, razao: "", condicao: "" }]),
    ),
  );
  const escolhidos = Object.entries(linhas).filter(([, l]) => l.segue);

  async function marcarRealizada() {
    if (!supabase || !c2) return;
    await supabase.from("encontro").update({ estado: "realizado", data_realizada: new Date().toISOString() }).eq("id", c2.id);
    await recarregar();
  }

  // Grava a decisão (oculta) e as marcas nos padrões; a leitura curta torna tudo visível.
  async function gravarDecisao(): Promise<boolean> {
    if (!supabase || !pessoa) return false;
    const conteudo_mentora = {
      escolhidos: escolhidos.map(([id, l]) => ({ padrao: id, rotulo: l.rotulo })),
      nao_seguiram: Object.entries(linhas)
        .filter(([, l]) => !l.segue)
        .map(([id, l]) => ({ padrao: id, razao: l.razao.trim(), condicao_volta: l.condicao.trim() })),
    };
    const existente = decisaoM2(dados);
    const d = existente
      ? await supabase.from("registro").update({ conteudo_mentora }).eq("id", existente.id)
      : await supabase.from("registro").insert({
      conta_id: dados.jornada.conta_id,
      jornada_id: dados.jornada.id,
      movimento_codigo: 2,
      tipo: "decisao_m2",
      conteudo_mentora,
      autora_papel: "mentora",
      autora_id: pessoa.id,
      pendente_publicacao: true,
    });
    if (d.error) return false;
    const marcas = Object.entries(linhas).map(([id, l]) => ({
      registro_id: id,
      jornada_id: dados.jornada.id,
      campos: l.segue
        ? { status: "escolhido", rotulo_final: l.rotulo }
        : { status: "nao_seguiu", rotulo_final: l.rotulo, razao: l.razao.trim(), condicao_volta: l.condicao.trim() },
    }));
    const m = await supabase.from("campo_mentora_rascunho").upsert(marcas);
    return !m.error;
  }

  const faltaRazao = Object.values(linhas).some((l) => !l.segue && !l.razao.trim());
  const bloqueio =
    c2?.estado !== "realizado"
      ? "Marque a Call 2 como realizada."
      : escolhidos.length === 0
        ? "Marque pelo menos um padrão que segue."
        : faltaRazao
          ? "Escreva a razão de cada padrão que não segue."
          : null;

  return (
    <div className="ws-bloco">
      <span className="mem-label mem-muted">Call 2 · juntas · decisão dela</span>
      <p className="mem-body-lg">
        {c2 ? dataHora(c2.data_atual) : "—"} · {c2?.estado === "realizado" ? "realizada" : "marcada"}
      </p>
      {c2 && c2.estado !== "realizado" && (
        <div>
          <button type="button" className="mem-btn mem-btn--secondary" onClick={marcarRealizada}>
            Marcar Call 2 como realizada
          </button>
        </div>
      )}

      <div className="ws-decisao">
        {lista.map((p) => {
          const l = linhas[p.id];
          const set = (n: Partial<Linha>) => setLinhas({ ...linhas, [p.id]: { ...l, ...n } });
          return (
            <div key={p.id} className="ws-situacao">
              <p className="mem-body ws-situacao__titulo">{dadosPadrao(p).nome}</p>
              <div className="ws-acoes">
                <label className="ws-marca__check mem-body-sm">
                  <input type="checkbox" checked={l.segue} onChange={(e) => set({ segue: e.target.checked })} />
                  Segue para o mercado
                </label>
                <select
                  className="mem-input ws-input-curto"
                  aria-label="Rótulo final"
                  value={l.rotulo}
                  onChange={(e) => set({ rotulo: e.target.value as Rotulo })}
                >
                  {(Object.keys(ROTULOS) as Rotulo[]).map((r) => (
                    <option key={r} value={r}>
                      {ROTULOS[r]}
                    </option>
                  ))}
                </select>
              </div>
              {!l.segue && (
                <div className="ws-acoes ws-marca">
                  <input className="mem-input" aria-label="Por que não segue" placeholder="Por que não segue" value={l.razao} onChange={(e) => set({ razao: e.target.value })} />
                  <input className="mem-input" aria-label="Pode voltar se…" placeholder="Pode voltar se…" value={l.condicao} onChange={(e) => set({ condicao: e.target.value })} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {escolhidos.length > 3 && (
        <Aviso variante="warn" titulo={`${escolhidos.length} ativos seguem`}>
          Mais de três: ela vai precisar justificar ao escrever o porquê.
        </Aviso>
      )}

      <PublicarLeitura
        mentoriaId={mentoriaId}
        tipo="call_2"
        rotuloCampo="Leitura curta · o que decidimos"
        ajuda="Publique em até 48 h. Resuma o que vocês decidiram juntas: o que segue e com qual rótulo, o que não segue e por quê. A decisão é dela: escreva como registro do que ela escolheu. Ao publicar, ela vê a decisão e escreve o porquê em uma frase."
        exemplo="Você decidiu levar ao mercado a mediação de conflitos (ativo) e a preparação de gestores de primeira viagem (ativo a confirmar: a base ainda é só a sua percepção, e o mercado vai nos dizer). Desligamentos e processos ficam guardados: há prova, mas pouca vontade."
        rotuloBotao="Publicar decisão e leitura"
        aviso={null}
        bloqueio={bloqueio}
        antesDePublicar={gravarDecisao}
        aoPublicar={recarregar}
      />
    </div>
  );
}

function ResumoDecisao({ dados, decisao }: { dados: DadosJornada; decisao: Registro }) {
  const c = decisao.conteudo_mentora as {
    escolhidos?: { padrao: string; rotulo: Rotulo }[];
    nao_seguiram?: { padrao: string; razao?: string; condicao_volta?: string }[];
  };
  return (
    <ul className="ws-lista-simples mem-body">
      {(c.escolhidos ?? []).map((e) => (
        <li key={e.padrao}>
          Segue: <strong>{nomePadrao(dados, e.padrao)}</strong> · {ROTULOS[e.rotulo].toLowerCase()}
        </li>
      ))}
      {(c.nao_seguiram ?? []).map((n) => (
        <li key={n.padrao} className="mem-muted">
          Não seguiu: {nomePadrao(dados, n.padrao)}
          {n.razao ? ` — ${n.razao}` : ""}
          {n.condicao_volta ? ` · volta se ${n.condicao_volta}` : ""}
        </li>
      ))}
    </ul>
  );
}
