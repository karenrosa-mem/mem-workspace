import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, type DadosJornada, type Registro } from "../../lib/jornada";
import { dataHora, diaDaSemana, naDia } from "../../lib/datas";
import {
  DEFINICAO_EVIDENCIA,
  PUBLICO,
  RECONHECEU,
  ROTEIRO,
  ROTEIRO_APROFUNDAR,
  ROTEIRO_NUNCA,
  contagem,
  conversasDe,
  decisaoM4,
  demonstra,
  faltaEnvioM4,
  fraseDaFrente,
  frentes,
  ideiasDe,
  meta,
  proximoPasso,
  resumo,
  situacaoPublico,
  ONDE_PROCURAR,
  ONDE_RELATO,
  ONDE_SINAL,
  TEMPO,
  TRILHAS,
  pesquisa,
  relatosDe,
  sinaisMercadoDe,
  sustentado,
  trilha,
  type Conversa,
  type Frente,
  type Relato,
  type SinalMercado,
  type Trilha,
  type FrenteMentora,
  type RevisaoConversa,
} from "../../lib/m4";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import DicaExpertIA from "../../componentes/DicaExpertIA";

const SIM_NAO = [
  { valor: "nao", rotulo: "Não" },
  { valor: "sim", rotulo: "Sim" },
] as const;

