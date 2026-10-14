import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { call, leitura, type DadosJornada } from "../../lib/jornada";
import { dataCurta, dataHora, somarHoras } from "../../lib/datas";
import { enviadoEm } from "../../lib/envio";
import {
  COMPORTAMENTOS,
  CRITERIOS_FIM,
  LEITURAS,
  MOTIVOS,
  PONTOS,
  VARIAVEIS,
  compradorPretendido,
  corte,
  dadosTeste,
  desenhoFeito,
  diaDaJanela,
  ex,
  exposicoes,
  fatosVariavel,
  mentoraTeste,
  resumoFatos,
  rotuloLeitura,
  rotuloRota,
  sinais,
  testeDe,
  type TesteMentora,
} from "../../lib/m9";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";
import NotaPrivada from "../../componentes/NotaPrivada";
import PublicarLeituraPartes from "../../componentes/PublicarLeituraPartes";
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import { Resultado } from "../mentorada/M9";

const NOTA_M9 = [
  {
    chave: "confrontos",
    rotulo: "Call 9 · até três pontos de confronto",
    ajuda: "Onde a leitura dela não se sustenta nos registros: acesso lido como oferta, opinião lida como comportamento, uma compra lida como conclusão. Um por linha.",
    exemplo: "Ela leu “desfavorável”, mas só 3 pessoas compatíveis receberam a proposta: é problema de acesso.",
  },
  {
    chave: "acesso_oferta",
    rotulo: "O que é acesso e o que é oferta",
    ajuda: "Separe antes da call: a rota chegou a quem devia? Só as exposições completas leem a oferta.",
    exemplo: "18 contatos, 5 responderam, 4 exposições: a rota não está chegando.",
  },
];

const VERIF_M9: { k: "v1" | "v2" | "v3" | "v4" | "v5" | "v6"; t: string }[] = [
  { k: "v1", t: "O teste terminou por um critério de fim" },
  { k: "v2", t: "Todas as exposições estão registradas, no mesmo dia, com até onde chegaram e o motivo, quando houve" },
  { k: "v3", t: "Contatos tentados e pessoas alcançadas estão contados por rota" },
  { k: "v4", t: "Toda mudança relevante está registrada, com o ponto de corte" },
  { k: "v5", t: "A evidência está organizada por parte, com o que permite e o que não permite dizer" },
  { k: "v6", t: "A leitura se apoia nas regras, não em como as conversas foram" },
];

const PARTES_C9 = [
  { chave: "o_que_aconteceu", rotulo: "O que aconteceu", exemplo: "Em 12 dias, 9 pessoas receberam a proposta completa; 2 compraram e 3 pediram proposta." },
  { chave: "a_leitura", rotulo: "A leitura", exemplo: "Evidência parcial: avanços que se repetem e duas compras, com o preço aparecendo como dúvida, não como recusa." },
  { chave: "o_que_vem", rotulo: "O que vem agora", exemplo: "No Movimento 10 você decide o que isso significa para a sua aposta e qual é o próximo passo." },
] as const;

