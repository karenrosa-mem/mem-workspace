import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { leitura, call, type DadosJornada, type Registro } from "../../lib/jornada";
import {
  PERGUNTAS_ONDE,
  FRASE_AINDA_NAO,
  MOTIVOS,
  respostaTexto,
  type PorQueAgora,
  LEMBRETES,
  MINIMO_SITUACOES,
  anos,
  ondeVoceEsta,
  respostaCompleta,
  situacoes,
  situacaoCompleta,
  situacoesCompletas,
  tituloDaSituacao,
  tituloDerivado,
  type Ideia,
  type Situacao,
} from "../../lib/m1";
import { dataHora } from "../../lib/datas";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";

// M1 · Contar sua trajetória — tela da mentorada.
// Nenhuma palavra do método (ativo, padrão, hipótese) antes da leitura da Call 1.
export default function M1() {
  const { dados, erro, recarregar } = useJornada();
  const [parametros, setParametros] = useSearchParams();
  const { hash } = useLocation();
  const carregado = !!dados;
  useEffect(() => {
    if (carregado && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [carregado, hash]);

  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;

  const mensagem = leitura(dados, "mensagem_abertura");
  const leituraCall1 = leitura(dados, "call_1");
  const call1 = call(dados, 1);
  const contando = parametros.get("contar") === "1";

  return (
    <>
      <span className="mem-label mem-muted">Movimento 1 · Contar sua trajetória</span>
      <h1 className="mem-h1">O que você já fez, de verdade</h1>

      {leituraCall1 && <LeituraKaren registro={leituraCall1} />}
      {!leituraCall1 && mensagem && (
        <section className="mem-mentor ws-measure">
          <span className="mem-label mem-muted">Mensagem da Karen</span>
          <p className="mem-mentor__text">{String(mensagem.conteudo_mentora.texto)}</p>
          <span className="mem-mentor__sig">— Karen, mentora</span>
        </section>
      )}

      {!leituraCall1 && call1 && (
        <p className="mem-body ws-measure">
          São duas partes, cerca de uma hora no total, em quantas vezes você quiser. A Karen lê tudo
          antes da Call 1: {dataHora(call1.data_atual)}.
        </p>
      )}

      <OndeVoceEsta dados={dados} aoSalvar={recarregar} />

      <Situacoes
        dados={dados}
        aoSalvar={recarregar}
        contando={contando}
        setContando={(v) => setParametros(v ? { contar: "1" } : {})}
        depoisDaLeitura={!!leituraCall1}
      />
    </>
  );
}

// ---------------------------------------------------------------------
// Parte 1 — Onde você está: uma pergunta por vez
// ---------------------------------------------------------------------
function OndeVoceEsta({ dados, aoSalvar }: { dados: DadosJornada; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const registro = ondeVoceEsta(dados);
  const conteudo = registro?.conteudo ?? {};
  const aberto = !registro || registro.estado_edicao === "aberto";
  const primeiraFaltando = PERGUNTAS_ONDE.findIndex((p) => !respostaCompleta(p.chave, conteudo));
  const [editando, setEditando] = useState<number | null>(null);
  const atual = editando ?? (primeiraFaltando === -1 ? null : primeiraFaltando);

  const [texto, setTexto] = useState("");
  const [ideia, setIdeia] = useState<Ideia | null>(null);
  const [motivos, setMotivos] = useState<PorQueAgora>({ motivos: [] });
  const [salvando, setSalvando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (atual === null) return;
    const chave = PERGUNTAS_ONDE[atual].chave;
    if (chave === "ideia") {
      setIdeia((conteudo.ideia as Ideia | undefined) ?? null);
    } else if (chave === "por_que_agora") {
      const v = conteudo.por_que_agora;
      setMotivos(typeof v === "object" && v ? (v as PorQueAgora) : { motivos: [], texto: typeof v === "string" ? v : "" });
    } else {
      setTexto(String(conteudo[chave] ?? ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual, registro?.id]);

  async function salvar() {
    if (!supabase || atual === null || !pessoa) return;
    const chave = PERGUNTAS_ONDE[atual].chave;
    const valor =
      chave === "ideia" ? ideia : chave === "por_que_agora" ? { ...motivos, texto: motivos.texto?.trim() } : texto.trim();
    const novo = { ...conteudo, [chave]: valor };
    setSalvando(true);
    setFalhou(false);
    const resposta = registro
      ? await supabase.from("registro").update({ conteudo: novo }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 1,
          tipo: "onde_voce_esta",
          conteudo: novo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    setSalvando(false);
    if (resposta.error) return setFalhou(true);
    setEditando(null);
    await aoSalvar();
  }

  const respondidas = PERGUNTAS_ONDE.length - PERGUNTAS_ONDE.filter((p) => !respostaCompleta(p.chave, conteudo)).length;
  const p = atual !== null ? PERGUNTAS_ONDE[atual] : null;
  const podeSalvar =
    p?.chave === "ideia"
      ? !!ideia && (!ideia.tem || !!ideia.texto?.trim())
      : p?.chave === "por_que_agora"
        ? motivos.motivos.length > 0 || !!motivos.texto?.trim()
        : texto.trim().length > 0;

  return (
    <section className="ws-bloco" id="onde">
      <span className="mem-label mem-muted">
        Parte 1 · Onde você está · ~10 min · {respondidas} de {PERGUNTAS_ONDE.length}
      </span>

      {p && aberto ? (
        <div className="ws-form">
          <div className="mem-field">
            <label className="mem-h3 ws-pergunta" htmlFor="pergunta">
              {p.pergunta}
            </label>
            {p.chave === "ideia" ? (
              <div className="ws-escolha" role="radiogroup" aria-label={p.pergunta}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={ideia?.tem === false}
                  className={`mem-btn ${ideia?.tem === false ? "mem-btn--primary" : "mem-btn--secondary"}`}
                  onClick={() => setIdeia({ tem: false })}
                >
                  Ainda não
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={ideia?.tem === true}
                  className={`mem-btn ${ideia?.tem ? "mem-btn--primary" : "mem-btn--secondary"}`}
                  onClick={() => setIdeia({ tem: true, texto: ideia?.texto ?? "" })}
                >
                  Sim, penso em…
                </button>
              </div>
            ) : p.chave === "por_que_agora" ? (
              <>
                <div className="ws-escolha" role="group" aria-label={p.pergunta}>
                  {MOTIVOS.map((m) => {
                    const marcado = motivos.motivos.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={marcado}
                        className={`mem-btn ${marcado ? "mem-btn--primary" : "mem-btn--secondary"}`}
                        onClick={() =>
                          setMotivos({
                            ...motivos,
                            motivos: marcado ? motivos.motivos.filter((x) => x !== m) : [...motivos.motivos, m],
                          })
                        }
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  id="pergunta"
                  className="mem-input"
                  rows={2}
                  aria-label="Conte em uma frase"
                  placeholder="Em uma frase, se quiser"
                  value={motivos.texto ?? ""}
                  onChange={(e) => setMotivos({ ...motivos, texto: e.target.value })}
                />
              </>
            ) : (
              <textarea
                id="pergunta"
                className="mem-input"
                rows={3}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            )}
            {p.apoio && <Colinha serve={p.apoio} exemplo={p.exemplo || undefined} />}
            {p.chave === "ideia" && ideia?.tem === false && (
              <span className="mem-field__help">{FRASE_AINDA_NAO}</span>
            )}
            {p.chave === "ideia" && ideia?.tem && (
              <textarea
                className="mem-input"
                rows={2}
                aria-label="Qual produto ou serviço"
                placeholder="O que você imagina"
                value={ideia.texto ?? ""}
                onChange={(e) => setIdeia({ tem: true, texto: e.target.value })}
              />
            )}
          </div>
          {falhou && (
            <Aviso variante="danger" titulo="Não foi possível salvar">
              Sua resposta continua aqui. Tente salvar de novo.
            </Aviso>
          )}
          <div className="ws-acoes">
            <button className="mem-btn mem-btn--primary" type="button" disabled={!podeSalvar || salvando} onClick={salvar}>
              {salvando ? "Salvando" : editando !== null ? "Salvar resposta" : "Continuar"}
            </button>
            {editando !== null && (
              <button className="mem-btn mem-btn--quiet" type="button" onClick={() => setEditando(null)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <dl className="ws-respostas">
          {PERGUNTAS_ONDE.map((q, i) => {
            const resposta = respostaTexto(q.chave, conteudo[q.chave]);
            return (
              <div key={q.chave} className="ws-respostas__item">
                <dt className="mem-body-sm mem-muted">{q.pergunta}</dt>
                <dd className="mem-body">
                  {resposta}
                  {aberto && (
                    <button type="button" className="mem-btn mem-btn--quiet ws-editar" onClick={() => setEditando(i)}>
                      Editar
                    </button>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// Parte 2 — Situações
// ---------------------------------------------------------------------
function Situacoes({
  dados,
  aoSalvar,
  contando,
  setContando,
  depoisDaLeitura,
}: {
  dados: DadosJornada;
  aoSalvar: () => Promise<void>;
  contando: boolean;
  setContando: (v: boolean) => void;
  depoisDaLeitura: boolean;
}) {
  const lista = situacoes(dados);
  const completas = situacoesCompletas(dados);
  const faltam = Math.max(0, MINIMO_SITUACOES - completas);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const podeContar = lista.every((r) => r.estado_edicao === "aberto") || lista.length === 0;
  // Situações a completar vêm primeiro, destacadas (pedido da Karen, 11/10).
  const aCompletarLista = lista.filter((r) => !situacaoCompleta(r) && r.estado_edicao === "aberto");
  const completasLista = lista.filter((r) => !aCompletarLista.includes(r));

  const item = (r: Registro) =>
    abertaId === r.id ? (
      <li key={r.id}>
        <CartaoSituacao
          dados={dados}
          registro={r}
          aoFechar={() => setAbertaId(null)}
          aoSalvar={async () => {
            setAbertaId(null);
            await aoSalvar();
          }}
        />
      </li>
    ) : (
      <li key={r.id} className={`ws-situacao ${aCompletarLista.includes(r) ? "ws-situacao--completar" : ""}`}>
        <div className="ws-situacao__topo">
          <span className="mem-data">{(r.conteudo as Situacao).ano ?? "—"}</span>
          {r.conteudo_mentora.origem === "call_1" && <span className="mem-label mem-muted">Surgiu na Call 1</span>}
          {aCompletarLista.includes(r) && <span className="mem-tag mem-tag--pendencia">Pendência · a completar</span>}
        </div>
        <p className="mem-body ws-situacao__titulo">{tituloDaSituacao(r)}</p>
        {depoisDaLeitura && r.conteudo_mentora.candidata === true && (
          <p className="mem-label ws-candidata">Pista de ativo · {String(r.conteudo_mentora.nome_provisorio ?? "")}</p>
        )}
        {aCompletarLista.includes(r) ? (
          <button type="button" className="mem-btn mem-btn--primary" onClick={() => setAbertaId(r.id)}>
            Completar
          </button>
        ) : (
          <button type="button" className="mem-btn mem-btn--quiet ws-editar" onClick={() => setAbertaId(r.id)}>
            {r.estado_edicao === "aberto" ? "Ver e editar" : "Ver"}
          </button>
        )}
      </li>
    );

  return (
    <section className="ws-bloco" id="situacoes">
      <span className="mem-label mem-muted">
        Parte 2 · Situações · ~6 min cada
        {!depoisDaLeitura && (faltam > 0 ? ` · faltam ${faltam} para o mínimo` : ` · ${completas} contadas`)}
      </span>

      {lista.length === 0 && !contando && (
        <p className="mem-body ws-measure">
          Conte situações reais: onde você estava, o que fez e o que mudou depois. Não precisa
          escrever bonito nem provar nada.
        </p>
      )}

      {aCompletarLista.length > 0 && (
        <div className="ws-completar">
          <p className="mem-label ws-completar__titulo">
            Para completar · {aCompletarLista.length}
            {depoisDaLeitura ? " · antes da Call 2" : ""}
          </p>
          <ol className="ws-situacoes">{aCompletarLista.map(item)}</ol>
        </div>
      )}

      {completasLista.length > 0 && <ol className="ws-situacoes">{completasLista.map(item)}</ol>}

      {contando ? (
        <CartaoSituacao
          dados={dados}
          aoFechar={() => setContando(false)}
          aoSalvar={async () => {
            setContando(false);
            await aoSalvar();
          }}
        />
      ) : (
        podeContar && (
          <div>
            <button className="mem-btn mem-btn--primary" type="button" onClick={() => setContando(true)}>
              Contar uma situação
            </button>
          </div>
        )
      )}
    </section>
  );
}

function CartaoSituacao({
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
  const inicial = (registro?.conteudo ?? {}) as Situacao;
  const [lembrete, setLembrete] = useState<string | null | undefined>(registro ? inicial.lembrete ?? null : undefined);
  const [ano, setAno] = useState<string>(inicial.ano ? String(inicial.ano) : "");
  const [contexto, setContexto] = useState(inicial.contexto ?? "");
  const [fez, setFez] = useState(inicial.o_que_fez ?? "");
  const [mudou, setMudou] = useState(inicial.o_que_mudou ?? "");
  const [titulo, setTitulo] = useState(inicial.titulo ?? "");
  const [salvando, setSalvando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const somenteLeitura = registro?.estado_edicao === "fechado";
  const tituloDaKaren = registro?.conteudo_mentora.titulo as string | undefined;

  // Primeiro passo de uma situação nova: escolher um lembrete (ou nenhum).
  if (lembrete === undefined) {
    return (
      <div className="mem-card ws-baralho">
        <span className="mem-label mem-muted">Algo para ajudar a lembrar</span>
        <p className="mem-body">Escolha um lembrete, se ajudar. Pode repetir o mesmo, ou começar sem nenhum.</p>
        <ul className="ws-baralho__lista">
          {LEMBRETES.map((l) => (
            <li key={l}>
              <button type="button" className="ws-baralho__carta" onClick={() => setLembrete(l)}>
                {l}
              </button>
            </li>
          ))}
        </ul>
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={() => setLembrete(null)}>
            Começar sem lembrete
          </button>
          <button type="button" className="mem-btn mem-btn--quiet" onClick={aoFechar}>
            Agora não
          </button>
        </div>
      </div>
    );
  }

  async function salvar() {
    if (!supabase || !pessoa) return;
    const conteudo: Situacao = {
      ano: ano ? Number(ano) : undefined,
      contexto: contexto.trim(),
      o_que_fez: fez.trim(),
      o_que_mudou: mudou.trim(),
      titulo: titulo.trim() || undefined,
      lembrete: lembrete ?? null,
    };
    setSalvando(true);
    setFalhou(false);
    const resposta = registro
      ? await supabase.from("registro").update({ conteudo }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 1,
          tipo: "situacao",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    setSalvando(false);
    if (resposta.error) return setFalhou(true);
    await aoSalvar();
  }

  const algoEscrito = !!(ano || contexto.trim() || fez.trim() || mudou.trim());

  return (
    <div className="mem-card ws-form ws-cartao">
      {lembrete && <p className="mem-label mem-muted">Lembrete · {lembrete}</p>}
      {tituloDaKaren && !registro?.conteudo.o_que_fez && (
        <p className="mem-body">
          A Karen anotou na call: <strong>{tituloDaKaren}</strong>
        </p>
      )}
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="ano">
          Ano aproximado
        </label>
        <select id="ano" className="mem-input ws-input-curto" value={ano} disabled={somenteLeitura} onChange={(e) => setAno(e.target.value)}>
          <option value="">Escolha o ano</option>
          {anos().map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="contexto">
          Onde você estava e o que estava acontecendo
        </label>
        <textarea id="contexto" className="mem-input" rows={3} value={contexto} disabled={somenteLeitura} onChange={(e) => setContexto(e.target.value)} />
        <Colinha
          serve="Onde você trabalhava, que momento era e o que estava acontecendo. O suficiente para alguém de fora entender a cena."
          exemplo="Em 2021, coordenando o RH de uma indústria, um gestor estava prestes a perder metade do time por conflito com ele."
        />
      </div>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="fez">
          O que você fez
        </label>
        <textarea id="fez" className="mem-input" rows={3} value={fez} disabled={somenteLeitura} onChange={(e) => setFez(e.target.value)} />
        <Colinha
          serve="O que você fez, não o que o time fez. Descreva as ações, mesmo as que parecem óbvias para você."
          exemplo="Conversei com cada pessoa e com o gestor separadamente, entendi o que cada lado precisava e montei com eles um acordo de rotina."
        />
      </div>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="mudou">
          O que mudou depois
        </label>
        <textarea id="mudou" className="mem-input" rows={3} value={mudou} disabled={somenteLeitura} onChange={(e) => setMudou(e.target.value)} />
        <Colinha
          serve="Não precisa ser medido: pode ser algo que você viu, que alguém comentou ou que você percebeu."
          exemplo="Ninguém pediu demissão nos seis meses seguintes, e o diretor comentou que o clima da área tinha mudado."
        />
      </div>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor="titulo">
          Título
        </label>
        <input
          id="titulo"
          className="mem-input"
          value={titulo}
          placeholder={fez.trim() ? tituloDerivado(fez) : tituloDaKaren ?? "Sai das primeiras palavras de “o que você fez”"}
          disabled={somenteLeitura}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <Colinha serve="Opcional. Um nome curto para você reconhecer a situação na lista. Se deixar em branco, usamos o começo de “o que você fez”." />
      </div>
      {falhou && (
        <Aviso variante="danger" titulo="Não foi possível salvar">
          O texto continua aqui. Tente salvar de novo.
        </Aviso>
      )}
      <div className="ws-acoes">
        {!somenteLeitura && (
          <button className="mem-btn mem-btn--primary" type="button" disabled={!algoEscrito || salvando} onClick={salvar}>
            {salvando ? "Salvando" : "Salvar situação"}
          </button>
        )}
        <button className="mem-btn mem-btn--quiet" type="button" onClick={aoFechar}>
          {somenteLeitura ? "Fechar" : "Cancelar"}
        </button>
      </div>
      {!somenteLeitura && (
        <span className="mem-field__help">
          Pode salvar pela metade e voltar depois. Ela conta para o mínimo quando tiver o ano e os três textos.
        </span>
      )}
    </div>
  );
}