// M4 · Ouvir o mercado — tela da mentorada.
export default function M4() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;

  const decisao = decisaoM4(dados);
  const c4 = call(dados, 4);
  const lista = frentes(dados);
  const nenhumaConversa = !dados.registros.some((r) => r.tipo === "conversa");
  const dia = c4 ? naDia(diaDaSemana(c4.data_atual)).toLowerCase() : "na Call 4";

  return (
    <>
      <span className="mem-label mem-muted">Movimento 4 · Ouvir o mercado</span>
      <h1 className="mem-h1">Isso acontece de verdade na vida dessas pessoas?</h1>

      {decisao && <DecisaoCall4 dados={dados} />}

      {!decisao && (
        <section className="ws-bloco ws-como">
          <p className="mem-label mem-muted">O que fazer aqui</p>
          <ol className="ws-como__passos">
            <li className="mem-body">
              Para cada hipótese, escolha como investigar: pesquisando sozinha (comentários, avaliações, anúncios, mais vendidos),
              conversando com pessoas, ou as duas.
            </li>
            <li className="mem-body">Registre o que encontrar. Cada registro leva poucos minutos.</li>
            <li className="mem-body">
              Na Call 4{c4 ? ` (${dataHora(c4.data_atual)})` : ""}, vocês olham juntas o que cada hipótese mostrou.
            </li>
          </ol>
          <details className="ws-referencia" open={nenhumaConversa}>
            <summary className="mem-body-sm">{DEFINICAO_EVIDENCIA} Como ler o que aparece</summary>
            <ul className="ws-lista-simples mem-body-sm">
              <li>
                <strong>Contou um caso concreto</strong>: o problema existe na vida dessa pessoa.
              </li>
              <li>
                <strong>Já tentou resolver</strong>: o problema pesa o bastante para ela agir.
              </li>
              <li>
                <strong>Já pagou por algo</strong>: existe dinheiro em volta desse problema.
              </li>
              <li>
                <strong>Anúncio rodando há meses, produto entre os mais vendidos</strong>: o tema vende de forma sustentada.
              </li>
              <li>
                <strong>“Eu compraria”, “adorei a ideia”</strong>: é opinião ou previsão. Pode anotar, mas não conta como prova.
              </li>
            </ul>
            <p className="mem-body-sm mem-muted">Nenhuma conclusão sai de uma conversa só.</p>
          </details>
        </section>
      )}

      {!decisao && lista.some((f) => trilha(f) === "conversas" || trilha(f) === "ambas") && (
        <details className="ws-bloco ws-roteiro-conversa" open={nenhumaConversa}>
          <summary className="mem-label">Roteiro da conversa · sempre à mão · vale também por mensagem</summary>
          <ol className="ws-como__passos">
            {ROTEIRO.map((p) => (
              <li key={p} className="mem-body">
                {p}
              </li>
            ))}
          </ol>
          <p className="mem-body-sm">
            Para abrir: “Estou pesquisando como [público] lida com [problema]. Posso te fazer quatro perguntas sobre a sua
            experiência?” Você não está vendendo nada: está pedindo que a pessoa conte o que viveu.
          </p>
          <p className="mem-body-sm">Para aprofundar: {ROTEIRO_APROFUNDAR}</p>
          <p className="mem-body-sm">
            <strong>Nunca pergunte:</strong> {ROTEIRO_NUNCA.map((x) => `“${x}”`).join(" · ")} Se a pessoa perguntar o que você está criando,
            responda depois que ela contar a experiência dela.
          </p>
        </details>
      )}

      {lista.map((f, i) => (
        <CartaoFrente key={f.id} dados={dados} frente={f} n={i + 1} total={lista.length} travado={!!decisao} dia={dia} aoSalvar={recarregar} />
      ))}

      {!decisao && (
        <div id="envio">
          <EnviarParaKaren dados={dados} movimento={4} numeroCall={4} falta={faltaEnvioM4(dados)} aoSalvar={recarregar} />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function CartaoFrente({
  dados,
  frente,
  n,
  total,
  travado,
  dia,
  aoSalvar,
}: {
  dados: DadosJornada;
  frente: Registro;
  n: number;
  total: number;
  travado: boolean;
  dia: string;
  aoSalvar: () => Promise<void>;
}) {
  const [registrando, setRegistrando] = useState<string | "nova" | null>(null);
  const conversas = conversasDe(dados, frente);
  const k = contagem(dados, frente);
  const fm = frente.conteudo_mentora as FrenteMentora;
  const t = trilha(frente);

  return (
    <section className="mem-card ws-padrao" id={`frente-${frente.id}`}>
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">
          Hipótese {n} de {total} · em teste
        </span>
        {fm.resultado === "segue" && <span className="mem-tag mem-tag--decisao">Segue para comparar</span>}
        {fm.resultado === "volta" && <span className="mem-tag mem-tag--relato">Volta para ajustar</span>}
        {fm.resultado === "guardada" && <span className="mem-tag mem-tag--relato">Guardada</span>}
      </div>
      <p className="mem-body-lg ws-serif ws-frase">{fraseDaFrente(dados, frente)}</p>

      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">O que já apareceu</p>
        <p className="mem-body">{resumo(dados, frente)}</p>
      </div>

      {!travado && (
        <div className="ws-pauta">
          <p className="mem-label">Próximo passo</p>
          <p className="mem-body-sm">{proximoPasso(dados, frente, dia)}</p>
        </div>
      )}

      {!travado && <EscolhaTrilha frente={frente} aoSalvar={aoSalvar} />}

      {(t === "pesquisa" || t === "ambas" || relatosDe(dados, frente).length > 0 || sinaisMercadoDe(dados, frente).length > 0) && (
        <PesquisaFrente dados={dados} frente={frente} travado={travado} aoSalvar={aoSalvar} />
      )}

      {(t === "conversas" || t === "ambas" || conversas.length > 0) && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">
            Conversas · {k.doPublico} de {meta(frente)} do público
          </p>
      {conversas.map((c, i) =>
          registrando === c.id ? (
            <FormConversa key={c.id} dados={dados} frente={frente} registro={c} aoFechar={() => setRegistrando(null)} aoSalvar={aoSalvar} />
          ) : (
            <CartaoConversa key={c.id} registro={c} n={i + 1} podeEditar={!travado} aoEditar={() => setRegistrando(c.id)} />
          ),
        )}
  
        {!travado &&
          (registrando === "nova" ? (
            <FormConversa dados={dados} frente={frente} aoFechar={() => setRegistrando(null)} aoSalvar={aoSalvar} />
          ) : (
            <div>
              <button type="button" className="mem-btn mem-btn--primary" onClick={() => setRegistrando("nova")}>
                Registrar conversa
              </button>
            </div>
          ))}
  
          </div>
      )}

      {!travado && t && <ExtrasFrente dados={dados} frente={frente} comConversa={t !== "pesquisa"} aoSalvar={aoSalvar} />}

      {ideiasDe(dados, frente).length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Ideias novas · ficam guardadas como hipótese, não como prova</p>
          <ul className="ws-lista-simples mem-body-sm">
            {ideiasDe(dados, frente).map((x) => (
              <li key={x.id}>{String((x.conteudo as { texto?: string }).texto ?? "")}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CartaoConversa({ registro, n, podeEditar, aoEditar }: { registro: Registro; n: number; podeEditar: boolean; aoEditar: () => void }) {
  const c = registro.conteudo as Conversa;
  const m = registro.conteudo_mentora as RevisaoConversa;
  const sit = situacaoPublico(registro);
  return (
    <article className="ws-conversa">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">Conversa {n}</span>
        {sit === "nao_conta" && <span className="mem-tag mem-tag--relato">Fora do público: não conta</span>}
        {sit === "a_avaliar" && <span className="mem-tag mem-tag--pendencia">Em parte do público: a Karen avalia</span>}
        {c.ideia_antes && <span className="mem-tag mem-tag--pendencia">Você falou da sua ideia antes</span>}
      </div>
      <ul className="ws-chips">
        {demonstra(registro).map((t) => (
          <li key={t} className="ws-chip">
            {t}
          </li>
        ))}
      </ul>
      {(c.falas ?? []).filter(Boolean).map((f, i) => (
        <p key={i} className="mem-body ws-serif ws-fala">
          “{f}”
          {m.falas_opiniao?.includes(i) && <span className="mem-body-sm mem-muted"> · não conta como prova: é opinião ou previsão</span>}
        </p>
      ))}
      {c.percebi?.trim() && <p className="mem-body-sm mem-muted">Você percebeu: {c.percebi}</p>}
      {m.nota?.trim() && (
        <div className="mem-mentor">
          <span className="mem-label mem-muted">Nota da Karen</span>
          <p className="mem-mentor__text">{m.nota}</p>
        </div>
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

function FormConversa({
  dados,
  frente,
  registro,
  aoFechar,
  aoSalvar,
}: {
  dados: DadosJornada;
  frente: Registro;
  registro?: Registro;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const { pessoa } = useSessao();
  const [c, setC] = useState<Conversa>(() => ({ falas: [""], ...((registro?.conteudo ?? {}) as Conversa) }));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(false);
  const falas = c.falas?.length ? c.falas : [""];
  const temFala = falas.some((f) => f.trim());
  const pronta = !!c.publico && !!c.reconheceu && c.tentou !== undefined && c.pagou !== undefined && c.ideia_antes !== undefined && temFala;

  async function salvar() {
    if (!supabase || !pessoa) return;
    setSalvando(true);
    setErro(false);
    const conteudo = { ...c, falas: falas.map((f) => f.trim()).filter(Boolean) };
    const r = registro
      ? await supabase.from("registro").update({ conteudo }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 4,
          tipo: "conversa",
          origem_id: frente.id,
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    setSalvando(false);
    if (r.error) return setErro(true);
    await aoSalvar();
    aoFechar();
  }

  const sn = (v?: boolean) => (v === undefined ? undefined : v ? "sim" : "nao");
  let k = 0;

  return (
    <article className="ws-conversa ws-form">
      <span className="mem-label mem-muted">{registro ? "Editando conversa" : "Nova conversa · ~3 min"}</span>
      <Pergunta n={++k} feita={!!c.publico} titulo="Essa pessoa é do público da hipótese?">
        <Opcoes rotulo="É do público" opcoes={PUBLICO} valor={c.publico} aoEscolher={(v) => setC({ ...c, publico: v as Conversa["publico"] })} />
        <Colinha serve="Conversa com quem não é do público não conta para esta hipótese. É o que evita o “falei com cinco amigas”." />
      </Pergunta>
      <Pergunta n={++k} feita={!!c.reconheceu} titulo="Ela reconheceu o problema?">
        <Opcoes rotulo="Reconheceu" opcoes={RECONHECEU} valor={c.reconheceu} aoEscolher={(v) => setC({ ...c, reconheceu: v as Conversa["reconheceu"] })} />
        <Colinha serve="Caso concreto é quando ela contou uma vez em que aconteceu. “Isso acontece muito” é só em geral. “Não” também é informação, não fracasso." />
      </Pergunta>
      <Pergunta n={++k} feita={c.tentou !== undefined} titulo="Já tentou resolver?">
        <Opcoes rotulo="Já tentou resolver" opcoes={SIM_NAO} valor={sn(c.tentou)} aoEscolher={(v) => setC({ ...c, tentou: v === "sim" })} />
        {c.tentou && (
          <input className="mem-input" aria-label="Como tentou resolver" placeholder="Como, em uma linha" value={c.tentou_como ?? ""} onChange={(e) => setC({ ...c, tentou_como: e.target.value })} />
        )}
      </Pergunta>
      <Pergunta n={++k} feita={c.pagou !== undefined} titulo="Já pagou por alguma coisa para resolver?">
        <Opcoes rotulo="Já pagou" opcoes={SIM_NAO} valor={sn(c.pagou)} aoEscolher={(v) => setC({ ...c, pagou: v === "sim" })} />
        {c.pagou && (
          <input className="mem-input" aria-label="Pagou pelo quê" placeholder="Pelo quê, em uma linha" value={c.pagou_oque ?? ""} onChange={(e) => setC({ ...c, pagou_oque: e.target.value })} />
        )}
      </Pergunta>
      <Pergunta n={++k} feita={c.ideia_antes !== undefined} titulo="Você falou da sua ideia antes de ouvir o problema?">
        <Opcoes rotulo="Falou da ideia antes" opcoes={SIM_NAO} valor={sn(c.ideia_antes)} aoEscolher={(v) => setC({ ...c, ideia_antes: v === "sim" })} />
        <Colinha serve="Seja honesta: acontece. Se sim, o “reconheceu” desta conversa não conta, mas o que a pessoa já fez (tentou, pagou) continua valendo." />
      </Pergunta>
      <Pergunta n={++k} feita={temFala} titulo="Uma frase, do jeito que a pessoa disse">
        {falas.map((f, i) => (
          <input
            key={i}
            className="mem-input"
            aria-label={`Fala ${i + 1}`}
            value={f}
            onChange={(e) => setC({ ...c, falas: falas.map((x, j) => (j === i ? e.target.value : x)) })}
          />
        ))}
        {falas.length < 3 && (
          <div>
            <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setC({ ...c, falas: [...falas, ""] })}>
              Mais uma frase
            </button>
          </div>
        )}
        <Colinha
          serve="Copie as palavras dela, não resuma. É a linguagem real do público: mais à frente, ela vai para a sua oferta. Uma é obrigatória; até três."
          exemplo="“Eu fico com cara de traidor toda vez que cobro alguém.”"
        />
      </Pergunta>
      <Pergunta n={++k} feita={!!c.percebi?.trim()} titulo="O que você percebeu (opcional)">
        <input className="mem-input" aria-label="O que você percebeu" value={c.percebi ?? ""} onChange={(e) => setC({ ...c, percebi: e.target.value })} />
        <Colinha serve="A sua leitura da conversa. Ajuda a Karen a entender o contexto; não conta como prova." />
      </Pergunta>
      {erro && (
        <Aviso variante="danger" titulo="Não salvo">
          Tente de novo.
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!pronta || salvando} onClick={salvar}>
          {salvando ? "Salvando" : "Salvar conversa"}
        </button>
        <button type="button" className="mem-btn mem-btn--quiet" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
      {!pronta && <p className="mem-body-sm mem-muted">Responda as seis primeiras para salvar.</p>}
    </article>
  );
}

// Checagem de mercado, acesso não conseguido e ideia nova: opcionais, recolhidos.
function ExtrasFrente({ dados, frente, comConversa, aoSalvar }: { dados: DadosJornada; frente: Registro; comConversa: boolean; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const f = frente.conteudo as Frente;
  const [semAcesso, setSemAcesso] = useState(f.sem_acesso ?? "");
  const [ideia, setIdeia] = useState("");
  const [msg, setMsg] = useState("");

  async function salvarFrente(novo: Frente) {
    if (!supabase) return;
    const r = await supabase.from("registro").update({ conteudo: { ...f, ...novo } }).eq("id", frente.id);
    setMsg(r.error ? "Não foi possível salvar." : "Salvo.");
    if (!r.error) await aoSalvar();
  }

  async function salvarIdeia() {
    if (!supabase || !pessoa || !ideia.trim()) return;
    const r = await supabase.from("registro").insert({
      conta_id: dados.jornada.conta_id,
      jornada_id: dados.jornada.id,
      movimento_codigo: 4,
      tipo: "ideia_nova",
      origem_id: frente.id,
      conteudo: { texto: ideia.trim() },
      autora_papel: "mentorada",
      autora_id: pessoa.id,
    });
    if (!r.error) {
      setIdeia("");
      await aoSalvar();
    }
  }

  return (
    <div className="ws-extras">
      {comConversa && <details className="ws-referencia">
        <summary className="mem-body-sm">Não consegui falar com esse público{f.sem_acesso ? " · registrado" : ""}</summary>
        <input className="mem-input" aria-label="O que aconteceu" placeholder="O que aconteceu, em uma linha" value={semAcesso} onChange={(e) => setSemAcesso(e.target.value)} />
        <Colinha serve="Tudo bem: vira assunto da call com a Karen, não falha." />
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={() => salvarFrente({ sem_acesso: semAcesso.trim() })}>
            Salvar
          </button>
        </div>
      </details>}
      <details className="ws-referencia">
        <summary className="mem-body-sm">Tive uma ideia nova a partir do que encontrei</summary>
        <input className="mem-input" aria-label="Ideia nova" value={ideia} onChange={(e) => setIdeia(e.target.value)} />
        <Colinha
          serve="Por exemplo, o que as pessoas que têm o problema têm em comum. Fica guardada como hipótese, para olhar com a Karen; não conta como prova."
          exemplo="As sócias que têm o problema dividem o capital de forma desigual."
        />
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" disabled={!ideia.trim()} onClick={salvarIdeia}>
            Guardar ideia
          </button>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------
function DecisaoCall4({ dados }: { dados: DadosJornada }) {
  const lista = frentes(dados);
  const rot: Record<string, string> = { segue: "Segue para comparar", volta: "Volta para ajustar", guardada: "Fica guardada" };
  return (
    <section className="ws-bloco">
      <span className="mem-label mem-muted">Decisão da Call 4 · sua</span>
      <ul className="ws-lista-simples mem-body">
        {lista.map((f) => {
          const m = f.conteudo_mentora as FrenteMentora;
          return (
            <li key={f.id}>
              <strong>{m.resultado ? rot[m.resultado] : "—"}</strong>: {fraseDaFrente(dados, f)}
              {m.razao ? <span className="mem-muted"> — {m.razao}</span> : null}
              {m.condicao_volta ? <span className="mem-muted">. Pode voltar se {m.condicao_volta}</span> : null}
            </li>
          );
        })}
      </ul>
      <p className="mem-body-sm mem-muted">Seguir para comparar não quer dizer que está validado: quer dizer que há material para comparar.</p>
    </section>
  );
}

// ---------------------------------------------------------------------
function EscolhaTrilha({ frente, aoSalvar }: { frente: Registro; aoSalvar: () => Promise<void> }) {
  const f = frente.conteudo as Frente;
  const [mudando, setMudando] = useState(!f.trilha);
  async function escolher(v: string) {
    if (!supabase) return;
    const r = await supabase.from("registro").update({ conteudo: { ...f, trilha: v as Trilha } }).eq("id", frente.id);
    if (!r.error) {
      setMudando(false);
      await aoSalvar();
    }
  }
  if (!mudando)
    return (
      <p className="mem-body-sm mem-muted">
        Investigando: {TRILHAS.find((x) => x.valor === f.trilha)?.rotulo.toLowerCase()} ·{" "}
        <button type="button" className="ws-link-botao" onClick={() => setMudando(true)}>
          mudar
        </button>
      </p>
    );
  return (
    <Pergunta n={1} feita={!!f.trilha} titulo="Como você quer investigar esta hipótese?">
      <Opcoes rotulo="Como investigar" opcoes={TRILHAS} valor={f.trilha} aoEscolher={escolher} />
      <Colinha serve="Os dois caminhos valem. Pesquisando, você mostra que o tema vende e que o problema aparece por aí. Conversando, você confirma que este público, do jeito que você descreveu, vive o problema. Dá para mudar depois." />
    </Pergunta>
  );
}

function PesquisaFrente({ dados, frente, travado, aoSalvar }: { dados: DadosJornada; frente: Registro; travado: boolean; aoSalvar: () => Promise<void> }) {
  const [abrindo, setAbrindo] = useState<"relato" | "sinal" | null>(null);
  const q = pesquisa(dados, frente);
  const relatos = relatosDe(dados, frente);
  const sinais = sinaisMercadoDe(dados, frente);
  return (
    <div className="ws-padrao__parte">
      <p className="mem-label mem-muted">
        Pesquisa de mercado · {q.relatosCaso} de 3 relatos com caso · {q.sustentados ? "sinal sustentado ✓" : "falta 1 sinal sustentado"}
      </p>
      {!travado && (
        <details className="ws-referencia" open={!relatos.length && !sinais.length}>
          <summary className="mem-body-sm">Onde procurar</summary>
          <ul className="ws-lista-simples mem-body-sm">
            {ONDE_PROCURAR.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <DicaExpertIA>
            Peça ao ExpertIA para garimpar comentários, avaliações e anúncios sobre este tema e organizar o que achar. Ele
            organiza; o que entra aqui é o que você conferir no link.
          </DicaExpertIA>
        </details>
      )}
      {relatos.map((r) => {
        const x = r.conteudo as Relato;
        const descartado = (r.conteudo_mentora as { nao_conta?: boolean }).nao_conta === true;
        return (
          <div key={r.id} className="ws-conversa">
            <div className="ws-situacao__topo">
              <span className="mem-label mem-muted">Relato · {ONDE_RELATO.find((o) => o.valor === x.onde)?.rotulo ?? "encontrado"}</span>
              {x.caso && !descartado && <span className="mem-tag mem-tag--evidencia">Caso concreto</span>}
              {descartado && <span className="mem-tag mem-tag--relato">A Karen marcou: não conta</span>}
            </div>
            <p className="mem-body ws-serif ws-fala">“{x.trecho}”</p>
            {x.link && (
              <a className="mem-body-sm ws-link" href={x.link} target="_blank" rel="noreferrer">
                abrir o link
              </a>
            )}
          </div>
        );
      })}
      {sinais.map((r) => {
        const x = r.conteudo as SinalMercado;
        return (
          <div key={r.id} className="ws-conversa">
            <div className="ws-situacao__topo">
              <span className="mem-label mem-muted">Sinal de mercado · {ONDE_SINAL.find((o) => o.valor === x.onde)?.rotulo ?? ""}</span>
              {sustentado(r) && <span className="mem-tag mem-tag--evidencia">Demanda sustentada</span>}
            </div>
            <p className="mem-body">
              {x.nome}
              <span className="mem-muted">
                {x.tempo ? ` · ${TEMPO.find((t) => t.valor === x.tempo)?.rotulo.toLowerCase()}` : ""}
                {x.anuncios ? ` · ${x.anuncios} anúncio${x.anuncios > 1 ? "s" : ""}` : ""}
                {x.mais_vendidos ? " · entre os mais vendidos" : ""}
                {x.preco ? ` · ${x.preco}` : ""}
              </span>
            </p>
            {x.link && (
              <a className="mem-body-sm ws-link" href={x.link} target="_blank" rel="noreferrer">
                abrir o link
              </a>
            )}
          </div>
        );
      })}
      {!travado && abrindo === "relato" && <FormRelato dados={dados} frente={frente} aoFechar={() => setAbrindo(null)} aoSalvar={aoSalvar} />}
      {!travado && abrindo === "sinal" && <FormSinal dados={dados} frente={frente} aoFechar={() => setAbrindo(null)} aoSalvar={aoSalvar} />}
      {!travado && !abrindo && (
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={() => setAbrindo("relato")}>
            Registrar relato encontrado
          </button>
          <button type="button" className="mem-btn mem-btn--secondary" onClick={() => setAbrindo("sinal")}>
            Registrar sinal de mercado
          </button>
        </div>
      )}
    </div>
  );
}

function FormRelato({ dados, frente, aoFechar, aoSalvar }: { dados: DadosJornada; frente: Registro; aoFechar: () => void; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const [r, setR] = useState<Relato>({});
  const [erro, setErro] = useState(false);
  const pronto = !!r.onde && !!r.trecho?.trim() && r.caso !== undefined;
  async function salvar() {
    if (!supabase || !pessoa) return;
    const x = await supabase.from("registro").insert({
      conta_id: dados.jornada.conta_id,
      jornada_id: dados.jornada.id,
      movimento_codigo: 4,
      tipo: "relato",
      origem_id: frente.id,
      conteudo: { ...r, trecho: r.trecho?.trim(), link: r.link?.trim() },
      autora_papel: "mentorada",
      autora_id: pessoa.id,
    });
    if (x.error) return setErro(true);
    await aoSalvar();
    aoFechar();
  }
  let k = 0;
  return (
    <article className="ws-conversa ws-form">
      <span className="mem-label mem-muted">Relato encontrado · ~2 min</span>
      <Pergunta n={++k} feita={!!r.onde} titulo="Onde você encontrou?">
        <Opcoes rotulo="Onde" opcoes={ONDE_RELATO} valor={r.onde} aoEscolher={(v) => setR({ ...r, onde: v })} />
      </Pergunta>
      <Pergunta n={++k} feita={!!r.trecho?.trim()} titulo="O que a pessoa escreveu">
        <textarea className="mem-input" rows={3} aria-label="Trecho" value={r.trecho ?? ""} onChange={(e) => setR({ ...r, trecho: e.target.value })} />
        <Colinha serve="Copie o trecho, sem resumir. É a linguagem real do público." exemplo="“Minha sócia contratou alguém sem me avisar e eu fiquei sabendo pelo funcionário.”" />
        <input className="mem-input" aria-label="Link" placeholder="Link (para você e a Karen conferirem)" value={r.link ?? ""} onChange={(e) => setR({ ...r, link: e.target.value })} />
      </Pergunta>
      <Pergunta n={++k} feita={r.caso !== undefined} titulo="A pessoa conta um caso concreto?">
        <Opcoes
          rotulo="Caso concreto"
          opcoes={[
            { valor: "sim", rotulo: "Sim", detalhe: "conta algo que aconteceu com ela" },
            { valor: "nao", rotulo: "Não", detalhe: "opina ou fala em geral" },
          ]}
          valor={r.caso === undefined ? undefined : r.caso ? "sim" : "nao"}
          aoEscolher={(v) => setR({ ...r, caso: v === "sim" })}
        />
        <Colinha serve="“Isso acontece com todo mundo” é opinião. “Semana passada aconteceu comigo” é caso concreto." />
      </Pergunta>
      {erro && (
        <Aviso variante="danger" titulo="Não salvo">
          Tente de novo.
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!pronto} onClick={salvar}>
          Salvar relato
        </button>
        <button type="button" className="mem-btn mem-btn--quiet" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </article>
  );
}

function FormSinal({ dados, frente, aoFechar, aoSalvar }: { dados: DadosJornada; frente: Registro; aoFechar: () => void; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const [x, setX] = useState<SinalMercado>({});
  const [erro, setErro] = useState(false);
  const pronto = !!x.onde && !!x.nome?.trim() && (!!x.tempo || x.onde === "busca");
  async function salvar() {
    if (!supabase || !pessoa) return;
    const r = await supabase.from("registro").insert({
      conta_id: dados.jornada.conta_id,
      jornada_id: dados.jornada.id,
      movimento_codigo: 4,
      tipo: "sinal_mercado",
      origem_id: frente.id,
      conteudo: { ...x, nome: x.nome?.trim(), link: x.link?.trim(), preco: x.preco?.trim() },
      autora_papel: "mentorada",
      autora_id: pessoa.id,
    });
    if (r.error) return setErro(true);
    await aoSalvar();
    aoFechar();
  }
  let k = 0;
  return (
    <article className="ws-conversa ws-form">
      <span className="mem-label mem-muted">Sinal de mercado · ~3 min</span>
      <Pergunta n={++k} feita={!!x.onde} titulo="O que você encontrou?">
        <Opcoes rotulo="Tipo" opcoes={ONDE_SINAL} valor={x.onde} aoEscolher={(v) => setX({ ...x, onde: v })} />
      </Pergunta>
      <Pergunta n={++k} feita={!!x.nome?.trim()} titulo="Nome e link">
        <input className="mem-input" aria-label="Nome" placeholder="Nome do produto, anunciante ou serviço" value={x.nome ?? ""} onChange={(e) => setX({ ...x, nome: e.target.value })} />
        <input className="mem-input" aria-label="Link" placeholder="Link" value={x.link ?? ""} onChange={(e) => setX({ ...x, link: e.target.value })} />
      </Pergunta>
      {x.onde !== "busca" && (
        <Pergunta n={++k} feita={!!x.tempo} titulo="Há quanto tempo está rodando ou vendendo?">
          <Opcoes rotulo="Tempo" opcoes={TEMPO} valor={x.tempo} aoEscolher={(v) => setX({ ...x, tempo: v as SinalMercado["tempo"] })} />
          <Colinha serve="Na biblioteca de anúncios aparece a data em que o anúncio começou a rodar. Ninguém mantém anúncio por meses sem retorno: é sinal de que o tema vende." />
        </Pergunta>
      )}
      {x.onde === "anuncio" && (
        <Pergunta n={++k} feita={!!x.anuncios} titulo="Quantos anúncios do mesmo produto?">
          <input className="mem-input ws-input-curto" type="number" min={1} aria-label="Quantos anúncios" value={x.anuncios ?? ""} onChange={(e) => setX({ ...x, anuncios: Number(e.target.value) || undefined })} />
        </Pergunta>
      )}
      {(x.onde === "curso" || x.onde === "livro") && (
        <Pergunta n={++k} feita={x.mais_vendidos !== undefined} titulo="Está entre os mais vendidos?">
          <Opcoes
            rotulo="Mais vendidos"
            opcoes={[
              { valor: "sim", rotulo: "Sim" },
              { valor: "nao", rotulo: "Não ou não sei" },
            ]}
            valor={x.mais_vendidos === undefined ? undefined : x.mais_vendidos ? "sim" : "nao"}
            aoEscolher={(v) => setX({ ...x, mais_vendidos: v === "sim" })}
          />
        </Pergunta>
      )}
      <Pergunta n={++k} feita={!!x.preco?.trim()} titulo="Preço, se aparecer (opcional)">
        <input className="mem-input ws-input-curto" aria-label="Preço" value={x.preco ?? ""} onChange={(e) => setX({ ...x, preco: e.target.value })} />
      </Pergunta>
      {erro && (
        <Aviso variante="danger" titulo="Não salvo">
          Tente de novo.
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!pronto} onClick={salvar}>
          Salvar sinal
        </button>
        <button type="button" className="mem-btn mem-btn--quiet" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </article>
  );
}