// Seção do M9 na página da mentorada, vista pela mentora.
export default function SecaoM9({ dados, mentoriaId, recarregar }: { dados: DadosJornada; mentoriaId: string; recarregar: () => Promise<void> }) {
  const m9 = dados.movimentos.find((m) => m.codigo === 9)?.estado;
  if (!m9 || m9 === "nao_iniciado") return null;
  const te = testeDe(dados);
  const t = dadosTeste(dados);
  const m = mentoraTeste(dados);
  const passou = !!m.gate_em;
  const c9 = call(dados, 9);
  const leituraC9 = leitura(dados, "call_9");
  const n = exposicoes(dados).length;

  const passos: Passo[] = [
    { id: "m9-desenho", titulo: "Desenhar o teste", quem: "Ela", estado: desenhoFeito(t) ? "feito" : "esperando", nota: "logo depois da Call 8 · ~30 min" },
    { id: "m9-conf", titulo: "Conferir o desenho, por escrito", quem: "Você", estado: m.conferencia?.texto ? "feito" : desenhoFeito(t) ? "agora" : "depois", nota: "até 48 h" },
    { id: "m9-rev", titulo: "Revisar as duas primeiras exposições", quem: "Você", estado: m.revisao?.texto ? "feito" : n >= 2 ? "agora" : "depois", nota: "até 48 h, por escrito" },
    {
      id: "m9-janela",
      titulo: "Janela do teste e proposta de leitura",
      quem: "Ela",
      estado: t.leitura?.geral ? "feito" : desenhoFeito(t) ? "esperando" : "depois",
      nota: enviadoEm(dados, 9) ? `enviado ${dataHora(enviadoEm(dados, 9)!)}` : `${n} ${n === 1 ? "exposição" : "exposições"}`,
    },
    { id: "m9-call", titulo: "Call 9: leitura e Gate 7", quem: "Juntas", estado: passou ? "feito" : t.leitura?.geral ? "agora" : "depois", nota: c9 && !passou ? dataHora(c9.data_atual) : passou ? "o M10 abriu" : undefined },
    { id: "m9-leitura", titulo: "Publicar a leitura da Call 9", quem: "Você", estado: leituraC9 ? "feito" : passou ? "agora" : "depois", nota: leituraC9 ? undefined : "até 48 h" },
  ];

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M9 · Teste Comercial</h2>
      <Roteiro titulo="O caminho do M9" passos={passos} />
      {passou && (
        <Etapa n={0} passo={{ id: "m9-res", titulo: "Resultado do teste", quem: "Juntas", estado: "feito" }} aberta>
          <Resultado dados={dados} paraMentora />
        </Etapa>
      )}
      {!passou && te && <Fluxo dados={dados} mentoriaId={mentoriaId} passos={passos} recarregar={recarregar} />}
      {!te && <p className="mem-body mem-muted">Ela ainda não começou o desenho do teste.</p>}
      <Etapa n={6} passo={passos[5]} porque="O que aconteceu, a leitura e o que vem no M10. Nada de “validada”: isso só existe no M10, como decisão.">
        {leituraC9 ? (
          <LeituraKaren registro={leituraC9} />
        ) : passou ? (
          <PublicarLeituraPartes
            mentoriaId={mentoriaId}
            movimento={9}
            tipo="call_9"
            partes={PARTES_C9}
            prazo={c9 ? somarHoras(c9.data_realizada ?? c9.data_atual, 48) : null}
            rotuloBotao="Publicar leitura da Call 9"
            aoPublicar={recarregar}
          />
        ) : (
          <p className="mem-body mem-muted">Abre depois do Gate 7.</p>
        )}
      </Etapa>
    </section>
  );
}

