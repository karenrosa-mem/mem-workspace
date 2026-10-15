import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { call, leitura, type DadosJornada } from "../../lib/jornada";
import { dataHora, somarHoras } from "../../lib/datas";
import { enviadoEm } from "../../lib/envio";
import {
  retornoDe,
  DESTINOS,
  NIVEIS,
  PASSOS,
  TODOS_ITENS,
  ativoConfirmar,
  carregado,
  dadosOportunidade,
  faltaEnvioM6,
  fraseOriginal,
  mentoraOportunidade,
  naoSabemosDoM5,
  oportunidadeDe,
  pareceFormato,
  prontaCall5,
  tudoMantido,
  valorItem,
  type ChaveItem,
  type Destino,
  type OportunidadeMentora,
} from "../../lib/m6";
import { reservaM5 } from "../../lib/m10";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";
import NotaPrivada from "../../componentes/NotaPrivada";
import PublicarLeituraPartes from "../../componentes/PublicarLeituraPartes";
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import { OportunidadeAssumida } from "../mentorada/M6";

export const VERIFICACOES = [
  { t: "Mudanças", p: "O que mudou em relação à aposta original? Alguma mudança passou de nível?", s: "Ponto de confronto; nível 3 pede decisão sobre retorno." },
  { t: "Lastro", p: "O que ela ajustou e o que escreveu sai do que foi ouvido?", s: "Na call: “o que você ouviu que te faz dizer isso?”" },
  { t: "Destino", p: "Sai das falas e casos? Acrescenta uma mudança que nunca apareceu?", s: "Recortar, ou declarar a parte sem lastro como aposta." },
  { t: "Direção da solução", p: "É um caminho ou já é formato, método, duração? Usa o ativo de verdade?", s: "Reescrever como caminho; se não usa o ativo, recomendar que não avance." },
  { t: "Ativo a confirmar", p: "A direção depende de competência ainda não demonstrada?", s: "Entra nos limites e nos pontos de observação do NORTE." },
  { t: "Comprador pretendido", p: "É diferente de quem vive o problema? Foi ouvido? A oportunidade depende dele?", s: "Marcar como aposta crítica." },
  { t: "Incertezas", p: "Para onde vai cada coisa que ainda não sabemos?", s: "Rotear abaixo: vira as listas da call." },
  { t: "Limites", p: "O que a oferta não poderá prometer, dado o destino, o lastro e o ativo?", s: "Rascunho abaixo, para propor na call." },
  { t: "Posse", p: "Ela manteve tudo? A última resposta diz o que ela ouviu?", s: "Ponto de confronto." },
];

const NOTA_M6 = [
  {
    chave: "confrontos",
    rotulo: "Até três pontos de confronto, em ordem",
    ajuda: "Só o que não tem lastro ou mudou de nível. O que está coerente não entra na call. Um por linha.",
    exemplo: "O destino promete “time engajado”, que ninguém falou: o que você ouviu que te faz dizer isso?",
  },
  {
    chave: "recomendacao",
    rotulo: "Recomendação, se houver",
    ajuda: "O que você vai recomendar e por quê. Se for diferente do que ela escreveu, registre na call se ela concordou.",
    exemplo: "Recortar o beneficiário para quem foi promovido de dentro: foi quem contou os casos.",
  },
  {
    chave: "posse",
    rotulo: "Posse: a explicação sem olhar bateu com o texto?",
    ajuda: "Preencha durante a call, depois de ela explicar a oportunidade sem ler. Fica só aqui.",
    exemplo: "Bateu no problema e no público; na direção, ela falou em curso de 4 semanas (formato).",
  },
];

