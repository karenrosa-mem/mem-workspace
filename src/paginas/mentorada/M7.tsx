import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, type DadosJornada } from "../../lib/jornada";
import { dataCurta, dataHora } from "../../lib/datas";
import { listasIncertezas, mentoraOportunidade, valorItem } from "../../lib/m6";
import {
  TIPOS_OFERTA,
  rotuloTipoOferta,
  type TipoOferta,
  DECISOES,
  HIPOTESE_FIXA,
  TRANSVERSAL_M7,
  ativoAConfirmar,
  clientesSimultaneos,
  dadosOferta,
  decisaoFeita,
  etapas,
  faltaEnvioM7,
  lerPreco,
  limitesDaOferta,
  materialM7,
  mentoraOferta,
  ofertaDe,
  reais,
  type ChaveDecisao,
  type Oferta,
} from "../../lib/m7";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";

// M7 · Desenhar a Oferta — tela da mentorada.
export default function M7() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;
  const c6 = call(dados, 6);
  const assumida = !!mentoraOferta(dados).assumida_em;
  const travada = ofertaDe(dados)?.estado_edicao === "fechado";
  const aberto = dados.movimentos.find((m) => m.codigo === 7)?.estado !== "nao_iniciado";

  return (
    <>
      <span className="mem-label mem-muted">Movimento 7 · Desenhar a Oferta</span>
      <h1 className="mem-h1">O que você entrega, como, e por quanto?</h1>
      {!aberto ? (
        <p className="mem-body mem-muted">Abre depois que você assumir a sua oportunidade, na Call 5.</p>
      ) : (
        <>
          {assumida ? (
            <OfertaAssumida dados={dados} />
          ) : (
            <section className="ws-bloco ws-como">
              <p className="mem-body-lg ws-measure">
                Agora você transforma a sua oportunidade numa oferta que você consegue entregar. Começa pelo que a pessoa vai ter de diferente no final,
                e termina no preço.
              </p>
              <ol className="ws-como__passos">
                <li className="mem-body">Cinco decisões, nesta ordem. Cada uma se apoia na anterior, por isso a próxima só abre quando a atual está feita.</li>
                <li className="mem-body">Aqui não existe “não sei”: se estiver insegura, decida e trate como hipótese. O teste vai mostrar.</li>
                <li className="mem-body">
                  Na Call 6{c6 ? ` (${dataHora(c6.data_atual)})` : ""}, você explica como a oferta funciona, com as suas palavras, e assume.
                </li>
              </ol>
              <p className="mem-body-sm mem-muted">~45 a 60 minutos, pode ser em mais de uma vez. Nada de promessa, nome ou texto de venda: isso é do próximo movimento.</p>
            </section>
          )}

          <SuaOportunidade dados={dados} />

          {!assumida && (
            <>
              <Decisoes dados={dados} travada={travada} aoSalvar={recarregar} />
              <Transversal dados={dados} travada={travada} aoSalvar={recarregar} />
              <div id="envio">
                <EnviarParaKaren dados={dados} movimento={7} numeroCall={6} falta={faltaEnvioM7(dados)} aoSalvar={recarregar} />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function SuaOportunidade({ dados }: { dados: DadosJornada }) {
  const lim = (mentoraOportunidade(dados).limites ?? []).filter((x) => x.trim());
  const { apostando } = listasIncertezas(dados);
  return (
    <details className="ws-bloco" open={!ofertaDe(dados)}>
      <summary className="mem-label mem-muted">A sua oportunidade (Movimento 6) · o teto da oferta</summary>
      <dl className="ws-resumo">
        <div>
          <dt className="mem-body-sm mem-muted">Para quem</dt>
          <dd className="mem-body">{valorItem(dados, "beneficiario") || "—"}</dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">Problema</dt>
          <dd className="mem-body">{valorItem(dados, "problema") || "—"}</dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">Mudança que alguém de fora perceberia</dt>
          <dd className="mem-body">{valorItem(dados, "destino") || "—"}</dd>
        </div>
        <div>
          <dt className="mem-body-sm mem-muted">Como você ajuda</dt>
          <dd className="mem-body">{valorItem(dados, "direcao") || "—"}</dd>
        </div>
        {lim.length > 0 && (
          <div>
            <dt className="mem-body-sm mem-muted">A oferta não poderá prometer</dt>
            <dd className="mem-body">{lim.join(" · ")}</dd>
          </div>
        )}
        {apostando.length > 0 && (
          <div>
            <dt className="mem-body-sm mem-muted">O que estamos apostando</dt>
            <dd className="mem-body">{apostando.join(" · ")}</dd>
          </div>
        )}
      </dl>
    </details>
  );
}

// ---------------------------------------------------------------------
function useSalvar(dados: DadosJornada, aoSalvar: () => Promise<void>) {
  const { pessoa } = useSessao();
  return async (mudar: (o: Oferta) => Oferta): Promise<boolean> => {
    if (!supabase || !pessoa) return false;
    const atual = ofertaDe(dados);
    const conteudo = mudar(dadosOferta(dados));
    const r = atual
      ? await supabase.from("registro").update({ conteudo }).eq("id", atual.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 7,
          tipo: "oferta",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    if (r.error) return false;
    await aoSalvar();
    return true;
  };
}

function Decisoes({ dados, travada, aoSalvar }: { dados: DadosJornada; travada: boolean; aoSalvar: () => Promise<void> }) {
  const [mudando, setMudando] = useState<ChaveDecisao | null>(null);
  const o = dadosOferta(dados);
  const atual = DECISOES.find((x) => !decisaoFeita(o, x.chave))?.chave;
  const aberto = mudando ?? atual;
  return (
    <>
      {DECISOES.map((dec) => {
        const feita = decisaoFeita(o, dec.chave);
        const abrir = !travada && aberto === dec.chave;
        return (
          <article key={dec.chave} className="mem-card ws-padrao" id={`decisao-${dec.n}`}>
            <span className="mem-label mem-muted">
              Decisão {dec.n} de 5 · {dec.titulo.toLowerCase()}
            </span>
            <h3 className="mem-h3">{dec.pergunta}</h3>
            {abrir ? (
              <div className="ws-m6-passo">
                <FormDecisao dados={dados} chave={dec.chave} aoSalvar={aoSalvar} aoFechar={() => setMudando(null)} />
                <aside className="ws-m6-material" aria-label="Ao lado">
                  {materialM7(dados, dec.chave).map((g) => (
                    <div key={g.titulo} className="ws-padrao__parte">
                      <p className="mem-label mem-muted">{g.titulo}</p>
                      <ul className="ws-lista-simples mem-body-sm">
                        {g.itens.map((x, j) => (
                          <li key={j}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </aside>
              </div>
            ) : feita ? (
              <div className="ws-sua-leitura">
                <Resumo dados={dados} chave={dec.chave} />
                {!travada && (
                  <div>
                    <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setMudando(dec.chave)}>
                      Mudar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mem-body-sm mem-muted">Abre depois da decisão anterior.</p>
            )}
          </article>
        );
      })}
    </>
  );
}

function Resumo({ dados, chave }: { dados: DadosJornada; chave: ChaveDecisao }) {
  const o = dadosOferta(dados);
  if (chave === "entrega")
    return (
      <p className="mem-body">
        <strong>{o.entrega?.texto}</strong> <span className="mem-muted">· cobre: {o.entrega?.cobre} · fica de fora: {o.entrega?.fora}</span>
      </p>
    );
  if (chave === "como")
    return (
      <>
        <ol className="ws-lista-simples mem-body">
          {etapas(o).map((e, i) => (
            <li key={i}>
              {e}
              {o.como?.competencia?.[String(i)]?.qual && <span className="mem-muted"> · apoiada em algo que você ainda vai confirmar</span>}
            </li>
          ))}
        </ol>
        <p className="mem-body">
          <span className="mem-muted">Diferencial:</span> {o.como?.diferencial}
        </p>
      </>
    );
  if (chave === "forma")
    return (
      <p className="mem-body">
        {o.forma?.texto && <span className="mem-tag mem-tag--decisao">{rotuloTipoOferta(o.forma?.tipo ?? "mentoria")}</span>} <strong>{o.forma?.texto}</strong> <span className="mem-muted">· inclui: {o.forma?.inclui} · não inclui: {o.forma?.exclui}</span>
      </p>
    );
  if (chave === "capacidade") {
    const c = clientesSimultaneos(o);
    return (
      <p className="mem-body">
        {o.capacidade?.horas_semana} h por semana · {o.capacidade?.horas_cliente} h por cliente → <strong>até {c} {c === 1 ? "cliente" : "clientes"} ao mesmo tempo</strong>
        <span className="mem-muted"> · antes da primeira venda: {o.capacidade?.pronto_antes}</span>
      </p>
    );
  }
  return (
    <p className="mem-body">
      <strong>{reais(o.preco?.valor)}</strong>, {o.preco?.condicao} <span className="mem-muted">· {o.preco?.racional}</span>
    </p>
  );
}

function FormDecisao({ dados, chave, aoSalvar, aoFechar }: { dados: DadosJornada; chave: ChaveDecisao; aoSalvar: () => Promise<void>; aoFechar: () => void }) {
  const [o, setO] = useState<Oferta>(() => JSON.parse(JSON.stringify(dadosOferta(dados))));
  const [precoTexto, setPrecoTexto] = useState(o.preco?.valor ? String(o.preco.valor).replace(".", ",") : "");
  const [erro, setErro] = useState(false);
  const salvar = useSalvar(dados, aoSalvar);
  const confirmar = ativoAConfirmar(dados);

  const preco = lerPreco(precoTexto);
  const faixa = !!precoTexto.trim() && preco === null;
  const pronto = chave === "preco" ? !!preco && !!o.preco?.condicao?.trim() && !!o.preco?.racional?.trim() : decisaoFeita(o, chave);

  async function guardar() {
    setErro(false);
    const novo = chave === "preco" ? { ...o, preco: { ...(o.preco ?? {}), valor: preco ?? undefined } } : o;
    const ok = await salvar(() => ({
      ...dadosOferta(dados),
      [chave]: novo[chave],
      ...(chave === "como" ? { como: { ...novo.como, etapas: etapas(novo) } } : {}),
    }));
    if (!ok) return setErro(true);
    aoFechar();
  }

  const lista = o.como?.etapas?.length ? o.como.etapas : ["", "", ""];
  const setEntrega = (n: Partial<NonNullable<Oferta["entrega"]>>) => setO({ ...o, entrega: { ...(o.entrega ?? {}), ...n } });
  const setComo = (n: Partial<NonNullable<Oferta["como"]>>) => setO({ ...o, como: { ...(o.como ?? {}), etapas: lista, ...n } });
  const setForma = (n: Partial<NonNullable<Oferta["forma"]>>) => setO({ ...o, forma: { ...(o.forma ?? {}), ...n } });
  const setCap = (n: Partial<NonNullable<Oferta["capacidade"]>>) => setO({ ...o, capacidade: { ...(o.capacidade ?? {}), ...n } });
  const setPreco = (n: Partial<NonNullable<Oferta["preco"]>>) => setO({ ...o, preco: { ...(o.preco ?? {}), ...n } });
  const num = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : undefined);
  const cs = clientesSimultaneos(o);

  return (
    <div className="ws-form">
      {chave === "entrega" && (
        <>
          <Pergunta n={1} feita={!!o.entrega?.texto?.trim()} titulo="O que a pessoa terá de diferente no final">
            <textarea className="mem-input" rows={2} aria-label="Entrega" value={o.entrega?.texto ?? ""} onChange={(e) => setEntrega({ texto: e.target.value })} />
            <Colinha
              serve="Uma ou duas linhas, algo que dá para ver. Precisa caber dentro da mudança do Movimento 6, que está ao lado: a oferta escolhe uma parte, nunca promete mais."
              exemplo="Ao final, o gestor terá conduzido sozinho as conversas de cobrança que estava adiando."
            />
          </Pergunta>
          <Pergunta n={2} feita={!!o.entrega?.cobre?.trim()} titulo="Que parte da mudança essa entrega cobre?">
            <input className="mem-input" aria-label="Que parte cobre" value={o.entrega?.cobre ?? ""} onChange={(e) => setEntrega({ cobre: e.target.value })} />
            <Colinha serve="Compare com a mudança ao lado." exemplo="A primeira metade: ele faz a cobrança sem adiar." />
          </Pergunta>
          <Pergunta n={3} feita={!!o.entrega?.fora?.trim()} titulo="E que parte fica de fora?">
            <input className="mem-input" aria-label="Que parte fica de fora" value={o.entrega?.fora ?? ""} onChange={(e) => setEntrega({ fora: e.target.value })} />
            <Colinha serve="O que esta oferta não vai produzir, e por quê. Saber o que fica de fora protege você de prometer demais." exemplo="O time cumprir sem escalar: depende de semanas de prática que esta oferta não acompanha." />
          </Pergunta>
        </>
      )}

      {chave === "como" && (
        <>
          <Pergunta n={1} feita={etapas(o).length >= 3} titulo="As etapas, de três a cinco, uma linha cada">
            {lista.map((e, i) => (
              <div key={i} className="ws-form">
                <input
                  className="mem-input"
                  aria-label={`Etapa ${i + 1}`}
                  placeholder={`Etapa ${i + 1}`}
                  value={e}
                  onChange={(ev) => setComo({ etapas: lista.map((x, j) => (j === i ? ev.target.value : x)) })}
                />
                {confirmar && e.trim() && (
                  <label className="ws-check mem-body-sm">
                    <input
                      type="checkbox"
                      checked={!!o.como?.competencia?.[String(i)]}
                      onChange={(ev) => {
                        const comp = { ...(o.como?.competencia ?? {}) };
                        if (ev.target.checked) comp[String(i)] = { qual: "", ja_fez: "" };
                        else delete comp[String(i)];
                        setComo({ competencia: comp });
                      }}
                    />{" "}
                    Esta etapa depende de algo que eu ainda não fiz de verdade
                  </label>
                )}
                {o.como?.competencia?.[String(i)] && (
                  <>
                    <input
                      className="mem-input"
                      aria-label={`Etapa ${i + 1}: o quê`}
                      placeholder="Do quê?"
                      value={o.como.competencia[String(i)].qual ?? ""}
                      onChange={(ev) => setComo({ competencia: { ...o.como!.competencia, [String(i)]: { ...o.como!.competencia![String(i)], qual: ev.target.value } } })}
                    />
                    <input
                      className="mem-input"
                      aria-label={`Etapa ${i + 1}: o que já fez de parecido`}
                      placeholder="O que você já fez de parecido?"
                      value={o.como.competencia[String(i)].ja_fez ?? ""}
                      onChange={(ev) => setComo({ competencia: { ...o.como!.competencia, [String(i)]: { ...o.como!.competencia![String(i)], ja_fez: ev.target.value } } })}
                    />
                  </>
                )}
              </div>
            ))}
            {lista.length < 5 && (
              <div>
                <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setComo({ etapas: [...lista, ""] })}>
                  Mais uma etapa
                </button>
              </div>
            )}
            <Colinha
              serve="Por onde a pessoa passa e o que você faz em cada momento. Cada etapa precisa servir à entrega: se não serve, sai. Use o que você já fez de verdade, que está ao lado."
              exemplo="1) mapear as conversas que ele está evitando; 2) preparar cada uma a partir do caso real; 3) ele conduz; 4) revisar o que aconteceu e ajustar a próxima."
            />
          </Pergunta>
          <Pergunta n={2} feita={!!o.como?.diferencial?.trim()} titulo="O que isso faz que o que a pessoa já tentou não fez?">
            <input className="mem-input" aria-label="Diferencial" value={o.como?.diferencial ?? ""} onChange={(e) => setComo({ diferencial: e.target.value })} />
            <Colinha
              serve="Uma linha, olhando o que as pessoas já tentaram (ao lado). Se ninguém contou o que tentou, escreva a partir de como você ajuda: fica como hipótese."
              exemplo="Trabalha sobre as conversas reais da semana dele, antes e depois. O livro e o RH não fazem isso."
            />
          </Pergunta>
        </>
      )}

      {chave === "forma" && (
        <>
          <Pergunta n={1} feita titulo="Que tipo de oferta é essa?">
            <Opcoes rotulo="Tipo de oferta" opcoes={TIPOS_OFERTA} valor={o.forma?.tipo ?? "mentoria"} aoEscolher={(v) => setForma({ tipo: v as TipoOferta })} />
            <Colinha
              serve="O seu primeiro produto é uma oferta de acompanhamento, vendida antes de existir. Mentoria é o caminho padrão. Se o que você sabe é fazer, e não ensinar, consultoria ou serviço podem servir melhor."
              exemplo="Mentoria: “eu te acompanho nas suas conversas difíceis até você conduzir sozinho”. Serviço: “eu monto a planilha de controle do seu time”."
            />
          </Pergunta>
          <Pergunta n={2} feita={!!o.forma?.texto?.trim()} titulo="Como acontece: formato, duração, frequência, suporte">
            <textarea className="mem-input" rows={2} aria-label="Forma" value={o.forma?.texto ?? ""} onChange={(e) => setForma({ texto: e.target.value })} />
            <Colinha serve="Com as suas palavras, sem escolher de uma lista. Uma ou duas linhas." exemplo="Acompanhamento individual, 6 semanas, um encontro semanal de 1 h + uma mensagem de preparação antes de cada conversa difícil." />
          </Pergunta>
          <Pergunta n={3} feita={!!o.forma?.porque?.trim()} titulo="Por que esse formato serve a essa entrega? (opcional)">
            <input className="mem-input" aria-label="Por que esse formato" value={o.forma?.porque ?? ""} onChange={(e) => setForma({ porque: e.target.value })} />
            <Colinha serve="Se a resposta for “porque todo mundo faz assim”, vale repensar." exemplo="Individual porque cada gestor tem conversas diferentes com o próprio time." />
          </Pergunta>
          <Pergunta n={4} feita={!!o.forma?.inclui?.trim()} titulo="O que está incluído">
            <input className="mem-input" aria-label="Inclui" value={o.forma?.inclui ?? ""} onChange={(e) => setForma({ inclui: e.target.value })} />
            <Colinha serve="Uma linha." exemplo="Conversas de cobrança e alinhamento com o próprio time." />
          </Pergunta>
          <Pergunta n={5} feita={!!o.forma?.exclui?.trim()} titulo="O que não está incluído">
            <input className="mem-input" aria-label="Não inclui" value={o.forma?.exclui ?? ""} onChange={(e) => setForma({ exclui: e.target.value })} />
            <Colinha serve="Obrigatório. É o que a pessoa poderia esperar e você não vai fazer." exemplo="Conflitos com pares ou com o chefe, desligamentos, treinamento do time." />
          </Pergunta>
          <p className="mem-body-sm ws-pauta">{HIPOTESE_FIXA}</p>
        </>
      )}

      {chave === "capacidade" && (
        <>
          <Pergunta n={1} feita={!!o.capacidade?.horas_semana} titulo="Quantas horas por semana você tem, de verdade, para isso?">
            <input className="mem-input" inputMode="decimal" aria-label="Horas por semana" value={o.capacidade?.horas_semana ?? ""} onChange={(e) => setCap({ horas_semana: num(e.target.value) })} />
            <Colinha serve="Com o emprego e a vida que você tem hoje, não com o tempo que gostaria de ter." exemplo="6 (noites de terça e quinta e o sábado de manhã)." />
          </Pergunta>
          <Pergunta n={2} feita={!!o.capacidade?.horas_cliente} titulo="Quantas horas cada cliente toma por semana?">
            <input className="mem-input" inputMode="decimal" aria-label="Horas por cliente" value={o.capacidade?.horas_cliente ?? ""} onChange={(e) => setCap({ horas_cliente: num(e.target.value) })} />
            <Colinha serve="Na forma que você escolheu: encontros, mensagens, preparação." exemplo="1,5 (1 h de encontro + meia hora de mensagens e preparação)." />
          </Pergunta>
          {cs !== null &&
            (cs >= 1 ? (
              <p className="mem-body ws-pauta">
                Você consegue atender <strong>até {cs} {cs === 1 ? "cliente" : "clientes"} ao mesmo tempo</strong>. Isso vira um limite da oferta.
              </p>
            ) : (
              <p className="mem-body ws-pauta">
                Do jeito que está, a oferta toma mais tempo do que você tem. Ajuste a forma, o tempo por cliente ou o que está incluído, ou leve isso para a
                call.
              </p>
            ))}
          <Pergunta n={3} feita={!!o.capacidade?.limites?.trim()} titulo="Algum limite de horário, ferramenta ou deslocamento? (opcional)">
            <input className="mem-input" aria-label="Limites operacionais" value={o.capacidade?.limites ?? ""} onChange={(e) => setCap({ limites: e.target.value })} />
          </Pergunta>
          <Pergunta n={4} feita={!!o.capacidade?.pronto_antes?.trim()} titulo="O que precisa estar pronto antes da primeira venda?">
            <input className="mem-input" aria-label="Pronto antes da primeira venda" value={o.capacidade?.pronto_antes ?? ""} onChange={(e) => setCap({ pronto_antes: e.target.value })} />
            <Colinha serve="Uma linha. Só o mínimo para atender o primeiro cliente." exemplo="Um roteiro-base de preparação e outro de revisão." />
          </Pergunta>
        </>
      )}

      {chave === "preco" && (
        <>
          <Pergunta n={1} feita={!!preco} titulo="Por quanto você começa?">
            <input className="mem-input" inputMode="decimal" aria-label="Preço" placeholder="R$" value={precoTexto} onChange={(e) => setPrecoTexto(e.target.value)} />
            {faixa && <p className="mem-body-sm">Escreva um valor só, não uma faixa.</p>}
            <Colinha serve="Um valor. Não precisa provar que o mercado aceita: precisa saber explicar por que começa nele." exemplo="1500" />
          </Pergunta>
          <Pergunta n={2} feita={!!o.preco?.condicao?.trim()} titulo="Como a pessoa paga?">
            <input className="mem-input" aria-label="Condição de pagamento" value={o.preco?.condicao ?? ""} onChange={(e) => setPreco({ condicao: e.target.value })} />
            <Colinha serve="À vista, parcelado ou equivalente. Descontos e bônus ficam para o próximo movimento." exemplo="Em até 3 vezes." />
          </Pergunta>
          <Pergunta n={3} feita={!!o.preco?.racional?.trim()} titulo="Por que começar nesse valor?">
            <input className="mem-input" aria-label="Racional do preço" value={o.preco?.racional ?? ""} onChange={(e) => setPreco({ racional: e.target.value })} />
            <Colinha
              serve="Uma ou duas linhas, apoiadas no tempo que cada cliente toma, em quem paga, no que você viu as pessoas pagarem ou no valor da entrega."
              exemplo="Seis semanas de acompanhamento individual; quem paga é o próprio gestor, então começo num valor que uma pessoa paga do próprio bolso."
            />
          </Pergunta>
          <p className="mem-body-sm ws-pauta">{HIPOTESE_FIXA}</p>
        </>
      )}

      {erro && <p className="mem-body-sm">Não foi possível guardar. Tente de novo.</p>}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!pronto} onClick={guardar}>
          Guardar e seguir
        </button>
      </div>
    </div>
  );
}

function Transversal({ dados, travada, aoSalvar }: { dados: DadosJornada; travada: boolean; aoSalvar: () => Promise<void> }) {
  const o = dadosOferta(dados);
  const [texto, setTexto] = useState(o.transversal ?? "");
  const [notas, setNotas] = useState(o.anotacoes_m8 ?? "");
  const [editando, setEditando] = useState(!o.transversal);
  const salvar = useSalvar(dados, aoSalvar);
  if (DECISOES.some((x) => !decisaoFeita(o, x.chave)) && !o.transversal) return null;
  return (
    <article className="mem-card ws-padrao" id="transversal">
      <span className="mem-label mem-muted">Última pergunta</span>
      <h3 className="mem-h3">Por que a sua oferta é assim, e não de outro jeito?</h3>
      {editando && !travada ? (
        <div className="ws-form">
          <textarea className="mem-input" rows={3} aria-label={TRANSVERSAL_M7} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <Colinha
            serve="Uma ou duas frases."
            exemplo="Porque é exatamente como eu ajudei meus colegas: em cima da conversa real, antes e depois. Não incluí o time porque eu não conseguiria acompanhar isso no tempo que tenho."
          />
          <Pergunta n={2} feita={!!notas.trim()} titulo="Apareceu alguma frase de promessa enquanto você montava? (opcional)">
            <input className="mem-input" aria-label="Anotações para o próximo movimento" value={notas} onChange={(e) => setNotas(e.target.value)} />
            <Colinha serve="Promessa não entra na oferta. Se surgiu uma frase boa, anote aqui: ela pode ser útil no próximo movimento, quando a oferta ganha palavras." exemplo="“Cobrar sem perder o time.”" />
          </Pergunta>
          <div className="ws-acoes">
            <button
              type="button"
              className="mem-btn mem-btn--primary"
              disabled={!texto.trim()}
              onClick={async () => {
                if (await salvar((x) => ({ ...x, transversal: texto.trim(), anotacoes_m8: notas.trim() }))) setEditando(false);
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="ws-sua-leitura">
          <p className="mem-body ws-serif">“{o.transversal}”</p>
          {!travada && (
            <div>
              <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setEditando(true)}>
                Mudar
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// Depois da Call 6: a oferta assumida.
export function OfertaAssumida({ dados, paraMentora = false }: { dados: DadosJornada; paraMentora?: boolean }) {
  const o = dadosOferta(dados);
  const m = mentoraOferta(dados);
  const cs = m.clientes_simultaneos ?? clientesSimultaneos(o);
  const lim = limitesDaOferta(dados);
  return (
    <section className="ws-bloco ws-aposta">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">{paraMentora ? "A oferta dela" : "A sua oferta"}</span>
        <span className="mem-tag mem-tag--decisao">Assumida</span>
      </div>
      <p className="mem-body-sm mem-muted">
        Assumida em {m.assumida_em ? dataCurta(m.assumida_em) : "—"} · não validada; aguarda a preparação para o mercado (Movimento 8) e o teste comercial
        (Movimento 9).
      </p>
      <dl className="ws-resumo">
        {DECISOES.map((dec) => (
          <div key={dec.chave}>
            <dt className="mem-body-sm mem-muted">
              {dec.titulo}
              {(dec.chave === "forma" || dec.chave === "preco") && <span className="mem-tag mem-tag--relato"> hipótese</span>}
            </dt>
            <dd>
              <Resumo dados={dados} chave={dec.chave} />
            </dd>
          </div>
        ))}
      </dl>
      {cs !== null && cs !== undefined && <p className="mem-body-sm">Limite: até {cs} {cs === 1 ? "cliente" : "clientes"} ao mesmo tempo.</p>}
      {lim.length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">A oferta não promete</p>
          <ul className="ws-lista-simples mem-body">{lim.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {(m.hipoteses ?? []).filter((x) => x.trim()).length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">O que o teste vai mostrar</p>
          <ul className="ws-lista-simples mem-body">{(m.hipoteses ?? []).filter((x) => x.trim()).map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {(m.recomendacoes ?? []).filter((r) => r.texto.trim()).length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Recomendações da Karen</p>
          <ul className="ws-lista-simples mem-body">
            {(m.recomendacoes ?? []).filter((r) => r.texto.trim()).map((r) => (
              <li key={r.texto}>
                {r.texto} <span className="mem-muted">· {r.concordou ? "você concordou" : "você decidiu diferente"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mem-body ws-serif">“{o.transversal}”</p>
    </section>
  );
}
