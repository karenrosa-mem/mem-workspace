import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { call, leitura, type DadosJornada } from "../../lib/jornada";
import { dataCurta, dataHora, somarHoras } from "../../lib/datas";
import { enviadoEm } from "../../lib/envio";
import { dadosOferta, limitesDaOferta } from "../../lib/m7";
import {
  CAMINHO,
  DECIDIR_NO_M9,
  ROTAS,
  call7Feita,
  caminhoPronto,
  dadosPreparo,
  falasDesejo,
  faltaEnvioM8,
  hipotesesM9,
  limitesDoTeste,
  mentoraPreparo,
  preparoDe,
  prontaCall7,
  tentativas,
  vocabularioMem,
  type PreparoMentora,
} from "../../lib/m8";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";
import NotaPrivada from "../../componentes/NotaPrivada";
import PublicarLeituraPartes from "../../componentes/PublicarLeituraPartes";
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Pergunta } from "../../componentes/Perguntas";
import { PreparoAssumido } from "../mentorada/M8";

const NOTA_M8 = [
  {
    chave: "confrontos",
    rotulo: "Call 7 · até três pontos de confronto, em ordem",
    ajuda: "Promessa que passa do que a oferta entrega, “por que do seu jeito” que inventa superioridade, palavra da mentoria no resumo. Você não reescreve: diz o que não funciona e por quê. Um por linha.",
    exemplo: "A promessa fala em “time que cumpre tudo”, que está na lista do que fica de fora.",
  },
  {
    chave: "papel",
    rotulo: "Call 8 · o papel que você vai fazer",
    ajuda: "Uma pessoa do público que nunca ouviu falar da mentoria, montada a partir das falas e tentativas ao lado. No papel: pergunte, duvide, peça o preço. Nunca diga “eu compraria”.",
    exemplo: "Gestor promovido há 3 meses, já leu um livro de liderança, desconfia de “mais um curso”, quer saber quanto tempo toma.",
  },
  {
    chave: "recomendacao",
    rotulo: "Recomendação, se houver",
    ajuda: "Na call, registre se ela concordou.",
    exemplo: "Trocar “acompanhamento” por “seis semanas, uma conversa por vez”.",
  },
  {
    chave: "posse",
    rotulo: "Posse: ela apresentou sem olhar e sem palavras da mentoria?",
    ajuda: "Preencha durante as calls. Fica só aqui.",
    exemplo: "Na Call 7 leu o resumo; na Call 8 falou sem olhar, em 50 segundos.",
  },
];

const VERIF_M8: { k: "compreensao" | "contencao" | "caminho" | "continuidade" | "proporcionalidade"; t: string; passa: string }[] = [
  { k: "compreensao", t: "Compreensão", passa: "No papel de alguém de fora, você consegue dizer o que é, para quem, que mudança, o que recebe, quanto e como avança; o resumo se sustenta sozinho" },
  { k: "contencao", t: "Contenção", passa: "A promessa passa nas duas perguntas; nada do que fica de fora nem dos limites aparece; nada depende de competência a confirmar" },
  { k: "caminho", t: "Caminho disponível", passa: "Interesse, aceite, pagamento e início estão prontos e foram percorridos por vocês duas, sem improviso" },
  { k: "continuidade", t: "Continuidade", passa: "É a oferta do M7: mesma entrega, forma, escopo, capacidade; preço e condição iguais ou alterados com razão registrada" },
  { k: "proporcionalidade", t: "Proporcionalidade", passa: "A rota não convida mais gente do que a capacidade comporta sem um jeito de lidar (agenda, lista de espera)" },
];

const PARTES_C8 = [
  { chave: "o_que_preparamos", rotulo: "O que preparamos", exemplo: "A sua oferta tem uma promessa do tamanho do que você entrega, um resumo que se lê sozinho e um caminho que funciona do primeiro contato ao pagamento." },
  { chave: "o_que_e_hipotese", rotulo: "O que é hipótese", exemplo: "Se as pessoas acreditam na promessa, se pagam R$ 1.500 e se a sua rede alcança quem compra." },
  { chave: "o_que_vem", rotulo: "O que vem agora", exemplo: "No Movimento 9 você desenha o teste: quem abordar, quantas pessoas e por quanto tempo." },
] as const;