// Seção do M6 na página da mentorada, vista pela mentora.
export default function SecaoM6({ dados, mentoriaId, recarregar }: { dados: DadosJornada; mentoriaId: string; recarregar: () => Promise<void> }) {
  const m6 = dados.movimentos.find((m) => m.codigo === 6)?.estado;
  if (!m6 || m6 === "nao_iniciado") return null;
  const op = oportunidadeDe(dados);
  const assumida = !!mentoraOportunidade(dados).assumida_em;
  const c5 = call(dados, 5);
  const leituraC5 = leitura(dados, "call_5");
  const pronta = prontaCall5(dados);
  const falta = faltaEnvioM6(dados);

  const passos: Passo[] = [
    {
      id: "m6-def",
      titulo: "Definir a oportunidade: 6 passos e a última pergunta",
      quem: "Ela",
      estado: pronta || assumida ? "feito" : "esperando",
      nota: enviadoEm(dados, 6) ? `enviado ${dataHora(enviadoEm(dados, 6)!)}` : falta.length ? `falta: ${falta.join("; ")}` : undefined,
    },
    { id: "m6-prep", titulo: "Preparar a Call 5: nove verificações", quem: "Você", estado: assumida ? "feito" : "agora", nota: "véspera · ~60 min" },
    {
      id: "m6-call",
      titulo: "Call 5: ela explica, lê, é confrontada e assume",
      quem: "Juntas",
      estado: assumida ? "feito" : "agora",
      nota: c5 && !assumida ? dataHora(c5.data_atual) : assumida ? "o M7 abriu" : undefined,
    },
    {
      id: "m6-leitura",
      titulo: "Publicar a leitura curta da Call 5",
      quem: "Você",
      estado: leituraC5 ? "feito" : assumida ? "agora" : "depois",
      nota: leituraC5 ? undefined : "até 48 h",
    },
  ];

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M6 · Navegação</h2>
      <Roteiro titulo="O caminho do M6" passos={passos} />

      <Etapa
        n={1}
        passo={passos[0]}
        aberta={!assumida}
        porque="O que o MAPA definiu vem carregado e ela escolhe Mantenho ou Ajusto. O resto ela escreve olhando o que ouviu, ou marca que isso não apareceu no que ouviu. Nem você nem o Workspace escrevem por ela."
      >
        {assumida ? <OportunidadeAssumida dados={dados} paraMentora /> : <p className="mem-body-sm mem-muted">A comparação lado a lado está no passo 2.</p>}
      </Etapa>

      {!assumida && op && <PreparacaoECall dados={dados} mentoriaId={mentoriaId} passos={passos} recarregar={recarregar} />}
      {!assumida && !op && (
        <p className="mem-body mem-muted">Ela ainda não começou os passos. A preparação abre quando houver o que ler.</p>
      )}

      {!assumida && op && <RetornoMentora dados={dados} recarregar={recarregar} />}

      <Etapa n={4} passo={passos[3]} porque="O que assumimos, o que estamos apostando e o que vem no M7.">
        {leituraC5 ? (
          <LeituraKaren registro={leituraC5} />
        ) : assumida ? (
          <PublicarLeituraPartes
            mentoriaId={mentoriaId}
            movimento={6}
            tipo="call_5"
            partes={PARTES_C5}
            prazo={c5 ? somarHoras(c5.data_realizada ?? c5.data_atual, 48) : null}
            rotuloBotao="Publicar leitura da Call 5"
            aoPublicar={recarregar}
          />
        ) : (
          <p className="mem-body mem-muted">Abre depois que ela assumir.</p>
        )}
      </Etapa>
    </section>
  );
}

const PARTES_C5 = [
  { chave: "o_que_assumimos", rotulo: "O que assumimos", exemplo: "Você assumiu construir para gestores promovidos de dentro do time, que não conseguem cobrar quem até ontem era colega." },
  { chave: "o_que_estamos_apostando", rotulo: "O que estamos apostando", exemplo: "Que o RH paga por isso. Ninguém ouviu o RH ainda: é a primeira coisa que o teste vai olhar." },
  { chave: "o_que_vem", rotulo: "O que vem no Movimento 7", exemplo: "Agora você desenha a oferta: o que entrega, como e por quanto, dentro do que a gente combinou que ela não pode prometer." },
] as const;

