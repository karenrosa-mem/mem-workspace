import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { call, leitura, type DadosJornada } from "../../lib/jornada";
import { dataHora, somarHoras } from "../../lib/datas";
import { enviadoEm } from "../../lib/envio";
import { valorItem } from "../../lib/m6";
import {
  DECISOES,
  capacidadeNaoFecha,
  clientesSimultaneos,
  dadosOferta,
  etapas,
  faltaEnvioM7,
  hipotesesPadrao,
  mentoraOferta,
  ofertaDe,
  prontaCall6,
  reais,
  type OfertaMentora,
} from "../../lib/m7";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";
import NotaPrivada from "../../componentes/NotaPrivada";
import PublicarLeituraPartes from "../../componentes/PublicarLeituraPartes";
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Pergunta } from "../../componentes/Perguntas";
import { OfertaAssumida } from "../mentorada/M7";

export const CHECKLIST_M7 = [
  "A entrega está contida no destino, e a parte que fica de fora está escrita?",
  "A oferta é sobre o mesmo beneficiário e o mesmo problema do M6, e segue a direção da solução?",
  "Cada etapa do como serve à entrega?",
  "O diferencial responde ao que o público já tentou (ou está declarado como hipótese)?",
  "A conta de capacidade usa o tempo real dela e fecha para pelo menos um cliente?",
  "Alguma etapa depende de competência a confirmar? Está marcada e limitada?",
  "O preço tem um racional que ela consegue explicar?",
  "Apareceu linguagem de promessa? (sai da oferta; pode ir para as anotações do M8)",
];

export const VERIFICACOES_M7: { k: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7"; t: string; passa: string }[] = [
  { k: "v1", t: "Preserva a oportunidade do M6", passa: "Mesmo beneficiário, mesmo problema, e o como segue a direção da solução" },
  { k: "v2", t: "A entrega está contida no destino", passa: "Uma parte observável do destino, sem prometer mais, nem nas entrelinhas" },
  { k: "v3", t: "O como produz a entrega", passa: "Cada etapa serve à entrega, e juntas elas a produzem" },
  { k: "v4", t: "A forma é executável", passa: "Formato, duração e escopo podem ser cumpridos como descritos" },
  { k: "v5", t: "A capacidade fecha", passa: "Pelo menos um cliente nas condições de hoje; o que precisa estar pronto é viável" },
  { k: "v6", t: "Dependências de competência tratadas", passa: "Nenhuma escondida; a entrega principal não depende só do que está a confirmar" },
  { k: "v7", t: "Preço, condição e racional", passa: "Um valor, uma forma de pagamento e um porquê" },
];

const NOTA_M7 = [
  {
    chave: "confrontos",
    rotulo: "Até três pontos de confronto, em ordem",
    ajuda: "Só o que não fecha: entrega maior que o destino, etapa sem função, conta apertada, dependência escondida, preço sem racional. Um por linha.",
    exemplo: "A mensagem antes de cada conversa cabe na 1 h 30 por cliente?",
  },
  {
    chave: "recomendacao",
    rotulo: "Recomendação, se houver",
    ajuda: "O que você vai recomendar e por quê. Na call, registre se ela concordou.",
    exemplo: "Perguntar se 6 semanas são necessárias ou se 4 bastariam.",
  },
  {
    chave: "posse",
    rotulo: "Posse: a explicação sem olhar bateu com a oferta?",
    ajuda: "Preencha durante a call. Fica só aqui.",
    exemplo: "Explicou bem, mas não mencionou o que não está incluído.",
  },
];

const PARTES_C6 = [
  { chave: "o_que_foi_construido", rotulo: "O que foi construído", exemplo: "Uma oferta de acompanhamento individual de 6 semanas para gestores conduzirem sozinhos as cobranças que estavam adiando." },
  { chave: "o_que_e_hipotese", rotulo: "O que é hipótese", exemplo: "Se alguém compra por R$ 1.500 em 3 vezes, e se quem paga é o próprio gestor." },
  { chave: "o_que_segue_m8", rotulo: "O que segue para o Movimento 8", exemplo: "Agora a oferta ganha palavras: como você vai apresentá-la, sem prometer mais do que entrega." },
] as const;

