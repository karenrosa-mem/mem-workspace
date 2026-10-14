import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { call, type DadosJornada } from "../../lib/jornada";
import { dataCurta, dataHora, hojeBrasilia, somarDias } from "../../lib/datas";
import { ROTAS } from "../../lib/m8";
import { reais, dadosOferta } from "../../lib/m7";
import {
  COMPORTAMENTOS,
  CRITERIOS_FIM,
  LEITURAS,
  MOTIVOS,
  MUDANCAS,
  PONTOS,
  PRECO,
  VARIAVEIS,
  capacidade,
  compradorCritico,
  compradorPretendido,
  corte,
  dadosTeste,
  desenhoFeito,
  diaDaJanela,
  ex,
  exposicoes,
  fatosVariavel,
  faltaEnvioM9,
  mentoraTeste,
  resumoFatos,
  rotaInicial,
  rotasEmUso,
  rotuloLeitura,
  rotuloRota,
  sinais,
  testeDe,
  type Exposicao,
  type Teste,
} from "../../lib/m9";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import EnviarParaKaren from "../../componentes/EnviarParaKaren";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";

const SIM_NAO = [
  { valor: "nao", rotulo: "Não" },
  { valor: "sim", rotulo: "Sim" },
];

// M9 · Teste Comercial — tela da mentorada.
export default function M9() {
  const { dados, erro, recarregar } = useJornada();
  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;
  const aberto = dados.movimentos.find((m) => m.codigo === 9)?.estado !== "nao_iniciado";
  const t = dadosTeste(dados);
  const m = mentoraTeste(dados);
  const travado = testeDe(dados)?.estado_edicao === "fechado";
  const c9 = call(dados, 9);

  return (
    <>
      <span className="mem-label mem-muted">Movimento 9 · Teste Comercial</span>
      <h1 className="mem-h1">O que acontece quando alguém pode, de verdade, comprar?</h1>
      {!aberto ? (
        <p className="mem-body mem-muted">Abre depois que a sua oferta estiver pronta para o teste, na Call 8.</p>
      ) : m.gate_em ? (
        <Resultado dados={dados} />
      ) : (
        <>
          <section className="ws-bloco ws-como">
            <p className="mem-body-lg ws-measure">
              Agora a oferta encontra pessoas que podem comprá-la. O objetivo não é provar que ela é boa: é ver o que as pessoas fazem quando podem
              dizer sim.
            </p>
            <ol className="ws-como__passos">
              <li className="mem-body">Desenhe o teste: de onde vêm os contatos e as datas. O resto já vem do método.</li>
              <li className="mem-body">Durante até 14 dias, apresente e proponha. Registre cada pessoa no mesmo dia, em uns 2 minutos.</li>
              <li className="mem-body">
                Quando o teste terminar, organize o que aconteceu e proponha uma leitura. Na Call 9{c9 ? ` (${dataHora(c9.data_atual)})` : ""}, vocês
                conferem juntas.
              </li>
            </ol>
            <p className="mem-body-sm mem-muted">O que vale é o que as pessoas fizeram, não o que disseram. Uma compra sozinha é um fato, ainda não uma conclusão.</p>
          </section>

          <section className="ws-secao" id="desenho">
            <h2 className="mem-h2">Parte 1 · Desenhar o teste</h2>
            <Desenho dados={dados} travado={travado} aoSalvar={recarregar} />
          </section>

          {desenhoFeito(t) && (
            <section className="ws-secao" id="janela">
              <h2 className="mem-h2">Parte 2 · A janela do teste</h2>
              <Janela dados={dados} travado={travado} aoSalvar={recarregar} />
            </section>
          )}

          {desenhoFeito(t) && (exposicoes(dados).length > 0 || t.encerramento?.criterio) && (
            <section className="ws-secao" id="leitura">
              <h2 className="mem-h2">Parte 3 · Encerrar e propor a leitura</h2>
              <details className="ws-bloco" open={!!t.encerramento?.criterio}>
                <summary className="mem-body">O teste terminou? Abra aqui para encerrar e propor a leitura.</summary>
                <Leitura dados={dados} travado={travado} aoSalvar={recarregar} />
              </details>
            </section>
          )}

          <div id="envio">
            <EnviarParaKaren dados={dados} movimento={9} numeroCall={9} falta={faltaEnvioM9(dados)} aoSalvar={recarregar} />
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function useSalvar(dados: DadosJornada, aoSalvar: () => Promise<void>) {
  const { pessoa } = useSessao();
  return async (mudar: (o: Teste) => Teste): Promise<boolean> => {
    if (!supabase || !pessoa) return false;
    const atual = testeDe(dados);
    const conteudo = mudar(dadosTeste(dados));
    const r = atual
      ? await supabase.from("registro").update({ conteudo }).eq("id", atual.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: 9,
          tipo: "teste",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    if (r.error) return false;
    await aoSalvar();
    return true;
  };
}

function Desenho({ dados, travado, aoSalvar }: { dados: DadosJornada; travado: boolean; aoSalvar: () => Promise<void> }) {
  const t = dadosTeste(dados);
  const m = mentoraTeste(dados);
  const [d, setD] = useState(() => ({ ...(t.desenho ?? {}), inicio: t.desenho?.inicio ?? hojeBrasilia() }));
  const [editando, setEditando] = useState(!desenhoFeito(t));
  const salvar = useSalvar(dados, aoSalvar);
  const cap = capacidade(dados);
  const o = dadosOferta(dados);
  const fimMax = d.inicio ? somarDias(d.inicio, 13) : undefined;
  const fimInvalido = !!(d.fim && fimMax && d.fim > fimMax);

  return (
    <article className="mem-card ws-padrao">
      {editando && !travado ? (
        <div className="ws-form">
          <Pergunta n={1} feita={!!d.fonte?.trim()} titulo="De onde vêm os contatos?">
            <input className="mem-input" aria-label="De onde vêm os contatos" value={d.fonte ?? ""} onChange={(e) => setD({ ...d, fonte: e.target.value })} />
            <Colinha
              serve={`Pessoas parecidas com quem você aposta que compra: ${compradorPretendido(dados)}. Sem nomes aqui.`}
              exemplo="Ex-colegas que foram promovidos nos últimos dois anos e indicações deles."
            />
          </Pergunta>
          <Pergunta n={2} feita={!!d.proximas?.trim()} titulo="Vão entrar pessoas próximas de você? (opcional)">
            <input className="mem-input" aria-label="Pessoas próximas" value={d.proximas ?? ""} onChange={(e) => setD({ ...d, proximas: e.target.value })} />
            <Colinha serve="Podem entrar, sempre marcadas, e nunca a maioria: a relação muda a decisão da pessoa." exemplo="Duas amigas que são gestoras; o resto, gente que não me conhece bem." />
          </Pergunta>
          <Pergunta n={3} feita={!!d.inicio && !!d.fim && !fimInvalido} titulo="Quando começa e quando termina?">
            <div className="ws-acoes">
              <input className="mem-input" type="date" aria-label="Início" value={d.inicio ?? ""} onChange={(e) => setD({ ...d, inicio: e.target.value })} />
              <input className="mem-input" type="date" aria-label="Fim" value={d.fim ?? ""} max={fimMax} onChange={(e) => setD({ ...d, fim: e.target.value })} />
            </div>
            {fimInvalido && <p className="mem-body-sm">A janela vai até 14 dias: termina no máximo em {dataCurta(fimMax!)}.</p>}
            <Colinha serve="Até 14 dias. Pode terminar antes, se as respostas começarem a se repetir ou se a sua capacidade se preencher. Se você já tem uma cliente em andamento, as horas para o teste diminuem." />
          </Pergunta>
          <div className="ws-acoes">
            <button
              type="button"
              className="mem-btn mem-btn--primary"
              disabled={!d.fonte?.trim() || !d.inicio || !d.fim || fimInvalido}
              onClick={async () => {
                if (await salvar((x) => ({ ...x, desenho: d }))) setEditando(false);
              }}
            >
              Guardar o desenho
            </button>
          </div>
        </div>
      ) : (
        <div className="ws-sua-leitura">
          <p className="mem-body">
            <strong>Contatos:</strong> {t.desenho?.fonte}
            {t.desenho?.proximas && <span className="mem-muted"> · próximas: {t.desenho.proximas}</span>}
          </p>
          <p className="mem-body">
            <strong>Janela:</strong> {t.desenho?.inicio && dataCurta(t.desenho.inicio)} a {t.desenho?.fim && dataCurta(t.desenho.fim)}
          </p>
          {!travado && (
            <div>
              <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setEditando(true)}>
                Mudar
              </button>
            </div>
          )}
        </div>
      )}
      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">O que já vem do método</p>
        <ul className="ws-lista-simples mem-body-sm">
          <li>
            <strong>Quanto:</strong> até as respostas começarem a se repetir. Como referência, umas 6 a 8 pessoas que receberam a proposta completa. No
            máximo 20 contatos tentados{cap ? `, ou até ${cap} ${cap === 1 ? "cliente" : "clientes"} (a sua capacidade)` : ""}.
          </li>
          <li>
            <strong>Por onde:</strong> {rotuloRota(rotaInicial(dados))}. Pode mudar uma vez, se não estiver alcançando quem compra.
          </li>
          <li>
            <strong>Retomadas:</strong> no máximo duas por pessoa, depois da proposta. Venda depois de pressão não diz o que a oferta faz sozinha.
          </li>
          <li>
            <strong>O que oferecer:</strong> a oferta como está, por {reais(o.preco?.valor)}
            {o.preco?.condicao ? `, ${o.preco.condicao}` : ""}. O preço não muda durante o teste.
          </li>
          {compradorCritico(dados) && (
            <li>
              <strong>Atenção:</strong> quem paga ainda é a maior aposta. Observe cedo quem decide e quem paga (a sua aposta: {compradorPretendido(dados)}).
            </li>
          )}
        </ul>
      </div>
      {m.conferencia?.texto && (
        <div className="mem-mentor">
          <span className="mem-label mem-muted">A Karen conferiu o desenho · {m.conferencia.em ? dataCurta(m.conferencia.em) : ""}</span>
          <p className="mem-mentor__text">{m.conferencia.texto}</p>
          <span className="mem-mentor__sig">— Karen, mentora</span>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------
function Janela({ dados, travado, aoSalvar }: { dados: DadosJornada; travado: boolean; aoSalvar: () => Promise<void> }) {
  const t = dadosTeste(dados);
  const m = mentoraTeste(dados);
  const j = diaDaJanela(t);
  const r = resumoFatos(dados);
  const cap = capacidade(dados);
  const salvar = useSalvar(dados, aoSalvar);
  const [nova, setNova] = useState(false);
  const lista = exposicoes(dados);

  async function contar(rota: string, campo: "tentados" | "alcancados", delta: number) {
    await salvar((x) => {
      const c = { ...(x.contagem ?? {}) };
      const atual = c[rota] ?? {};
      c[rota] = { ...atual, [campo]: Math.max(0, (atual[campo] ?? 0) + delta) };
      return { ...x, contagem: c };
    });
  }

  return (
    <>
      <article className="mem-card ws-padrao">
        <p className="mem-body">
          {j ? (j.dia < 1 ? `Começa em ${dataCurta(t.desenho!.inicio!)}.` : j.dia > j.total ? "A janela terminou." : `Dia ${j.dia} de ${j.total}.`) : ""} {r.total}{" "}
          {r.total === 1 ? "pessoa recebeu" : "pessoas receberam"} a proposta completa
          {cap ? ` · ${r.compras} de ${cap} ${cap === 1 ? "vaga preenchida" : "vagas preenchidas"}` : ""}.
        </p>
        {sinais(dados).map((s) => (
          <p key={s} className="mem-body-sm ws-pauta">
            {s}
          </p>
        ))}
        <div className="ws-padrao__parte">
          <p className="mem-label mem-muted">Contatos, por onde as pessoas conheceram</p>
          {rotasEmUso(dados).map((rota) => {
            const c = t.contagem?.[rota] ?? {};
            return (
              <div key={rota} className="ws-contador">
                <span className="mem-body">{rotuloRota(rota)}</span>
                {(["tentados", "alcancados"] as const).map((campo) => (
                  <span key={campo} className="ws-contador__item mem-body-sm">
                    {campo === "tentados" ? "Tentei contato" : "Responderam"}: <strong>{c[campo] ?? 0}</strong>
                    {!travado && (
                      <>
                        <button type="button" className="mem-btn mem-btn--quiet" aria-label={`menos ${campo}`} onClick={() => contar(rota, campo, -1)}>
                          −
                        </button>
                        <button type="button" className="mem-btn mem-btn--secondary" aria-label={`mais ${campo}`} onClick={() => contar(rota, campo, 1)}>
                          +1
                        </button>
                      </>
                    )}
                  </span>
                ))}
              </div>
            );
          })}
          <Colinha serve="Só contar, sem registrar cada pessoa. Isso mostra se o caminho está chegando em gente: é leitura do acesso, não da oferta." />
        </div>
      </article>

      {m.revisao?.texto && (
        <section className="mem-mentor ws-measure">
          <span className="mem-label mem-muted">A Karen olhou as suas primeiras exposições · {m.revisao.em ? dataCurta(m.revisao.em) : ""}</span>
          <p className="mem-mentor__text">{m.revisao.texto}</p>
          <span className="mem-mentor__sig">— Karen, mentora</span>
        </section>
      )}

      <article className="mem-card ws-padrao" id="exposicoes">
        <span className="mem-label mem-muted">Quem recebeu a proposta completa</span>
        <Colinha serve="Registre aqui só quem é parecido com quem você espera que compre, recebeu a apresentação inteira e uma proposta concreta, com o caminho para aceitar. Registre no mesmo dia." />
        {lista.length === 0 && <p className="mem-body-sm mem-muted">Ninguém ainda.</p>}
        <ul className="ws-lista-simples mem-body-sm">
          {lista.map((x, i) => {
            const e = ex(x);
            const comp = COMPORTAMENTOS.find((c) => c.valor === e.comportamento);
            const mot = MOTIVOS.find((c) => c.valor === e.motivo);
            const ct = corte(dados, x);
            return (
              <li key={x.id}>
                <strong>
                  {i + 1}. {e.perfil}
                </strong>{" "}
                · {comp?.rotulo ?? "—"} <span className="mem-muted">({e.ponto ? PONTOS[e.ponto].toLowerCase() : "—"})</span>
                {mot && <span className="mem-muted"> · parou: {mot.rotulo}</span>}
                {e.proxima && <span className="mem-tag mem-tag--relato"> próxima</span>}
                {e.compativel === "nao" && <span className="mem-tag mem-tag--pendencia"> fora do público</span>}
                {ct && <span className="mem-muted"> · {ct}</span>}
                <span className="mem-muted"> · {dataCurta(x.criado_em)}</span>
              </li>
            );
          })}
        </ul>
        {!travado &&
          (nova ? (
            <FormExposicao dados={dados} aoFechar={() => setNova(false)} aoSalvar={aoSalvar} />
          ) : (
            <div>
              <button type="button" className="mem-btn mem-btn--primary" onClick={() => setNova(true)}>
                Registrar uma pessoa · ~2 min
              </button>
            </div>
          ))}
      </article>

      <Mudancas dados={dados} travado={travado} aoSalvar={aoSalvar} />
    </>
  );
}

function FormExposicao({ dados, aoFechar, aoSalvar }: { dados: DadosJornada; aoFechar: () => void; aoSalvar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const teste = testeDe(dados);
  const [e, setE] = useState<Exposicao>({ rota: rotasEmUso(dados).slice(-1)[0], retomadas: 0, comprador: "pretendido" });
  const [erro, setErro] = useState(false);
  const comp = COMPORTAMENTOS.find((c) => c.valor === e.comportamento);
  const parou = comp && comp.ponto !== "forte";
  const pronta = !!e.perfil?.trim() && !!e.compativel && e.proxima !== undefined && !!e.comportamento && !!e.preco && (!parou || !!e.motivo);

  async function salvar() {
    if (!supabase || !pessoa || !teste) return;
    setErro(false);
    const r = await supabase.from("registro").insert({
      conta_id: dados.jornada.conta_id,
      jornada_id: dados.jornada.id,
      movimento_codigo: 9,
      tipo: "exposicao",
      origem_id: teste.id,
      conteudo: { ...e, ponto: comp?.ponto },
      autora_papel: "mentorada",
      autora_id: pessoa.id,
    });
    if (r.error) return setErro(true);
    await aoSalvar();
    aoFechar();
  }

  let k = 0;
  return (
    <div className="ws-conversa ws-form">
      <span className="mem-label mem-muted">Nova pessoa · sem nome</span>
      <Pergunta n={++k} feita={!!e.perfil?.trim()} titulo="Quem é, em uma linha">
        <input className="mem-input" aria-label="Perfil" value={e.perfil ?? ""} onChange={(x) => setE({ ...e, perfil: x.target.value })} />
        <Colinha serve="Sem nome. Só o suficiente para lembrar." exemplo="Gestor promovido há 2 meses, empresa de varejo." />
      </Pergunta>
      <Pergunta n={++k} feita={!!e.compativel} titulo={`É parecida com quem você espera que compre (${compradorPretendido(dados)})?`}>
        <Opcoes
          rotulo="Compatível"
          opcoes={[
            { valor: "sim", rotulo: "Sim" },
            { valor: "em_parte", rotulo: "Em parte" },
            { valor: "nao", rotulo: "Não" },
          ]}
          valor={e.compativel}
          aoEscolher={(v) => setE({ ...e, compativel: v as Exposicao["compativel"] })}
        />
      </Pergunta>
      <Pergunta n={++k} feita={e.proxima !== undefined} titulo="É uma pessoa próxima de você?">
        <Opcoes rotulo="Próxima" opcoes={SIM_NAO} valor={e.proxima === undefined ? undefined : e.proxima ? "sim" : "nao"} aoEscolher={(v) => setE({ ...e, proxima: v === "sim" })} />
      </Pergunta>
      {rotasEmUso(dados).length > 1 && (
        <Pergunta n={++k} feita={!!e.rota} titulo="Por onde ela conheceu?">
          <Opcoes rotulo="Rota" opcoes={rotasEmUso(dados).map((r) => ({ valor: r, rotulo: rotuloRota(r) }))} valor={e.rota} aoEscolher={(v) => setE({ ...e, rota: v })} />
        </Pergunta>
      )}
      <Pergunta n={++k} feita={!!e.comportamento} titulo="Até onde ela chegou?">
        <Opcoes rotulo="Até onde chegou" opcoes={COMPORTAMENTOS.map((c) => ({ valor: c.valor, rotulo: c.rotulo }))} valor={e.comportamento} aoEscolher={(v) => setE({ ...e, comportamento: v })} />
        <Colinha serve="O ponto mais avançado. O que custa tempo, exposição ou dinheiro vale mais. “Adorei, eu compraria” não conta como evidência." />
      </Pergunta>
      {comp?.ponto === "forte" && (
        <Pergunta n={++k} feita={!!e.comprador} titulo="Quem pagou foi quem você esperava?">
          <Opcoes
            rotulo="Comprador"
            opcoes={[
              { valor: "pretendido", rotulo: "Sim" },
              { valor: "outro", rotulo: "Não, outra pessoa pagou" },
            ]}
            valor={e.comprador}
            aoEscolher={(v) => setE({ ...e, comprador: v as Exposicao["comprador"] })}
          />
        </Pergunta>
      )}
      {parou && (
        <Pergunta n={++k} feita={!!e.motivo} titulo="Por que ela parou?">
          <Opcoes rotulo="Motivo" opcoes={MOTIVOS.map((m) => ({ valor: m.valor, rotulo: m.rotulo }))} valor={e.motivo} aoEscolher={(v) => setE({ ...e, motivo: v })} />
          <input className="mem-input" aria-label="Fala literal" placeholder="O que ela disse, literal (opcional)" value={e.fala ?? ""} onChange={(x) => setE({ ...e, fala: x.target.value })} />
          <Colinha serve="O motivo que ela disse é relato, não fato: vale quando se repete. Silêncio não é recusa." />
        </Pergunta>
      )}
      <Pergunta n={++k} feita={!!e.preco} titulo="E o preço?">
        <Opcoes rotulo="Preço" opcoes={PRECO} valor={e.preco} aoEscolher={(v) => setE({ ...e, preco: v })} />
      </Pergunta>
      <Pergunta n={++k} feita={e.retomadas !== undefined} titulo="Quantas vezes você retomou depois da proposta?">
        <Opcoes
          rotulo="Retomadas"
          opcoes={[
            { valor: "0", rotulo: "Nenhuma" },
            { valor: "1", rotulo: "Uma" },
            { valor: "2", rotulo: "Duas" },
          ]}
          valor={String(e.retomadas ?? 0)}
          aoEscolher={(v) => setE({ ...e, retomadas: Number(v) })}
        />
        <Colinha serve="No máximo duas. Depois disso, é pressão." />
      </Pergunta>
      {comp?.ponto === "forte" && (
        <label className="ws-check mem-body-sm">
          <input type="checkbox" checked={!!e.entrega} onChange={(x) => setE({ ...e, entrega: x.target.checked })} /> A entrega já começou
        </label>
      )}
      {erro && <p className="mem-body-sm">Não foi possível registrar. Tente de novo.</p>}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!pronta} onClick={salvar}>
          Registrar
        </button>
        <button type="button" className="mem-btn mem-btn--quiet" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Mudancas({ dados, travado, aoSalvar }: { dados: DadosJornada; travado: boolean; aoSalvar: () => Promise<void> }) {
  const t = dadosTeste(dados);
  const [aberta, setAberta] = useState(false);
  const [tipo, setTipo] = useState<string>();
  const [o, setO] = useState("");
  const [novaRota, setNovaRota] = useState<string>();
  const salvar = useSalvar(dados, aoSalvar);
  const feitos = new Set((t.mudancas ?? []).map((m) => m.tipo));
  return (
    <details className="ws-bloco" open={aberta || (t.mudancas ?? []).length > 0} onToggle={(e) => setAberta((e.target as HTMLDetailsElement).open)}>
      <summary className="mem-body-sm">Precisa mudar alguma coisa no meio do teste?</summary>
      <p className="mem-body-sm mem-muted">
        Horário, link, erro de digitação: mude à vontade. Preço, promessa e a oferta não mudam durante o teste. Se precisarem mudar, isso já é o resultado:
        avise a Karen. O que pode mudar, uma vez cada e com registro:
      </p>
      {(t.mudancas ?? []).length > 0 && (
        <ul className="ws-lista-simples mem-body-sm">
          {(t.mudancas ?? []).map((m, i) => (
            <li key={i}>
              {dataCurta(m.em)} · <strong>{MUDANCAS.find((x) => x.valor === m.tipo)?.rotulo}</strong>: {m.o_que}
            </li>
          ))}
        </ul>
      )}
      {!travado && (
        <div className="ws-form">
          <Opcoes
            rotulo="Tipo de mudança"
            opcoes={MUDANCAS.filter((m) => !feitos.has(m.valor)).map((m) => ({ valor: m.valor, rotulo: m.rotulo, detalhe: m.detalhe }))}
            valor={tipo}
            aoEscolher={setTipo}
          />
          {tipo === "rota" && (
            <Opcoes rotulo="Nova rota" opcoes={ROTAS.filter((r) => r.valor !== rotaInicial(dados)).map((r) => ({ valor: r.valor, rotulo: r.rotulo }))} valor={novaRota} aoEscolher={setNovaRota} />
          )}
          {tipo && <input className="mem-input" aria-label="O que mudou" placeholder="O que mudou, em uma linha" value={o} onChange={(e) => setO(e.target.value)} />}
          {tipo && (
            <div className="ws-acoes">
              <button
                type="button"
                className="mem-btn mem-btn--secondary"
                disabled={!o.trim() || (tipo === "rota" && !novaRota)}
                onClick={async () => {
                  const ok = await salvar((x) => ({
                    ...x,
                    mudancas: [...(x.mudancas ?? []), { tipo, o_que: tipo === "rota" ? `${novaRota}: ${o.trim()}` : o.trim(), em: new Date().toISOString() }],
                    contagem: tipo === "rota" && novaRota ? { ...(x.contagem ?? {}), [novaRota]: x.contagem?.[novaRota] ?? { tentados: 0, alcancados: 0 } } : x.contagem,
                  }));
                  if (ok) {
                    setTipo(undefined);
                    setO("");
                  }
                }}
              >
                Registrar a mudança
              </button>
            </div>
          )}
          <Colinha serve="A partir daqui, as pessoas que você registrar ficam marcadas como “depois da mudança”, para a leitura não misturar as duas fases." />
        </div>
      )}
    </details>
  );
}

// ---------------------------------------------------------------------
function Leitura({ dados, travado, aoSalvar }: { dados: DadosJornada; travado: boolean; aoSalvar: () => Promise<void> }) {
  const t = dadosTeste(dados);
  const [crit, setCrit] = useState(t.encerramento?.criterio);
  const [l, setL] = useState(() => ({ ...(t.leitura ?? {}), variaveis: { ...(t.leitura?.variaveis ?? {}) } }));
  const [estado, setEstado] = useState("");
  const salvar = useSalvar(dados, aoSalvar);
  const r = resumoFatos(dados);

  return (
    <article className="mem-card ws-padrao">
      <Pergunta n={1} feita={!!crit} titulo="Por que o teste terminou?">
        <Opcoes rotulo="Critério de fim" opcoes={CRITERIOS_FIM} valor={crit} aoEscolher={setCrit} />
        <Colinha serve="O que acontecer primeiro. Se a janela acabou com poucas pessoas, a leitura é inconclusiva, e tudo bem: é informação para o próximo passo, não falha." />
      </Pergunta>
      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">O que aconteceu, em números</p>
        <p className="mem-body-sm">
          {r.tentados} contatos tentados → {r.alcancados} responderam → {r.total} receberam a proposta completa · forte: {r.porPonto.forte} ·
          intermediária: {r.porPonto.intermediaria} · fraca: {r.porPonto.fraca} · não conta: {r.porPonto.nao_evidencia}
          {r.proximas ? ` · ${r.proximas} ${r.proximas === 1 ? "pessoa próxima" : "pessoas próximas"}` : ""}
        </p>
      </div>
      <Pergunta n={2} feita={Object.values(l.variaveis).some((x) => x?.trim())} titulo="O que isso permite dizer, parte por parte">
        {VARIAVEIS.map((v) => (
          <div key={v.chave} className="ws-padrao__parte">
            <p className="mem-body-sm">
              <strong>{v.rotulo}:</strong> <span className="mem-muted">{fatosVariavel(dados, v.chave).join(" · ")}</span>
            </p>
            <input
              className="mem-input"
              aria-label={`${v.rotulo}: o que permite dizer`}
              placeholder="O que isso permite dizer, e o que ainda não permite (opcional)"
              value={l.variaveis[v.chave] ?? ""}
              onChange={(e) => setL({ ...l, variaveis: { ...l.variaveis, [v.chave]: e.target.value } })}
            />
          </div>
        ))}
        <Colinha
          serve="Uma compra pode dizer muito sobre preço e nada sobre quem compra em geral. Onde não houve material, “sem evidência neste teste” é a resposta certa."
          exemplo="Preço: duas pessoas questionaram e seguiram; ninguém disse que era caro. Ainda não permite dizer se é o preço certo."
        />
      </Pergunta>
      <Pergunta n={3} feita={!!l.geral} titulo="A sua leitura geral">
        <Opcoes rotulo="Leitura" opcoes={LEITURAS} valor={l.geral} aoEscolher={(v) => setL({ ...l, geral: v })} />
      </Pergunta>
      <Pergunta n={4} feita={!!l.sintese?.trim()} titulo="O que sustenta essa leitura?">
        <textarea className="mem-input" rows={2} aria-label="O que sustenta a leitura" value={l.sintese ?? ""} onChange={(e) => setL({ ...l, sintese: e.target.value })} />
        <Colinha serve="Cite as partes acima que levam a essa leitura. Não é se você gostou das conversas." exemplo="Duas compras de gestores que eu não conhecia e três pediram proposta; ninguém disse que não tinha o problema." />
      </Pergunta>
      <Pergunta n={5} feita={!!l.limites?.trim()} titulo="O que essa leitura não permite dizer?">
        <input className="mem-input" aria-label="Limites" value={l.limites ?? ""} onChange={(e) => setL({ ...l, limites: e.target.value })} />
        <Colinha serve="Nenhuma leitura é “deu certo” ou “deu errado para sempre”." exemplo="Não permite dizer que outros vão comprar, nem que eu sei entregar: nenhuma entrega terminou." />
      </Pergunta>
      <Pergunta n={6} feita={!!l.abertas?.trim()} titulo="O que o teste não respondeu? (opcional)">
        <input className="mem-input" aria-label="Hipóteses abertas" value={l.abertas ?? ""} onChange={(e) => setL({ ...l, abertas: e.target.value })} />
      </Pergunta>
      {!travado && (
        <div className="ws-acoes">
          <button
            type="button"
            className="mem-btn mem-btn--primary"
            onClick={async () => {
              const ok = await salvar((x) => ({
                ...x,
                encerramento: crit ? { criterio: crit, em: x.encerramento?.em ?? new Date().toISOString() } : x.encerramento,
                leitura: l,
              }));
              setEstado(ok ? "salvo" : "erro");
            }}
          >
            {estado === "salvo" ? "Salvo" : "Guardar"}
          </button>
        </div>
      )}
      {l.geral && <p className="mem-body-sm mem-muted">Na Call 9, a Karen confere se as regras sustentam essa leitura. Se vocês discordarem, as duas leituras ficam registradas.</p>}
    </article>
  );
}

// Depois do Gate 7.
export function Resultado({ dados, paraMentora = false, final = false }: { dados: DadosJornada; paraMentora?: boolean; final?: boolean }) {
  const t = dadosTeste(dados);
  const m = mentoraTeste(dados);
  const r = resumoFatos(dados);
  return (
    <section className="ws-bloco ws-aposta">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">{paraMentora ? "O teste dela" : "O seu teste"}</span>
        <span className="mem-tag mem-tag--decisao">{rotuloLeitura(m.leitura_registrada ?? t.leitura?.geral)}</span>
      </div>
      <p className="mem-body-sm mem-muted">
        Teste comercial realizado de {t.desenho?.inicio ? dataCurta(t.desenho.inicio) : "—"} a {t.encerramento?.em ? dataCurta(t.encerramento.em) : "—"} ·{" "}
        {rotuloLeitura(m.leitura_registrada ?? t.leitura?.geral).toLowerCase()}{final ? "." : "; aguarda interpretação e decisão (Movimento 10)."}
      </p>
      <p className="mem-body-sm">
        {r.tentados} contatos tentados → {r.alcancados} responderam → {r.total} receberam a proposta completa · {r.compras}{" "}
        {r.compras === 1 ? "compra" : "compras"}
      </p>
      <p className="mem-body">
        <span className="mem-muted">O que sustenta:</span> {t.leitura?.sintese}
      </p>
      <p className="mem-body">
        <span className="mem-muted">O que não permite dizer:</span> {t.leitura?.limites}
      </p>
      {m.leitura_karen?.geral && m.leitura_karen.geral !== t.leitura?.geral && (
        <p className="mem-body">
          <span className="mem-muted">Leitura da Karen:</span> {rotuloLeitura(m.leitura_karen.geral)} · {m.leitura_karen.porque}
        </p>
      )}
      {!final && <p className="mem-body-sm mem-muted">O que fazer com isso é decidido no Movimento 10.</p>}
    </section>
  );
}

