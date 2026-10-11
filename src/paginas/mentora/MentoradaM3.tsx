import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { call, leitura, type DadosJornada, type Registro } from "../../lib/jornada";
import { ondeVoceEsta, respostaTexto } from "../../lib/m1";
import { ROTULOS } from "../../lib/m2";
import {
  LASTRO,
  ROTULO_ORIGEM,
  ativosEscolhidos,
  ativosSemHipotese,
  dadosHipotese,
  decisaoM3,
  disputaPublico,
  fraseTexto,
  hipoteseCompleta,
  hipoteses,
  hipotesesCompletas,
  publicos,
  quemMaisDe,
  quemMaisRespondido,
  type DecisaoM3,
  type Hipotese,
  type QuemMais,
} from "../../lib/m3";
import { dataHora } from "../../lib/datas";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";
import NotaPrivada from "../../componentes/NotaPrivada";
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import { PublicarLeitura } from "./MentoradaM2";
import { enviadoEm } from "../../lib/envio";

const NOTA_M3 = [
  {
    chave: "genericas",
    rotulo: "Quais estão genéricas",
    ajuda: "Hipóteses que serviriam para qualquer pessoa. Na call, você lê em voz alta e pergunta “isso serve para quem mais?”.",
    exemplo: "H2: “conflitos” serve para todo mundo. Que conflito, entre quem?",
  },
  {
    chave: "imaginadas",
    rotulo: "Quais são só imaginadas",
    ajuda: "As marcadas “Imagino”. Podem ir a campo, mas ela vai precisar encontrar pessoas que nunca viu.",
    exemplo: "H3, líderes de startup: ela não conhece ninguém nesse público.",
  },
  {
    chave: "ativo_usado",
    rotulo: "Usam o ativo de verdade ou só citam",
    ajuda: "O ativo aparece no problema e na transformação, ou só no fim da frase? E o público novo tem mesmo o problema observado no M2?",
    exemplo: "H4 cita mediação, mas o problema descrito é de finanças, não de conflito.",
  },
  {
    chave: "disputa",
    rotulo: "Disputa de público",
    ajuda: "Hipóteses com o mesmo público. A disputa pode revelar um padrão mais forte ou ser só repetição. Nenhuma é eliminada por isso.",
    exemplo: "H2 e H4 parecem o mesmo problema (sociedade que não decide junto) em contextos diferentes.",
  },
  {
    chave: "ideia_entrada",
    rotulo: "A ideia com que ela chegou apareceu?",
    ajuda: "Se a ideia de produto do M1 virou hipótese e está dominando o conjunto. Ela não vê essa ligação.",
    exemplo: "Não tinha ideia de entrada. / A H1 é a ideia do curso que ela trouxe, e é a única com lastro.",
  },
];