// Seção do M7 na página da mentorada, vista pela mentora.
export default function SecaoM7({ dados, mentoriaId, recarregar }: { dados: DadosJornada; mentoriaId: string; recarregar: () => Promise<void> }) {
  const m7 = dados.movimentos.find((m) => m.codigo === 7)?.estado;
  if (!m7 || m7 === "nao_iniciado") return null;
  const of = ofertaDe(dados);
  const assumida = !!mentoraOferta(dados).assumida_em;
  const c6 = call(dados, 6);
  const leituraC6 = leitura(dados, "call_6");
  const falta = faltaEnvioM7(dados);

  const passos: Passo[] = [
    {
      id: "m7-dec",
      titulo: "Desenhar a oferta: 5 decisões e a última pergunta",
      quem: "Ela",
      estado: prontaCall6(dados) || assumida ? "feito" : "esperando",
      nota: enviadoEm(dados, 7) ? `enviado ${dataHora(enviadoEm(dados, 7)!)}` : falta.length ? `falta: ${falta.join("; ")}` : undefined,
    },
    { id: "m7-prep", titulo: "Preparar a Call 6", quem: "Você", estado: assumida ? "feito" : "agora", nota: "véspera · ~60 min" },
    {
      id: "m7-call",
      titulo: "Call 6: ela explica, sustenta e assume",
      quem: "Juntas",
      estado: assumida ? "feito" : "agora",
      nota: c6 && !assumida ? dataHora(c6.data_atual) : assumida ? "o M8 abriu" : undefined,
    },
    { id: "m7-leitura", titulo: "Publicar a leitura curta da Call 6", quem: "Você", estado: leituraC6 ? "feito" : assumida ? "agora" : "depois", nota: leituraC6 ? undefined : "até 48 h" },
  ];

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M7 · Desenhar a Oferta</h2>
      <Roteiro titulo="O caminho do M7" passos={passos} />

      <Etapa
        n={1}
        passo={passos[0]}
        aberta={!assumida}
        porque="Cinco decisões em ordem fixa (entrega, como, forma, capacidade, preço), com a oportunidade do M6 ao lado. Nada vem preenchido, e não existe “não sei”: insegura, ela decide e fica como hipótese."
      >
        {assumida ? <OfertaAssumida dados={dados} paraMentora /> : of ? <OfertaLadoALado dados={dados} /> : <p className="mem-body-sm mem-muted">Ela ainda não começou.</p>}
      </Etapa>

      {!assumida && of && <PreparacaoECall dados={dados} mentoriaId={mentoriaId} passos={passos} recarregar={recarregar} />}

      <Etapa n={4} passo={passos[3]} porque="O que foi construído, o que é hipótese e o que segue para o M8.">
        {leituraC6 ? (
          <LeituraKaren registro={leituraC6} />
        ) : assumida ? (
          <PublicarLeituraPartes
            mentoriaId={mentoriaId}
            movimento={7}
            tipo="call_6"
            partes={PARTES_C6}
            prazo={c6 ? somarHoras(c6.data_realizada ?? c6.data_atual, 48) : null}
            rotuloBotao="Publicar leitura da Call 6"
            aoPublicar={recarregar}
          />
        ) : (
          <p className="mem-body mem-muted">Abre depois que ela assumir a oferta.</p>
        )}
      </Etapa>
    </section>
  );
}

// A oferta e a oportunidade lado a lado (pedido da especificação: a relação entrega × destino evidente).
function OfertaLadoALado({ dados }: { dados: DadosJornada }) {
  const o = dadosOferta(dados);
  const cs = clientesSimultaneos(o);
  return (
    <div className="mem-table-wrap">
      <table className="mem-table mem-body-sm">
        <thead>
          <tr>
            <th>Do M6</th>
            <th>Na oferta dela</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span className="mem-muted">Destino:</span> {valorItem(dados, "destino") || "—"}
            </td>
            <td>
              <strong>Entrega:</strong> {o.entrega?.texto || "—"}
              <br />
              <span className="mem-muted">Cobre: {o.entrega?.cobre || "—"} · fica de fora: {o.entrega?.fora || "—"}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span className="mem-muted">Direção:</span> {valorItem(dados, "direcao") || "—"}
            </td>
            <td>
              <strong>Como:</strong> {etapas(o).map((e, i) => `${i + 1}) ${e}`).join(" ") || "—"}
              <br />
              <span className="mem-muted">Diferencial: {o.como?.diferencial || "—"}</span>
              {Object.entries(o.como?.competencia ?? {}).map(([i, c]) => (
                <span key={i} className="mem-muted">
                  <br />
                  Etapa {Number(i) + 1} apoiada em competência a confirmar: {c.qual || "—"} · já fez de parecido: {c.ja_fez || "—"}
                </span>
              ))}
            </td>
          </tr>
          <tr>
            <td>
              <span className="mem-muted">Para quem:</span> {valorItem(dados, "beneficiario") || "—"}
            </td>
            <td>
              <strong>Forma:</strong> {o.forma?.texto || "—"}
              <br />
              <span className="mem-muted">Inclui: {o.forma?.inclui || "—"} · não inclui: {o.forma?.exclui || "—"}</span>
            </td>
          </tr>
          <tr>
            <td className="mem-muted">—</td>
            <td>
              <strong>Capacidade:</strong> {o.capacidade?.horas_semana ?? "—"} h/semana · {o.capacidade?.horas_cliente ?? "—"} h/cliente →{" "}
              {cs === null ? "—" : `até ${cs}`}
              {capacidadeNaoFecha(dados) && <strong> · não fecha</strong>}
              <br />
              <span className="mem-muted">Antes da primeira venda: {o.capacidade?.pronto_antes || "—"}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span className="mem-muted">Comprador pretendido:</span> {valorItem(dados, "comprador") || "—"}
            </td>
            <td>
              <strong>Preço:</strong> {reais(o.preco?.valor)}, {o.preco?.condicao || "—"}
              <br />
              <span className="mem-muted">Racional: {o.preco?.racional || "—"}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mem-body">
        <span className="mem-muted">Por que assim:</span> “{o.transversal || "—"}”
      </p>
      {o.anotacoes_m8?.trim() && <p className="mem-body-sm mem-muted">Anotado para o M8: {o.anotacoes_m8}</p>}
    </div>
  );
}