// Seção do M8 na página da mentorada, vista pela mentora.
export default function SecaoM8({ dados, mentoriaId, recarregar }: { dados: DadosJornada; mentoriaId: string; recarregar: () => Promise<void> }) {
  const m8 = dados.movimentos.find((m) => m.codigo === 8)?.estado;
  if (!m8 || m8 === "nao_iniciado") return null;
  const pr = preparoDe(dados);
  const p = dadosPreparo(dados);
  const assumida = !!mentoraPreparo(dados).assumida_em;
  const c7 = call(dados, 7);
  const c8 = call(dados, 8);
  const leituraC8 = leitura(dados, "call_8");
  const falta = faltaEnvioM8(dados);

  const passos: Passo[] = [
    {
      id: "m8-dec",
      titulo: "Promessa, “por que do seu jeito”, apresentação e rota",
      quem: "Ela",
      estado: prontaCall7(dados) || assumida ? "feito" : "esperando",
      nota: enviadoEm(dados, 8) ? `enviado ${dataHora(enviadoEm(dados, 8)!)}` : "antes da Call 7",
    },
    { id: "m8-prep", titulo: "Preparar as Calls 7 e 8", quem: "Você", estado: assumida ? "feito" : "agora", nota: "~45–60 min + ~30 min" },
    {
      id: "m8-c7",
      titulo: "Call 7: traduzir",
      quem: "Juntas",
      estado: call7Feita(dados) || assumida ? "feito" : "agora",
      nota: c7 && !call7Feita(dados) ? dataHora(c7.data_atual) : undefined,
    },
    {
      id: "m8-caminho",
      titulo: "Deixar o caminho pronto, percorrer e ensaiar",
      quem: "Ela",
      estado: caminhoPronto(p) || assumida ? "feito" : call7Feita(dados) ? "esperando" : "depois",
      nota: falta.filter((x) => x.startsWith("caminho")).length ? falta.filter((x) => x.startsWith("caminho")).join("; ") : undefined,
    },
    {
      id: "m8-c8",
      titulo: "Call 8: ensaio, Gate 6 e passagem para o teste",
      quem: "Juntas",
      estado: assumida ? "feito" : call7Feita(dados) ? "agora" : "depois",
      nota: c8 && !assumida ? dataHora(c8.data_atual) : assumida ? "o M9 abriu" : undefined,
    },
    { id: "m8-leitura", titulo: "Publicar a leitura curta da Call 8", quem: "Você", estado: leituraC8 ? "feito" : assumida ? "agora" : "depois", nota: leituraC8 ? undefined : "até 48 h" },
  ];

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M8 · Preparar para o Mercado</h2>
      <Roteiro titulo="O caminho do M8" passos={passos} />

      <Etapa
        n={1}
        passo={passos[0]}
        aberta={!assumida}
        porque="O M8 muda como a oferta é dita, nunca o que ela é. Ela escreve a promessa e o “por que do seu jeito”, ajusta o resumo montado a partir do M7 e escolhe a rota inicial, como hipótese."
      >
        {assumida ? <PreparoAssumido dados={dados} paraMentora /> : pr ? <LadoALado dados={dados} /> : <p className="mem-body-sm mem-muted">Ela ainda não começou.</p>}
      </Etapa>

      {!assumida && pr && <Fluxo dados={dados} mentoriaId={mentoriaId} passos={passos} recarregar={recarregar} />}

      <Etapa n={6} passo={passos[5]} porque="O que preparamos, o que é hipótese e o que vem no M9.">
        {leituraC8 ? (
          <LeituraKaren registro={leituraC8} />
        ) : assumida ? (
          <PublicarLeituraPartes
            mentoriaId={mentoriaId}
            movimento={8}
            tipo="call_8"
            partes={PARTES_C8}
            prazo={c8 ? somarHoras(c8.data_realizada ?? c8.data_atual, 48) : null}
            rotuloBotao="Publicar leitura da Call 8"
            aoPublicar={recarregar}
          />
        ) : (
          <p className="mem-body mem-muted">Abre depois do Gate 6.</p>
        )}
      </Etapa>
    </section>
  );
}