// Seção do M3 na página da mentorada, vista pela mentora.
export default function SecaoM3({
  dados,
  mentoriaId,
  recarregar,
}: {
  dados: DadosJornada;
  mentoriaId: string;
  recarregar: () => Promise<void>;
}) {
  const m3 = dados.movimentos.find((m) => m.codigo === 3);
  if (!m3 || m3.estado === "nao_iniciado") return null;

  const ativos = ativosEscolhidos(dados);
  const lista = hipoteses(dados);
  const completas = hipotesesCompletas(dados);
  const quemMaisOk = ativos.every((a) => quemMaisRespondido(dados, a.id));
  const decisao = decisaoM3(dados);
  const registrada = !!decisao && !decisao.pendente_publicacao;
  const c3 = call(dados, 3);
  const leituraC3 = leitura(dados, "call_3");
  const ideia = respostaTexto("ideia", (ondeVoceEsta(dados)?.conteudo ?? {})["ideia"]);

  const passos: Passo[] = [
    {
      id: "m3-quem",
      titulo: "Responder “Quem mais?” para cada ativo",
      quem: "Ela",
      estado: quemMaisOk ? "feito" : "esperando",
    },
    {
      id: "m3-hip",
      titulo: "Montar de 3 a 5 hipóteses",
      quem: "Ela",
      estado: registrada || (completas >= 3 && ativosSemHipotese(dados).length === 0) ? "feito" : "esperando",
      nota: enviadoEm(dados, 3)
        ? `enviado ${dataHora(enviadoEm(dados, 3)!)}`
        : `${completas} completa${completas === 1 ? "" : "s"}${lista.length > completas ? ` · ${lista.length - completas} pela metade` : ""}`,
    },
    { id: "m3-nota", titulo: "Ler as hipóteses e preparar a Call 3", quem: "Você", estado: registrada ? "feito" : "agora", nota: "na véspera" },
    {
      id: "m3-call",
      titulo: "Call 3: decidir o que vai a campo",
      quem: "Juntas",
      estado: registrada ? "feito" : "agora",
      nota: c3 && !registrada ? `${dataHora(c3.data_atual)} · primeira metade` : registrada ? "o M4 abriu" : undefined,
    },
    {
      id: "m3-leitura",
      titulo: "Publicar a leitura da Call 3",
      quem: "Você",
      estado: leituraC3 ? "feito" : registrada ? "agora" : "depois",
      nota: leituraC3 ? undefined : "até 48 h · cobre a call inteira",
    },
  ];

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M3 · Formular hipóteses</h2>
      <Roteiro titulo="O caminho do M3" passos={passos} />

      <Etapa
        n={1}
        passo={passos[0]}
        aberta={!registrada}
        porque="Para cada ativo, ela amplia quem mais tem o mesmo problema. Cada linha vira um público na lista dela."
      >
        {ativos.map((a) => {
          const q = quemMaisDe(dados, a.id)?.conteudo as QuemMais | undefined;
          const pubs = publicos(dados).filter((p) => p.ativo === a.id && p.origem !== "novo");
          return (
            <article key={a.id} className="mem-card ws-padrao">
              <span className="mem-label mem-muted">
                Ativo · {ROTULOS[a.rotulo].toLowerCase()}
              </span>
              <h4 className="mem-h3 ws-padrao__nome">{a.nome}</h4>
              <dl className="ws-resumo">
                <div>
                  <dt className="mem-body-sm mem-muted">Quem já ajudou</dt>
                  <dd className="mem-body">{q?.ja_ajudei?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="mem-body-sm mem-muted">Outro tipo de pessoa</dt>
                  <dd className="mem-body">{q?.outro_tipo?.trim() || "—"}</dd>
                </div>
                {q?.motivo_sem_hipotese && (
                  <div>
                    <dt className="mem-body-sm mem-muted">Sem hipótese porque</dt>
                    <dd className="mem-body">{q.motivo_sem_hipotese}</dd>
                  </div>
                )}
              </dl>
              {pubs.length > 0 && (
                <ul className="ws-chips">
                  {pubs.map((p) => (
                    <li key={p.descricao} className="ws-chip">
                      {p.descricao} <span className="mem-muted">· {ROTULO_ORIGEM[p.origem]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </Etapa>

      <Etapa
        n={2}
        passo={passos[1]}
        aberta={!registrada}
        porque="Cada hipótese é uma frase de cinco partes, ligada a um ativo, com o quanto ela já viu aquilo de perto. Embaixo de cada uma, o que vale levar para a Call 3."
      >
        {lista.length === 0 && <p className="mem-body mem-muted">Ela ainda não montou nenhuma hipótese.</p>}
        {lista.map((h, i) => (
          <CartaoHipoteseMentora key={h.id} dados={dados} registro={h} n={i + 1} />
        ))}
      </Etapa>

      <Etapa
        n={3}
        passo={passos[2]}
        aberta={!registrada}
        porque="Na véspera, leia as hipóteses e anote o que vai confrontar. A sua nota alimenta o guia da Call 3."
      >
        <div className="ws-bloco">
          <p className="mem-label mem-muted">A ideia com que ela chegou (M1) · ela não vê esta ligação</p>
          <p className="mem-body">{ideia}</p>
        </div>
        <NotaPrivada mentoriaId={mentoriaId} movimento={3} campos={NOTA_M3} aberta titulo="Nota privada · M3 · só você vê" />
      </Etapa>

      {registrada && decisao ? (
        <Etapa n={4} passo={passos[3]} aberta={false} porque="A decisão foi registrada na call. O M4 abriu.">
          <ResumoDecisaoM3 dados={dados} decisao={decisao} />
        </Etapa>
      ) : (
        <RegistrarDecisaoM3 dados={dados} passo={passos[3]} recarregar={recarregar} />
      )}

      <Etapa
        n={5}
        passo={passos[4]}
        porque="Uma leitura só para a Call 3 inteira: o que foi a campo e por quê, e como ela vai procurar as pessoas."
      >
        {leituraC3 ? (
          <LeituraKaren registro={leituraC3} />
        ) : registrada ? (
          <PublicarLeitura
            mentoriaId={mentoriaId}
            movimento={3}
            tipo="call_3"
            rotuloCampo="Leitura da Call 3"
            ajuda="Resuma as duas metades: o que vai a campo (e o que ficou guardado, com a razão) e o que vocês combinaram para as conversas. A decisão é dela; o porquê dela já aparece junto."
            exemplo="Você levou três hipóteses a campo: gestores promovidos, sócias que não decidem juntas e gerentes de clínica. A de líderes de startup ficou guardada até você encontrar acesso a esse público. Nesta semana, comece pelas pessoas que você já ajudou."
            rotuloBotao="Publicar leitura"
            aviso={null}
            bloqueio={null}
            aoPublicar={recarregar}
          />
        ) : (
          <p className="mem-body mem-muted">Abre depois que a decisão for registrada.</p>
        )}
      </Etapa>
    </section>
  );
}

// O que vale levar para a Call 3, a partir do que ela escreveu (só a mentora vê).
function pautaHipotese(dados: DadosJornada, r: Registro): string[] {
  const h = dadosHipotese(r);
  const pts: string[] = [];
  const faltam = [
    !h.publico?.trim() && "público",
    !h.problema?.trim() && "problema",
    !h.contexto?.trim() && "contexto",
    !h.transformacao?.trim() && "transformação",
    !h.lastro && "lastro",
  ].filter(Boolean);
  if (faltam.length) pts.push(`Falta: ${faltam.join(", ")}.`);
  if (h.lastro === "imagino") pts.push("Imaginada: pode ir, sabendo que ela vai precisar encontrar pessoas que nunca viu.");
  const ativo = ativosEscolhidos(dados).find((a) => a.id === h.ativo);
  if (ativo?.rotulo === "ativo_a_confirmar") pts.push("Nasce de um ativo a confirmar: mais atenção ao lastro.");
  if (disputaPublico(dados, r) > 0) pts.push("Mesmo público de outra hipótese: padrão mais forte ou só repetição?");
  const pub = publicos(dados).find((p) => p.descricao.trim().toLowerCase() === (h.publico ?? "").trim().toLowerCase());
  if (pub && pub.origem !== "m2") pts.push("Público novo: ele tem mesmo o problema observado no M2?");
  pts.push("Leia em voz alta: “isso serve para quem mais?”");
  return pts;
}

function CartaoHipoteseMentora({ dados, registro, n }: { dados: DadosJornada; registro: Registro; n: number }) {
  const h = dadosHipotese(registro);
  const ativo = ativosEscolhidos(dados).find((a) => a.id === h.ativo);
  const lastro = LASTRO.find((l) => l.valor === h.lastro);
  const status = (registro.conteudo_mentora as { status?: string }).status;
  return (
    <article className="mem-card ws-padrao">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">Hipótese {n}</span>
        {status === "vai_a_campo" && <span className="mem-tag mem-tag--decisao">Vai a campo</span>}
        {status === "guardada" && <span className="mem-tag mem-tag--relato">Guardada</span>}
        {!status &&
          (hipoteseCompleta(h) ? <span className="mem-tag mem-tag--evidencia">Completa</span> : <span className="mem-tag mem-tag--pendencia">Pela metade</span>)}
        {lastro && <span className="mem-tag mem-tag--relato">{lastro.rotulo}</span>}
        {(registro.versao_atual ?? 1) > 1 && <span className="mem-label mem-muted">reformulada</span>}
      </div>
      <p className="mem-body-lg ws-serif ws-frase">{fraseTexto(dados, h)}</p>
      <p className="mem-body-sm mem-muted">
        Ativo: {ativo?.nome ?? "—"}
        {ativo ? ` · ${ROTULOS[ativo.rotulo].toLowerCase()}` : ""}
      </p>
      {!status && (
        <div className="ws-pauta">
          <p className="mem-label">Para levar à Call 3</p>
          <ul className="ws-lista-simples mem-body-sm">
            {pautaHipotese(dados, registro).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------
type Linha = { vai?: boolean; razao: string; condicao: string };

const VAI = [
  { valor: "sim", rotulo: "Vai a campo", detalhe: "ela vai conversar com pessoas desse público" },
  { valor: "nao", rotulo: "Fica guardada", detalhe: "continua visível e pode voltar" },
] as const;

function RegistrarDecisaoM3({ dados, passo, recarregar }: { dados: DadosJornada; passo: Passo; recarregar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const c3 = call(dados, 3);
  const lista = hipoteses(dados);
  const existente = decisaoM3(dados);
  const salvo = (existente?.conteudo_mentora ?? {}) as DecisaoM3;
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(
      lista.map((h) => {
        const g = salvo.guardadas?.find((x) => x.hipotese === h.id);
        return [h.id, { vai: salvo.vao?.includes(h.id) ? true : g ? false : undefined, razao: g?.razao ?? "", condicao: g?.condicao_volta ?? "" }];
      }),
    ),
  );
  const [porque, setPorque] = useState(salvo.porque ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const vao = lista.filter((h) => linhas[h.id]?.vai === true);
  const semDecisao = lista.filter((h) => linhas[h.id]?.vai === undefined);
  const semRazao = lista.filter((h) => linhas[h.id]?.vai === false && !linhas[h.id].razao.trim());
  const incompletasQueVao = vao.filter((h) => !hipoteseCompleta(dadosHipotese(h)));
  const faltando = [
    semDecisao.length > 0 && `decidir ${semDecisao.length === 1 ? "1 hipótese" : `${semDecisao.length} hipóteses`}`,
    semDecisao.length === 0 && vao.length === 0 && "pelo menos uma hipótese precisa ir a campo",
    semRazao.length > 0 && "escrever a razão de cada hipótese guardada",
    incompletasQueVao.length > 0 && "completar as hipóteses que vão a campo (ela completa na tela dela)",
    !porque.trim() && "registrar o porquê nas palavras dela",
  ].filter(Boolean) as string[];

  async function marcarRealizada() {
    if (!supabase || !c3) return;
    await supabase.from("encontro").update({ estado: "realizado", data_realizada: new Date().toISOString() }).eq("id", c3.id);
    await recarregar();
  }

  async function registrar() {
    if (!supabase || !pessoa) return;
    setErro(null);
    setSalvando(true);
    const conteudo_mentora: DecisaoM3 = {
      vao: vao.map((h) => h.id),
      guardadas: lista
        .filter((h) => linhas[h.id]?.vai === false)
        .map((h) => ({ hipotese: h.id, razao: linhas[h.id].razao.trim(), condicao_volta: linhas[h.id].condicao.trim() })),
      porque: porque.trim(),
    };
    const d = existente
      ? await supabase.from("registro").update({ conteudo_mentora }).eq("id", existente.id).select("id").single()
      : await supabase
          .from("registro")
          .insert({
            conta_id: dados.jornada.conta_id,
            jornada_id: dados.jornada.id,
            movimento_codigo: 3,
            tipo: "decisao_m3",
            conteudo_mentora,
            autora_papel: "mentora",
            autora_id: pessoa.id,
            pendente_publicacao: true,
          })
          .select("id")
          .single();
    if (d.error || !d.data) {
      setSalvando(false);
      return setErro("Não foi possível gravar a decisão.");
    }
    const r = await supabase.rpc("registrar_decisao_m3", { p_decisao: d.data.id });
    setSalvando(false);
    if (r.error) return setErro(r.error.message);
    await recarregar();
  }

  return (
    <Etapa
      n={4}
      passo={passo}
      porque="Na primeira metade da Call 3, vocês decidem quais hipóteses vão a campo. Entre as coerentes, a escolha é dela; uma hipótese incoerente não vai só porque ela quer. Ao registrar, o M4 abre na hora e vocês seguem para a segunda metade."
    >
      <p className="mem-body-lg">
        {c3 ? dataHora(c3.data_atual) : "—"} · {c3?.estado === "realizado" ? "realizada" : "marcada"}
      </p>
      <div className="ws-acoes">
        <Link className="mem-btn mem-btn--primary" to={`/mentoradas/${dados.jornada.id}/call/3`}>
          Abrir guia da Call 3
        </Link>
        {c3 && c3.estado !== "realizado" && (
          <button type="button" className="mem-btn mem-btn--secondary" onClick={marcarRealizada}>
            Marcar Call 3 como realizada
          </button>
        )}
      </div>

      {lista.map((h, i) => {
        const l = linhas[h.id] ?? { razao: "", condicao: "" };
        const set = (n: Partial<Linha>) => setLinhas({ ...linhas, [h.id]: { ...l, ...n } });
        let k = 0;
        return (
          <article key={h.id} className="mem-card ws-padrao">
            <span className="mem-label mem-muted">Hipótese {i + 1}</span>
            <p className="mem-body ws-serif ws-frase">{fraseTexto(dados, dadosHipotese(h) as Hipotese)}</p>
            <Pergunta n={++k} feita={l.vai !== undefined} titulo="Vai a campo?">
              <Opcoes
                rotulo="Vai a campo"
                opcoes={VAI}
                valor={l.vai === undefined ? undefined : l.vai ? "sim" : "nao"}
                aoEscolher={(v) => set({ vai: v === "sim" })}
              />
            </Pergunta>
            {l.vai === false && (
              <>
                <Pergunta n={++k} feita={!!l.razao.trim()} titulo="Por que fica guardada?">
                  <input className="mem-input" aria-label="Por que fica guardada" value={l.razao} onChange={(e) => set({ razao: e.target.value })} />
                  <Colinha serve="Em uma frase, com as palavras dela. Ela lê junto da hipótese." exemplo="Não conheço ninguém desse público." />
                </Pergunta>
                <Pergunta n={++k} feita={!!l.condicao.trim()} titulo="Em que condição pode voltar? (opcional)">
                  <input className="mem-input" aria-label="Pode voltar se" value={l.condicao} onChange={(e) => set({ condicao: e.target.value })} />
                  <Colinha serve="O que precisaria acontecer para valer testar." exemplo="Se eu encontrar acesso a esse público." />
                </Pergunta>
              </>
            )}
          </article>
        );
      })}

      {lista.length > 0 && (
        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">Para fechar a decisão</span>
          <Pergunta n={1} feita={!!porque.trim()} titulo="Em uma frase: por que essas? (nas palavras dela)">
            <input className="mem-input" aria-label="O porquê, nas palavras dela" value={porque} onChange={(e) => setPorque(e.target.value)} />
            <Colinha
              serve="Pergunte na call e anote literal, sem melhorar. Ela vê junto da decisão e pode ajustar depois."
              exemplo="São as que eu consigo encontrar gente para conversar já nesta semana."
            />
          </Pergunta>
          {vao.length > 5 && <p className="mem-body-sm">{vao.length} vão a campo. O método fala em 3 a 5: confirme com ela.</p>}
        </article>
      )}

      {faltando.length > 0 && (
        <Aviso variante="warn" titulo="Para registrar, falta">
          {faltando.join("; ")}.
        </Aviso>
      )}
      {erro && (
        <Aviso variante="danger" titulo="Decisão não registrada">
          {erro}
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={faltando.length > 0 || salvando} onClick={registrar}>
          {salvando ? "Registrando" : "Registrar decisão e abrir o M4"}
        </button>
      </div>
    </Etapa>
  );
}

function ResumoDecisaoM3({ dados, decisao }: { dados: DadosJornada; decisao: Registro }) {
  const c = decisao.conteudo_mentora as DecisaoM3;
  const porque = (decisao.conteudo as { porque?: string }).porque ?? c.porque;
  const frase = (id: string) => {
    const h = hipoteses(dados).find((x) => x.id === id);
    return h ? fraseTexto(dados, dadosHipotese(h)) : "Hipótese";
  };
  return (
    <>
      <ul className="ws-lista-simples mem-body">
        {(c.vao ?? []).map((id) => (
          <li key={id}>
            Vai a campo: <strong>{frase(id)}</strong>
          </li>
        ))}
        {(c.guardadas ?? []).map((g) => (
          <li key={g.hipotese} className="mem-muted">
            Guardada: {frase(g.hipotese)}
            {g.razao ? ` — ${g.razao}` : ""}
            {g.condicao_volta ? ` · volta se ${g.condicao_volta}` : ""}
          </li>
        ))}
      </ul>
      {porque && <p className="mem-body ws-serif">O porquê dela: “{porque}”</p>}
    </>
  );
}
