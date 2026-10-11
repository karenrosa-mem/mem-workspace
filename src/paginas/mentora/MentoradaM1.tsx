import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, leitura, movimentoAtual, type DadosJornada, type Registro } from "../../lib/jornada";
import { MOVIMENTOS } from "../../lib/metodo";
import {
  PERGUNTAS_ONDE,
  ondeVoceEsta,
  situacoes,
  situacaoCompleta,
  situacoesCompletas,
  perguntasFaltando,
  tituloDaSituacao,
  respostaTexto,
  type Situacao,
} from "../../lib/m1";
import { dataHora } from "../../lib/datas";
import { Trilha } from "../mentorada/Jornada";
import Aviso from "../../componentes/Aviso";
import LeituraKaren from "../../componentes/LeituraKaren";
import Colinha from "../../componentes/Colinha";
import SecaoM2 from "./MentoradaM2";

type Marca = { candidata?: boolean; nome_provisorio?: string };
type Nota = {
  perfil?: "" | "A" | "B" | "C";
  pontos?: string;
  contradicoes?: string;
  naturalizacao?: string;
  sinais?: string;
};
type CamposLeitura = { o_que_investigamos?: string; o_que_e_ativo?: string; o_que_fazer_agora?: string; prazo_padroes?: string };

// Página de uma mentorada, vista pela mentora. No M1: material dela,
// nota privada, candidatas, situações novas e leitura da Call 1.
export default function MentoradaM1() {
  const { id } = useParams();
  const { dados, erro, recarregar } = useJornada(id);
  const [nome, setNome] = useState("");
  const [mentoriaId, setMentoriaId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !id) return;
    supabase
      .from("jornada")
      .select("conta(pessoa(nome)), mentoria(id)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as unknown as { conta: { pessoa: { nome: string } }; mentoria: { id: string } | null } | null;
        setNome(d?.conta?.pessoa?.nome ?? "");
        setMentoriaId(d?.mentoria?.id ?? null);
      });
  }, [id]);

  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (dados === undefined) return null;
  if (dados === null)
    return (
      <Aviso variante="warn" titulo="Jornada não encontrada">
        Ela pode ter sido encerrada. Volte para <Link to="/">Mentoradas</Link>.
      </Aviso>
    );

  const atual = movimentoAtual(dados);
  const c1 = call(dados, 1);
  const leituraCall1 = leitura(dados, "call_1");

  return (
    <>
      <span className="mem-label mem-muted">
        <Link to="/" className="ws-voltar">
          Mentoradas
        </Link>{" "}
        · {nome}
      </span>
      <h1 className="mem-h1">{nome || "Mentorada"}</h1>
      <p className="mem-body-lg">{atual ? `M${atual} · ${MOVIMENTOS[atual]}` : "Jornada"}</p>

      <Trilha movimentos={dados.movimentos} ligar={() => `/mentoradas/${dados.jornada.id}`} />

      {leituraCall1 ? (
        <>
          {mentoriaId && <SecaoM2 dados={dados} mentoriaId={mentoriaId} recarregar={recarregar} />}
          <details className="ws-bloco">
            <summary className="mem-label">M1 · leitura da Call 1 e material dela</summary>
            <LeituraKaren registro={leituraCall1} />
            <MaterialDela dados={dados} marcas={{}} editavel={false} aoMudar={recarregar} />
          </details>
        </>
      ) : (
        mentoriaId && (
          <PreparacaoM1
            dados={dados}
            mentoriaId={mentoriaId}
            recarregar={recarregar}
            call1Realizada={c1?.estado === "realizado"}
            call1Id={c1?.id}
            call1Data={c1?.data_atual}
          />
        )
      )}
    </>
  );
}