function LadoALado({ dados }: { dados: DadosJornada }) {
  const p = dadosPreparo(dados);
  const o = dadosOferta(dados);
  const vocab = vocabularioMem(p.resumo);
  return (
    <>
      <div className="mem-table-wrap">
        <table className="mem-table mem-body-sm">
          <thead>
            <tr>
              <th>Do M7</th>
              <th>No M8, dela</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="mem-muted">Entrega:</span> {o.entrega?.texto || "—"}
                <br />
                <span className="mem-muted">Fica de fora:</span> {o.entrega?.fora || "—"}
                <br />
                <span className="mem-muted">Limites:</span> {limitesDaOferta(dados).join(" · ") || "—"}
              </td>
              <td>
                <strong>Promessa:</strong> {p.promessa?.texto || "—"}
                <br />
                <span className="mem-muted">
                  Ela respondeu: cumprida? {p.promessa?.cumprimento === "sim" ? "sim" : p.promessa?.cumprimento ? "não" : "—"} · já está na entrega?{" "}
                  {p.promessa?.origem === "contida" ? "sim" : p.promessa?.origem ? "não" : "—"}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="mem-muted">Diferencial:</span> {o.como?.diferencial || "—"}
              </td>
              <td>
                <strong>Por que do seu jeito:</strong> {p.abordagem?.texto || "—"}
                {p.abordagem?.nome && <span className="mem-muted"> · nome: {p.abordagem.nome}</span>}
              </td>
            </tr>
            <tr>
              <td className="mem-muted">Rota</td>
              <td>
                {ROTAS.find((r) => r.valor === p.rota?.tipo)?.rotulo ?? "—"} <span className="mem-muted">· {p.rota?.porque || "—"}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="ws-padrao__parte">
        <p className="mem-label mem-muted">Resumo escrito · leia como alguém que nunca ouviu falar da mentoria</p>
        <p className="mem-body ws-pre">{p.resumo || "—"}</p>
        {vocab.length > 0 && <p className="mem-body-sm">Palavras da mentoria no resumo: {vocab.join(", ")}.</p>}
        <p className="mem-body-sm mem-muted">Falada: {p.falada?.ensaiada_em ? `ensaiada em ${dataCurta(p.falada.ensaiada_em)}` : "ainda não ensaiada"}</p>
      </div>
    </>
  );
}