// ---------------------------------------------------------------------
function PreparacaoECall({ dados, mentoriaId, passos, recarregar }: { dados: DadosJornada; mentoriaId: string; passos: Passo[]; recarregar: () => Promise<void> }) {
  const op = oportunidadeDe(dados)!;
  const salvo = mentoraOportunidade(dados);
  const [m, setM] = useState<OportunidadeMentora>(() => ({
    ...salvo,
    incertezas: salvo.incertezas ?? naoSabemosDoM5(dados).map((t) => ({ texto: t, destino: "observar" as Destino })),
    limites: salvo.limites ?? [""],
  }));
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const c5 = call(dados, 5);
  const itens = dadosOportunidade(dados).itens ?? {};
  const dir = valorItem(dados, "direcao");
  const comprador = itens.comprador;

  async function salvar(): Promise<boolean> {
    if (!supabase) return false;
    setEstado("salvando");
    const r = await supabase.from("registro").update({ conteudo_mentora: { ...(op.conteudo_mentora ?? {}), ...m } }).eq("id", op.id);
    setEstado(r.error ? "erro" : "salvo");
    return !r.error;
  }

  async function assumir() {
    if (!supabase) return;
    setErro(null);
    setResultado(null);
    if (!(await salvar())) return setErro("Não foi possível salvar.");
    const r = await supabase.rpc("assumir_oportunidade", { p_registro: op.id });
    if (r.error) return setErro(r.error.message);
    if (r.data === "nao_passou") setResultado("A passagem não aconteceu: ajuste com ela o que ficou desmarcado e registre de novo.");
    await recarregar();
  }

  async function marcarRealizada() {
    if (!supabase || !c5) return;
    await supabase.from("encontro").update({ estado: "realizado", data_realizada: new Date().toISOString() }).eq("id", c5.id);
    await recarregar();
  }

  const set = (n: Partial<OportunidadeMentora>) => {
    setM({ ...m, ...n });
    setEstado("");
  };
  const v = m.verificacao ?? {};
  const setV = (k: keyof NonNullable<OportunidadeMentora["verificacao"]>, b: boolean) => set({ verificacao: { ...v, [k]: b } });
  const incertezas = m.incertezas ?? [];
  const limites = m.limites ?? [];

  const faltando = [
    !prontaCall5(dados) && "ela terminar os passos e a última pergunta",
    !limites.some((x) => x.trim()) && "o que a oferta não poderá prometer",
    !m.concorda_limites && "ela concordar com os limites",
  ].filter(Boolean) as string[];

  return (
    <>
      <Etapa
        n={2}
        passo={passos[1]}
        porque="Uma leitura em nove verificações, que termina com no máximo três pontos de confronto. O que está coerente e tem lastro não entra na call."
      >
        {tudoMantido(dados) && (
          <Aviso variante="warn" titulo="Ela manteve tudo o que veio carregado">
            Manter não é erro. Confira se a última resposta dela diz o que ela ouviu que sustenta manter. Ela não vê este aviso.
          </Aviso>
        )}

        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">Aposta original (M5) · intacta</span>
          <p className="mem-body ws-serif">{fraseOriginal(dados)}</p>
          <div className="mem-table-wrap">
          <table className="mem-table mem-body-sm">
            <thead>
              <tr>
                <th>Definição</th>
                <th>Do MAPA</th>
                <th>Dela</th>
                <th>Nível do ajuste</th>
              </tr>
            </thead>
            <tbody>
              {TODOS_ITENS.map((i) => {
                const it = itens[i.chave];
                const trat =
                  it?.escolha === "mantenho" ? "mantido" : it?.escolha === "ajusto" ? "ajustado" : it?.escolha === "sem_material" ? i.semMaterial?.toLowerCase() : it?.escolha === "escrito" ? "escrito por ela" : "sem resposta";
                return (
                  <tr key={i.chave}>
                    <td>{i.pergunta}</td>
                    <td className="mem-muted">{carregado(dados, i.chave) ?? "—"}</td>
                    <td>
                      {valorItem(dados, i.chave) || "—"} <span className="mem-muted">· {trat}</span>
                      {i.chave === "beneficiario" && it?.conversa && <span className="mem-muted"> · com conversa de apoio</span>}
                      {i.chave === "comprador" && it?.porque && <span className="mem-muted"> · porque {it.porque}</span>}
                    </td>
                    <td>
                      {it?.escolha === "ajusto" ? (
                        <select
                          className="mem-input"
                          aria-label={`Nível do ajuste: ${i.pergunta}`}
                          value={m.niveis?.[i.chave] ?? ""}
                          onChange={(e) => set({ niveis: { ...(m.niveis ?? {}), [i.chave]: e.target.value ? (Number(e.target.value) as 1 | 2 | 3) : undefined } })}
                        >
                          <option value="">—</option>
                          {NIVEIS.map((n) => (
                            <option key={n.valor} value={n.valor}>
                              {n.rotulo} · {n.detalhe}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="mem-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <p className="mem-body">
            <span className="mem-muted">O que ela manteve e o que mudou:</span> “{dadosOportunidade(dados).transversal ?? "—"}”
          </p>
          <ul className="ws-lista-simples mem-body-sm">
            {pareceFormato(dir) && <li>A direção da solução parece falar de formato (curso, semanas, preço…): “é o caminho ou já é o formato?”</li>}
            {ativoConfirmar(dados) && <li>O ativo ainda está a confirmar: veja se a direção depende dele.</li>}
            {comprador?.tipo === "outra" && <li>O comprador é outra pessoa ({comprador.quem}): ela foi ouvida?</li>}
            {(m.niveis && Object.values(m.niveis).includes(3)) && <li>Há ajuste de nível 3: não é ajuste, é retorno. Decidam na call.</li>}
          </ul>
        </article>

        <details className="ws-referencia" open>
          <summary className="mem-body-sm">As nove verificações</summary>
          <ol className="ws-lista-simples mem-body-sm">
            {VERIFICACOES.map((x) => (
              <li key={x.t}>
                <strong>{x.t}.</strong> {x.p} <span className="mem-muted">Se houver problema: {x.s}</span>
              </li>
            ))}
          </ol>
        </details>

        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">Comprador e ativo</span>
          <label className="ws-check mem-body-sm">
            <input type="checkbox" checked={!!m.comprador_critico} onChange={(e) => set({ comprador_critico: e.target.checked })} /> O comprador é aposta crítica (diferente de
            quem vive o problema e não foi ouvido): testar cedo no NORTE
          </label>
          <label className="ws-check mem-body-sm">
            <input type="checkbox" checked={!!m.ativo_dependencia} onChange={(e) => set({ ativo_dependencia: e.target.checked })} /> A direção depende de competência ainda não
            demonstrada
          </label>
          {m.ativo_dependencia && (
            <input className="mem-input" aria-label="O que observar no NORTE" placeholder="O que observar no NORTE" value={m.ativo_observacao ?? ""} onChange={(e) => set({ ativo_observacao: e.target.value })} />
          )}
        </article>

        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">O que ainda não sabemos · para onde vai cada um</span>
          <p className="mem-body-sm mem-muted">
            Já vem com o que ficou em aberto no M5. Ela vê só duas listas: “o que estamos apostando” (aposta assumida) e “o que ainda não sabemos” (o
            resto).
          </p>
          {incertezas.map((x, i) => (
            <div key={i} className="ws-form">
              <input
                className="mem-input"
                aria-label={`Incerteza ${i + 1}`}
                value={x.texto}
                onChange={(e) => set({ incertezas: incertezas.map((y, j) => (j === i ? { ...y, texto: e.target.value } : y)) })}
              />
              <Opcoes
                rotulo={`Destino da incerteza ${i + 1}`}
                opcoes={DESTINOS}
                valor={x.destino}
                aoEscolher={(d) => set({ incertezas: incertezas.map((y, j) => (j === i ? { ...y, destino: d as Destino } : y)) })}
              />
            </div>
          ))}
          <div>
            <button type="button" className="mem-btn mem-btn--quiet" onClick={() => set({ incertezas: [...incertezas, { texto: "", destino: "observar" }] })}>
              Mais uma
            </button>
          </div>
          <Colinha
            serve="Se o M7 precisa da resposta para construir, é aposta assumida. Se só precisa ser acompanhado, observar no NORTE. Se não afeta nada agora, não precisamos saber agora. Se derrubaria a aposta, condição de retorno. Nenhuma incerteza justifica pesquisa nova no M6."
            exemplo="“Quem paga: o gestor ou a empresa” → aposta assumida."
          />
        </article>

        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">O que a oferta não poderá prometer · rascunho para a call</span>
          {limites.map((x, i) => (
            <input
              key={i}
              className="mem-input"
              aria-label={`Limite ${i + 1}`}
              value={x}
              onChange={(e) => set({ limites: limites.map((y, j) => (j === i ? e.target.value : y)) })}
            />
          ))}
          <div>
            <button type="button" className="mem-btn mem-btn--quiet" onClick={() => set({ limites: [...limites, ""] })}>
              Mais um
            </button>
          </div>
          <Colinha
            serve="Dado o destino, o que foi ouvido e o ativo. Vira a cerca do M7: a oferta não promete nada daqui."
            exemplo="Não prometer que o time inteiro muda de comportamento: as conversas só mostraram a relação com quem era colega."
          />
        </article>

        <NotaPrivada mentoriaId={mentoriaId} movimento={6} campos={NOTA_M6} aberta titulo="Nota privada · M6 · só você vê" />

        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={salvar} disabled={estado === "salvando"}>
            {estado === "salvando" ? "Salvando" : estado === "salvo" ? "Salvo" : "Salvar preparação"}
          </button>
        </div>
      </Etapa>

      <Etapa
        n={3}
        passo={passos[2]}
        porque="Ela explica sem olhar, lê o registro, você trata os até três pontos, separam o que sabem do que apostam e ela assume. Os ajustes ela faz na tela dela, durante a call."
      >
        <p className="mem-body-lg">
          {c5 ? dataHora(c5.data_atual) : "—"} · {c5?.estado === "realizado" ? "realizada" : "marcada"}
        </p>
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--secondary" to={`/mentoradas/${dados.jornada.id}/call/5`}>
            Abrir guia da Call 5
          </Link>
          {c5 && c5.estado !== "realizado" && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={marcarRealizada}>
              Marcar Call 5 como realizada
            </button>
          )}
        </div>

        <article className="mem-card ws-padrao">
          <Pergunta n={1} feita={!!m.concorda_limites} titulo="Ela concorda com o que a oferta não poderá prometer?">
            <label className="ws-check mem-body-sm">
              <input type="checkbox" checked={!!m.concorda_limites} onChange={(e) => set({ concorda_limites: e.target.checked })} /> Sim, com os limites como estão acima
              (ajuste o texto se ela discutir)
            </label>
          </Pergunta>
          <Pergunta n={2} feita={!!m.recomendacao?.trim()} titulo="Sua recomendação, se diferente do que ela escreveu (opcional)">
            <input className="mem-input" aria-label="Recomendação" value={m.recomendacao ?? ""} onChange={(e) => set({ recomendacao: e.target.value })} />
            {m.recomendacao?.trim() && (
              <label className="ws-check mem-body-sm">
                <input type="checkbox" checked={!!m.concordou_recomendacao} onChange={(e) => set({ concordou_recomendacao: e.target.checked })} /> Ela concordou
              </label>
            )}
            <Colinha serve="Ela vê a recomendação e se concordou, junto da oportunidade." exemplo="Recortar para quem foi promovido de dentro do time." />
          </Pergunta>
          <Pergunta n={3} feita={!!(v.beneficiario_ouvido && v.problema_ouvido && v.apostas_declaradas && v.caminho)} titulo="Antes de ela assumir, confira">
            <label className="ws-check mem-body-sm">
              <input type="checkbox" checked={!!v.beneficiario_ouvido} onChange={(e) => setV("beneficiario_ouvido", e.target.checked)} /> Quem vive o problema está dentro de quem
              ela ouviu
            </label>
            <label className="ws-check mem-body-sm">
              <input type="checkbox" checked={!!v.problema_ouvido} onChange={(e) => setV("problema_ouvido", e.target.checked)} /> O problema é o que apareceu nas conversas e na pesquisa
            </label>
            <label className="ws-check mem-body-sm">
              <input type="checkbox" checked={!!v.apostas_declaradas} onChange={(e) => setV("apostas_declaradas", e.target.checked)} /> Nenhuma aposta importante ficou
              implícita
            </label>
            <label className="ws-check mem-body-sm">
              <input type="checkbox" checked={!!v.caminho} onChange={(e) => setV("caminho", e.target.checked)} /> A direção é caminho, não formato, preço ou ferramenta
            </label>
            <Colinha serve="Se alguma não se confirma, registre assim mesmo: a passagem fica “não passou”, com o motivo, e vocês ajustam na call. A decisão de assumir é dela; você confirma que a passagem é possível." />
          </Pergunta>
        </article>

        {faltando.length > 0 && (
          <Aviso variante="warn" titulo="Para registrar, falta">
            {faltando.join("; ")}.
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
          <button type="button" className="mem-btn mem-btn--primary" disabled={faltando.length > 0} onClick={assumir}>
            Registrar: ela assume a oportunidade
          </button>
        </div>
      </Etapa>
    </>
  );
}

export type { ChaveItem };
export { PASSOS };

// ---------------------------------------------------------------------
// Retorno único: decidido na Call 5, com a sua recomendação explícita.
function RetornoMentora({ dados, recarregar }: { dados: DadosJornada; recarregar: () => Promise<void> }) {
  const op = oportunidadeDe(dados)!;
  const r = retornoDe(dados);
  const reserva = reservaM5(dados);
  const [caminho, setCaminho] = useState<string | undefined>(reserva ? undefined : "campo");
  const [motivo, setMotivo] = useState("");
  const [recomendacao, setRecomendacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const nivel3 = Object.values(mentoraOportunidade(dados).niveis ?? {}).includes(3);

  if (r)
    return (
      <section className="ws-bloco">
        <span className="mem-label mem-muted">Retorno único · acionado em {r.acionado_em ? dataHora(r.acionado_em) : "—"}</span>
        <p className="mem-body">
          {r.caminho === "reserva" ? "Pela reserva: a reserva virou a aposta e a oportunidade recomeçou." : "Voltando a ouvir pessoas: ela registra as conversas novas no M6."} Prazo
          dela: {r.prazo ? dataHora(r.prazo) : "—"}.
        </p>
        <p className="mem-body-sm mem-muted">
          Motivo: {r.motivo} · sua recomendação: {r.recomendacao}. Quando ela enviar, confira e registre a oportunidade por escrito, sem call. As Calls 6 a 10
          andaram uma semana.
        </p>
      </section>
    );

  async function acionar() {
    if (!supabase || !caminho) return;
    setErro(null);
    const res = await supabase.rpc("acionar_retorno", { p_oportunidade: op.id, p_caminho: caminho, p_motivo: motivo, p_recomendacao: recomendacao });
    if (res.error) return setErro(res.error.message);
    await recarregar();
  }

  return (
    <details className="ws-bloco" open={nivel3}>
      <summary className="mem-label">Retorno único · se a decisão da Call 5 for voltar um passo</summary>
      <div className="ws-form">
      <p className="mem-body-sm mem-muted ws-measure">
        Só com mudança de nível 3 (pessoa ou problema que não foi ouvido) ou com a condição da reserva atingida. A decisão é dela, com a sua recomendação
        por escrito. Ela tem uma semana; sem call nova. Usa 7 dias de folga; sem folga, não há retorno. Acontece uma vez por jornada.
      </p>
      <Opcoes
        rotulo="Caminho do retorno"
        opcoes={[
          ...(reserva ? [{ valor: "reserva", rotulo: "Pela reserva", detalhe: `${reserva.frase} (entra se ${reserva.condicao})` }] : []),
          { valor: "campo", rotulo: "Voltar a ouvir pessoas", detalhe: "mesma aposta; ela registra conversas novas no M6" },
        ]}
        valor={caminho}
        aoEscolher={setCaminho}
      />
      <input className="mem-input" aria-label="Motivo" placeholder="Por que voltar (ela vê)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <textarea className="mem-input ws-serif" rows={2} aria-label="Sua recomendação" placeholder="A sua recomendação, por escrito (ela vê, assinada por você)" value={recomendacao} onChange={(e) => setRecomendacao(e.target.value)} />
      {erro && (
        <Aviso variante="danger" titulo="Retorno não acionado">
          {erro}
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={!caminho || !motivo.trim() || !recomendacao.trim()} onClick={acionar}>
          Acionar o retorno
        </button>
      </div>
      </div>
    </details>
  );
}