function Fluxo({ dados, mentoriaId, passos, recarregar }: { dados: DadosJornada; mentoriaId: string; passos: Passo[]; recarregar: () => Promise<void> }) {
  const te = testeDe(dados)!;
  const t = dadosTeste(dados);
  const salvo = mentoraTeste(dados);
  const [m, setM] = useState<TesteMentora>(() => ({ ...salvo }));
  const [estado, setEstado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const c9 = call(dados, 9);
  const r = resumoFatos(dados);
  const j = diaDaJanela(t);
  const set = (n: Partial<TesteMentora>) => {
    setM({ ...m, ...n });
    setEstado("");
  };
  const v = m.verificacao ?? {};

  async function salvar(extra?: Partial<TesteMentora>): Promise<boolean> {
    if (!supabase) return false;
    setEstado("salvando");
    const novo = { ...m, ...(extra ?? {}) };
    setM(novo);
    const res = await supabase.from("registro").update({ conteudo_mentora: { ...(te.conteudo_mentora ?? {}), ...novo } }).eq("id", te.id);
    setEstado(res.error ? "erro" : "salvo");
    if (!res.error) await recarregar();
    return !res.error;
  }
  async function gate() {
    if (!supabase) return;
    setErro(null);
    setResultado(null);
    if (!(await salvar())) return setErro("Não foi possível salvar.");
    const res = await supabase.rpc("registrar_gate7", { p_teste: te.id });
    if (res.error) return setErro(res.error.message);
    if (res.data === "nao_passou") setResultado("O Gate 7 não passou: completem o registro no que ficou desmarcado e registre de novo.");
    await recarregar();
  }
  async function marcar() {
    if (!supabase || !c9) return;
    await supabase.from("encontro").update({ estado: "realizado", data_realizada: new Date().toISOString() }).eq("id", c9.id);
    await recarregar();
  }

  return (
    <>
      <Etapa n={1} passo={passos[0]} porque="Ela define de onde vêm os contatos e as datas. Quanto, por onde, retomadas e o que observar vêm do método e do M8.">
        {desenhoFeito(t) ? (
          <ul className="ws-lista-simples mem-body">
            <li>
              <strong>Contatos:</strong> {t.desenho?.fonte} <span className="mem-muted">· quem compra, segundo a aposta: {compradorPretendido(dados)}</span>
            </li>
            {t.desenho?.proximas && (
              <li>
                <strong>Próximas:</strong> {t.desenho.proximas}
              </li>
            )}
            <li>
              <strong>Janela:</strong> {t.desenho?.inicio && dataCurta(t.desenho.inicio)} a {t.desenho?.fim && dataCurta(t.desenho.fim)}
            </li>
          </ul>
        ) : (
          <p className="mem-body-sm mem-muted">Ela ainda não terminou o desenho.</p>
        )}
      </Etapa>

      <Etapa n={2} passo={passos[1]} porque="Sem call. A fonte de contatos é compatível com quem ela espera que compre? Há relações próximas demais? As datas cabem?">
        <EscritaKaren
          valor={m.conferencia?.texto ?? ""}
          rotulo="A sua conferência do desenho"
          exemplo="Fonte boa: ex-colegas promovidos são o público. Cuidado com as duas amigas: entram marcadas. As datas cabem."
          aoPublicar={(texto) => salvar({ conferencia: { texto, em: new Date().toISOString() } })}
          publicadoEm={m.conferencia?.em}
        />
      </Etapa>

      <Etapa n={3} passo={passos[2]} porque="A mesma lógica do M4: corrigir cedo para não contaminar o resto. Ela explicou demais? A promessa cresceu na fala? Houve pressão? Apresentou o preço?">
        <Exposicoes dados={dados} />
        {exposicoes(dados).length >= 2 || m.revisao?.texto ? (
          <EscritaKaren
            valor={m.revisao?.texto ?? ""}
            rotulo="A sua revisão das primeiras exposições"
            exemplo="Você apresentou o preço nas duas: ótimo. Na segunda, a promessa cresceu (“o time inteiro muda”): volte à frase da oferta."
            aoPublicar={(texto) => salvar({ revisao: { texto, em: new Date().toISOString() } })}
            publicadoEm={m.revisao?.em}
          />
        ) : (
          <p className="mem-body-sm mem-muted">Abre quando ela registrar as duas primeiras.</p>
        )}
      </Etapa>

      <Etapa n={4} passo={passos[3]} porque="Durante a janela, você só entra se ela pedir, ou num encontro curto de desbloqueio se, na metade, ninguém tiver recebido a proposta completa. Sempre sobre acesso, nunca sobre mudar a oferta.">
        <p className="mem-body">
          {j ? `Dia ${Math.max(0, j.dia)} de ${j.total}` : "—"} · {r.tentados} contatos → {r.alcancados} responderam → {r.total} exposições · {r.compras}{" "}
          {r.compras === 1 ? "compra" : "compras"}
        </p>
        {j && j.dia >= j.total / 2 && r.total === 0 && (
          <Aviso variante="warn" titulo="Metade da janela, nenhuma exposição completa">
            É o momento do encontro curto de desbloqueio, sobre acesso.
          </Aviso>
        )}
        {sinais(dados).map((s) => (
          <p key={s} className="mem-body-sm ws-pauta">
            {s}
          </p>
        ))}
        {(t.mudancas ?? []).length > 0 && (
          <ul className="ws-lista-simples mem-body-sm">
            {(t.mudancas ?? []).map((x, i) => (
              <li key={i}>
                Mudança em {dataCurta(x.em)} · {x.tipo}: {x.o_que}
              </li>
            ))}
          </ul>
        )}
      </Etapa>

      <Etapa n={5} passo={passos[4]} porque="Organizar, classificar e passar pelo Gate 7, sem decidir o próximo passo: isso é do M10. Se vocês discordarem, as duas leituras ficam registradas.">
        <p className="mem-body-lg">
          {c9 ? dataHora(c9.data_atual) : "—"} · {c9?.estado === "realizado" ? "realizada" : "marcada"}
        </p>
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--secondary" to={`/mentoradas/${dados.jornada.id}/call/9`}>
            Abrir guia da Call 9
          </Link>
          {c9 && c9.estado !== "realizado" && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={marcar}>
              Marcar Call 9 como realizada
            </button>
          )}
        </div>
        <NotaPrivada mentoriaId={mentoriaId} movimento={9} campos={NOTA_M9} titulo="Nota privada · M9 · só você vê" />

        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">Por parte · fatos e o que ela escreveu</span>
          {VARIAVEIS.map((x) => (
            <p key={x.chave} className="mem-body-sm">
              <strong>{x.rotulo}:</strong> {fatosVariavel(dados, x.chave).join(" · ")}
              {t.leitura?.variaveis?.[x.chave] && <span className="mem-muted"> · ela: {t.leitura.variaveis[x.chave]}</span>}
            </p>
          ))}
          <p className="mem-body">
            <strong>Leitura dela:</strong> {rotuloLeitura(t.leitura?.geral)} · {t.leitura?.sintese || "—"}
          </p>
          <p className="mem-body-sm mem-muted">Não permite dizer: {t.leitura?.limites || "—"}</p>
          <p className="mem-body-sm mem-muted">Fim: {CRITERIOS_FIM.find((c) => c.valor === t.encerramento?.criterio)?.rotulo ?? "ainda não encerrado"}</p>
        </article>

        <article className="mem-card ws-padrao">
          <Pergunta n={1} feita={!!m.leitura_karen?.geral} titulo="A sua leitura">
            <Opcoes
              rotulo="Leitura da Karen"
              opcoes={LEITURAS.map((l) => ({ valor: l.valor, rotulo: l.rotulo }))}
              valor={m.leitura_karen?.geral}
              aoEscolher={(g) => set({ leitura_karen: { ...(m.leitura_karen ?? {}), geral: g } })}
            />
            {m.leitura_karen?.geral && m.leitura_karen.geral !== t.leitura?.geral && (
              <input
                className="mem-input"
                aria-label="Por que você lê diferente"
                placeholder="Por que você lê diferente"
                value={m.leitura_karen?.porque ?? ""}
                onChange={(e) => set({ leitura_karen: { ...(m.leitura_karen ?? {}), porque: e.target.value } })}
              />
            )}
            <Colinha serve="Igual à dela, nada mais a escrever. Diferente: as duas ficam registradas e o M10 decide com as duas à vista. A leitura que vale no registro é a dela." />
          </Pergunta>
          <Pergunta n={2} feita={VERIF_M9.every((x) => v[x.k])} titulo="Gate 7 · a evidência está organizada o suficiente para o M10?">
            {VERIF_M9.map((x) => (
              <label key={x.k} className="ws-check mem-body-sm">
                <input type="checkbox" checked={!!v[x.k]} onChange={(e) => set({ verificacao: { ...v, [x.k]: e.target.checked } })} /> {x.t}
              </label>
            ))}
            <Colinha serve="Não exige compra, leitura favorável, preço certo nem comprador confirmado. Uma leitura inconclusiva passa: é informação para o M10." />
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
          <button type="button" className="mem-btn mem-btn--primary" disabled={!t.leitura?.geral || !t.encerramento?.criterio} onClick={gate}>
            Registrar o Gate 7
          </button>
        </div>
      </Etapa>
    </>
  );
}