function PreparacaoECall({ dados, mentoriaId, passos, recarregar }: { dados: DadosJornada; mentoriaId: string; passos: Passo[]; recarregar: () => Promise<void> }) {
  const of = ofertaDe(dados)!;
  const o = dadosOferta(dados);
  const salvo = mentoraOferta(dados);
  const [m, setM] = useState<OfertaMentora>(() => ({ ...salvo, hipoteses: salvo.hipoteses ?? hipotesesPadrao(dados), recomendacoes: salvo.recomendacoes ?? [] }));
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const c6 = call(dados, 6);
  const set = (n: Partial<OfertaMentora>) => {
    setM({ ...m, ...n });
    setEstado("");
  };
  const hip = m.hipoteses ?? [];
  const rec = m.recomendacoes ?? [];
  const v = m.verificacao ?? {};
  const deps = Object.entries(o.como?.competencia ?? {});

  async function salvar(): Promise<boolean> {
    if (!supabase) return false;
    setEstado("salvando");
    const r = await supabase.from("registro").update({ conteudo_mentora: { ...(of.conteudo_mentora ?? {}), ...m } }).eq("id", of.id);
    setEstado(r.error ? "erro" : "salvo");
    return !r.error;
  }
  async function assumir() {
    if (!supabase) return;
    setErro(null);
    setResultado(null);
    if (!(await salvar())) return setErro("Não foi possível salvar.");
    const r = await supabase.rpc("assumir_oferta", { p_registro: of.id });
    if (r.error) return setErro(r.error.message);
    if (r.data === "nao_passou") setResultado("A passagem não aconteceu: ajustem a oferta no que ficou desmarcado e registre de novo.");
    await recarregar();
  }
  async function marcarRealizada() {
    if (!supabase || !c6) return;
    await supabase.from("encontro").update({ estado: "realizado", data_realizada: new Date().toISOString() }).eq("id", c6.id);
    await recarregar();
  }

  return (
    <>
      <Etapa n={2} passo={passos[1]} porque="Leia a oferta contra a oportunidade. Até três pontos de confronto; o que está coerente não ocupa tempo de call.">
        {capacidadeNaoFecha(dados) && (
          <Aviso variante="warn" titulo="A conta de capacidade não fecha">
            Com as horas que ela registrou, não cabe nem um cliente. Na call: reduzir a forma, o tempo por cliente ou o escopo.
          </Aviso>
        )}
        <details className="ws-referencia" open>
          <summary className="mem-body-sm">Antes da Call 6 · o que conferir</summary>
          <ol className="ws-lista-simples mem-body-sm">
            {CHECKLIST_M7.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </details>

        {deps.length > 0 && (
          <article className="mem-card ws-padrao">
            <span className="mem-label mem-muted">Etapas apoiadas em competência a confirmar</span>
            {deps.map(([i, c]) => {
              const cm = m.competencia?.[i] ?? {};
              const setC = (n: Partial<typeof cm>) => set({ competencia: { ...(m.competencia ?? {}), [i]: { ...cm, ...n } } });
              return (
                <div key={i} className="ws-form">
                  <p className="mem-body">
                    Etapa {Number(i) + 1}: {etapas(o)[Number(i)] ?? "—"} <span className="mem-muted">· {c.qual} · já fez de parecido: {c.ja_fez || "—"}</span>
                  </p>
                  <input className="mem-input" aria-label="Limite" placeholder="Limite: a oferta não pode garantir que…" value={cm.limite ?? ""} onChange={(e) => setC({ limite: e.target.value })} />
                  <input className="mem-input" aria-label="Observação" placeholder="Onde e quando observar" value={cm.observacao ?? ""} onChange={(e) => setC({ observacao: e.target.value })} />
                </div>
              );
            })}
            <Colinha
              serve="Marca, limite e observação. Só bloqueia se a entrega principal depender disso. Venda não confirma competência."
              exemplo="Limite: a oferta não pode garantir que o gestor saberá revisar sozinho as próprias conversas. Observar: nas primeiras entregas e no M10."
            />
          </article>
        )}

        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">O que o teste vai mostrar · hipóteses que seguem para o M8 e o M9</span>
          {hip.map((x, i) => (
            <input key={i} className="mem-input" aria-label={`Hipótese ${i + 1}`} value={x} onChange={(e) => set({ hipoteses: hip.map((y, j) => (j === i ? e.target.value : y)) })} />
          ))}
          <div>
            <button type="button" className="mem-btn mem-btn--quiet" onClick={() => set({ hipoteses: [...hip, ""] })}>
              Mais uma
            </button>
          </div>
          <Colinha serve="Já vem um rascunho a partir da oferta dela. Complete ou apague. Ela vê esta lista depois que assumir." />
        </article>

        <NotaPrivada mentoriaId={mentoriaId} movimento={7} campos={NOTA_M7} aberta titulo="Nota privada · M7 · só você vê" />
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={salvar} disabled={estado === "salvando"}>
            {estado === "salvando" ? "Salvando" : estado === "salvo" ? "Salvo" : "Salvar preparação"}
          </button>
        </div>
      </Etapa>

      <Etapa
        n={3}
        passo={passos[2]}
        porque="Ela explica a oferta sem olhar, vocês confrontam coerência, como e forma, capacidade e preço, e ela assume. Você não aprova: confere se a passagem é possível."
      >
        <p className="mem-body-lg">
          {c6 ? dataHora(c6.data_atual) : "—"} · {c6?.estado === "realizado" ? "realizada" : "marcada"}
        </p>
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--secondary" to={`/mentoradas/${dados.jornada.id}/call/6`}>
            Abrir guia da Call 6
          </Link>
          {c6 && c6.estado !== "realizado" && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={marcarRealizada}>
              Marcar Call 6 como realizada
            </button>
          )}
        </div>
        <article className="mem-card ws-padrao">
          <Pergunta n={1} feita={rec.some((r) => r.texto.trim())} titulo="Suas recomendações e se ela concordou (opcional)">
            {rec.map((r, i) => (
              <div key={i} className="ws-form">
                <input className="mem-input" aria-label={`Recomendação ${i + 1}`} value={r.texto} onChange={(e) => set({ recomendacoes: rec.map((y, j) => (j === i ? { ...y, texto: e.target.value } : y)) })} />
                <label className="ws-check mem-body-sm">
                  <input type="checkbox" checked={!!r.concordou} onChange={(e) => set({ recomendacoes: rec.map((y, j) => (j === i ? { ...y, concordou: e.target.checked } : y)) })} /> Ela concordou
                </label>
              </div>
            ))}
            <div>
              <button type="button" className="mem-btn mem-btn--quiet" onClick={() => set({ recomendacoes: [...rec, { texto: "" }] })}>
                {rec.length ? "Mais uma" : "Registrar uma recomendação"}
              </button>
            </div>
            <Colinha serve="Ela vê as recomendações e se concordou, junto da oferta." exemplo="Reduzir de 6 para 4 semanas." />
          </Pergunta>
          <Pergunta n={2} feita={VERIFICACOES_M7.every((x) => v[x.k])} titulo="As sete verificações da passagem">
            {VERIFICACOES_M7.map((x) => (
              <label key={x.k} className="ws-check mem-body-sm">
                <input type="checkbox" checked={!!v[x.k]} onChange={(e) => set({ verificacao: { ...v, [x.k]: e.target.checked } })} />{" "}
                <span>
                  <strong>{x.t}.</strong> <span className="mem-muted">{x.passa}</span>
                </span>
              </label>
            ))}
            <Colinha serve="Se alguma não passa, ajustem a oferta na call (ela edita na tela dela) e registre. Registrando com alguma desmarcada, a passagem fica “não passou”, com o motivo." />
          </Pergunta>
        </article>
        {!prontaCall6(dados) && (
          <Aviso variante="warn" titulo="Para registrar, falta">
            ela terminar as cinco decisões e a última pergunta.
          </Aviso>
        )}
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
          <button type="button" className="mem-btn mem-btn--primary" disabled={!prontaCall6(dados)} onClick={assumir}>
            Registrar: ela assume a oferta
          </button>
        </div>
      </Etapa>
    </>
  );
}

export { DECISOES };
