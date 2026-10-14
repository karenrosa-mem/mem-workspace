import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, type DadosJornada } from "../../lib/jornada";
import { dataCurta, dataHora } from "../../lib/datas";
import { ROTULOS } from "../../lib/m2";
import { ativosEscolhidos, dadosHipotese, fraseTexto, hipoteses } from "../../lib/m3";
import { fraseOriginal, valorItem } from "../../lib/m6";
import { dadosOferta, reais } from "../../lib/m7";
import { dadosPreparo } from "../../lib/m8";
import { VARIAVEIS, fatosVariavel, rotuloLeitura } from "../../lib/m9";
import {
  CAPACIDADES,
  DECISOES_10,
  ESTATUTOS,
  MUDA,
  RETORNOS,
  competenciasAConfirmar,
  dadosM10,
  decisaoFeita,
  decisaoM10De,
  faltaEnvioM10,
  leituraGate7,
  mentoraM10,
  planoFeito,
  quatroFeitas,
  reservaM5,
  rotuloDecisao,
  fimDoAcesso,
  mudasDe,
  alternarMuda,
  rotuloMudas,
  rotuloEstatuto,
  rotuloStatusJornada,
  type DecisaoM10,
} from "../../lib/m10";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import { Resultado } from "./M9";

// M10 · Aprender e Decidir — tela da mentorada.
export default function M10() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;
  const aberto = dados.movimentos.find((m) => m.codigo === 10)?.estado !== "nao_iniciado";
  const m = mentoraM10(dados);
  const c10 = call(dados, 10);
  const travado = decisaoM10De(dados)?.estado_edicao === "fechado";

  return (
    <>
      <span className="mem-label mem-muted">Movimento 10 · Aprender e Decidir</span>
      <h1 className="mem-h1">{m.gate_em ? "A sua jornada" : "O que o teste mostrou, e o que você decide agora?"}</h1>
      {!aberto ? (
        <p className="mem-body mem-muted">Abre depois da leitura do teste, na Call 9.</p>
      ) : m.gate_em ? (
        <RelatorioFinal dados={dados} />
      ) : (
        <>
          <section className="ws-bloco ws-como">
            <p className="mem-body-lg ws-measure">
              Você não precisa ter certeza para decidir. Precisa saber o que os fatos sustentam, o que ainda é hipótese e qual decisão é proporcional ao que
              descobriu.
            </p>
            <ol className="ws-como__passos">
              <li className="mem-body">Quatro perguntas: o que aconteceu, o que isso sugere, o que você aprendeu e o que você decide.</li>
              <li className="mem-body">O plano do que você vai fazer depois, sozinha.</li>
              <li className="mem-body">
                Na Call 10{c10 ? ` (${dataHora(c10.data_atual)})` : ""}, você conta o caminho sem olhar, apresenta a decisão e fecha a jornada.
              </li>
            </ol>
            <p className="mem-body-sm mem-muted">~45 a 60 minutos. Continuar, ajustar, investigar, voltar um passo ou arquivar: todas são decisões legítimas.</p>
          </section>

          <details className="ws-bloco">
            <summary className="mem-label mem-muted">O que o teste registrou · para consultar enquanto responde</summary>
            <Resultado dados={dados} />
            <ul className="ws-lista-simples mem-body-sm">
              {VARIAVEIS.map((v) => (
                <li key={v.chave}>
                  <strong>{v.rotulo}:</strong> {fatosVariavel(dados, v.chave).join(" · ")}
                </li>
              ))}
            </ul>
          </details>

          <Formulario dados={dados} travado={travado} aoSalvar={recarregar} />
          <div id="envio">
            <EnviarParaKaren dados={dados} movimento={10} numeroCall={10} falta={faltaEnvioM10(dados)} aoSalvar={recarregar} />
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function Formulario({ dados, travado, aoSalvar }: { dados: DadosJornada; travado: boolean; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const [x, setX] = useState<DecisaoM10>(() => {
    const s = JSON.parse(JSON.stringify(dadosM10(dados))) as DecisaoM10;
    if (!s.aprendi?.length) s.aprendi = [{ texto: "", muda: [] }];
    return s;
  });
  const [estado, setEstado] = useState("");
  const g7 = leituraGate7(dados);
  const reserva = reservaM5(dados);
  const comps = competenciasAConfirmar(dados);
  const set = (n: Partial<DecisaoM10>) => {
    setX({ ...x, ...n });
    setEstado("");
  };
  const aprendi = x.aprendi ?? [];

  async function salvar() {
    if (!supabase || !pessoa) return;
    setEstado("salvando");
    const conteudo = { ...x, aprendi: aprendi.filter((a) => a.texto.trim()).map((a) => ({ ...a, muda: mudasDe(a) })) };
    const atual = decisaoM10De(dados);
    const r = atual
      ? await supabase.from("registro").update({ conteudo }).eq("id", atual.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 10,
          tipo: "decisao_m10",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    setEstado(r.error ? "erro" : "salvo");
    if (!r.error) await aoSalvar();
  }

  let k = 0;
  return (
    <>
      <section className="ws-secao" id="perguntas">
        <h2 className="mem-h2">As quatro perguntas</h2>
        <article className="mem-card ws-padrao">
          <Pergunta n={++k} feita={!!x.aconteceu?.trim()} titulo="O que aconteceu?">
            <textarea className="mem-input" rows={3} aria-label="O que aconteceu" disabled={travado} value={x.aconteceu ?? ""} onChange={(e) => set({ aconteceu: e.target.value })} />
            <Colinha serve="Só os fatos, antes de explicar: quantas pessoas, onde pararam, quem comprou, que motivos apareceram, o que mudou durante o teste." exemplo="Nove pessoas receberam a proposta. Duas compraram, três pediram proposta e pararam no preço, quatro só responderam." />
          </Pergunta>
          <Pergunta n={++k} feita={!!x.sugere?.trim()} titulo="O que isso sugere?">
            <textarea className="mem-input" rows={3} aria-label="O que isso sugere" disabled={travado} value={x.sugere ?? ""} onChange={(e) => set({ sugere: e.target.value })} />
            <Colinha serve="O que se repetiu, onde as pessoas concordaram e discordaram, e se existe outra explicação possível. Escreva “os dados sugerem”, não “é isso”." exemplo="Os dados sugerem que o problema leva gente a considerar comprar. O preço apareceu em três pessoas, mas pode ser timing: era fim de ano." />
          </Pergunta>
          <Pergunta n={++k} feita={aprendi.some((a) => a.texto.trim() && mudasDe(a).length > 0)} titulo="O que você aprendeu?">
            <p className="mem-body-sm mem-muted">O que você sabe hoje que não sabia antes de colocar a oferta no mercado?</p>
            {aprendi.map((a, i) => (
              <div key={i} className="ws-form">
                <input
                  className="mem-input"
                  aria-label={`Aprendizado ${i + 1}`}
                  disabled={travado}
                  value={a.texto}
                  onChange={(e) => set({ aprendi: aprendi.map((y, j) => (j === i ? { ...y, texto: e.target.value } : y)) })}
                />
                <p className="mem-body-sm mem-muted">O que isso muda? Marque quantas partes precisar.</p>
                <Opcoes rotulo={`O que o aprendizado ${i + 1} muda`} opcoes={MUDA} marcados={mudasDe(a)} aoEscolher={(v) => !travado && set({ aprendi: aprendi.map((y, j) => (j === i ? { ...y, muda: alternarMuda(y, v) } : y)) })} />
              </div>
            ))}
            {!travado && aprendi.length < 3 && (
              <div>
                <button type="button" className="mem-btn mem-btn--quiet" onClick={() => set({ aprendi: [...aprendi, { texto: "", muda: [] }] })}>
                  Mais um
                </button>
              </div>
            )}
            <Colinha
              serve="Específico o bastante para mudar uma decisão. Marque tudo o que ele muda: um aprendizado pode mexer no preço e no caminho até pagar ao mesmo tempo."
              exemplo="Fraco: “preciso melhorar meu marketing”. Forte: “o problema é reconhecido, mas a apresentação não deixa claro o que a pessoa recebe no primeiro encontro”."
            />
          </Pergunta>
          <Pergunta n={++k} feita={decisaoFeita(x)} titulo="O que você decide?">
            <Opcoes rotulo="Decisão" opcoes={DECISOES_10} valor={x.decisao} aoEscolher={(v) => !travado && set({ decisao: v as DecisaoM10["decisao"] })} />
            {(x.decisao === "ajustar" || x.decisao === "retornar") && (
              <div className="ws-form">
                <p className="mem-body-sm">Volte só o necessário: o menor passo capaz de corrigir o que travou.</p>
                <Opcoes rotulo="Para onde voltar" opcoes={RETORNOS} valor={x.retorno?.para} aoEscolher={(v) => !travado && set({ retorno: { ...(x.retorno ?? {}), para: v } })} />
                {x.retorno?.para === "MAPA" && reserva && (
                  <p className="mem-body-sm ws-pauta">
                    A sua reserva era: {reserva.frase}. Ela entra se {reserva.condicao}. Isso aconteceu? Se não, voltar ao começo pede uma razão nova.
                  </p>
                )}
                <input className="mem-input" aria-label="O que muda" placeholder="O que exatamente muda" disabled={travado} value={x.retorno?.o_que ?? ""} onChange={(e) => set({ retorno: { ...(x.retorno ?? {}), o_que: e.target.value } })} />
              </div>
            )}
            {x.decisao === "investigar" && (
              <div className="ws-form">
                {(
                  [
                    ["pergunta", "A pergunta que falta responder"],
                    ["hipotese", "O que você acha que está acontecendo (opcional)"],
                    ["evidencia", "O que precisaria ver para responder"],
                    ["limite", "Até quando, ou quantas conversas, antes de decidir"],
                  ] as const
                ).map(([c, l]) => (
                  <input key={c} className="mem-input" aria-label={l} placeholder={l} disabled={travado} value={x.investigacao?.[c] ?? ""} onChange={(e) => set({ investigacao: { ...(x.investigacao ?? {}), [c]: e.target.value } })} />
                ))}
                <p className="mem-body-sm mem-muted">Investigar não é testar de novo: é buscar a evidência que falta, como conversar com quem chegou à proposta e parou.</p>
              </div>
            )}
            <input className="mem-input" aria-label="Por que essa e não as outras" placeholder="Por que essa decisão, e não as outras" disabled={travado} value={x.porque ?? ""} onChange={(e) => set({ porque: e.target.value })} />
            <input className="mem-input" aria-label="O que ainda não sei" placeholder="O que eu ainda não sei" disabled={travado} value={x.nao_sabe ?? ""} onChange={(e) => set({ nao_sabe: e.target.value })} />
            <input className="mem-input" aria-label="O que me faria mudar de ideia" placeholder="O que me faria mudar de ideia" disabled={travado} value={x.revisao ?? ""} onChange={(e) => set({ revisao: e.target.value })} />
            <Colinha
              serve="Se falta mais da mesma evidência, é continuar. Se falta entender por quê, é investigar. Quanto maior a decisão, mais evidência ela pede."
              exemplo="Continuar: duas compras e três propostas pelo mesmo motivo. Ainda não sei se outros compram fora da minha rede. Mudo de ideia se nas próximas seis pessoas ninguém avançar."
            />
          </Pergunta>
          <Pergunta n={++k} feita={!!x.estatuto} titulo="E a sua hipótese, depois do teste?">
            <Opcoes
              rotulo="Estatuto da hipótese"
              opcoes={ESTATUTOS.filter((e) => e.valor !== "validada" || g7 === "favoravel")}
              valor={x.estatuto}
              aoEscolher={(v) => !travado && set({ estatuto: v as DecisaoM10["estatuto"] })}
            />
            {g7 !== "favoravel" && <p className="mem-body-sm mem-muted">“Validada” só é possível quando a leitura do teste foi favorável. A sua foi: {rotuloLeitura(g7).toLowerCase()}.</p>}
            <Colinha serve="A decisão e o estado da hipótese são coisas diferentes: dá para continuar com uma hipótese fortalecida, não validada. Se você marcar “validada”, a Karen confere os critérios." />
          </Pergunta>
        </article>
      </section>

      <section className="ws-secao" id="historico">
        <h2 className="mem-h2">Como a sua hipótese mudou</h2>
        <article className="mem-card ws-padrao">
          {(
            [
              ["acreditava", "O que eu acreditava"],
              ["aconteceu", "O que aconteceu"],
              ["acredita", "O que eu acredito agora"],
            ] as const
          ).map(([c, l], i) => (
            <Pergunta key={c} n={i + 1} feita={!!x.historico?.[c]?.trim()} titulo={l}>
              <input className="mem-input" aria-label={l} disabled={travado} value={x.historico?.[c] ?? ""} onChange={(e) => set({ historico: { ...(x.historico ?? {}), [c]: e.target.value } })} />
            </Pergunta>
          ))}
          <Colinha exemplo="Acreditava que o RH pagaria. No teste, quem pagou foi o próprio gestor. Agora acredito que o gestor paga do próprio bolso, quando o problema aperta." serve="A hipótese anterior não é apagada: é o que mostra como o seu raciocínio evoluiu." />
        </article>
      </section>

      {comps.length > 0 && (
        <section className="ws-secao" id="ativo">
          <h2 className="mem-h2">O que ainda está a confirmar</h2>
          <article className="mem-card ws-padrao">
            <p className="mem-body">Na sua oferta, ainda está a confirmar: {comps.join("; ")}.</p>
            <Pergunta n={1} feita={!!x.ativo?.criterio?.trim()} titulo="O que mostraria que você sabe fazer isso?">
              <textarea className="mem-input" rows={2} aria-label="Critério de confirmação" disabled={travado} value={x.ativo?.criterio ?? ""} onChange={(e) => set({ ativo: { ...(x.ativo ?? {}), criterio: e.target.value } })} />
              <Colinha
                serve="Algo que dá para ver na entrega, não na venda: uma compra não confirma que você sabe fazer. Nem elogio. Fica fixado antes de observar."
                exemplo="Depois de uma revisão comigo, o gestor identifica sozinho o que mudar na conversa seguinte, e ela acontece com essa mudança, em mais de um cliente."
              />
            </Pergunta>
          </article>
        </section>
      )}

      <section className="ws-secao" id="plano">
        <h2 className="mem-h2">Depois da jornada</h2>
        <article className="mem-card ws-padrao">
          {(
            [
              ["acao", "A próxima ação", "O primeiro passo concreto que a decisão pede."],
              ["pergunta", "A próxima pergunta", "A incerteza principal que você vai tentar responder."],
              ["evidencia", "O que precisaria acontecer para responder", ""],
            ] as const
          ).map(([c, l, s], i) => (
            <Pergunta key={c} n={i + 1} feita={!!x.plano?.[c]?.trim()} titulo={l}>
              <input className="mem-input" aria-label={l} disabled={travado} value={x.plano?.[c] ?? ""} onChange={(e) => set({ plano: { ...(x.plano ?? {}), [c]: e.target.value } })} />
              {s && <Colinha serve={s} />}
            </Pergunta>
          ))}
          <Pergunta n={4} feita={!!x.plano?.revisitar} titulo="Quando você relê este plano">
            <input className="mem-input" type="date" aria-label="Quando revisitar" disabled={travado} value={x.plano?.revisitar ?? ""} onChange={(e) => set({ plano: { ...(x.plano ?? {}), revisitar: e.target.value } })} />
            <Colinha serve="Uma data em que você mesma relê o plano e o registro." />
          </Pergunta>
          <Pergunta n={5} feita={!!x.reflexao?.trim()} titulo="O que você aprendeu sobre como decidir, e o que faria diferente se começasse de novo? (opcional)">
            <textarea className="mem-input" rows={3} aria-label="Reflexão" disabled={travado} value={x.reflexao ?? ""} onChange={(e) => set({ reflexao: e.target.value })} />
            <Colinha serve="Poucas linhas. Não tem resposta certa e não conta para o fechamento." />
          </Pergunta>
        </article>
      </section>

      {!travado && (
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--primary" onClick={salvar} disabled={estado === "salvando"}>
            {estado === "salvando" ? "Salvando" : estado === "salvo" ? "Salvo" : "Guardar"}
          </button>
          {quatroFeitas(x) && decisaoFeita(x) && planoFeito(x) && <span className="mem-body-sm mem-muted">Tudo respondido. Envie para a Karen quando quiser.</span>}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// Relatório final: montado a partir dos registros; ninguém escreve do zero.
// "final": dentro da jornada completa (sem o botão e sem o caminho, que vem movimento a movimento).
export function RelatorioFinal({ dados, paraMentora = false, final = false }: { dados: DadosJornada; paraMentora?: boolean; final?: boolean }) {
  const x = dadosM10(dados);
  const m = mentoraM10(dados);
  const o = dadosOferta(dados);
  const p = dadosPreparo(dados);
  const ativos = ativosEscolhidos(dados);
  const hips = hipoteses(dados);
  const caps = m.capacidades ?? {};
  const naoDem = CAPACIDADES.filter((c) => caps[c.chave]?.demonstrada === false);
  return (
    <section className="ws-relatorio">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">Relatório final da jornada</span>
        <span className="mem-tag mem-tag--decisao">{rotuloStatusJornada(m.status_jornada)}</span>
      </div>
      {naoDem.length > 0 && (
        <p className="mem-body-sm mem-muted">Ainda não demonstrado nesta call: {naoDem.map((c) => c.titulo.toLowerCase()).join("; ")}.</p>
      )}
      {!final && (
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--primary" to={paraMentora ? `/mentoradas/${dados.jornada.id}/jornada-completa` : "/jornada/completa"}>
            {paraMentora ? "Ver a jornada completa que ela recebe" : "Baixar a jornada completa em PDF"}
          </Link>
          <span className="mem-body-sm mem-muted">
            {paraMentora
              ? `O acesso dela fecha em ${fimDoAcesso(dados) ? dataCurta(fimDoAcesso(dados)!) : "—"}. Lembre de dizer isso na Call 10.`
              : `Este relatório e, movimento a movimento, tudo o que você construiu e as leituras da Karen. Baixe até ${fimDoAcesso(dados) ? dataCurta(fimDoAcesso(dados)!) : "—"}: depois disso o seu acesso ao Workspace fecha.`}
          </span>
        </div>
      )}

      {!final && <><h2 className="mem-h2">O caminho</h2>
      <dl className="ws-resumo">
        <div>
          <dt className="mem-body-sm mem-muted">O que você sabe fazer que resolve o problema de alguém</dt>
          <dd className="mem-body">{ativos.map((a) => `${a.nome} (${ROTULOS[a.rotulo].toLowerCase()})`).join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">As hipóteses</dt>
          <dd className="mem-body">
            <ul className="ws-lista-simples">
              {hips.map((h) => {
                const st = (h.conteudo_mentora as { status?: string }).status;
                return (
                  <li key={h.id}>
                    {fraseTexto(dados, dadosHipotese(h))} {st === "guardada" && <span className="mem-muted">· ficou guardada</span>}
                  </li>
                );
              })}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">Onde você apostou</dt>
          <dd className="mem-body">{fraseOriginal(dados) || "—"}</dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">A oportunidade</dt>
          <dd className="mem-body">
            {valorItem(dados, "beneficiario")} · {valorItem(dados, "problema")} · {valorItem(dados, "destino")}
          </dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">A oferta</dt>
          <dd className="mem-body">
            {o.entrega?.texto} · {o.forma?.texto} · {reais(o.preco?.valor)}
          </dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">A promessa</dt>
          <dd className="mem-body">{p.promessa?.texto ?? "—"}</dd>
        </div>
      </dl>

      <h2 className="mem-h2">O que o teste mostrou</h2>
      <Resultado dados={dados} paraMentora={paraMentora} final />
      </>}

      <h2 className="mem-h2">A decisão</h2>
      <dl className="ws-resumo">
        <div>
          <dt className="mem-body-sm mem-muted">Decisão</dt>
          <dd className="mem-body">
            <strong>{rotuloDecisao(x.decisao)}</strong> · {x.porque}
          </dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">A hipótese comercial</dt>
          <dd className="mem-body">
            {m.estatuto_registrado === "validada" ? <span className="mem-tag mem-tag--validado">{rotuloEstatuto("validada")}</span> : rotuloEstatuto(m.estatuto_registrado ?? x.estatuto)}
            {m.discordancia_estatuto && <span className="mem-muted"> · {m.discordancia_estatuto}</span>}
          </dd>
        </div>
        {x.retorno?.o_que && (
          <div>
            <dt className="mem-body-sm mem-muted">O que muda</dt>
            <dd className="mem-body">
              {RETORNOS.find((r) => r.valor === x.retorno?.para)?.rotulo} · {x.retorno.o_que}
            </dd>
          </div>
        )}
        {x.investigacao?.pergunta && (
          <div>
            <dt className="mem-body-sm mem-muted">A investigação</dt>
            <dd className="mem-body">
              {x.investigacao.pergunta} · {x.investigacao.evidencia} · até {x.investigacao.limite}
            </dd>
          </div>
        )}
        <div>
          <dt className="mem-body-sm mem-muted">O que ainda não se sabe</dt>
          <dd className="mem-body">{x.nao_sabe}</dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">O que faria rever a decisão</dt>
          <dd className="mem-body">{x.revisao}</dd>
        </div>
        {(x.aprendi ?? []).length > 0 && (
          <div>
            <dt className="mem-body-sm mem-muted">Aprendizados</dt>
            <dd className="mem-body">
              <ul className="ws-lista-simples">
                {(x.aprendi ?? []).map((a) => (
                  <li key={a.texto}>
                    {a.texto} <span className="mem-muted">· muda: {rotuloMudas(a)}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {x.historico?.acreditava && (
          <div>
            <dt className="mem-body-sm mem-muted">Como a hipótese mudou</dt>
            <dd className="mem-body">
              Acreditava: {x.historico.acreditava} → aconteceu: {x.historico.aconteceu} → acredito agora: {x.historico.acredita}
            </dd>
          </div>
        )}
        {x.ativo?.criterio && (
          <div>
            <dt className="mem-body-sm mem-muted">O que ainda está a confirmar</dt>
            <dd className="mem-body">
              {m.ativo?.status === "confirmado" ? "Confirmado" : m.ativo?.status === "nao_confirmado" ? "Não confirmado" : "Ainda a confirmar"} · critério:{" "}
              {x.ativo.criterio}
              {m.ativo?.criterio_em && <span className="mem-muted"> (fixado em {dataCurta(m.ativo.criterio_em)})</span>}
            </dd>
          </div>
        )}
      </dl>

      <h2 className="mem-h2">Depois da jornada</h2>
      <dl className="ws-resumo">
        <div>
          <dt className="mem-body-sm mem-muted">Próxima ação</dt>
          <dd className="mem-body">{x.plano?.acao}</dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">Próxima pergunta</dt>
          <dd className="mem-body">
            {x.plano?.pergunta}
            {x.plano?.evidencia && <span className="mem-muted"> · para responder: {x.plano.evidencia}</span>}
          </dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">Reler este plano em</dt>
          <dd className="mem-body">{x.plano?.revisitar ? dataCurta(x.plano.revisitar) : "—"}</dd>
        </div>
        {naoDem.length > 0 && (
          <div>
            <dt className="mem-body-sm mem-muted">Para exercitar na próxima decisão</dt>
            <dd className="mem-body">{naoDem.map((c) => `${c.titulo}${caps[c.chave]?.faltou ? `: ${caps[c.chave]?.faltou}` : ""}`).join(" · ")}</dd>
          </div>
        )}
      </dl>

      {x.reflexao?.trim() && (
        <>
          <h2 className="mem-h2">O que eu aprendi sobre como decidir</h2>
          <p className="mem-body ws-serif">“{x.reflexao}”</p>
        </>
      )}

      {m.leitura_final?.trim() && (
        <section className="mem-mentor ws-measure">
          <span className="mem-label mem-muted">Leitura final da Karen</span>
          <p className="mem-mentor__text">{m.leitura_final}</p>
          <span className="mem-mentor__sig">— Karen, mentora</span>
        </section>
      )}
    </section>
  );
}