function PreparacaoM1({
  dados,
  mentoriaId,
  recarregar,
  call1Realizada,
  call1Id,
  call1Data,
}: {
  dados: DadosJornada;
  mentoriaId: string;
  recarregar: () => Promise<void>;
  call1Realizada: boolean;
  call1Id?: string;
  call1Data?: string;
}) {
  const [marcas, setMarcas] = useState<Record<string, Marca>>({});

  const carregarMarcas = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("campo_mentora_rascunho")
      .select("registro_id, campos")
      .eq("jornada_id", dados.jornada.id);
    const m: Record<string, Marca> = {};
    (data ?? []).forEach((l) => (m[l.registro_id as string] = l.campos as Marca));
    setMarcas(m);
  }, [dados.jornada.id]);

  useEffect(() => {
    carregarMarcas();
  }, [carregarMarcas]);

  const pronta = perguntasFaltando(dados) === 0 && situacoesCompletas(dados) >= 5;
  const candidatas = Object.values(marcas).filter((m) => m.candidata).length;

  async function marcarRealizada() {
    if (!supabase || !call1Id) return;
    await supabase
      .from("encontro")
      .update({ estado: "realizado", data_realizada: new Date().toISOString() })
      .eq("id", call1Id);
    await recarregar();
  }

  return (
    <>
      <section className="ws-bloco">
        <span className="mem-label mem-muted">Call 1 · juntas</span>
        <p className="mem-body-lg">
          {call1Data ? dataHora(call1Data) : "—"} ·{" "}
          {call1Realizada ? "realizada" : pronta ? "material pronto para a call" : `material incompleto: ${materialFaltando(dados)}`}
        </p>
        {!call1Realizada && call1Id && (
          <div>
            <button type="button" className="mem-btn mem-btn--secondary" onClick={marcarRealizada}>
              Marcar Call 1 como realizada
            </button>
          </div>
        )}
      </section>

      <NotaPrivada mentoriaId={mentoriaId} />

      <MaterialDela
        dados={dados}
        marcas={marcas}
        editavel
        aoMudar={async () => {
          await carregarMarcas();
          await recarregar();
        }}
      />

      <SituacaoNova dados={dados} aoCriar={recarregar} />

      <LeituraCall1
        mentoriaId={mentoriaId}
        candidatas={candidatas}
        call1Realizada={call1Realizada}
        aoPublicar={recarregar}
      />
    </>
  );
}

// Quais campos da situação ela ainda não preencheu.
function camposFaltando(s: Situacao): string {
  const f = [
    !s.ano && "ano",
    !s.contexto?.trim() && "onde estava",
    !s.o_que_fez?.trim() && "o que fez",
    !s.o_que_mudou?.trim() && "o que mudou",
  ].filter(Boolean);
  return f.join(", ");
}

function materialFaltando(d: DadosJornada): string {
  const p = perguntasFaltando(d);
  const s = Math.max(0, 5 - situacoesCompletas(d));
  const partes = [];
  if (p) partes.push(`${p} pergunta${p > 1 ? "s" : ""}`);
  if (s) partes.push(`${s} situação${s > 1 ? "ões" : ""}`);
  return `faltam ${partes.join(" e ")}`;
}

