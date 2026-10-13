import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, type DadosJornada } from "../../lib/jornada";
import { dataCurta, dataHora } from "../../lib/datas";
import { aposta, valorItem } from "../../lib/m6";
import { conversasDe, relatosDe } from "../../lib/m4";
import { clientesSimultaneos, dadosOferta, etapas, limitesDaOferta, reais } from "../../lib/m7";
import {
  CAMINHO,
  CUMPRIMENTO,
  DECISOES_M8,
  ORIGEM,
  ROTAS,
  call7Feita,
  caminhoPronto,
  dadosPreparo,
  decisaoM8Feita,
  falasDesejo,
  faltaEnvioM8,
  mentoraPreparo,
  preparoDe,
  resumoMontado,
  tentativas,
  vocabularioMem,
  type ChaveM8,
  type Preparo,
} from "../../lib/m8";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";

// M8 · Preparar para o Mercado — tela da mentorada.
export default function M8() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;
  const c7 = call(dados, 7);
  const c8 = call(dados, 8);
  const assumida = !!mentoraPreparo(dados).assumida_em;
  const travada = preparoDe(dados)?.estado_edicao === "fechado";
  const aberto = dados.movimentos.find((m) => m.codigo === 8)?.estado !== "nao_iniciado";
  const p = dadosPreparo(dados);
  const parte1 = DECISOES_M8.every((x) => decisaoM8Feita(p, x.chave));

  return (
    <>
      <span className="mem-label mem-muted">Movimento 8 · Preparar para o Mercado</span>
      <h1 className="mem-h1">Como alguém de fora entende a sua oferta e consegue dizer sim?</h1>
      {!aberto ? (
        <p className="mem-body mem-muted">Abre depois que você assumir a sua oferta, na Call 6.</p>
      ) : assumida ? (
        <PreparoAssumido dados={dados} />
      ) : (
        <>
          <section className="ws-bloco ws-como">
            <p className="mem-body-lg ws-measure">
              Agora você pega a oferta que construiu e a torna clara para alguém que nunca ouviu falar da mentoria, sem prometer mais do que ela entrega.
              E deixa pronto o caminho para alguém dizer sim.
            </p>
            <ol className="ws-como__passos">
              <li className="mem-body">
                Antes da Call 7{c7 ? ` (${dataHora(c7.data_atual)})` : ""}: quatro decisões curtas. A oferta não muda: muda só o jeito de dizer.
              </li>
              <li className="mem-body">
                Entre a Call 7 e a Call 8{c8 ? ` (${dataHora(c8.data_atual)})` : ""}: deixe pronto o caminho (como a pessoa chega, aceita, paga e começa) e
                percorra você mesma.
              </li>
              <li className="mem-body">Na Call 8, você apresenta a oferta para a Karen como apresentaria a alguém de fora.</li>
            </ol>
            <p className="mem-body-sm mem-muted">Estar pronta não é saber se vão comprar. É poder descobrir isso no teste.</p>
          </section>

          <section className="ws-secao">
            <h2 className="mem-h2">Parte 1 · Antes da Call 7</h2>
            <Decisoes dados={dados} travada={travada} aoSalvar={recarregar} />
          </section>

          {(parte1 || call7Feita(dados)) && (
            <section className="ws-secao" id="caminho">
              <h2 className="mem-h2">Parte 2 · Entre a Call 7 e a Call 8</h2>
              <Caminho dados={dados} travada={travada} aoSalvar={recarregar} />
            </section>
          )}

          <div id="envio">
            <EnviarParaKaren dados={dados} movimento={8} numeroCall={call7Feita(dados) ? 8 : 7} falta={faltaEnvioM8(dados)} aoSalvar={recarregar} />
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function useSalvar(dados: DadosJornada, aoSalvar: () => Promise<void>) {
  const { pessoa } = useSessao();
  return async (mudar: (o: Preparo) => Preparo): Promise<boolean> => {
    if (!supabase || !pessoa) return false;
    const atual = preparoDe(dados);
    const conteudo = mudar(dadosPreparo(dados));
    const r = atual
      ? await supabase.from("registro").update({ conteudo }).eq("id", atual.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 8,
          tipo: "preparo",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    if (r.error) return false;
    await aoSalvar();
    return true;
  };
}

function Lado({ grupos }: { grupos: { titulo: string; itens: string[] }[] }) {
  return (
    <aside className="ws-m6-material" aria-label="Ao lado">
      {grupos.map((g) => (
        <div key={g.titulo} className="ws-padrao__parte">
          <p className="mem-label mem-muted">{g.titulo}</p>
          <ul className="ws-lista-simples mem-body-sm">
            {(g.itens.length ? g.itens : ["—"]).map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

function acessoM4(dados: DadosJornada): string {
  const f = aposta(dados)?.frente;
  if (!f) return "—";
  const conv = conversasDe(dados, f).length;
  const rel = relatosDe(dados, f).length;
  return [conv && `${conv} ${conv === 1 ? "conversa" : "conversas"}`, rel && `${rel} ${rel === 1 ? "relato encontrado" : "relatos encontrados"} em pesquisa`].filter(Boolean).join(" · ") || "—";
}

function lado(dados: DadosJornada, ch: ChaveM8) {
  const o = dadosOferta(dados);
  if (ch === "promessa")
    return [
      { titulo: "O que você entrega", itens: [o.entrega?.texto ?? "—"] },
      { titulo: "O que fica de fora", itens: [o.entrega?.fora ?? "—"] },
      { titulo: "A oferta não promete", itens: limitesDaOferta(dados) },
      { titulo: "Como as pessoas falaram", itens: falasDesejo(dados) },
    ];
  if (ch === "abordagem")
    return [
      { titulo: "O seu diferencial (Movimento 7)", itens: [o.como?.diferencial ?? "—"] },
      { titulo: "As etapas", itens: etapas(o).map((e, i) => `${i + 1}. ${e}`) },
      { titulo: "O que as pessoas já tentaram", itens: tentativas(dados) },
    ];
  if (ch === "apresentacao")
    return [{ titulo: "O resumo tem sete partes", itens: ["Para quem e em que situação", "A promessa", "Por que do seu jeito", "O que recebe", "O que não está incluído", "Quanto custa e como paga", "O próximo passo"] }];
  const cs = clientesSimultaneos(o);
  return [
    { titulo: "Quem você aposta que compra", itens: [valorItem(dados, "comprador") || "—"] },
    { titulo: "Sua capacidade", itens: [cs ? `até ${cs} ${cs === 1 ? "cliente" : "clientes"} ao mesmo tempo` : "—"] },
    { titulo: "Como você chegou nessas pessoas no Movimento 4", itens: [acessoM4(dados)] },
  ];
}

function Decisoes({ dados, travada, aoSalvar }: { dados: DadosJornada; travada: boolean; aoSalvar: () => Promise<void> }) {
  const [mudando, setMudando] = useState<ChaveM8 | null>(null);
  const p = dadosPreparo(dados);
  const atual = DECISOES_M8.find((x) => !decisaoM8Feita(p, x.chave))?.chave;
  const aberto = mudando ?? atual;
  return (
    <>
      {DECISOES_M8.map((dec) => {
        const feita = decisaoM8Feita(p, dec.chave);
        return (
          <article key={dec.chave} className="mem-card ws-padrao" id={`decisao-${dec.n}`}>
            <span className="mem-label mem-muted">
              Decisão {dec.n} de 4 · {dec.titulo.toLowerCase()}
            </span>
            <h3 className="mem-h3">{dec.pergunta}</h3>
            {!travada && aberto === dec.chave ? (
              <div className="ws-m6-passo">
                <FormDecisao dados={dados} chave={dec.chave} aoSalvar={aoSalvar} aoFechar={() => setMudando(null)} />
                <Lado grupos={lado(dados, dec.chave)} />
              </div>
            ) : feita ? (
              <div className="ws-sua-leitura">
                <ResumoDecisao p={p} chave={dec.chave} />
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

function ResumoDecisao({ p, chave }: { p: Preparo; chave: ChaveM8 }) {
  if (chave === "promessa") return <p className="mem-body-lg ws-serif">“{p.promessa?.texto}”</p>;
  if (chave === "abordagem")
    return (
      <p className="mem-body">
        {p.abordagem?.texto}
        {p.abordagem?.nome && <span className="mem-muted"> · nome: {p.abordagem.nome}</span>}
      </p>
    );
  if (chave === "apresentacao")
    return (
      <p className="mem-body-sm mem-muted">
        Resumo escrito pronto · ensaiada em voz alta em {p.falada?.ensaiada_em ? dataCurta(p.falada.ensaiada_em) : "—"}
      </p>
    );
  return (
    <p className="mem-body">
      <strong>{ROTAS.find((r) => r.valor === p.rota?.tipo)?.rotulo}</strong> <span className="mem-muted">· {p.rota?.porque} · é hipótese: o teste mostra se alcança quem compra</span>
    </p>
  );
}

function FormDecisao({ dados, chave, aoSalvar, aoFechar }: { dados: DadosJornada; chave: ChaveM8; aoSalvar: () => Promise<void>; aoFechar: () => void }) {
  const [p, setP] = useState<Preparo>(() => {
    const x: Preparo = JSON.parse(JSON.stringify(dadosPreparo(dados)));
    if (chave === "apresentacao" && !x.resumo?.trim()) x.resumo = resumoMontado(dados, x);
    return x;
  });
  const [erro, setErro] = useState(false);
  const salvar = useSalvar(dados, aoSalvar);
  const pronto = decisaoM8Feita(p, chave);

  async function guardar() {
    setErro(false);
    const ok = await salvar((atual) => ({
      ...atual,
      ...(chave === "promessa" ? { promessa: p.promessa } : {}),
      ...(chave === "abordagem" ? { abordagem: p.abordagem } : {}),
      ...(chave === "apresentacao" ? { resumo: p.resumo, falada: p.falada } : {}),
      ...(chave === "rota" ? { rota: p.rota } : {}),
    }));
    if (!ok) return setErro(true);
    aoFechar();
  }

  const setProm = (n: Partial<NonNullable<Preparo["promessa"]>>) => setP({ ...p, promessa: { ...(p.promessa ?? {}), ...n } });
  const setAb = (n: Partial<NonNullable<Preparo["abordagem"]>>) => setP({ ...p, abordagem: { ...(p.abordagem ?? {}), ...n } });
  const vocab = vocabularioMem(p.resumo);

  return (
    <div className="ws-form">
      {chave === "promessa" && (
        <>
          <Pergunta n={1} feita={!!p.promessa?.texto?.trim()} titulo="A promessa, em uma ou duas frases">
            <textarea className="mem-input" rows={2} aria-label="Promessa" value={p.promessa?.texto ?? ""} onChange={(e) => setProm({ texto: e.target.value })} />
            <Colinha
              serve="A mudança que a pessoa vai perceber, nas palavras dela (as falas estão ao lado). Pode deixar o que você entrega desejável; não pode acrescentar uma mudança que a oferta não produz. Nem lista de encontros, nem garantia de resultado."
              exemplo="Pare de adiar a conversa difícil com quem até ontem era seu colega, e conduza essa conversa sem se sentir um traidor."
            />
          </Pergunta>
          <Pergunta n={2} feita={!!p.promessa?.cumprimento} titulo="Se a pessoa receber exatamente o que você entrega, nem mais nem menos, ela vai reconhecer que a promessa foi cumprida?">
            <Opcoes rotulo="Cumprimento" opcoes={CUMPRIMENTO} valor={p.promessa?.cumprimento} aoEscolher={(v) => setProm({ cumprimento: v as "sim" })} />
          </Pergunta>
          <Pergunta n={3} feita={!!p.promessa?.origem} titulo="Essa mudança já está no que você entrega, ou você está acrescentando?">
            <Opcoes rotulo="Origem" opcoes={ORIGEM} valor={p.promessa?.origem} aoEscolher={(v) => setProm({ origem: v as "contida" })} />
          </Pergunta>
          {((p.promessa?.cumprimento && p.promessa.cumprimento !== "sim") || p.promessa?.origem === "acrescenta") && (
            <p className="mem-body-sm ws-pauta">
              A promessa precisa encolher até o tamanho do que você entrega. Se ela só fica de pé com uma entrega maior, isso não se resolve com palavras: leve
              para a Call 7.
            </p>
          )}
        </>
      )}

      {chave === "abordagem" && (
        <>
          <Pergunta n={1} feita={!!p.abordagem?.texto?.trim()} titulo="Por que do seu jeito, em uma ou duas frases">
            <textarea className="mem-input" rows={2} aria-label="Por que do seu jeito" value={p.abordagem?.texto ?? ""} onChange={(e) => setAb({ texto: e.target.value })} />
            <Colinha
              serve="Explique o seu diferencial (ao lado) para alguém de fora, em comparação ao que essa pessoa já tentou. Sem dizer que é o único, o melhor ou que todo mundo erra."
              exemplo="Livro e conversa com o RH falam de liderança em geral. Aqui a gente trabalha em cima das conversas reais da sua semana: antes de você ter a conversa e depois que ela acontece."
            />
          </Pergunta>
          <Pergunta n={2} feita={!!p.abordagem?.nome?.trim()} titulo="Quer dar um nome a esse jeito? (opcional)">
            <input className="mem-input" aria-label="Nome" value={p.abordagem?.nome ?? ""} onChange={(e) => setAb({ nome: e.target.value })} />
            <Colinha serve="Só se ajudar a lembrar, e nunca no lugar da frase que explica." exemplo="Antes e depois." />
          </Pergunta>
        </>
      )}

      {chave === "apresentacao" && (
        <>
          <Pergunta n={1} feita={!!p.resumo?.trim()} titulo="O resumo escrito">
            <textarea className="mem-input" rows={12} aria-label="Resumo escrito" value={p.resumo ?? ""} onChange={(e) => setP({ ...p, resumo: e.target.value })} />
            <Colinha serve="Já vem montado com o que você decidiu. Ajuste a linguagem até alguém entender sozinho, sem você explicar. Não acrescente nada novo à oferta." />
            {vocab.length > 0 && (
              <p className="mem-body-sm">
                Palavras daqui da mentoria que alguém de fora pode não entender: {vocab.join(", ")}. Troque pelas palavras do seu público.
              </p>
            )}
            <div>
              <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setP({ ...p, resumo: resumoMontado(dados, p) })}>
                Montar de novo a partir das decisões
              </button>
            </div>
          </Pergunta>
          <Pergunta n={2} feita={!!p.falada?.ensaiada_em} titulo="A versão falada, em até um minuto">
            <p className="mem-body-sm">
              Sem olhar o texto, diga em voz alta: para quem, que mudança, o que a pessoa recebe, quanto custa e qual o próximo passo. Grave no celular e ouça. Se
              passou de um minuto ou se apareceu uma palavra daqui da mentoria, ensaie de novo.
            </p>
            <label className="ws-check mem-body-sm">
              <input
                type="checkbox"
                checked={!!p.falada?.ensaiada_em}
                onChange={(e) => setP({ ...p, falada: { ensaiada_em: e.target.checked ? new Date().toISOString() : undefined } })}
              />{" "}
              Ensaiei em voz alta, em até um minuto, sem olhar
            </label>
          </Pergunta>
        </>
      )}

      {chave === "rota" && (
        <>
          <Pergunta n={1} feita={!!p.rota?.tipo} titulo="Por onde as pessoas vão conhecer a oferta">
            <Opcoes rotulo="Rota" opcoes={ROTAS} valor={p.rota?.tipo} aoEscolher={(v) => setP({ ...p, rota: { ...(p.rota ?? {}), tipo: v as "conversa" } })} />
            {p.rota?.tipo && <p className="mem-body-sm mem-muted">O que precisa: {ROTAS.find((r) => r.valor === p.rota?.tipo)?.exige}.</p>}
          </Pergunta>
          <Pergunta n={2} feita={!!p.rota?.porque?.trim()} titulo="Por que essa, com o acesso que você já mostrou?">
            <input className="mem-input" aria-label="Por que essa rota" value={p.rota?.porque ?? ""} onChange={(e) => setP({ ...p, rota: { ...(p.rota ?? {}), porque: e.target.value } })} />
            <Colinha
              serve="Uma linha. Pense em como você chegou nas pessoas no Movimento 4, em quem paga, no quanto a oferta precisa de conversa e no seu tempo. É hipótese: o teste mostra se alcança quem compra."
              exemplo="Cheguei rápido nesse público pelos colegas; a oferta precisa de conversa para ser entendida."
            />
          </Pergunta>
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

function Caminho({ dados, travada, aoSalvar }: { dados: DadosJornada; travada: boolean; aoSalvar: () => Promise<void> }) {
  const [c, setC] = useState<NonNullable<Preparo["caminho"]>>(() => JSON.parse(JSON.stringify(dadosPreparo(dados).caminho ?? {})));
  const [estado, setEstado] = useState("");
  const salvar = useSalvar(dados, aoSalvar);
  const cs = clientesSimultaneos(dadosOferta(dados));
  const o = dadosOferta(dados);
  return (
    <article className="mem-card ws-padrao">
      <p className="mem-body ws-measure">
        Se alguém quiser avançar, a pessoa precisa saber exatamente o que fazer. Descreva cada passo, deixe pronto e percorra você mesma, como se fosse a
        cliente. Simples basta: {cs ? `para até ${cs} ${cs === 1 ? "cliente" : "clientes"}, ` : ""}uma conversa, um meio de pagamento e uma agenda.
      </p>
      {CAMINHO.map((x, i) => {
        const v = c[x.chave] ?? {};
        const set = (n: Partial<typeof v>) => {
          setC({ ...c, [x.chave]: { ...v, ...n } });
          setEstado("");
        };
        return (
          <Pergunta key={x.chave} n={i + 1} feita={!!v.como?.trim() && !!v.percorrido} titulo={`${x.titulo}: ${x.pergunta}`}>
            <input className="mem-input" aria-label={x.titulo} value={v.como ?? ""} disabled={travada} onChange={(e) => set({ como: e.target.value })} />
            <label className="ws-check mem-body-sm">
              <input type="checkbox" checked={!!v.percorrido} disabled={travada} onChange={(e) => set({ percorrido: e.target.checked })} />{" "}
              {x.chave === "pagamento" ? "Já fiz um pagamento de teste, do começo ao fim" : "Já percorri esse passo eu mesma"}
            </label>
            <Colinha
              serve={x.chave === "inicio" ? `Inclua o que precisava estar pronto antes da primeira venda: ${o.capacidade?.pronto_antes ?? "—"}.` : "Uma linha. A ferramenta é escolha sua."}
              exemplo={x.exemplo}
            />
          </Pergunta>
        );
      })}
      {!travada && (
        <div className="ws-acoes">
          <button
            type="button"
            className="mem-btn mem-btn--primary"
            onClick={async () => {
              setEstado((await salvar((p) => ({ ...p, caminho: c }))) ? "salvo" : "erro");
            }}
          >
            {estado === "salvo" ? "Salvo" : "Guardar o caminho"}
          </button>
        </div>
      )}
      {caminhoPronto({ caminho: c }) && <p className="mem-body-sm">Os quatro passos estão prontos. Na Call 8, vocês percorrem juntas.</p>}
    </article>
  );
}

// Depois da Call 8: a oferta preparada para teste.
export function PreparoAssumido({ dados, paraMentora = false }: { dados: DadosJornada; paraMentora?: boolean }) {
  const p = dadosPreparo(dados);
  const m = mentoraPreparo(dados);
  const o = dadosOferta(dados);
  return (
    <section className="ws-bloco ws-aposta">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">{paraMentora ? "A oferta dela, preparada" : "A sua oferta, preparada para o teste"}</span>
        <span className="mem-tag mem-tag--decisao">Pronta para o teste</span>
      </div>
      <p className="mem-body-sm mem-muted">
        Preparada em {m.assumida_em ? dataCurta(m.assumida_em) : "—"} · não validada; aguarda o teste comercial (Movimento 9).
      </p>
      <p className="mem-body-lg ws-serif">“{p.promessa?.texto}”</p>
      <p className="mem-body">{p.abordagem?.texto}</p>
      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">Resumo escrito</p>
        <p className="mem-body ws-pre">{p.resumo}</p>
      </div>
      <dl className="ws-resumo">
        <div>
          <dt className="mem-body-sm mem-muted">Por onde as pessoas vão conhecer <span className="mem-tag mem-tag--relato">hipótese</span></dt>
          <dd className="mem-body">
            {ROTAS.find((r) => r.valor === p.rota?.tipo)?.rotulo} · {p.rota?.porque}
          </dd>
        </div>
        {CAMINHO.map((x) => (
          <div key={x.chave}>
            <dt className="mem-body-sm mem-muted">{x.titulo}</dt>
            <dd className="mem-body">{p.caminho?.[x.chave]?.como ?? "—"}</dd>
          </div>
        ))}
        <div>
          <dt className="mem-body-sm mem-muted">Preço <span className="mem-tag mem-tag--relato">hipótese</span></dt>
          <dd className="mem-body">
            {reais(o.preco?.valor)}, {o.preco?.condicao}
          </dd>
        </div>
      </dl>
      {(m.objecoes ?? []).filter((x) => x.texto.trim()).length > 0 && (
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Objeções que podem aparecer</p>
          <ul className="ws-lista-simples mem-body">
            {(m.objecoes ?? []).filter((x) => x.texto.trim()).map((x) => (
              <li key={x.texto}>
                “{x.texto}” <span className="mem-muted">→ {x.resposta}</span>
              </li>
            ))}
          </ul>
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
    </section>
  );
}
