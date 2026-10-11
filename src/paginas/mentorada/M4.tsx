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
  type Conversa,
  type Frente,
  type FrenteMentora,
  type RevisaoConversa,
} from "../../lib/m4";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";

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
            <li className="mem-body">Converse com pessoas de cada hipótese, seguindo o roteiro. Sem apresentar a sua ideia.</li>
            <li className="mem-body">Registre cada conversa logo depois, pelo celular. ~3 min.</li>
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
                <strong>“Eu compraria”, “adorei a ideia”</strong>: é opinião ou previsão. Pode anotar, mas não conta como prova.
              </li>
            </ul>
            <p className="mem-body-sm mem-muted">Nenhuma conclusão sai de uma conversa só.</p>
          </details>
        </section>
      )}

      {!decisao && (
        <details className="ws-bloco ws-roteiro-conversa" open={nenhumaConversa}>
          <summary className="mem-label">Roteiro da conversa · sempre à mão</summary>
          <ol className="ws-como__passos">
            {ROTEIRO.map((p) => (
              <li key={p} className="mem-body">
                {p}
              </li>
            ))}
          </ol>
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
        <p className="mem-label mem-muted">
          {k.doPublico} de {meta(frente)} conversas do público
        </p>
        <p className="mem-body">{resumo(dados, frente)}</p>
      </div>

      {!travado && (
        <div className="ws-pauta">
          <p className="mem-label">Próximo passo</p>
          <p className="mem-body-sm">{proximoPasso(dados, frente, dia)}</p>
        </div>
      )}

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

      {!travado && <ExtrasFrente dados={dados} frente={frente} aoSalvar={aoSalvar} />}

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
function ExtrasFrente({ dados, frente, aoSalvar }: { dados: DadosJornada; frente: Registro; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const f = frente.conteudo as Frente;
  const [checagem, setChecagem] = useState<Frente["checagem"]>(f.checagem);
  const [links, setLinks] = useState((f.checagem_links ?? []).join("\n"));
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
      <details className="ws-referencia">
        <summary className="mem-body-sm">Alguém já cobra para resolver isso? · opcional, ~5 min{f.checagem ? " · feito" : ""}</summary>
        <Opcoes
          rotulo="Alguém já cobra"
          opcoes={[
            { valor: "sim", rotulo: "Sim, encontrei" },
            { valor: "nao", rotulo: "Não encontrei" },
          ]}
          valor={checagem}
          aoEscolher={(v) => setChecagem(v as Frente["checagem"])}
        />
        {checagem === "sim" && (
          <textarea className="mem-input" rows={3} aria-label="Nomes ou links" placeholder="Até 3 nomes ou links, um por linha" value={links} onChange={(e) => setLinks(e.target.value)} />
        )}
        <Colinha serve="Um curso, um serviço, um profissional que já cobra por isso. Mostra que há dinheiro em volta do tema, mas não substitui conversa com o público." />
        <div className="ws-acoes">
          <button
            type="button"
            className="mem-btn mem-btn--secondary"
            disabled={!checagem}
            onClick={() => salvarFrente({ checagem, checagem_links: links.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 3) })}
          >
            Salvar
          </button>
          {msg && <span className="mem-body-sm mem-muted">{msg}</span>}
        </div>
      </details>
      <details className="ws-referencia">
        <summary className="mem-body-sm">Não consegui falar com esse público{f.sem_acesso ? " · registrado" : ""}</summary>
        <input className="mem-input" aria-label="O que aconteceu" placeholder="O que aconteceu, em uma linha" value={semAcesso} onChange={(e) => setSemAcesso(e.target.value)} />
        <Colinha serve="Tudo bem: vira assunto da call com a Karen, não falha." />
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={() => salvarFrente({ sem_acesso: semAcesso.trim() })}>
            Salvar
          </button>
        </div>
      </details>
      <details className="ws-referencia">
        <summary className="mem-body-sm">Tive uma ideia nova a partir das conversas</summary>
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