// ---------------------------------------------------------------------
function NotaPrivada({ mentoriaId }: { mentoriaId: string }) {
  const { pessoa } = useSessao();
  const [notaId, setNotaId] = useState<string | null>(null);
  const [nota, setNota] = useState<Nota>({});
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("nota_privada")
      .select("id, conteudo")
      .eq("mentoria_id", mentoriaId)
      .eq("movimento_codigo", 1)
      .order("criada_em")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setNotaId(data.id as string);
        try {
          setNota(JSON.parse(data.conteudo as string));
        } catch {
          setNota({ pontos: data.conteudo as string });
        }
      });
  }, [mentoriaId]);

  async function salvar() {
    if (!supabase || !pessoa) return;
    setEstado("salvando");
    const conteudo = JSON.stringify(nota);
    const r = notaId
      ? await supabase.from("nota_privada").update({ conteudo }).eq("id", notaId)
      : await supabase
          .from("nota_privada")
          .insert({ mentoria_id: mentoriaId, movimento_codigo: 1, conteudo, autora_id: pessoa.id })
          .select("id")
          .single();
    if (r.error) return setEstado("erro");
    if (!notaId && "data" in r && r.data) setNotaId((r.data as { id: string }).id);
    setEstado("salvo");
  }

  const campo = (chave: keyof Nota, rotulo: string, ajuda?: string) => (
    <div className="mem-field">
      <label className="mem-field__label" htmlFor={`nota-${chave}`}>
        {rotulo}
      </label>
      <textarea
        id={`nota-${chave}`}
        className="mem-input"
        rows={2}
        value={(nota[chave] as string) ?? ""}
        onChange={(e) => {
          setNota({ ...nota, [chave]: e.target.value });
          setEstado("");
        }}
      />
      {ajuda && <span className="mem-field__help">{ajuda}</span>}
    </div>
  );

  return (
    <details className="ws-bloco ws-privado">
      <summary className="mem-label">Nota privada · M1 · só você vê</summary>
      <div className="ws-form">
        <div className="mem-field">
          <label className="mem-field__label" htmlFor="nota-perfil">
            Perfil provável
          </label>
          <select
            id="nota-perfil"
            className="mem-input ws-input-curto"
            value={nota.perfil ?? ""}
            onChange={(e) => {
              setNota({ ...nota, perfil: e.target.value as Nota["perfil"] });
              setEstado("");
            }}
          >
            <option value="">Ainda não sei</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
        {campo("pontos", "Pontos de investigação", "De 3 a 5, citando situações específicas.")}
        {campo("contradicoes", "Contradições")}
        {campo("naturalizacao", "Sinais de naturalização")}
        {campo("sinais", "Sinais emocionais ou de contexto de vida", "Só se aparecerem.")}
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={salvar} disabled={estado === "salvando"}>
            Salvar nota
          </button>
          {estado === "salvo" && <span className="mem-body-sm mem-muted">Nota salva.</span>}
          {estado === "erro" && <span className="mem-body-sm">Não foi possível salvar. Tente de novo.</span>}
        </div>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------
function MaterialDela({
  dados,
  marcas,
  editavel,
  aoMudar,
}: {
  dados: DadosJornada;
  marcas: Record<string, Marca>;
  editavel: boolean;
  aoMudar: () => Promise<void>;
}) {
  const onde = ondeVoceEsta(dados)?.conteudo ?? {};
  const lista = situacoes(dados);

  return (
    <section className="ws-bloco">
      <span className="mem-label mem-muted">Material dela</span>
      <dl className="ws-respostas">
        {PERGUNTAS_ONDE.map((q) => {
          const resposta = respostaTexto(q.chave, onde[q.chave]);
          return (
            <div key={q.chave} className="ws-respostas__item">
              <dt className="mem-body-sm mem-muted">{q.pergunta}</dt>
              <dd className="mem-body">{resposta}</dd>
            </div>
          );
        })}
      </dl>

      <p className="mem-label mem-muted">
        Situações · {lista.length} · {situacoesCompletas(dados)} completas
        {editavel && ` · ${Object.values(marcas).filter((m) => m.candidata).length} candidatas a ativo`}
      </p>
      {editavel && (
        <p className="mem-body-sm mem-muted ws-measure">
          Na Call 1 ou logo depois, marque as situações que podem esconder um ativo e dê a cada uma um
          nome provisório. Elas viram a matéria-prima do M2. Situações incompletas não impedem a publicação.
          Ela só vê as marcas depois que você publicar a leitura.
        </p>
      )}
      {lista.length === 0 && <p className="mem-body mem-muted">Ela ainda não contou nenhuma situação.</p>}
      <ol className="ws-situacoes">
        {lista.map((r) => (
          <SituacaoDaMentora
            key={r.id}
            registro={r}
            jornadaId={dados.jornada.id}
            marca={editavel ? marcas[r.id] ?? {} : (r.conteudo_mentora as Marca)}
            editavel={editavel}
            aoMudar={aoMudar}
          />
        ))}
      </ol>
    </section>
  );
}

function SituacaoDaMentora({
  registro,
  jornadaId,
  marca,
  editavel,
  aoMudar,
}: {
  registro: Registro;
  jornadaId: string;
  marca: Marca;
  editavel: boolean;
  aoMudar: () => Promise<void>;
}) {
  const s = registro.conteudo as Situacao;
  const [nomeProvisorio, setNomeProvisorio] = useState(marca.nome_provisorio ?? "");
  useEffect(() => setNomeProvisorio(marca.nome_provisorio ?? ""), [marca.nome_provisorio]);

  async function salvarMarca(nova: Marca) {
    if (!supabase) return;
    await supabase
      .from("campo_mentora_rascunho")
      .upsert({ registro_id: registro.id, jornada_id: jornadaId, campos: nova });
    await aoMudar();
  }

  return (
    <li className="ws-situacao">
      <div className="ws-situacao__topo">
        <span className="mem-data">{s.ano ?? "—"}</span>
        {registro.conteudo_mentora.origem === "call_1" && <span className="mem-label mem-muted">Surgiu na Call 1</span>}
        {registro.pendente_publicacao && <span className="mem-label mem-muted">Ela vê depois da leitura</span>}
        {!situacaoCompleta(registro) && (
          <span className="mem-tag mem-tag--pendencia">
            {registro.conteudo_mentora.origem === "call_1" ? "Pendência · ela completa no M2" : `Pendência · falta ${camposFaltando(s)}`}
          </span>
        )}
      </div>
      <p className="mem-body ws-situacao__titulo">{tituloDaSituacao(registro)}</p>
      {s.contexto && (
        <dl className="ws-situacao__textos mem-body-sm">
          <dt className="mem-muted">Onde estava</dt>
          <dd>{s.contexto}</dd>
          <dt className="mem-muted">O que fez</dt>
          <dd>{s.o_que_fez}</dd>
          <dt className="mem-muted">O que mudou</dt>
          <dd>{s.o_que_mudou}</dd>
          {s.lembrete && (
            <>
              <dt className="mem-muted">Lembrete</dt>
              <dd>{s.lembrete}</dd>
            </>
          )}
        </dl>
      )}
      {editavel ? (
        <div className="ws-marca">
          <label className="ws-marca__check mem-body-sm">
            <input
              type="checkbox"
              checked={!!marca.candidata}
              onChange={(e) => salvarMarca({ ...marca, candidata: e.target.checked, nome_provisorio: nomeProvisorio })}
            />
            Pode esconder um ativo
          </label>
          {marca.candidata && (
            <input
              className="mem-input"
              aria-label="Nome provisório"
              placeholder="Nome provisório do ativo"
              value={nomeProvisorio}
              onChange={(e) => setNomeProvisorio(e.target.value)}
              onBlur={() => nomeProvisorio !== (marca.nome_provisorio ?? "") && salvarMarca({ ...marca, nome_provisorio: nomeProvisorio })}
            />
          )}
        </div>
      ) : (
        marca.candidata && <p className="mem-label ws-candidata">Candidata a ativo · {marca.nome_provisorio}</p>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------
function SituacaoNova({ dados, aoCriar }: { dados: DadosJornada; aoCriar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const [titulo, setTitulo] = useState("");

  async function criar() {
    if (!supabase || !pessoa || !titulo.trim()) return;
    const r = await supabase.from("registro").insert({
      conta_id: dados.jornada.conta_id,
      jornada_id: dados.jornada.id,
      movimento_codigo: 1,
      tipo: "situacao",
      conteudo_mentora: { titulo: titulo.trim(), origem: "call_1" },
      autora_papel: "mentora",
      autora_id: pessoa.id,
      pendente_publicacao: true,
    });
    if (!r.error) {
      setTitulo("");
      await aoCriar();
    }
  }

  return (
    <section className="ws-bloco">
      <span className="mem-label mem-muted">Situação nova que surgiu na call</span>
      <div className="ws-acoes">
        <input
          className="mem-input ws-flex"
          aria-label="Título da situação nova"
          placeholder="Título da situação"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <button type="button" className="mem-btn mem-btn--secondary" disabled={!titulo.trim()} onClick={criar}>
          Anotar situação
        </button>
      </div>
      <span className="mem-field__help">
        Ela vê só o título, depois da leitura publicada, e completa no M2.
      </span>
    </section>
  );
}

// ---------------------------------------------------------------------
function LeituraCall1({
  mentoriaId,
  candidatas,
  call1Realizada,
  aoPublicar,
}: {
  mentoriaId: string;
  candidatas: number;
  call1Realizada: boolean;
  aoPublicar: () => Promise<void>;
}) {
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposLeitura>({});
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("leitura_rascunho")
      .select("id, campos")
      .eq("mentoria_id", mentoriaId)
      .eq("movimento_codigo", 1)
      .eq("tipo_leitura", "call_1")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRascunhoId(data.id as string);
        setCampos(data.campos as CamposLeitura);
      });
  }, [mentoriaId]);

  async function salvar(): Promise<string | null> {
    if (!supabase) return null;
    setEstado("salvando");
    if (rascunhoId) {
      const r = await supabase.from("leitura_rascunho").update({ campos }).eq("id", rascunhoId);
      setEstado(r.error ? "erro" : "salvo");
      return r.error ? null : rascunhoId;
    }
    const r = await supabase
      .from("leitura_rascunho")
      .insert({ mentoria_id: mentoriaId, movimento_codigo: 1, tipo_leitura: "call_1", campos })
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
    const id = await salvar();
    if (!id) return;
    const r = await supabase.rpc("publicar_leitura", { p_rascunho: id, p_fecha_movimento: true });
    if (r.error) return setErro(r.error.message);
    await aoPublicar();
  }

  const campo = (chave: keyof CamposLeitura, rotulo: string, ajuda: string, exemplo?: string) => (
    <div className="mem-field">
      <label className="mem-field__label" htmlFor={`leitura-${chave}`}>
        {rotulo}
      </label>
      <textarea
        id={`leitura-${chave}`}
        className="mem-input ws-serif"
        rows={4}
        value={campos[chave] ?? ""}
        onChange={(e) => {
          setCampos({ ...campos, [chave]: e.target.value });
          setEstado("");
        }}
      />
      <Colinha serve={ajuda} exemplo={exemplo} />
    </div>
  );

  // O que falta para publicar, dito com todas as letras (kit: botão desativado diz por quê).
  const faltando = [
    !call1Realizada && "marcar a Call 1 como realizada (botão no topo da página)",
    !campos.o_que_investigamos?.trim() && "preencher “O que investigamos”",
    !campos.o_que_fazer_agora?.trim() && "preencher “O que fazer agora”",
  ].filter(Boolean) as string[];

  return (
    <section className="ws-bloco">
      <span className="mem-label mem-muted">Leitura da Call 1 · você publica em até 48 h</span>
      <div className="ws-form">
        {campo(
          "o_que_investigamos",
          "O que investigamos",
          "O que você enxergou nas situações dela e na conversa: o que se repete, em que anos e em que contextos, e o que ela mesma percebeu. Fale com ela (“você”). É o primeiro texto que ela lê depois da call, antes de ver as marcas nas situações.",
          "Você contou três situações, em anos bem diferentes (2016, 2021 e 2023), em que entrou num conflito entre gestor e time e as pessoas ficaram. Na call, você mesma percebeu que chama isso de “só conversar com as pessoas”, mas o que você descreveu tem método: ouvir os dois lados antes de alguém decidir.",
        )}
        {campo(
          "o_que_e_ativo",
          "O que é um ativo",
          "A primeira vez que ela encontra a palavra. Uma ou duas frases, ligando a definição ao material dela.",
          "Um ativo é algo que você sabe fazer, já fez mais de uma vez, gera resultado e resolve o problema de alguém. As situações que marquei são as que podem esconder um ativo; na próxima etapa, a gente vê quais se sustentam.",
        )}
        {campo(
          "o_que_fazer_agora",
          "O que fazer agora",
          "O próximo passo dela, concreto. Em geral: completar as situações que surgiram na call e esperar você organizar as candidatas em padrões.",
          "Complete as duas situações que você contou na call — os títulos já estão lá. Até segunda, eu organizo suas candidatas em padrões e te mostro aqui.",
        )}
        <div className="mem-field">
          <label className="mem-field__label" htmlFor="leitura-prazo">
            Até quando você publica os padrões
          </label>
          <input
            id="leitura-prazo"
            type="date"
            className="mem-input ws-input-curto"
            value={campos.prazo_padroes ?? ""}
            onChange={(e) => {
              setCampos({ ...campos, prazo_padroes: e.target.value });
              setEstado("");
            }}
          />
          <span className="mem-field__help">
            Ela vê “aguardando a Karen organizar suas candidatas, até [data]”.
          </span>
        </div>
        <p className="mem-body-sm mem-muted">
          As candidatas aparecem para ela sobre as próprias situações, com o nome provisório que você
          deu. As situações novas aparecem só com o título.
        </p>
        <p className="mem-body-sm">
          {candidatas === 1 ? "1 situação marcada" : `${candidatas} situações marcadas`} como podendo esconder um ativo.
          A quantidade não impede a publicação.
        </p>
        {faltando.length > 0 && (
          <Aviso variante="warn" titulo="Para publicar, falta">
            {faltando.join("; ")}.
          </Aviso>
        )}
        {erro && (
          <Aviso variante="danger" titulo="Leitura não publicada">
            {erro}
          </Aviso>
        )}
        <div className="ws-acoes">
          <button
            type="button"
            className="mem-btn mem-btn--primary"
            disabled={faltando.length > 0 || estado === "salvando"}
            onClick={publicar}
          >
            Publicar leitura e abrir o M2
          </button>
          <button type="button" className="mem-btn mem-btn--quiet" onClick={salvar} disabled={estado === "salvando"}>
            Salvar rascunho
          </button>
          {estado === "salvo" && <span className="mem-body-sm mem-muted">Rascunho salvo.</span>}
          {estado === "erro" && <span className="mem-body-sm">Não foi possível salvar.</span>}
        </div>
      </div>
    </section>
  );
}
