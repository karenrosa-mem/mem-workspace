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
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { FamiliasAtivo } from "../../componentes/Referencias";
import { enviadoEm } from "../../lib/envio";
import { DEFINICAO_ATIVO } from "../../lib/m2";
import SecaoM2 from "./MentoradaM2";
import SecaoM3 from "./MentoradaM3";
import SecaoM4 from "./MentoradaM4";
import SecaoM5 from "./MentoradaM5";
import SecaoM6 from "./MentoradaM6";
import SecaoM7 from "./MentoradaM7";
import SecaoM8 from "./MentoradaM8";
import SecaoM9 from "./MentoradaM9";
import SecaoM10 from "./MentoradaM10";
import { comparacaoLiberada } from "../../lib/m5";

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
        Ela pode ter sido encerrada. Volte para <Link to="/mentoradas">Mentoradas</Link>.
      </Aviso>
    );

  const atual = movimentoAtual(dados);
  // O M5 acontece na segunda parte da Call 4.
  const callDoAtual = atual && atual <= 4 ? atual : atual === 5 ? 4 : atual === 6 ? 5 : atual === 7 ? 6 : atual === 8 ? (call(dados, 7)?.estado === "realizado" ? 8 : 7) : atual === 9 ? 9 : atual === 10 ? 10 : null;
  const c1 = call(dados, 1);
  const leituraCall1 = leitura(dados, "call_1");

  return (
    <>
      <span className="mem-label mem-muted">
        <Link to="/mentoradas" className="ws-voltar">
          Mentoradas
        </Link>{" "}
        · {nome}
      </span>
      <h1 className="mem-h1">{nome || "Mentorada"}</h1>
      <p className="mem-body-lg">{atual ? `M${atual} · ${MOVIMENTOS[atual]}` : dados.jornada.estado === "concluida" ? "Jornada concluída" : "Jornada"}</p>
      {callDoAtual && call(dados, callDoAtual) && (
        <Link className="ws-guia-atalho" to={`/mentoradas/${dados.jornada.id}/call/${callDoAtual}`}>
          <span className="mem-label">Guia da Call {callDoAtual}</span>
          <span className="mem-body">
            {dataHora(call(dados, callDoAtual)!.data_atual)} · o roteiro da call com o que é dela, para marcar enquanto conversa
          </span>
        </Link>
      )}

      <Trilha movimentos={dados.movimentos} encontros={dados.encontros} ligar={() => `/mentoradas/${dados.jornada.id}`} />

      {leituraCall1 ? (
        <>
          {mentoriaId &&
            ([
              [10, "M10 · decisão e relatório final", SecaoM10],
              [9, "M9 · teste comercial", SecaoM9],
              [8, "M8 · oferta preparada para teste", SecaoM8],
              [7, "M7 · oferta assumida", SecaoM7],
              [6, "M6 · oportunidade assumida", SecaoM6],
              [5, "M5 · comparação e aposta", SecaoM5],
              [4, "M4 · conversas, revisões e decisão", SecaoM4],
              [3, "M3 · hipóteses e decisão", SecaoM3],
              [2, "M2 · padrões, respostas dela e decisão", SecaoM2],
            ] as const).map(([codigo, rotulo, Secao]) => {
              const estado = dados.movimentos.find((m) => m.codigo === codigo)?.estado;
              // O M5 aparece antes de abrir: ela compara antes da Call 4.
              const ativo = estado === "aberto" || (codigo === 10 && estado === "fechado") || (codigo === 5 && estado === "nao_iniciado" && comparacaoLiberada(dados));
              if (estado === "nao_iniciado" && !ativo) return null;
              return ativo ? (
                <Secao key={codigo} dados={dados} mentoriaId={mentoriaId} recarregar={recarregar} />
              ) : (
                <details key={codigo} className="ws-bloco">
                  <summary className="mem-label">{rotulo}</summary>
                  <Secao dados={dados} mentoriaId={mentoriaId} recarregar={recarregar} />
                </details>
              );
            })}
          <details className="ws-bloco">
            <summary className="mem-label">M1 · leitura da Call 1 e material dela</summary>
            <LeituraKaren registro={leituraCall1} />
            <MaterialDela dados={dados} marcas={{}} editavel={false} aoMudar={recarregar} comOnde />
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

  const passos: Passo[] = [
    {
      id: "m1-material",
      titulo: "Contar onde está e as situações",
      quem: "Ela",
      estado: enviadoEm(dados, 1) || pronta || call1Realizada ? "feito" : "esperando",
      nota: enviadoEm(dados, 1) ? `enviado ${dataHora(enviadoEm(dados, 1)!)}` : pronta ? "pronto, ainda não enviado" : materialFaltando(dados),
    },
    {
      id: "m1-pistas",
      titulo: "Ler as situações e marcar as pistas de ativo",
      quem: "Você",
      estado: call1Realizada && candidatas > 0 ? "feito" : "agora",
      nota: candidatas ? `${candidatas} marcada${candidatas > 1 ? "s" : ""}` : undefined,
    },
    { id: "m1-nota", titulo: "Preparar a Call 1", quem: "Você", estado: call1Realizada ? "feito" : "agora" },
    {
      id: "m1-call",
      titulo: "Call 1",
      quem: "Juntas",
      estado: call1Realizada ? "feito" : "depois",
      nota: call1Data ? dataHora(call1Data) : undefined,
    },
    {
      id: "m1-leitura",
      titulo: "Publicar a leitura da Call 1",
      quem: "Você",
      estado: call1Realizada ? "agora" : "depois",
      nota: "até 48 h depois da call",
    },
  ];

  return (
    <>
      <Roteiro titulo="O caminho do M1" passos={passos} />

      <Etapa
        n={1}
        passo={passos[0]}
        porque="Antes da Call 1 ela responde quatro perguntas sobre o momento dela e conta pelo menos cinco situações reais. É o material que você lê para preparar a call."
      >
        <RespostasOnde dados={dados} />
      </Etapa>

      <Etapa
        n={2}
        passo={passos[1]}
        porque="Leia cada situação. Marque como pista de ativo a que pode esconder algo que ela sabe fazer e que alguém precisa. Pode marcar antes, durante ou logo depois da call. As pistas são a matéria-prima do M2."
      >
        <MaterialDela
          dados={dados}
          marcas={marcas}
          editavel
          aoMudar={async () => {
            await carregarMarcas();
            await recarregar();
          }}
        />
      </Etapa>

      <Etapa
        n={3}
        passo={passos[2]}
        porque="Anote o que você quer investigar na call. É a sua nota: ela nunca vê."
      >
        <NotaPrivada mentoriaId={mentoriaId} />
      </Etapa>

      <Etapa
        n={4}
        passo={passos[3]}
        porque="Na call vocês conversam sobre as situações. Se ela contar uma situação nova, anote o título aqui: ela completa depois."
      >
        <p className="mem-body-lg">
          {call1Data ? dataHora(call1Data) : "—"} ·{" "}
          {call1Realizada ? "realizada" : pronta ? "material pronto para a call" : `material incompleto: ${materialFaltando(dados)}`}
        </p>
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--primary" to={`/mentoradas/${dados.jornada.id}/call/1`}>
            Abrir guia da Call 1
          </Link>
          {!call1Realizada && call1Id && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={marcarRealizada}>
              Marcar Call 1 como realizada
            </button>
          )}
        </div>
        <SituacaoNova dados={dados} aoCriar={recarregar} />
      </Etapa>

      <Etapa
        n={5}
        passo={passos[4]}
        porque="É o primeiro texto que ela lê depois da call. Ao publicar, ela vê as pistas marcadas nas próprias situações e o M2 abre."
      >
        <LeituraCall1
          mentoriaId={mentoriaId}
          candidatas={candidatas}
          call1Realizada={call1Realizada}
          aoPublicar={recarregar}
        />
      </Etapa>
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

  const campo = (chave: keyof Nota, rotulo: string, ajuda?: string, exemplo?: string) => (
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
      {ajuda && <Colinha serve={ajuda} exemplo={exemplo} />}
    </div>
  );

  return (
    <details className="ws-bloco ws-privado" open>
      <summary className="mem-label">Nota privada · só você vê</summary>
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
        {campo(
          "pontos",
          "Pontos de investigação",
          "O que você quer investigar na Call 1, de 3 a 5 pontos, citando situações específicas.",
          "Como ela decide o que dizer a cada lado nas mediações de 2012, 2016 e 2021.",
        )}
        {campo(
          "contradicoes",
          "Contradições",
          "Onde o que ela escreveu não fecha: uma situação diz uma coisa, outra diz o contrário.",
          "Diz que não gosta de conflito, mas três situações são de mediação.",
        )}
        {campo(
          "naturalizacao",
          "Sinais de naturalização",
          "Quando ela descreve algo difícil como simples: “só”, “qualquer um faz”, “é normal”.",
          "Chama de “só conversar com as pessoas” o que evitou a saída de metade do time.",
        )}
        {campo("sinais", "Sinais emocionais ou de contexto de vida", "Só se aparecerem. Descreva sem diagnóstico; serve para você conduzir a call com cuidado.")}
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
function RespostasOnde({ dados }: { dados: DadosJornada }) {
  const onde = ondeVoceEsta(dados)?.conteudo ?? {};
  return (
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
  );
}

function MaterialDela({
  dados,
  marcas,
  editavel,
  aoMudar,
  comOnde = false,
}: {
  dados: DadosJornada;
  marcas: Record<string, Marca>;
  editavel: boolean;
  aoMudar: () => Promise<void>;
  comOnde?: boolean;
}) {
  const lista = situacoes(dados);

  return (
    <div className="ws-form">
      {comOnde && <RespostasOnde dados={dados} />}
      <p className="mem-label mem-muted">
        Situações · {lista.length} · {situacoesCompletas(dados)} completas
        {editavel && ` · ${Object.values(marcas).filter((m) => m.candidata).length} pistas de ativo`}
      </p>
      {editavel && (
        <Colinha
          serve="Pista de ativo: uma situação que, pelo que ela contou e pelo que vocês conversaram na Call 1, pode esconder algo que ela sabe fazer e que alguém precisa. Marque na call ou logo depois e dê um nome provisório que descreva o que ela fez e o efeito. As pistas são a matéria-prima do M2, onde você as agrupa em padrões. Ela só vê as marcas depois que você publicar a leitura. Situações incompletas não impedem a publicação."
          exemplo="Situação de 2021, “conversei com cada gestor e evitei a saída de metade do time” → pista de ativo, nome provisório: mediação que retém pessoas."
        />
      )}
      {editavel && <FamiliasAtivo />}
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
    </div>
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
            Pista de ativo
          </label>
          {marca.candidata && (
            <input
              className="mem-input"
              aria-label="Nome provisório"
              placeholder="Nome provisório: o que ela fez e o efeito"
              value={nomeProvisorio}
              onChange={(e) => setNomeProvisorio(e.target.value)}
              onBlur={() => nomeProvisorio !== (marca.nome_provisorio ?? "") && salvarMarca({ ...marca, nome_provisorio: nomeProvisorio })}
            />
          )}
        </div>
      ) : (
        marca.candidata && <p className="mem-label ws-candidata">Pista de ativo · {marca.nome_provisorio}</p>
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
    <div className="ws-form">
      <p className="mem-field__label">Situação nova que surgiu na call</p>
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
      <Colinha
        serve="Uma situação que ela contou ao vivo na call e não estava escrita. Anote só um título que ela reconheça; ela vê depois da leitura publicada e completa no M2."
        exemplo="Mediação na fusão de 2019."
      />
    </div>
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
    !call1Realizada && "marcar a Call 1 como realizada (passo 4)",
    !campos.o_que_investigamos?.trim() && "preencher “O que investigamos”",
    !campos.o_que_fazer_agora?.trim() && "preencher “O que fazer agora”",
  ].filter(Boolean) as string[];

  return (
    <div>
      <div className="ws-form">
        {campo(
          "o_que_investigamos",
          "O que investigamos",
          "O que você enxergou nas situações dela e na conversa: o que se repete, em que anos e em que contextos, e o que ela mesma percebeu. Fale com ela (“você”). É o primeiro texto que ela lê depois da call, antes de ver as marcas nas situações.",
          "Você contou três situações, em anos bem diferentes (2016, 2021 e 2023), em que entrou num conflito entre gestor e time e as pessoas ficaram. Na call, você mesma percebeu que chama isso de “só conversar com as pessoas”, mas o que você descreveu tem método: ouvir os dois lados antes de alguém decidir.",
        )}
        <div className="ws-colinha mem-body-sm">
          <p className="mem-field__label">O que é um ativo</p>
          <p className="mem-muted">
            Entra sozinho na leitura, sempre igual: “{DEFINICAO_ATIVO}” É a primeira vez que ela
            encontra a palavra. Se quiser ligar a definição ao material dela, faça isso em “O que investigamos”.
          </p>
        </div>
        {campo(
          "o_que_fazer_agora",
          "O que fazer agora",
          "O próximo passo dela, concreto. Em geral: completar as situações que surgiram na call e esperar você organizar as pistas de ativo em padrões.",
          "Complete as duas situações que você contou na call — os títulos já estão lá. Até segunda, eu organizo suas pistas de ativo em padrões e te mostro aqui.",
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
          <Colinha serve="O prazo que você se dá para montar os padrões e publicar. Até lá, ela vê “aguardando a Karen organizar suas pistas de ativo, até [data]”." />
        </div>
        <p className="mem-body-sm mem-muted">
          As pistas de ativo aparecem para ela sobre as próprias situações, com o nome provisório que você
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
    </div>
  );
}
