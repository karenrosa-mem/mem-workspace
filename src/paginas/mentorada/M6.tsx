import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, type DadosJornada } from "../../lib/jornada";
import { dataCurta, dataHora } from "../../lib/datas";
import {
  NIVEIS,
  PASSOS,
  TRANSVERSAL,
  aposta,
  ativoConfirmar,
  carregado,
  dadosOportunidade,
  estatuto,
  faltaEnvioM6,
  fontes,
  fraseOriginal,
  listasIncertezas,
  material,
  mentoraOportunidade,
  oportunidadeDe,
  passoFeito,
  valorItem,
  type ChaveItem,
  type Item,
  type Oportunidade,
  type Passo,
} from "../../lib/m6";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";

// M6 · Navegação — tela da mentorada.
export default function M6() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;
  const c5 = call(dados, 5);
  const op = oportunidadeDe(dados);
  const assumida = !!mentoraOportunidade(dados).assumida_em;
  const travada = op?.estado_edicao === "fechado";

  if (!aposta(dados))
    return (
      <>
        <span className="mem-label mem-muted">Movimento 6 · Navegação</span>
        <h1 className="mem-h1">O que, exatamente, você escolhe construir?</h1>
        <p className="mem-body mem-muted">Abre depois que a aposta for registrada, na Call 4.</p>
      </>
    );

  return (
    <>
      <span className="mem-label mem-muted">Movimento 6 · Navegação</span>
      <h1 className="mem-h1">O que, exatamente, você escolhe construir?</h1>

      {assumida ? (
        <OportunidadeAssumida dados={dados} />
      ) : (
        <section className="ws-bloco ws-como">
          <p className="mem-body-lg ws-measure">
            Agora a gente pega tudo o que você descobriu e diz exatamente o que estamos escolhendo construir. Muita coisa já vem pronta do caminho
            até aqui.
          </p>
          <ol className="ws-como__passos">
            <li className="mem-body">
              Seis passos curtos. Onde algo já vem pronto, você escolhe <strong>Mantenho</strong> ou <strong>Ajusto</strong>. Onde não vem, você
              escreve olhando o que ouviu, que fica ao lado.
            </li>
            <li className="mem-body">Se o que você ouviu não mostra algo, diga isso. Ninguém espera que você invente.</li>
            <li className="mem-body">
              Na Call 5{c5 ? ` (${dataHora(c5.data_atual)})` : ""}, você explica a sua oportunidade com as suas palavras, vocês leem juntas e você
              assume.
            </li>
          </ol>
          <p className="mem-body-sm mem-muted">~30 a 45 minutos, pode ser em mais de uma vez.</p>
        </section>
      )}

      <section className="ws-bloco">
        <p className="mem-label mem-muted">A sua aposta, como ficou na Call 4</p>
        <p className="mem-body ws-serif">{fraseOriginal(dados)}</p>
      </section>

      {!assumida && (
        <>
          <Passos dados={dados} travada={travada} aoSalvar={recarregar} />
          <Transversal dados={dados} travada={travada} aoSalvar={recarregar} />
          <div id="envio">
            <EnviarParaKaren dados={dados} movimento={6} numeroCall={5} falta={faltaEnvioM6(dados)} aoSalvar={recarregar} />
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function useSalvar(dados: DadosJornada, aoSalvar: () => Promise<void>) {
  const { pessoa } = useSessao();
  return async (mudar: (o: Oportunidade) => Oportunidade): Promise<boolean> => {
    if (!supabase || !pessoa) return false;
    const atual = oportunidadeDe(dados);
    const conteudo = mudar(dadosOportunidade(dados));
    const r = atual
      ? await supabase.from("registro").update({ conteudo }).eq("id", atual.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 6,
          tipo: "oportunidade",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    if (r.error) return false;
    await aoSalvar();
    return true;
  };
}

function Passos({ dados, travada, aoSalvar }: { dados: DadosJornada; travada: boolean; aoSalvar: () => Promise<void> }) {
  const [mudando, setMudando] = useState<number | null>(null);
  const atual = PASSOS.find((p) => !passoFeito(dados, p))?.n;
  const aberto = mudando ?? atual;
  return (
    <>
      {PASSOS.map((p) => {
        const feito = passoFeito(dados, p);
        const abrir = !travada && aberto === p.n;
        return (
          <article key={p.n} className="mem-card ws-padrao" id={`passo-${p.n}`}>
            <span className="mem-label mem-muted">
              Passo {p.n} de {PASSOS.length}
            </span>
            <h3 className="mem-h3">{p.titulo}</h3>
            {abrir ? (
              <PassoForm dados={dados} passo={p} aoSalvar={aoSalvar} aoFechar={() => setMudando(null)} />
            ) : feito ? (
              <div className="ws-sua-leitura">
                {p.itens.map((i) => (
                  <p key={i.chave} className="mem-body">
                    <span className="mem-muted">{i.pergunta}</span> <strong>{valorItem(dados, i.chave) || "—"}</strong>
                    {dadosOportunidade(dados).itens?.[i.chave]?.escolha === "sem_material" && <span className="mem-muted"> {i.semMaterial}</span>}
                    {dadosOportunidade(dados).itens?.[i.chave]?.escolha === "mantenho" && <span className="mem-muted"> · mantido</span>}
                    {dadosOportunidade(dados).itens?.[i.chave]?.escolha === "ajusto" && <span className="mem-muted"> · ajustado</span>}
                  </p>
                ))}
                {!travada && (
                  <div>
                    <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setMudando(p.n)}>
                      Mudar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mem-body-sm mem-muted">Depois do passo anterior.</p>
            )}
          </article>
        );
      })}
    </>
  );
}

const MANTENHO = [
  { valor: "mantenho", rotulo: "Mantenho" },
  { valor: "ajusto", rotulo: "Ajusto" },
];

function PassoForm({ dados, passo, aoSalvar, aoFechar }: { dados: DadosJornada; passo: Passo; aoSalvar: () => Promise<void>; aoFechar: () => void }) {
  const salvo = dadosOportunidade(dados).itens ?? {};
  const [itens, setItens] = useState<Partial<Record<ChaveItem, Item>>>(() =>
    Object.fromEntries(passo.itens.map((i) => [i.chave, { ...(salvo[i.chave] ?? {}) }])),
  );
  const [erro, setErro] = useState(false);
  const salvar = useSalvar(dados, aoSalvar);
  const grupos = material(dados, passo.n);
  const lista = fontes(dados);

  const set = (ch: ChaveItem, n: Partial<Item>) => setItens({ ...itens, [ch]: { ...(itens[ch] ?? {}), ...n } });
  const pronto = passo.itens.every((i) => {
    const it = itens[i.chave] ?? {};
    if (!it.escolha) return false;
    if (it.escolha === "mantenho" || it.escolha === "sem_material") return true;
    if (i.chave === "comprador") return !!it.tipo && !!it.porque?.trim() && (it.tipo === "mesma" || !!it.quem?.trim());
    if (i.chave === "beneficiario" && it.escolha === "ajusto" && !it.conversa) return false;
    return !!it.valor?.trim();
  });

  async function guardar() {
    setErro(false);
    const ok = await salvar((o) => ({ ...o, itens: { ...(o.itens ?? {}), ...itens } }));
    if (!ok) return setErro(true);
    aoFechar();
  }

  let k = 0;
  return (
    <div className="ws-m6-passo">
      <div className="ws-form">
        {passo.n === 5 && ativoConfirmar(dados) && (
          <p className="mem-body-sm ws-pauta">Seu ativo ainda está a confirmar. Escreva o caminho a partir do que você já fez de verdade.</p>
        )}
        {passo.itens.map((i) => {
          const it = itens[i.chave] ?? {};
          const base = carregado(dados, i.chave);
          if (i.chave === "comprador")
            return (
              <div key={i.chave} className="ws-form">
                <Pergunta n={++k} feita={!!it.escolha} titulo={i.pergunta}>
                  <Opcoes
                    rotulo={i.pergunta}
                    opcoes={[
                      { valor: "mesma", rotulo: "A mesma pessoa que vive o problema" },
                      { valor: "outra", rotulo: "Outra pessoa" },
                      { valor: "sem_material", rotulo: "Ainda não sei" },
                    ]}
                    valor={it.escolha === "sem_material" ? "sem_material" : it.tipo}
                    aoEscolher={(v) => (v === "sem_material" ? set(i.chave, { escolha: "sem_material", tipo: undefined }) : set(i.chave, { escolha: "escrito", tipo: v as Item["tipo"] }))}
                  />
                  {it.tipo === "outra" && it.escolha !== "sem_material" && (
                    <input className="mem-input" aria-label="Quem compraria" placeholder="Quem?" value={it.quem ?? ""} onChange={(e) => set(i.chave, { quem: e.target.value })} />
                  )}
                  <Colinha serve={i.serve} exemplo={i.exemplo} />
                </Pergunta>
                {it.escolha === "escrito" && (
                  <Pergunta n={++k} feita={!!it.porque?.trim()} titulo="Por que você aposta nisso?">
                    <input className="mem-input" aria-label="Por que aposta nisso" value={it.porque ?? ""} onChange={(e) => set(i.chave, { porque: e.target.value })} />
                    <Colinha serve="Uma linha, a partir do que você ouviu: quem já pagou por algo parecido, quem decide a compra." exemplo="Uma das pessoas contou que o RH pagou um curso parecido." />
                  </Pergunta>
                )}
              </div>
            );
          return (
            <div key={i.chave} className="ws-form">
              <Pergunta n={++k} feita={it.escolha === "mantenho" || it.escolha === "sem_material" || !!it.valor?.trim()} titulo={i.pergunta}>
                {base ? (
                  <>
                    <p className="mem-body ws-m6-carregado">
                      <span className="mem-label mem-muted">Do caminho até aqui</span>
                      <br />
                      {base}
                    </p>
                    <Opcoes rotulo={i.pergunta} opcoes={MANTENHO} valor={it.escolha} aoEscolher={(v) => set(i.chave, { escolha: v as Item["escolha"], valor: v === "ajusto" ? it.valor || base : it.valor })} />
                    {it.escolha === "ajusto" && (
                      <input className="mem-input" aria-label={`${i.pergunta} (ajustado)`} value={it.valor ?? ""} onChange={(e) => set(i.chave, { valor: e.target.value })} />
                    )}
                  </>
                ) : (
                  <>
                    {it.escolha !== "sem_material" && (
                      <input
                        className="mem-input"
                        aria-label={i.pergunta}
                        value={it.valor ?? ""}
                        onChange={(e) => set(i.chave, { escolha: "escrito", valor: e.target.value })}
                      />
                    )}
                    {i.semMaterial && (
                      <label className="ws-check mem-body-sm">
                        <input
                          type="checkbox"
                          checked={it.escolha === "sem_material"}
                          onChange={(e) => set(i.chave, { escolha: e.target.checked ? "sem_material" : it.valor?.trim() ? "escrito" : undefined })}
                        />{" "}
                        {i.semMaterial}
                      </label>
                    )}
                  </>
                )}
                <Colinha serve={i.serve} exemplo={i.exemplo} />
              </Pergunta>
              {i.chave === "beneficiario" && it.escolha === "ajusto" && (
                <Pergunta n={++k} feita={!!it.conversa} titulo="Qual conversa te mostrou isso?">
                  {lista.length ? (
                    <Opcoes rotulo="Conversa que mostrou o recorte" opcoes={lista.map((f) => ({ valor: f.id, rotulo: f.texto }))} valor={it.conversa} aoEscolher={(v) => set(i.chave, { conversa: v })} />
                  ) : (
                    <p className="mem-body-sm">Nenhuma conversa ou relato registrado nesta hipótese.</p>
                  )}
                  <Colinha serve="Recortar é permitido, mas só dentro de quem você ouviu. Aponte a conversa ou o relato de onde veio o recorte." />
                </Pergunta>
              )}
              {i.chave === "beneficiario" && (
                <Pergunta n={++k} feita={!!it.fica_de_fora?.trim()} titulo="Quem fica de fora, e por quê? (opcional)">
                  <input className="mem-input" aria-label="Quem fica de fora" value={it.fica_de_fora ?? ""} onChange={(e) => set(i.chave, { fica_de_fora: e.target.value })} />
                  <Colinha serve="Quem parece com esse público, mas não é para quem você vai construir agora." exemplo="Gestores contratados de fora: não contaram o problema de cobrar ex-colegas." />
                </Pergunta>
              )}
            </div>
          );
        })}
        {erro && <p className="mem-body-sm">Não foi possível guardar. Tente de novo.</p>}
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--primary" disabled={!pronto} onClick={guardar}>
            Guardar e seguir
          </button>
        </div>
      </div>
      <aside className="ws-m6-material" aria-label="O que você ouviu">
        {grupos.map((g) => (
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
  );
}

function Transversal({ dados, travada, aoSalvar }: { dados: DadosJornada; travada: boolean; aoSalvar: () => Promise<void> }) {
  const salvo = dadosOportunidade(dados).transversal ?? "";
  const [texto, setTexto] = useState(salvo);
  const [editando, setEditando] = useState(!salvo);
  const salvar = useSalvar(dados, aoSalvar);
  const passosOk = PASSOS.every((p) => passoFeito(dados, p));
  if (!passosOk && !salvo) return null;
  return (
    <article className="mem-card ws-padrao" id="transversal">
      <span className="mem-label mem-muted">Última pergunta</span>
      <h3 className="mem-h3">O que você manteve e o que mudou por causa do que você ouviu?</h3>
      {editando && !travada ? (
        <div className="ws-form">
          <textarea className="mem-input" rows={3} aria-label={TRANSVERSAL} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <Colinha
            serve="Uma ou duas frases. Se manteve tudo, diga o que você ouviu que sustenta manter."
            exemplo="Mantive o problema e a mudança. Recortei para quem foi promovido de dentro do time, porque foi quem contou os casos de verdade."
          />
          <div className="ws-acoes">
            <button
              type="button"
              className="mem-btn mem-btn--primary"
              disabled={!texto.trim()}
              onClick={async () => {
                if (await salvar((o) => ({ ...o, transversal: texto.trim() }))) setEditando(false);
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="ws-sua-leitura">
          <p className="mem-body ws-serif">“{salvo}”</p>
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

// Depois da Call 5: a oportunidade assumida.
export function OportunidadeAssumida({ dados, paraMentora = false }: { dados: DadosJornada; paraMentora?: boolean }) {
  const m = mentoraOportunidade(dados);
  const { apostando, naoSabemos } = listasIncertezas(dados);
  return (
    <section className="ws-bloco ws-aposta">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">{paraMentora ? "A oportunidade dela" : "A sua oportunidade"}</span>
        <span className="mem-tag mem-tag--decisao">Assumida</span>
      </div>
      <p className="mem-body-sm mem-muted">
        Assumida em {m.assumida_em ? dataCurta(m.assumida_em) : "—"} · não validada; aguarda a construção da oferta (Movimento 7) e o teste comercial
        (Movimento 9).
      </p>
      <dl className="ws-resumo">
        {PASSOS.flatMap((p) => p.itens).map((i) => {
          const est = estatuto(dados, i.chave);
          const nivel = m.niveis?.[i.chave];
          const it = dadosOportunidade(dados).itens?.[i.chave];
          return (
            <div key={i.chave}>
              <dt className="mem-body-sm mem-muted">{i.pergunta}</dt>
              <dd className="mem-body">
                {valorItem(dados, i.chave) || "—"}{" "}
                <span className={`mem-tag ${est.tipo === "campo" ? "mem-tag--evidencia" : est.tipo === "aposta" ? "mem-tag--relato" : "mem-tag--pendencia"}`}>
                  {est.rotulo}
                </span>
                {it?.escolha === "ajusto" && nivel && (
                  <span className="mem-body-sm mem-muted"> · {NIVEIS.find((n) => n.valor === String(nivel))?.paraEla}</span>
                )}
                {i.chave === "comprador" && it?.porque && <span className="mem-body-sm mem-muted"> · porque {it.porque}</span>}
                {i.chave === "beneficiario" && it?.fica_de_fora && <span className="mem-body-sm mem-muted"> · fica de fora: {it.fica_de_fora}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      {apostando.length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">O que estamos apostando</p>
          <ul className="ws-lista-simples mem-body">{apostando.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {naoSabemos.length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">O que ainda não sabemos e vamos acompanhar</p>
          <ul className="ws-lista-simples mem-body">{naoSabemos.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {(m.limites ?? []).length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">O que a oferta não poderá prometer</p>
          <ul className="ws-lista-simples mem-body">{(m.limites ?? []).filter((x) => x.trim()).map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {m.recomendacao?.trim() && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Recomendação da Karen</p>
          <p className="mem-body">
            {m.recomendacao} · {m.concordou_recomendacao ? "você concordou" : "você decidiu diferente"}
          </p>
        </div>
      )}
    </section>
  );
}
