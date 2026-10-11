import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { call, leitura, type DadosJornada, type Registro } from "../../lib/jornada";
import { situacaoCompleta, situacoes, tituloDaSituacao, type Situacao } from "../../lib/m1";
import {
  textoComoSabe,
  pautaDoPadrao,
  porqueDaDecisao,
  padroesFaltando,
  precisaEscolherDois,
  reacaoCompleta,
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
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import { enviadoEm } from "../../lib/envio";
import { FamiliasAtivo, TesteClassificacao } from "../../componentes/Referencias";

const NOTA_M2 = [
  {
    chave: "tensoes",
    rotulo: "Tensões entre prova e vontade",
    ajuda:
      "Onde a prova e a vontade apontam para lados opostos: há registro e reconhecimento, mas ela marcou pouca vontade; ou muita vontade com só a percepção dela. É o que você mais precisa abrir na Call 2.",
    exemplo: "Desligamentos: tem e-mail do diretor e avaliação, mas marcou pouca vontade. Gestores novos: muita vontade, só “eu percebi”.",
  },
  {
    chave: "concordancia",
    rotulo: "Suspeita de concordância automática",
    ajuda:
      "Respostas que parecem concordar com você sem pensar: marcou “Sim, sou eu” em tudo, ou a frase dela só repete o nome que você deu. Anote para perguntar na call com as palavras dela.",
    exemplo: "Em “Organizar processos que ninguém entende” ela escreveu só “organizar processos”. Perguntar: me conta uma vez em que fez isso.",
  },
  {
    chave: "perfil",
    rotulo: "Perfil",
    ajuda: "Só se a sua leitura do perfil dela mudou desde o M1: qual era, qual parece agora e o que mudou sua leitura.",
    exemplo: "No M1 achei B; as respostas do M2 puxam para A: ela tem prova de fora em quase tudo.",
  },
  {
    chave: "classificacao_fina",
    rotulo: "Classificação fina por padrão",
    ajuda:
      "Para cada padrão, a sua classificação técnica: experiência, conhecimento, habilidade, ativo ou ativo hipotético. Serve para você decidir o rótulo na Call 2. Ela nunca vê.",
    exemplo: "Mediar conflitos: ativo. Organizar processos: habilidade. Gestores de primeira viagem: ativo hipotético.",
    referencia: <TesteClassificacao />,
  },
];

// Seção do M2 na página da mentorada, vista pela mentora: seis passos em ordem.
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
  const lista = padroes(dados);
  const c2 = call(dados, 2);
  const prazo = leitura(dados, "call_1")?.conteudo_mentora.prazo_padroes as string | undefined;

  if (m2?.estado === "nao_iniciado") return null;

  const faltam = mapa ? padroesFaltando(dados) : lista.length;
  const faltaEscolha = precisaEscolherDois(dados) && !escolhaDois(dados);
  const respondeu = !!mapa && faltam === 0 && !faltaEscolha;
  const call2Feita = c2?.estado === "realizado";
  const fechado = m2?.estado === "fechado";
  const publicada = !!(decisao && curta);
  const porque = porqueDaDecisao(decisao).texto;

  const passos: Passo[] = [
    {
      id: "m2-padroes",
      titulo: "Agrupar as pistas em padrões",
      quem: "Você",
      estado: mapa ? "feito" : "agora",
      nota: lista.length ? (lista.length === 1 ? "1 padrão" : `${lista.length} padrões`) : undefined,
    },
    {
      id: "m2-publicar",
      titulo: "Publicar os padrões para ela",
      quem: "Você",
      estado: mapa ? "feito" : lista.length ? "agora" : "depois",
      nota: !mapa && prazo ? `ela espera até ${dataCurta(prazo)}` : undefined,
    },
    {
      id: "m2-respostas",
      titulo: "Responder sobre cada possível ativo",
      quem: "Ela",
      estado: !mapa ? "depois" : respondeu || enviadoEm(dados, 2) ? "feito" : "esperando",
      nota: mapa
        ? enviadoEm(dados, 2)
          ? `enviado ${dataHora(enviadoEm(dados, 2)!)}`
          : `${lista.length - faltam} de ${lista.length} respondidos`
        : undefined,
    },
    {
      id: "m2-call",
      titulo: "Call 2: registrar a decisão dela",
      quem: "Juntas",
      estado: publicada ? "feito" : mapa && call2Feita ? "agora" : "depois",
      nota: c2 && !publicada ? dataHora(c2.data_atual) : undefined,
    },
    {
      id: "m2-leitura",
      titulo: "Publicar a decisão e a leitura curta",
      quem: "Você",
      estado: publicada ? "feito" : mapa && call2Feita ? "agora" : "depois",
      nota: publicada ? "o M3 abriu" : "até 48 h depois da call · abre o M3",
    },
  ];

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M2 · Enxergar seus ativos</h2>
      <Roteiro titulo="O caminho do M2" passos={passos} />

      <Etapa
        n={1}
        passo={passos[0]}
        aberta={!mapa}
        porque="Junte as pistas de ativo que mostram a mesma coisa num padrão, com um nome que ela reconheça. A referência é de 3 a 5 padrões."
      >
        {mapa ? <ListaPadroes dados={dados} /> : <Agrupamento dados={dados} recarregar={recarregar} />}
      </Etapa>

      <Etapa
        n={2}
        passo={passos[1]}
        aberta={!mapa}
        porque="Ela vê os padrões como “possíveis ativos”, com as situações de cada um, e responde quatro perguntas sobre cada."
      >
        {mapa ? (
          <LeituraKaren registro={mapa} />
        ) : (
          <PublicarLeitura
            mentoriaId={mentoriaId}
            tipo="mapa_ativos"
            rotuloCampo="Sua leitura dos padrões"
            ajuda="Ela lê isto antes dos padrões. Conte quantos padrões você enxergou, qual parece mais forte e por quê, e o que ela deve olhar com atenção ao responder. Não diga ainda o que é ativo: isso se decide na Call 2."
            exemplo="Enxerguei quatro padrões na sua história. O que mais aparece é a mediação: está em três empresas diferentes, de 2016 a 2023. Ao responder, repare se você reconhece cada um como seu ou só como algo que fez por obrigação — as duas respostas valem."
            rotuloBotao="Publicar os padrões"
            aviso={lista.length < 3 || lista.length > 5 ? `${lista.length} padrões. A referência do método é de 3 a 5.` : null}
            bloqueio={lista.length === 0 ? "Crie pelo menos um padrão no passo 1." : null}
            aoPublicar={recarregar}
          />
        )}
      </Etapa>

      <Etapa
        n={3}
        passo={passos[2]}
        aberta={!fechado}
        porque="Para cada possível ativo ela diz se se vê nisso, quem tinha o problema, que sinais tem de resultado e quanta vontade tem. Embaixo de cada um, o que vale levar para a Call 2."
      >
        {mapa ? (
          <>
            <Respostas dados={dados} />
            <NotaPrivada mentoriaId={mentoriaId} movimento={2} campos={NOTA_M2} />
          </>
        ) : (
          <p className="mem-body mem-muted">Abre quando você publicar os padrões.</p>
        )}
      </Etapa>

      {mapa && !publicada ? (
        <RegistrarDecisao dados={dados} mentoriaId={mentoriaId} recarregar={recarregar} passoCall={passos[3]} passoLeitura={passos[4]} />
      ) : (
        <>
          <Etapa
            n={4}
            passo={passos[3]}
            aberta={!fechado}
            porque="Na Call 2 ela decide o que segue para o mercado. Você registra a decisão dela, possível ativo por possível ativo."
          >
            {publicada && decisao ? (
              <ResumoDecisao dados={dados} decisao={decisao} />
            ) : (
              <p className="mem-body mem-muted">Abre depois que ela responder e vocês fizerem a Call 2.</p>
            )}
          </Etapa>
          <Etapa n={5} passo={passos[4]} aberta={!fechado}>
            {curta ? <LeituraKaren registro={curta} /> : <p className="mem-body mem-muted">Abre depois da Call 2.</p>}
          </Etapa>
        </>
      )}

      {fechado && (
        <Aviso variante="done" titulo="M2 concluído">
          {porque ? <>O porquê dela: “{porque}”.</> : "Decisão publicada."}
        </Aviso>
      )}
    </section>
  );
}

