import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { call, type DadosJornada } from "../../lib/jornada";
import { dataCurta, dataHora, somarHoras } from "../../lib/datas";
import { enviadoEm } from "../../lib/envio";
import { VARIAVEIS, fatosVariavel, rotuloLeitura } from "../../lib/m9";
import { compradorPretendido } from "../../lib/m9";
import {
  CAPACIDADES,
  rotuloMudas,
  PARTE_A,
  RETORNOS,
  TERMOS,
  competenciasAConfirmar,
  compradorCriticoM6,
  dadosM10,
  decisaoM10De,
  leituraGate7,
  mentoraM10,
  prontaCall10,
  reservaM5,
  rotuloDecisao,
  rotuloEstatuto,
  rotuloStatusJornada,
  type CapKey,
  type Capacidade,
  type DecisaoM10Mentora,
} from "../../lib/m10";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import NotaPrivada from "../../componentes/NotaPrivada";
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import { RelatorioFinal } from "../mentorada/M10";

const NOTA_M10 = [
  {
    chave: "conclusoes",
    rotulo: "As duas ou três conclusões que ela vai classificar",
    ajuda: "Escolha as conclusões que sustentam a decisão. Na call, ela diz qual é fato, qual é interpretação e qual é hipótese. Uma por linha.",
    exemplo: "“O preço foi o problema.” · “Gestores pagam do próprio bolso.” · “A rota de ex-colegas funciona.”",
  },
  {
    chave: "confrontos",
    rotulo: "Até três pontos de confronto",
    ajuda: "Saltos de causa, generalização, narrativa depois do fato, acesso lido como oferta, opinião lida como comportamento.",
    exemplo: "Ela diz que o problema é o preço, mas só uma pessoa citou preço; duas pararam antes de ver a proposta.",
  },
];

const PERGUNTAS_DECISAO = [
  "Qual evidência sustenta isso?",
  "O que faria você mudar de ideia?",
  "Você está decidindo sobre o que aconteceu ou sobre o que gostaria que tivesse acontecido?",
  "Se tirarmos a sua opinião, o que sobra?",
];