function Exposicoes({ dados }: { dados: DadosJornada }) {
  const lista = exposicoes(dados);
  if (!lista.length) return <p className="mem-body-sm mem-muted">Nenhuma exposição registrada ainda.</p>;
  return (
    <ul className="ws-lista-simples mem-body-sm">
      {lista.map((x, i) => {
        const e = ex(x);
        return (
          <li key={x.id}>
            <strong>
              {i + 1}. {e.perfil}
            </strong>{" "}
            · {COMPORTAMENTOS.find((c) => c.valor === e.comportamento)?.rotulo} <span className="mem-muted">({e.ponto ? PONTOS[e.ponto].toLowerCase() : "—"})</span>
            {e.motivo && <span className="mem-muted"> · parou: {MOTIVOS.find((c) => c.valor === e.motivo)?.rotulo}</span>}
            {e.fala && <span className="mem-muted"> · “{e.fala}”</span>}
            <span className="mem-muted">
              {" "}
              · preço: {e.preco} · retomadas: {e.retomadas ?? 0} · {rotuloRota(e.rota)}
              {e.proxima ? " · próxima" : ""}
              {e.compativel !== "sim" ? ` · compatível: ${e.compativel}` : ""}
              {corte(dados, x) ? ` · ${corte(dados, x)}` : ""} · {dataCurta(x.criado_em)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function EscritaKaren({
  valor,
  rotulo,
  exemplo,
  aoPublicar,
  publicadoEm,
}: {
  valor: string;
  rotulo: string;
  exemplo: string;
  aoPublicar: (texto: string) => Promise<boolean>;
  publicadoEm?: string;
}) {
  const [texto, setTexto] = useState(valor);
  const [editando, setEditando] = useState(!valor);
  if (!editando)
    return (
      <div className="ws-sua-leitura">
        <p className="mem-body ws-serif">{valor}</p>
        <p className="mem-body-sm mem-muted">Ela vê isto desde {publicadoEm ? dataCurta(publicadoEm) : "—"}.</p>
        <div>
          <button type="button" className="mem-btn mem-btn--quiet" onClick={() => setEditando(true)}>
            Mudar
          </button>
        </div>
      </div>
    );
  return (
    <div className="ws-form">
      <label className="mem-field__label">{rotulo}</label>
      <textarea className="mem-input ws-serif" rows={3} aria-label={rotulo} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <Colinha serve="Curto, por escrito. Ela vê na tela dela, assinado por você." exemplo={exemplo} />
      <div className="ws-acoes">
        <button
          type="button"
          className="mem-btn mem-btn--primary"
          disabled={!texto.trim()}
          onClick={async () => {
            if (await aoPublicar(texto.trim())) setEditando(false);
          }}
        >
          Enviar para ela
        </button>
      </div>
    </div>
  );
}