function Fluxo({ dados, mentoriaId, passos, recarregar }: { dados: DadosJornada; mentoriaId: string; passos: Passo[]; recarregar: () => Promise<void> }) {
  const pr = preparoDe(dados)!;
  const p = dadosPreparo(dados);
  const salvo = mentoraPreparo(dados);
  const [m, setM] = useState<PreparoMentora>(() => ({
    ...salvo,
    objecoes: salvo.objecoes ?? [],
    ajustes: salvo.ajustes ?? [],
    hipoteses: salvo.hipoteses ?? hipotesesM9(dados),
    recomendacoes: salvo.recomendacoes ?? [],
    handoff: salvo.handoff ?? { materiais: "", decidir_no_m9: DECIDIR_NO_M9 },
  }));
  const [estado, setEstado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const c7 = call(dados, 7);
  const c8 = call(dados, 8);
  const set = (n: Partial<PreparoMentora>) => {
    setM({ ...m, ...n });
    setEstado("");
  };
  const obj = m.objecoes ?? [];
  const aj = m.ajustes ?? [];
  const hip = m.hipoteses ?? [];
  const rec = m.recomendacoes ?? [];
  const v = m.verificacao ?? {};

  async function salvar(): Promise<boolean> {
    if (!supabase) return false;
    setEstado("salvando");
    const r = await supabase.from("registro").update({ conteudo_mentora: { ...(pr.conteudo_mentora ?? {}), ...m } }).eq("id", pr.id);
    setEstado(r.error ? "erro" : "salvo");
    return !r.error;
  }
  async function assumir() {
    if (!supabase) return;
    setErro(null);
    setResultado(null);
    if (!(await salvar())) return setErro("Não foi possível salvar.");
    const r = await supabase.rpc("assumir_preparo", { p_registro: pr.id });
    if (r.error) return setErro(r.error.message);
    if (r.data === "nao_passou") setResultado("O Gate 6 não passou: ajustem o que ficou desmarcado e registre de novo.");
    await recarregar();
  }
  async function marcar(n: number) {
    const c = call(dados, n);
    if (!supabase || !c) return;
    await supabase.from("encontro").update({ estado: "realizado", data_realizada: new Date().toISOString() }).eq("id", c.id);
    await recarregar();
  }

  return (
    <>
      <Etapa n={2} passo={passos[1]} porque="Antes da Call 7: aplique as duas perguntas à promessa, confira o “por que do seu jeito” contra o diferencial e leia o resumo como alguém de fora. Antes da Call 8: monte o papel de uma pessoa do público.">
        <details className="ws-referencia" open>
          <summary className="mem-body-sm">As duas perguntas da promessa</summary>
          <ol className="ws-lista-simples mem-body-sm">
            <li>
              <strong>Cumprimento.</strong> Se esta pessoa comprar e receber exatamente o que o M7 descreve, ela vai reconhecer que a promessa foi cumprida?
            </li>
            <li>
              <strong>Origem.</strong> A mudança já está na entrega, ou a promessa acrescenta uma transformação que a oferta não produz?
            </li>
          </ol>
          <p className="mem-body-sm mem-muted">
            Se a promessa só fica de pé com uma entrega maior, não é problema de palavras: é retorno pontual ao M7, na decisão da entrega.
          </p>
        </details>
        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">Para montar o papel da Call 8 · falas e tentativas do M4</span>
          <ul className="ws-lista-simples mem-body-sm">
            {[...falasDesejo(dados), ...tentativas(dados).map((x) => `Já tentou: ${x}`)].map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </article>
        <NotaPrivada mentoriaId={mentoriaId} movimento={8} campos={NOTA_M8} aberta titulo="Nota privada · M8 · só você vê" />
      </Etapa>

      <Etapa n={3} passo={passos[2]} porque="Promessa, “por que do seu jeito”, apresentação falada e rota. Você não reescreve: diz o que não funciona e por quê; ela reescreve na tela dela.">
        <p className="mem-body-lg">
          {c7 ? dataHora(c7.data_atual) : "—"} · {c7?.estado === "realizado" ? "realizada" : "marcada"}
        </p>
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--secondary" to={`/mentoradas/${dados.jornada.id}/call/7`}>
            Abrir guia da Call 7
          </Link>
          {c7 && c7.estado !== "realizado" && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={() => marcar(7)}>
              Marcar Call 7 como realizada
            </button>
          )}
        </div>
        {!prontaCall7(dados) && <p className="mem-body-sm mem-muted">Ela ainda não terminou as quatro decisões.</p>}
      </Etapa>

      <Etapa n={4} passo={passos[3]} porque="Entre as calls, ela deixa os quatro passos disponíveis (meio de pagamento, agenda, o que precisava estar pronto), percorre cada um e ensaia.">
        <ul className="ws-lista-simples mem-body">
          {CAMINHO.map((x) => {
            const c = p.caminho?.[x.chave];
            return (
              <li key={x.chave}>
                <strong>{x.titulo}:</strong> {c?.como || "—"} <span className="mem-muted">· {c?.percorrido ? "percorrido por ela" : "ainda não percorrido"}</span>
              </li>
            );
          })}
        </ul>
      </Etapa>

      <Etapa n={5} passo={passos[4]} porque="Parte A: ela apresenta, você responde no papel, sai do papel e devolve o que entendeu, vocês percorrem o caminho, registram até três objeções e conferem o Gate 6. Parte B: só o registro do que o M9 recebe, sem desenhar o teste.">
        <p className="mem-body-lg">
          {c8 ? dataHora(c8.data_atual) : "—"} · {c8?.estado === "realizado" ? "realizada" : "marcada"}
        </p>
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--secondary" to={`/mentoradas/${dados.jornada.id}/call/8`}>
            Abrir guia da Call 8
          </Link>
          {c8 && c8.estado !== "realizado" && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={() => marcar(8)}>
              Marcar Call 8 como realizada
            </button>
          )}
        </div>

        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">Parte A</span>
          <Pergunta n={1} feita={obj.some((x) => x.texto.trim())} titulo="Objeções previsíveis (até três, com origem)">
            {obj.map((x, i) => (
              <div key={i} className="ws-form">
                <input className="mem-input" aria-label={`Objeção ${i + 1}`} placeholder="A objeção, como a pessoa diria" value={x.texto} onChange={(e) => set({ objecoes: obj.map((y, j) => (j === i ? { ...y, texto: e.target.value } : y)) })} />
                <input className="mem-input" aria-label={`Origem ${i + 1}`} placeholder="De onde veio: fala ou tentativa do M4, ou o ensaio" value={x.origem} onChange={(e) => set({ objecoes: obj.map((y, j) => (j === i ? { ...y, origem: e.target.value } : y)) })} />
                <input className="mem-input" aria-label={`Resposta ${i + 1}`} placeholder="A resposta dela, dentro do que a oferta entrega" value={x.resposta} onChange={(e) => set({ objecoes: obj.map((y, j) => (j === i ? { ...y, resposta: e.target.value } : y)) })} />
              </div>
            ))}
            {obj.length < 3 && (
              <div>
                <button type="button" className="mem-btn mem-btn--quiet" onClick={() => set({ objecoes: [...obj, { texto: "", origem: "", resposta: "" }] })}>
                  {obj.length ? "Mais uma" : "Registrar uma objeção"}
                </button>
              </div>
            )}
            <Colinha serve="Sem origem, não entra. A resposta não pode prometer mais do que a oferta entrega." exemplo="“Já li um livro sobre isso” · tentativas do M4 · “aqui é sobre as suas conversas desta semana, antes e depois”." />
          </Pergunta>
          <Pergunta n={2} feita={aj.some((x) => x.o_que.trim())} titulo="Ajustes em relação ao M7 (se houver)">
            {aj.map((x, i) => (
              <div key={i} className="ws-form">
                <select className="mem-input" aria-label={`Nível ${i + 1}`} value={x.nivel} onChange={(e) => set({ ajustes: aj.map((y, j) => (j === i ? { ...y, nivel: e.target.value } : y)) })}>
                  <option value="1">1 · palavras e ordem</option>
                  <option value="2">2 · como a forma é descrita, condições</option>
                  <option value="2a">2a · preço (só com razão)</option>
                  <option value="3">3 · estrutura: volta ao M7</option>
                </select>
                <input className="mem-input" aria-label={`O que mudou ${i + 1}`} placeholder="O que mudou" value={x.o_que} onChange={(e) => set({ ajustes: aj.map((y, j) => (j === i ? { ...y, o_que: e.target.value } : y)) })} />
                <input className="mem-input" aria-label={`Razão ${i + 1}`} placeholder="Razão" value={x.razao} onChange={(e) => set({ ajustes: aj.map((y, j) => (j === i ? { ...y, razao: e.target.value } : y)) })} />
              </div>
            ))}
            <div>
              <button type="button" className="mem-btn mem-btn--quiet" onClick={() => set({ ajustes: [...aj, { nivel: "1", o_que: "", razao: "" }] })}>
                Registrar um ajuste
              </button>
            </div>
            <Colinha serve="Se muda o que a pessoa recebe, quanto tempo leva ou quanto da capacidade consome, é nível 3. “Parece caro” não é razão para mudar o preço." />
          </Pergunta>
          <Pergunta n={3} feita={rec.some((r) => r.texto.trim())} titulo="Suas recomendações e se ela concordou (opcional)">
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
          </Pergunta>
          <Pergunta n={4} feita={VERIF_M8.every((x) => v[x.k])} titulo="Gate 6 · pode ser colocada diante de pessoas reais sem improviso?">
            {VERIF_M8.map((x) => (
              <label key={x.k} className="ws-check mem-body-sm">
                <input type="checkbox" checked={!!v[x.k]} onChange={(e) => set({ verificacao: { ...v, [x.k]: e.target.checked } })} />{" "}
                <span>
                  <strong>{x.t}.</strong> <span className="mem-muted">{x.passa}</span>
                </span>
              </label>
            ))}
            <Colinha serve="Não exige vendas, interesse, preço validado, página nem copy perfeita. É “estamos prontos para observar”, nunca “funciona”." />
          </Pergunta>
        </article>

        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">Parte B · o que o M9 recebe</span>
          <p className="mem-body-sm">
            <strong>Ponto de partida:</strong> a oferta preparada e a rota “{ROTAS.find((r) => r.valor === p.rota?.tipo)?.rotulo ?? "—"}”.
          </p>
          <p className="mem-body-sm">
            <strong>Limites do teste:</strong> {limitesDoTeste(dados).join(" · ") || "—"}
          </p>
          <Pergunta n={1} feita={!!m.handoff?.materiais?.trim()} titulo="Materiais disponíveis">
            <input className="mem-input" aria-label="Materiais" value={m.handoff?.materiais ?? ""} onChange={(e) => set({ handoff: { ...m.handoff, materiais: e.target.value } })} />
            <Colinha serve="O que ela tem pronto para usar." exemplo="Resumo por WhatsApp, link de pagamento, agenda aberta às terças e quintas." />
          </Pergunta>
          <Pergunta n={2} feita={hip.some((x) => x.trim())} titulo="Hipóteses que chegam ao M9">
            {hip.map((x, i) => (
              <input key={i} className="mem-input" aria-label={`Hipótese ${i + 1}`} value={x} onChange={(e) => set({ hipoteses: hip.map((y, j) => (j === i ? e.target.value : y)) })} />
            ))}
            <div>
              <button type="button" className="mem-btn mem-btn--quiet" onClick={() => set({ hipoteses: [...hip, ""] })}>
                Mais uma
              </button>
            </div>
          </Pergunta>
          <Pergunta n={3} feita={!!m.handoff?.decidir_no_m9?.trim()} titulo="O que ainda precisa ser decidido no M9">
            <input className="mem-input" aria-label="Decidir no M9" value={m.handoff?.decidir_no_m9 ?? ""} onChange={(e) => set({ handoff: { ...m.handoff, decidir_no_m9: e.target.value } })} />
            <Colinha serve="Não defina amostra, duração nem metas aqui: isso é do M9." />
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
          <button type="button" className="mem-btn mem-btn--secondary" onClick={salvar} disabled={estado === "salvando"}>
            {estado === "salvo" ? "Salvo" : "Salvar"}
          </button>
          <button type="button" className="mem-btn mem-btn--primary" disabled={!prontaCall7(dados) || !caminhoPronto(p)} onClick={assumir}>
            Registrar: ela assume a oferta preparada
          </button>
        </div>
        {(!prontaCall7(dados) || !caminhoPronto(p)) && <p className="mem-body-sm mem-muted">Abre quando ela tiver as quatro decisões e o caminho percorrido.</p>}
      </Etapa>
    </>
  );
}