// Seção do M10 na página da mentorada, vista pela mentora.
export default function SecaoM10({ dados, mentoriaId, recarregar }: { dados: DadosJornada; mentoriaId: string; recarregar: () => Promise<void> }) {
  const m10 = dados.movimentos.find((m) => m.codigo === 10)?.estado;
  if (!m10 || m10 === "nao_iniciado") return null;
  const reg = decisaoM10De(dados);
  const m = mentoraM10(dados);
  const passou = !!m.gate_em;
  const c10 = call(dados, 10);
  const enviado = enviadoEm(dados, 10);
  const pronta = prontaCall10(dados);

  const passos: Passo[] = [
    { id: "m10-ela", titulo: "Responder as quatro perguntas e esboçar decisão e plano", quem: "Ela", estado: pronta ? "feito" : "esperando", nota: enviado ? `enviado ${dataHora(enviado)}` : "~45 a 60 min" },
    { id: "m10-prep", titulo: "Ler contra a evidência e preparar a call", quem: "Você", estado: passou ? "feito" : pronta ? "agora" : "depois", nota: "~60 min" },
    { id: "m10-call", titulo: "Call 10: decisão e autonomia", quem: "Juntas", estado: passou ? "feito" : pronta ? "agora" : "depois", nota: c10 && !passou ? dataHora(c10.data_atual) : undefined },
    { id: "m10-gate", titulo: "Registrar e fechar a jornada", quem: "Você", estado: passou ? "feito" : "depois", nota: passou ? rotuloStatusJornada(m.status_jornada).replace("Jornada concluída · ", "") : undefined },
  ];
  if (passou && m.status_jornada !== "demonstrada")
    passos.push({
      id: "m10-conversa",
      titulo: "Conversa de fechamento (opcional)",
      quem: "Juntas",
      estado: m.conversa_em ? "feito" : "agora",
      nota: m.conversa_em ? dataCurta(m.conversa_em) : `até ${dataCurta(somarHoras(m.gate_em!, 24 * 14))}`,
    });

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M10 · Aprender e Decidir</h2>
      <Roteiro titulo="O caminho do M10" passos={passos} />
      {passou ? (
        <>
          <Etapa n={0} passo={{ id: "m10-relatorio", titulo: "Relatório final", quem: "Juntas", estado: "feito" }}>
            <RelatorioFinal dados={dados} paraMentora />
          </Etapa>
          {m.status_jornada !== "demonstrada" && (
            <Etapa
              n={5}
              passo={passos[4]}
              porque="Uma vez, até 14 dias depois da Call 10, só nas capacidades que faltaram. Ela relê o relatório antes. Mesma regra: só a pergunta de abertura e, se precisar, esclarecimento."
            >
              {m.conversa_em ? <p className="mem-body">Registrada em {dataCurta(m.conversa_em)}.</p> : <Conversa dados={dados} recarregar={recarregar} />}
            </Etapa>
          )}
        </>
      ) : reg ? (
        <Fluxo dados={dados} mentoriaId={mentoriaId} passos={passos} recarregar={recarregar} />
      ) : (
        <p className="mem-body mem-muted">Ela ainda não começou as quatro perguntas.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
function Fluxo({ dados, mentoriaId, passos, recarregar }: { dados: DadosJornada; mentoriaId: string; passos: Passo[]; recarregar: () => Promise<void> }) {
  const reg = decisaoM10De(dados)!;
  const x = dadosM10(dados);
  const [m, setM] = useState<DecisaoM10Mentora>(() => JSON.parse(JSON.stringify(mentoraM10(dados))));
  const [estado, setEstado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const c10 = call(dados, 10);
  const g7 = leituraGate7(dados);
  const reserva = reservaM5(dados);
  const comps = competenciasAConfirmar(dados);
  const critico = compradorCriticoM6(dados);
  const set = (n: Partial<DecisaoM10Mentora>) => {
    setM({ ...m, ...n });
    setEstado("");
  };
  const caps = m.capacidades ?? {};
  const termos = m.termos ?? {};
  const a = m.parte_a ?? {};

  async function salvar(): Promise<boolean> {
    if (!supabase) return false;
    setEstado("salvando");
    const res = await supabase.from("registro").update({ conteudo_mentora: { ...(reg.conteudo_mentora ?? {}), ...m } }).eq("id", reg.id);
    setEstado(res.error ? "erro" : "salvo");
    if (!res.error) await recarregar();
    return !res.error;
  }
  async function gate() {
    if (!supabase) return;
    setErro(null);
    setResultado(null);
    if (!(await salvar())) return setErro("Não foi possível salvar.");
    const res = await supabase.rpc("registrar_gate8", { p_registro: reg.id });
    if (res.error) return setErro(res.error.message);
    if (res.data === "nao_passou") setResultado("A qualidade da decisão não passou: revejam juntas o que ficou desmarcado. A jornada continua aberta.");
    await recarregar();
  }
  async function marcar() {
    if (!supabase || !c10) return;
    await supabase.from("encontro").update({ estado: "realizado", data_realizada: new Date().toISOString() }).eq("id", c10.id);
    await recarregar();
  }
  const setCap = (k: CapKey, c: Capacidade) => set({ capacidades: { ...caps, [k]: c } });
  const todasMarcadas = CAPACIDADES.every((c) => typeof caps[c.chave]?.demonstrada === "boolean");

  return (
    <>
      <Etapa n={1} passo={passos[0]} porque="Ela responde por escrito antes da call. A call é para pensar em voz alta e decidir, não para ler formulário.">
        <dl className="ws-resumo">
          <div>
            <dt className="mem-body-sm mem-muted">O que aconteceu</dt>
            <dd className="mem-body">{x.aconteceu || "—"}</dd>
          </div>
          <div>
            <dt className="mem-body-sm mem-muted">O que isso sugere</dt>
            <dd className="mem-body">{x.sugere || "—"}</dd>
          </div>
          <div>
            <dt className="mem-body-sm mem-muted">O que aprendeu</dt>
            <dd className="mem-body">
              {(x.aprendi ?? []).filter((y) => y.texto).map((y) => `${y.texto} (muda: ${rotuloMudas(y)})`).join(" · ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="mem-body-sm mem-muted">Decisão</dt>
            <dd className="mem-body">
              <strong>{rotuloDecisao(x.decisao)}</strong> · {x.porque || "—"}
              {x.retorno?.para && ` · volta: ${RETORNOS.find((r) => r.valor === x.retorno?.para)?.rotulo} (${x.retorno.o_que ?? "—"})`}
              {x.investigacao?.pergunta && ` · investiga: ${x.investigacao.pergunta} · evidência: ${x.investigacao.evidencia ?? "—"} · limite: ${x.investigacao.limite ?? "—"}`}
            </dd>
          </div>
          <div>
            <dt className="mem-body-sm mem-muted">Não sabe · muda de ideia se</dt>
            <dd className="mem-body">
              {x.nao_sabe || "—"} · {x.revisao || "—"}
            </dd>
          </div>
          <div>
            <dt className="mem-body-sm mem-muted">Estatuto que ela propõe</dt>
            <dd className="mem-body">{rotuloEstatuto(x.estatuto)}</dd>
          </div>
          <div>
            <dt className="mem-body-sm mem-muted">Plano</dt>
            <dd className="mem-body">
              {x.plano?.acao || "—"} · {x.plano?.pergunta || "—"} · reler em {x.plano?.revisitar ? dataCurta(x.plano.revisitar) : "—"}
            </dd>
          </div>
        </dl>
      </Etapa>

      <Etapa
        n={2}
        passo={passos[1]}
        porque="Procure saltos de causa, generalizações, narrativa depois do fato, acesso lido como oferta e opinião lida como comportamento. Verifique reserva, comprador e ativo."
      >
        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">O teste, por parte · leitura do Gate 7: {rotuloLeitura(g7).toLowerCase()}</span>
          {VARIAVEIS.map((v) => (
            <p key={v.chave} className="mem-body-sm">
              <strong>{v.rotulo}:</strong> {fatosVariavel(dados, v.chave).join(" · ")}
            </p>
          ))}
        </article>

        <article className="mem-card ws-padrao">
          <Pergunta n={1} feita={!reserva || typeof m.reserva?.atingida === "boolean"} titulo="A reserva do M5">
            {reserva ? (
              <>
                <p className="mem-body">
                  {reserva.frase} · entra se {reserva.condicao}
                </p>
                <Opcoes
                  rotulo="A condição foi atingida?"
                  opcoes={[
                    { valor: "sim", rotulo: "Sim" },
                    { valor: "nao", rotulo: "Não" },
                  ]}
                  valor={m.reserva?.atingida === undefined ? undefined : m.reserva.atingida ? "sim" : "nao"}
                  aoEscolher={(v) => set({ reserva: { ...(m.reserva ?? {}), atingida: v === "sim" } })}
                />
                <input className="mem-input" aria-label="Evidência da reserva" placeholder="Qual evidência" value={m.reserva?.evidencia ?? ""} onChange={(e) => set({ reserva: { ...(m.reserva ?? {}), evidencia: e.target.value } })} />
              </>
            ) : (
              <p className="mem-body-sm mem-muted">Não houve reserva no M5.</p>
            )}
          </Pergunta>
          {critico && (
            <Pergunta n={2} feita={!!m.comprador?.sustenta || !!m.comprador?.contradiz} titulo="Quem compra: a aposta crítica do M6">
              <p className="mem-body-sm mem-muted">Na aposta, quem compra: {compradorPretendido(dados)}.</p>
              {(
                [
                  ["sustenta", "O que o teste sustenta"],
                  ["contradiz", "O que contradiz"],
                  ["desconhecido", "O que ainda não se sabe"],
                ] as const
              ).map(([k, l]) => (
                <input key={k} className="mem-input" aria-label={l} placeholder={l} value={m.comprador?.[k] ?? ""} onChange={(e) => set({ comprador: { ...(m.comprador ?? {}), [k]: e.target.value } })} />
              ))}
            </Pergunta>
          )}
          {comps.length > 0 && (
            <Pergunta n={3} feita={typeof m.ativo?.criterio_aceito === "boolean"} titulo="O que ainda está a confirmar">
              <p className="mem-body">
                {comps.join("; ")} · critério dela: {x.ativo?.criterio || <span className="mem-muted">ainda não propôs</span>}
              </p>
              <Opcoes
                rotulo="O critério demonstra a competência?"
                opcoes={[
                  { valor: "sim", rotulo: "Sim, fica registrado" },
                  { valor: "nao", rotulo: "Não, ajustar na call" },
                ]}
                valor={m.ativo?.criterio_aceito === undefined ? undefined : m.ativo.criterio_aceito ? "sim" : "nao"}
                aoEscolher={(v) =>
                  set({ ativo: { ...(m.ativo ?? {}), criterio_aceito: v === "sim", criterio_em: v === "sim" ? new Date().toISOString() : undefined, status: m.ativo?.status ?? "a_confirmar" } })
                }
              />
              <Colinha serve="Tem que dar para ver na entrega, e mais de uma vez. Compra não confirma competência; elogio também não." />
            </Pergunta>
          )}
          {x.estatuto === "validada" && (
            <Pergunta n={4} feita={TERMOS.every((t) => termos[t.k])} titulo="Ela propõe “validada”: os cinco termos">
              {g7 !== "favoravel" && (
                <p className="mem-body-sm ws-pauta">A leitura do Gate 7 foi {rotuloLeitura(g7).toLowerCase()}: “validada” não é possível. Fica registrada como fortalecida.</p>
              )}
              {TERMOS.map((t) => (
                <label key={t.k} className="ws-check mem-body-sm">
                  <input type="checkbox" checked={!!termos[t.k]} onChange={(e) => set({ termos: { ...termos, [t.k]: e.target.checked } })} /> {t.t}
                </label>
              ))}
              <input
                className="mem-input"
                aria-label="Se não for validada, por quê"
                placeholder="Se não fecha, o que faltou (ela vê no relatório)"
                value={m.discordancia_estatuto ?? ""}
                onChange={(e) => set({ discordancia_estatuto: e.target.value })}
              />
              <Colinha serve="Faltando um termo, o Workspace registra “fortalecida, não validada” quando você registrar o fechamento." />
            </Pergunta>
          )}
        </article>
        <NotaPrivada mentoriaId={mentoriaId} movimento={10} campos={NOTA_M10} titulo="Nota privada · M10 · só você vê" />
      </Etapa>

      <Etapa n={3} passo={passos[2]} porque="~60 min, cinco momentos. A decisão é dela: você confronta e verifica, não escolhe.">
        <p className="mem-body-lg">
          {c10 ? dataHora(c10.data_atual) : "—"} · {c10?.estado === "realizado" ? "realizada" : "marcada"}
        </p>
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--secondary" to={`/mentoradas/${dados.jornada.id}/call/10`}>
            Abrir guia da Call 10
          </Link>
          {c10 && c10.estado !== "realizado" && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={marcar}>
              Marcar Call 10 como realizada
            </button>
          )}
        </div>
        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">As quatro demonstrações · registre durante a call</span>
          <p className="mem-body-sm mem-muted">
            Faça a pergunta de abertura. Toda pergunta sua depois dela entra aqui: esclarecimento (“o que quer dizer?”, “dá um exemplo?”, “e depois?”) não invalida. Condução (dar a
            conclusão, a estrutura, o passo que faltava, ou escolher por ela) marca a capacidade como não demonstrada nesta call.
          </p>
          {CAPACIDADES.map((c, i) => (
            <CapacidadeCampo key={c.chave} n={i + 1} cap={c} valor={caps[c.chave] ?? {}} aoMudar={(v) => setCap(c.chave, v)} extra={c.chave === "justificar" ? PERGUNTAS_DECISAO : undefined} />
          ))}
        </article>
      </Etapa>

      <Etapa n={4} passo={passos[3]} porque="Duas partes, registradas separadas. A qualidade da decisão precisa passar. A autonomia vira o status da jornada: não é nota e não é fracasso.">
        <article className="mem-card ws-padrao">
          <Pergunta n={1} feita={PARTE_A.every((t) => a[t.k])} titulo="A qualidade da decisão">
            {PARTE_A.map((t) => (
              <label key={t.k} className="ws-check mem-body-sm">
                <input type="checkbox" checked={!!a[t.k]} onChange={(e) => set({ parte_a: { ...a, [t.k]: e.target.checked } })} /> {t.t}
              </label>
            ))}
            <Colinha serve="Não exige continuar, nem “validada”, nem leitura favorável. Investigar ou arquivar podem ser decisões excelentes." />
          </Pergunta>
          <Pergunta n={2} feita={todasMarcadas} titulo="A autonomia">
            <ul className="ws-lista-simples mem-body-sm">
              {CAPACIDADES.map((c) => (
                <li key={c.chave}>
                  {c.titulo}: {caps[c.chave]?.demonstrada === true ? "demonstrada" : caps[c.chave]?.demonstrada === false ? `não demonstrada nesta call${caps[c.chave]?.faltou ? ` (${caps[c.chave]?.faltou})` : ""}` : "não marcada"}
                </li>
              ))}
            </ul>
          </Pergunta>
          <Pergunta n={3} feita={!!m.leitura_final?.trim()} titulo="A sua leitura final">
            <textarea className="mem-input ws-serif" rows={5} aria-label="Leitura final" value={m.leitura_final ?? ""} onChange={(e) => set({ leitura_final: e.target.value })} />
            <Colinha
              serve="Fecha o relatório final, assinada por você. Diga o que ela demonstrou e o que ainda não, sem nota e sem elogio vazio."
              exemplo="Você saiu de “quero ajudar líderes” para uma oferta que duas pessoas compraram, e soube dizer o que o teste não mostra. Separar fato de interpretação ainda pediu ajuda: é o que exercitar na próxima decisão."
            />
          </Pergunta>
        </article>
        {resultado && (
          <Aviso variante="warn" titulo="Não passou">
            {resultado}
          </Aviso>
        )}
        {erro && (
          <Aviso variante="danger" titulo="Não registrado">
            {erro}
          </Aviso>
        )}
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={() => salvar()} disabled={estado === "salvando"}>
            {estado === "salvo" ? "Salvo" : "Salvar"}
          </button>
          <button type="button" className="mem-btn mem-btn--primary" disabled={!todasMarcadas || !m.leitura_final?.trim()} onClick={gate}>
            Registrar e fechar a jornada
          </button>
        </div>
        <p className="mem-body-sm mem-muted">Depois disso, o registro fecha e ela passa a ver o relatório final.</p>
      </Etapa>
    </>
  );
}

// ---------------------------------------------------------------------
function CapacidadeCampo({
  n,
  cap,
  valor,
  aoMudar,
  extra,
}: {
  n: number;
  cap: (typeof CAPACIDADES)[number];
  valor: Capacidade;
  aoMudar: (c: Capacidade) => void;
  extra?: string[];
}) {
  const [texto, setTexto] = useState("");
  const perguntas = valor.perguntas ?? [];
  const conduziu = perguntas.some((p) => p.tipo === "conducao");
  function registrar(tipo: "esclarecimento" | "conducao") {
    if (!texto.trim()) return;
    const novas = [...perguntas, { texto: texto.trim(), tipo }];
    aoMudar({ ...valor, perguntas: novas, demonstrada: tipo === "conducao" ? false : valor.demonstrada });
    setTexto("");
  }
  return (
    <Pergunta n={n} feita={typeof valor.demonstrada === "boolean"} titulo={cap.titulo}>
      <p className="mem-body ws-serif">“{cap.abertura}”</p>
      <p className="mem-body-sm mem-muted">O que observar: {cap.observa}</p>
      {extra && <p className="mem-body-sm mem-muted">Para testar a decisão (aprofundam, não conduzem): {extra.join(" · ")}</p>}
      {perguntas.length > 0 && (
        <ul className="ws-lista-simples mem-body-sm">
          {perguntas.map((p, i) => (
            <li key={i}>
              {p.texto} <span className="mem-muted">· {p.tipo === "conducao" ? "condução" : "esclarecimento"}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="ws-form">
        <input className="mem-input" aria-label={`Pergunta sua em ${cap.titulo}`} placeholder="Uma pergunta sua além da abertura" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--quiet" disabled={!texto.trim()} onClick={() => registrar("esclarecimento")}>
            Foi esclarecimento
          </button>
          <button type="button" className="mem-btn mem-btn--quiet" disabled={!texto.trim()} onClick={() => registrar("conducao")}>
            Foi condução
          </button>
        </div>
      </div>
      <Opcoes
        rotulo={`${cap.titulo}: resultado`}
        opcoes={
          conduziu
            ? [{ valor: "nao", rotulo: "Não demonstrada nesta call" }]
            : [
                { valor: "sim", rotulo: "Demonstrada" },
                { valor: "nao", rotulo: "Não demonstrada nesta call" },
              ]
        }
        valor={valor.demonstrada === undefined ? undefined : valor.demonstrada ? "sim" : "nao"}
        aoEscolher={(v) => aoMudar({ ...valor, demonstrada: v === "sim" })}
      />
      {conduziu && <p className="mem-body-sm mem-muted">Houve condução: a capacidade fica como não demonstrada nesta call.</p>}
      {valor.demonstrada === false && (
        <input className="mem-input" aria-label="O que faltou" placeholder="O que faltou (ela vê no relatório)" value={valor.faltou ?? ""} onChange={(e) => aoMudar({ ...valor, faltou: e.target.value })} />
      )}
    </Pergunta>
  );
}

// ---------------------------------------------------------------------
function Conversa({ dados, recarregar }: { dados: DadosJornada; recarregar: () => Promise<void> }) {
  const reg = decisaoM10De(dados)!;
  const m = mentoraM10(dados);
  const faltaram = CAPACIDADES.filter((c) => !m.capacidades?.[c.chave]?.demonstrada);
  const [caps, setCaps] = useState<Partial<Record<CapKey, Capacidade>>>({});
  const [erro, setErro] = useState<string | null>(null);
  const prazo = somarHoras(m.gate_em!, 24 * 14);
  if (new Date() > new Date(prazo)) return <p className="mem-body mem-muted">O prazo de 14 dias terminou em {dataCurta(prazo)}. O status fica como está.</p>;

  async function registrar() {
    if (!supabase) return;
    setErro(null);
    const res = await supabase.rpc("registrar_conversa_fechamento", { p_registro: reg.id, p_capacidades: caps });
    if (res.error) return setErro(res.error.message);
    await recarregar();
  }
  return (
    <article className="mem-card ws-padrao">
      {faltaram.map((c, i) => (
        <CapacidadeCampo key={c.chave} n={i + 1} cap={c} valor={caps[c.chave] ?? {}} aoMudar={(v) => setCaps({ ...caps, [c.chave]: v })} />
      ))}
      {erro && (
        <Aviso variante="danger" titulo="Não registrado">
          {erro}
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!faltaram.every((c) => typeof caps[c.chave]?.demonstrada === "boolean")} onClick={registrar}>
          Registrar a conversa
        </button>
      </div>
      <p className="mem-body-sm mem-muted">Acontece uma vez só. O status da jornada é atualizado com a data.</p>
    </article>
  );
}