function ListaPadroes({ dados }: { dados: DadosJornada }) {
  return (
    <ul className="ws-lista-simples mem-body">
      {padroes(dados).map((p) => (
        <li key={p.id}>
          {dadosPadrao(p).nome}
          <span className="mem-muted">
            {" "}
            · {anosDoPadrao(dados, p).join(", ") || "sem ano"}
            {dadosPadrao(p).rotulo ? ` · ${ROTULOS[dadosPadrao(p).rotulo!].toLowerCase()} (provisório)` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------
// Antes da leitura com os padrões: agrupar, separar outras experiências, publicar
// ---------------------------------------------------------------------
function Agrupamento({ dados, recarregar }: { dados: DadosJornada; recarregar: () => Promise<void> }) {
  const prazo = leitura(dados, "call_1")?.conteudo_mentora.prazo_padroes as string | undefined;
  const sits = situacoes(dados);
  const aCompletar = sits.filter((s) => !situacaoCompleta(s)).length;
  const lista = padroes(dados);
  const usadas = new Set(lista.flatMap((p) => dadosPadrao(p).situacoes ?? []));
  const candidatasFora = sits.filter((s) => s.conteudo_mentora.candidata === true && !usadas.has(s.id));
  const [editando, setEditando] = useState<string | "novo" | null>(lista.length ? null : "novo");

  return (
    <>
      {prazo && <p className="mem-body-sm">Ela espera os padrões até {dataCurta(prazo)}.</p>}
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
          <span className="mem-label mem-muted">Pistas fora dos padrões · outras experiências</span>
          <Colinha
            serve="Pistas que não entraram em nenhum padrão. Para cada uma, escreva em uma frase por que ficou fora. Ela vê o motivo junto com os padrões, como “outras experiências”."
            exemplo="Você fez, mas não há ninguém com um problema do outro lado."
          />
          <ul className="ws-situacoes">
            {candidatasFora.map((s) => (
              <OutraExperiencia key={s.id} situacao={s} jornadaId={dados.jornada.id} />
            ))}
          </ul>
        </div>
      )}

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
      <Colinha
        serve="Um padrão é o que se repete em várias situações dela: a mesma coisa feita em momentos ou lugares diferentes. Cada padrão reúne as situações que mostram essa mesma coisa, sob um nome. Faça um padrão de cada vez: escolha as situações, dê o nome e complete o resto."
        exemplo="As pistas “mediação que retém pessoas” (2016), “evitei a saída de metade do time” (2021) e uma situação da call (2023) mostram a mesma coisa → um padrão: Mediar conflitos que ameaçam perder gente."
      />
      <fieldset className="ws-calls">
        <legend className="mem-field__label">1. Quais situações mostram a mesma coisa?</legend>
        <Colinha serve="Marque todas as que entram neste padrão. As pistas de ativo vêm primeiro; as outras situações dela também podem entrar." />
        {sits.map((s, i) => (
          <div key={s.id}>
            {i > 0 && sits[i - 1].conteudo_mentora.candidata === true && s.conteudo_mentora.candidata !== true && (
              <p className="mem-label mem-muted ws-separador">Outras situações dela</p>
            )}
            <label className="ws-marca__check mem-body-sm">
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
                  <span className="mem-muted"> · pista: {String(s.conteudo_mentora.nome_provisorio ?? "")}</span>
                )}
              </span>
            </label>
          </div>
        ))}
      </fieldset>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="padrao-nome">
          2. Nome do padrão
        </label>
        <input id="padrao-nome" className="mem-input" value={p.nome ?? ""} onChange={(e) => setP({ ...p, nome: e.target.value })} />
        <Colinha
          serve="O que ela faz e o efeito, num nome que ela possa reconhecer como dela. Verbo + o quê + resultado. Evite rótulos genéricos como “liderança” ou “comunicação”."
          exemplo="Organizar processos que ninguém entende."
        />
        <FamiliasAtivo />
      </div>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="padrao-quem">
          3. Quem tinha o problema · sua sugestão para ela
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
      <div className="mem-field">
        <span className="mem-field__label">4. Ela sabe fazer?</span>
        <label className="ws-marca__check mem-body-sm">
          <input type="checkbox" checked={!!p.sabe_fazer} onChange={(e) => setP({ ...p, sabe_fazer: e.target.checked })} />
          Sim, ficou claro que ela sabe fazer
        </label>
        <Colinha
          serve="Marque se, pelas situações e pela Call 1, ficou claro que foi ela quem fez (não o time) e que ela entende como fez. É um dos quatro sinais de um ativo que ela vê ao lado do padrão: marcado, o sinal “sabe fazer” aparece aceso. Os outros três o Workspace calcula sozinho. Na dúvida, deixe desmarcado: a Call 2 confirma."
        />
      </div>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="padrao-rotulo">
          5. Rótulo provisório
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
        <Colinha serve="Sua leitura de agora; o rótulo final sai da Call 2. “Ativo a confirmar” quando a base ainda é fraca (uma situação só, ou só a percepção dela)." />
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
export function PublicarLeitura({
  mentoriaId,
  tipo,
  rotuloCampo,
  ajuda,
  rotuloBotao,
  aviso,
  bloqueio,
  aoPublicar,
  antesDePublicar,
  publicarCom,
  exemplo,
  movimento = 2,
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
  publicarCom?: (rascunhoId: string) => Promise<string | null>; // devolve a mensagem de erro, se houver
  movimento?: number;
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
      .eq("movimento_codigo", movimento)
      .eq("tipo_leitura", tipo)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRascunhoId(data.id as string);
        setTexto(String((data.campos as Record<string, string>)[chave] ?? ""));
      });
  }, [mentoriaId, tipo, chave, movimento]);

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
      .insert({ mentoria_id: mentoriaId, movimento_codigo: movimento, tipo_leitura: tipo, campos })
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
    if (publicarCom) {
      const falha = await publicarCom(id);
      if (falha) return setErro(falha);
    } else {
      const r = await supabase.rpc("publicar_leitura", { p_rascunho: id, p_fecha_movimento: false });
      if (r.error) return setErro(r.error.message);
    }
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

function Respostas({ dados }: { dados: DadosJornada }) {
  const lista = padroes(dados);
  const escolha = escolhaDois(dados)?.conteudo as { padroes?: string[]; linha?: string } | undefined;
  return (
    <div className="ws-form">
      {lista.map((p, i) => (
        <CartaoRespostas
          key={p.id}
          dados={dados}
          padrao={p}
          indice={i + 1}
          total={lista.length}
          escolhido={!!escolha?.padroes?.includes(p.id)}
        />
      ))}
      {precisaEscolherDois(dados) && (
        <div className="ws-bloco">
          <p className="mem-label mem-muted">Se só pudesse levar dois</p>
          {escolha?.padroes?.length ? (
            <p className="mem-body">
              <strong>{escolha.padroes.map((id) => nomePadrao(dados, id)).join(" e ")}</strong>
              {escolha.linha ? <span className="mem-muted"> — “{escolha.linha}”</span> : ""}
            </p>
          ) : (
            <p className="mem-body mem-muted">Ela ainda não escolheu.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CartaoRespostas({
  dados,
  padrao,
  indice,
  total,
  escolhido,
}: {
  dados: DadosJornada;
  padrao: Registro;
  indice: number;
  total: number;
  escolhido: boolean;
}) {
  const info = dadosPadrao(padrao);
  const r = reacaoDe(dados, padrao)?.conteudo as Reacao | undefined;
  const sits = situacoesDoPadrao(dados, padrao);
  const completa = reacaoCompleta(r, sits.length === 1);
  const anos = anosDoPadrao(dados, padrao);
  const linhas: [string, string][] = r
    ? [
        ["Você se vê nisso?", `${rotuloDe(RECONHECE, r.reconhece)}${r.frase ? ` — “${r.frase}”` : ""}`],
        ["Quem tinha o problema", r.quem_tinha?.trim() || "—"],
        ["Sinais de que deu resultado", textoComoSabe(r)],
        ["Vontade nos próximos 5 a 10 anos", rotuloDe(VONTADE, r.vontade)],
        ...(r.outras_vezes ? ([["Outras vezes", rotuloDe(OUTRAS_VEZES, r.outras_vezes)]] as [string, string][]) : []),
      ]
    : [];

  return (
    <article className="mem-card ws-padrao">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">
          Possível ativo {indice} de {total}
        </span>
        {completa ? (
          <span className="mem-tag mem-tag--evidencia">Respondido</span>
        ) : r ? (
          <span className="mem-tag mem-tag--pendencia">Pela metade</span>
        ) : (
          <span className="mem-tag mem-tag--relato">Sem resposta</span>
        )}
        {escolhido && <span className="mem-tag mem-tag--decisao">Um dos dois dela</span>}
      </div>
      <h4 className="mem-h3 ws-padrao__nome">{info.nome}</h4>
      <p className="mem-body-sm mem-muted">
        {sits.length === 1 ? "1 situação" : `${sits.length} situações`}
        {anos.length ? ` · ${anos.join(", ")}` : ""}
        {info.rotulo ? ` · sua leitura: ${ROTULOS[info.rotulo].toLowerCase()}` : ""}
      </p>

      <ul className="ws-sinais-linha">
        {sinais(dados, padrao, r).map((x) => (
          <li key={x.nome} className={`ws-sinal ${x.presente ? "" : "ws-sinal--ainda"}`}>
            <span className={`mem-marker mem-marker--${x.presente ? "done" : "next"}`} aria-hidden="true" />
            <span className="mem-body-sm">
              {x.nome}
              {x.detalhe && <span className="mem-muted"> · {x.detalhe}</span>}
            </span>
          </li>
        ))}
      </ul>

      {r && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">O que ela respondeu</p>
          <dl className="ws-resumo">
            {linhas.map(([k, v]) => (
              <div key={k}>
                <dt className="mem-body-sm mem-muted">{k}</dt>
                <dd className="mem-body">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="ws-pauta">
        <p className="mem-label">Para levar à Call 2</p>
        <ul className="ws-lista-simples mem-body-sm">
          {pautaDoPadrao(dados, padrao, r).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

type Linha = { segue?: boolean; rotulo: Rotulo; razao: string; condicao: string };

const SEGUE = [
  { valor: "sim", rotulo: "Sim, segue", detalhe: "vai para o mercado no M3" },
  { valor: "nao", rotulo: "Não, fica guardado", detalhe: "continua visível para ela" },
] as const;

const ROTULOS_FINAIS = [
  { valor: "ativo", rotulo: "Ativo", detalhe: "base boa: repetição, resultado e alguém com o problema" },
  { valor: "ativo_a_confirmar", rotulo: "Ativo a confirmar", detalhe: "base fraca: o mercado vai dizer" },
  { valor: "outra_experiencia", rotulo: "Outra experiência", detalhe: "ela fez, mas não é um ativo" },
] as const;

function RegistrarDecisao({
  dados,
  mentoriaId,
  recarregar,
  passoCall,
  passoLeitura,
}: {
  dados: DadosJornada;
  mentoriaId: string;
  recarregar: () => Promise<void>;
  passoCall: Passo;
  passoLeitura: Passo;
}) {
  const { pessoa } = useSessao();
  const c2 = call(dados, 2);
  const lista = padroes(dados);
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(
      lista.map((p) => [p.id, { rotulo: (dadosPadrao(p).rotulo ?? "ativo") as Rotulo, razao: "", condicao: "" }]),
    ),
  );
  const escolhidos = Object.entries(linhas).filter(([, l]) => l.segue === true);
  const existente = decisaoM2(dados);
  const salvo = (existente?.conteudo_mentora ?? {}) as { porque?: string; justificativa?: string };
  const [porque, setPorque] = useState(salvo.porque ?? "");
  const [justificativa, setJustificativa] = useState(salvo.justificativa ?? "");
  const [decisaoId, setDecisaoId] = useState<string | null>(existente?.id ?? null);
  const idDecisao = useRef<string | null>(existente?.id ?? null);

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
        .filter(([, l]) => l.segue === false)
        .map(([id, l]) => ({ padrao: id, razao: l.razao.trim(), condicao_volta: l.condicao.trim() })),
      porque: porque.trim(),
      ...(justificativa.trim() ? { justificativa: justificativa.trim() } : {}),
    };
    const d = decisaoId
      ? await supabase.from("registro").update({ conteudo_mentora }).eq("id", decisaoId).select("id").single()
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 2,
          tipo: "decisao_m2",
          conteudo_mentora,
          autora_papel: "mentora",
          autora_id: pessoa.id,
          pendente_publicacao: true,
        }).select("id").single();
    if (d.error || !d.data) return false;
    setDecisaoId(d.data.id as string);
    idDecisao.current = d.data.id as string;
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

  const semDecisao = lista.filter((p) => linhas[p.id]?.segue === undefined).map((p) => dadosPadrao(p).nome);
  const semRazao = lista
    .filter((p) => linhas[p.id]?.segue === false && !linhas[p.id].razao.trim())
    .map((p) => dadosPadrao(p).nome);
  const faltando = [
    c2?.estado !== "realizado" && "marcar a Call 2 como realizada (passo 4)",
    semDecisao.length > 0 && `decidir se segue: ${semDecisao.join("; ")}`,
    semDecisao.length === 0 && escolhidos.length === 0 && "pelo menos um possível ativo precisa seguir",
    semRazao.length > 0 && `escrever por que não segue: ${semRazao.join("; ")}`,
    !porque.trim() && "registrar o porquê nas palavras dela",
    escolhidos.length > 3 && !justificativa.trim() && "justificar por que mais de três seguem",
  ].filter(Boolean) as string[];

  return (
    <>
      <Etapa
        n={4}
        passo={passoCall}
        porque="Na Call 2 ela decide o que segue para o mercado. A decisão é dela; você registra, possível ativo por possível ativo. Nada é apagado: o que não segue continua visível para ela."
      >
        <p className="mem-body-lg">
          {c2 ? dataHora(c2.data_atual) : "—"} · {c2?.estado === "realizado" ? "realizada" : "marcada"}
        </p>
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--primary" to={`/mentoradas/${dados.jornada.id}/call/2`}>
            Abrir guia da Call 2
          </Link>
          {c2 && c2.estado !== "realizado" && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={marcarRealizada}>
              Marcar Call 2 como realizada
            </button>
          )}
        </div>

        {c2?.estado !== "realizado" && (
          <p className="mem-body mem-muted">O registro da decisão abre quando você marcar a Call 2 como realizada.</p>
        )}
        {c2?.estado === "realizado" && lista.map((p, i) => {
          const l = linhas[p.id];
          const set = (n: Partial<Linha>) => setLinhas({ ...linhas, [p.id]: { ...l, ...n } });
          let k = 0;
          return (
            <article key={p.id} className="mem-card ws-padrao">
              <span className="mem-label mem-muted">
                Possível ativo {i + 1} de {lista.length}
              </span>
              <h4 className="mem-h3 ws-padrao__nome">{dadosPadrao(p).nome}</h4>
              <Pergunta n={++k} feita={l.segue !== undefined} titulo="Ela decidiu levar este para o mercado?">
                <Opcoes rotulo="Segue para o mercado" opcoes={SEGUE} valor={l.segue === undefined ? undefined : l.segue ? "sim" : "nao"} aoEscolher={(v) => set({ segue: v === "sim" })} />
              </Pergunta>
              <Pergunta n={++k} feita={l.segue !== undefined} titulo="Com que rótulo fica?">
                <Opcoes rotulo="Rótulo final" opcoes={ROTULOS_FINAIS} valor={l.rotulo} aoEscolher={(v) => set({ rotulo: v as Rotulo })} />
                <Colinha serve={`Sua leitura provisória era “${ROTULOS[(dadosPadrao(p).rotulo ?? "ativo") as Rotulo].toLowerCase()}”. O rótulo final é o que vocês combinaram na call; ela vê.`} />
              </Pergunta>
              {l.segue === false && (
                <>
                  <Pergunta n={++k} feita={!!l.razao.trim()} titulo="Por que não segue?">
                    <input className="mem-input" aria-label="Por que não segue" value={l.razao} onChange={(e) => set({ razao: e.target.value })} />
                    <Colinha serve="Em uma frase, com as palavras dela. Ela lê isto junto do possível ativo." exemplo="Tem prova, mas pouca vontade de fazer isso pelos próximos anos." />
                  </Pergunta>
                  <Pergunta n={++k} feita={!!l.condicao.trim()} titulo="Em que condição pode voltar? (opcional)">
                    <input className="mem-input" aria-label="Pode voltar se" value={l.condicao} onChange={(e) => set({ condicao: e.target.value })} />
                    <Colinha serve="O que precisaria acontecer para valer olhar de novo." exemplo="Se o mercado mostrar demanda forte por desligamento humanizado." />
                  </Pergunta>
                </>
              )}
            </article>
          );
        })}
        {c2?.estado === "realizado" && (
          <article className="mem-card ws-padrao">
            <span className="mem-label mem-muted">Para fechar a decisão</span>
            <Pergunta n={1} feita={!!porque.trim()} titulo="Em uma frase: por que esses? (nas palavras dela)">
              <input className="mem-input" aria-label="O porquê, nas palavras dela" value={porque} onChange={(e) => setPorque(e.target.value)} />
              <Colinha
                serve="Pergunte a ela na call e anote a resposta literal, sem melhorar. É a frase que ela vai reler lá no fim da jornada. Ela vê junto da decisão e pode ajustar depois, se quiser."
                exemplo="São o que eu faria mesmo sem ser paga, e as pessoas já me procuram para isso."
              />
            </Pergunta>
            {escolhidos.length > 3 && (
              <Pergunta n={2} feita={!!justificativa.trim()} titulo={`Por que mais de três? (${escolhidos.length} seguem)`}>
                <input className="mem-input" aria-label="Por que mais de três" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
                <Colinha serve="O método pede de 1 a 3. Se seguirem mais, registre o motivo que vocês combinaram." />
              </Pergunta>
            )}
          </article>
        )}
      </Etapa>

      <Etapa
        n={5}
        passo={passoLeitura}
        porque="Ao publicar, ela vê a decisão sobre cada possível ativo, o porquê que disse na call e esta leitura. O M2 fecha e o M3 abre na hora."
      >
        <PublicarLeitura
          mentoriaId={mentoriaId}
          tipo="call_2"
          rotuloCampo="Leitura curta · o que decidimos"
          ajuda="Resuma o que vocês decidiram juntas: o que segue e com qual rótulo, o que não segue e por quê. A decisão é dela: escreva como registro do que ela escolheu. O porquê dela já vai junto; não precisa repetir."
          exemplo="Você decidiu levar ao mercado a mediação de conflitos (ativo) e a preparação de gestores de primeira viagem (ativo a confirmar: a base ainda é só a sua percepção, e o mercado vai nos dizer). Desligamentos e processos ficam guardados: há prova, mas pouca vontade."
          rotuloBotao="Publicar decisão e leitura"
          aviso={null}
          bloqueio={faltando.length ? `Para publicar, falta: ${faltando.join("; ")}.` : null}
          antesDePublicar={gravarDecisao}
          publicarCom={async (rascunho) => {
            if (!supabase || !idDecisao.current) return "Não foi possível gravar a decisão.";
            const r = await supabase.rpc("publicar_decisao_m2", { p_rascunho: rascunho, p_decisao: idDecisao.current });
            return r.error ? r.error.message : null;
          }}
          aoPublicar={recarregar}
        />
      </Etapa>
    </>
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
