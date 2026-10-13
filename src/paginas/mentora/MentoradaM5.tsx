import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { call, leitura, type DadosJornada, type Registro } from "../../lib/jornada";
import { dataHora, somarHoras } from "../../lib/datas";
import { enviadoEm } from "../../lib/envio";
import { dadosHipotese, fraseTexto, hipoteses } from "../../lib/m3";
import {
  COMO_RECOMENDAR,
  CRITERIOS,
  ativoDa,
  comparacaoDe,
  comparacaoLiberada,
  comparadas,
  dadosComparacao,
  decisaoM5,
  duvidas,
  faltaEnvioM5,
  investigacaoAberta,
  leituraValida,
  naoSabemosDerivado,
  nomeEscolha,
  porqueDaAposta,
  prontaCall4M5,
  rotuloParaVoce,
  sinaisDeDinheiro,
  soUma,
  type ChaveCriterio,
  type ComparacaoMentora,
  type DecisaoM5,
} from "../../lib/m5";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import LeituraKaren from "../../componentes/LeituraKaren";
import PublicarLeituraPartes from "../../componentes/PublicarLeituraPartes";
import NotaPrivada from "../../componentes/NotaPrivada";
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";
import { ColunasFatos } from "../mentorada/M5";

export const NOTA_M5 = [
  {
    chave: "distancia",
    rotulo: "Onde a leitura dela se afasta dos fatos",
    ajuda: "Critério por critério. Otimismo (escolheu a hipótese de que gosta mesmo com fatos fracos) ou autossabotagem (desvalorizou um sinal bom). Na call, você pergunta “o que sustenta isso?”.",
    exemplo: "Em “o problema incomoda tanto…”, escolheu os gestores recém-promovidos, mas nas clínicas alguém pagou e outro inventou uma solução própria. O que sustenta a escolha?",
  },
  {
    chave: "desejo",
    rotulo: "Evidência × desejo",
    ajuda: "Quando a hipótese com mais sinal não é a que ela quer, ou quando um “sim, e quero” parece medo de dizer não.",
    exemplo: "As clínicas têm o sinal de dinheiro mais próximo; os gestores recém-promovidos têm repetição, acesso fácil e o desejo dela.",
  },
  {
    chave: "empates",
    rotulo: "Empates",
    ajuda: "Onde as leituras dela se dividem sem padrão claro. Primeiro desempate: “dá para testar logo?”. Se ainda empatar, investigação curta no critério que empatou.",
    exemplo: "Nenhum empate real: as leituras dela são coerentes com os fatos.",
  },
  {
    chave: "recomendacao",
    rotulo: "A recomendação que você vai fazer, e por quê",
    ajuda: "O método pede que você não se esconda atrás de neutralidade. Recomende com os critérios declarados. A escolha final é dela.",
    exemplo: "Sócias de pequenos negócios como aposta: o problema se repete, uma pagou consultora e há curso anunciando há meses. Gestores recém-promovidos como reserva, se aparecer alguém pagando para resolver.",
  },
];

// Seção do M5 na página da mentorada, vista pela mentora.
export default function SecaoM5({
  dados,
  mentoriaId,
  recarregar,
}: {
  dados: DadosJornada;
  mentoriaId: string;
  recarregar: () => Promise<void>;
}) {
  if (!comparacaoLiberada(dados)) return null;
  const m5 = dados.movimentos.find((m) => m.codigo === 5)?.estado;
  const decisao = decisaoM5(dados);
  const registrada = !!decisao && !decisao.pendente_publicacao;
  const c4 = call(dados, 4);
  const passagem = leitura(dados, "passagem_norte");
  const pronta = prontaCall4M5(dados);
  const falta = faltaEnvioM5(dados);

  const passos: Passo[] = [
    {
      id: "m5-comparar",
      titulo: soUma(dados) ? "Responder “é para você?”" : "Comparar e responder “é para você?”",
      quem: "Ela",
      estado: pronta || registrada ? "feito" : "esperando",
      nota: enviadoEm(dados, 5) ? `enviado ${dataHora(enviadoEm(dados, 5)!)}` : falta.length ? `falta: ${falta.join("; ")}` : undefined,
    },
    { id: "m5-nota", titulo: "Ler a comparação e preparar a recomendação", quem: "Você", estado: registrada ? "feito" : "agora", nota: "véspera · 45–60 min" },
    {
      id: "m5-call",
      titulo: "Call 4, segunda parte: escolher onde apostar",
      quem: "Juntas",
      estado: registrada ? "feito" : m5 === "aberto" ? "agora" : "depois",
      nota: registrada ? "o NORTE abriu" : m5 === "aberto" ? undefined : "abre quando a decisão do M4 for registrada",
    },
    {
      id: "m5-passagem",
      titulo: "Publicar a leitura de passagem para o NORTE",
      quem: "Você",
      estado: passagem ? "feito" : registrada ? "agora" : "depois",
      nota: passagem ? undefined : "até 48 h depois da call",
    },
  ];

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M5 · Escolher onde apostar</h2>
      {m5 === "nao_iniciado" && (
        <p className="mem-body ws-measure mem-muted">
          Ela já pode comparar as hipóteses que cumprem o critério do M4, antes da call. Se você tirar uma no início da Call 4, ela sai
          da comparação (o que ela escreveu fica guardado).
        </p>
      )}
      <Roteiro titulo="O caminho do M5" passos={passos} />

      <Etapa
        n={1}
        passo={passos[0]}
        aberta={!registrada}
        porque="Os fatos vêm do M4. A leitura dela vem rotulada e separada. Nenhuma contagem de quantas vezes cada hipótese foi escolhida: nem para ela, nem para você."
      >
        <ComparacaoMentora dados={dados} />
      </Etapa>

      <Etapa n={2} passo={passos[1]} aberta={!registrada} porque="Na véspera, compare a leitura dela com os fatos e decida a recomendação. Sua nota alimenta o guia da segunda parte da Call 4.">
        <ComoRecomendar />
        <NotaPrivada mentoriaId={mentoriaId} movimento={5} campos={NOTA_M5} aberta titulo="Nota privada · M5 · só você vê" />
      </Etapa>

      {registrada && decisao ? (
        <Etapa n={3} passo={passos[2]} aberta={false} porque="A aposta foi registrada na call. O M5 fechou e o NORTE abriu.">
          <ResumoAposta dados={dados} decisao={decisao} />
        </Etapa>
      ) : (
        <Etapa
          n={3}
          passo={passos[2]}
          porque="Depois de registrar a decisão do M4. Você percorre onde a leitura dela se afasta dos fatos, conversa sobre as dúvidas de “é para você?”, faz a sua recomendação e ela escolhe. Você registra durante a call."
        >
          <p className="mem-body-lg">
            {c4 ? dataHora(c4.data_atual) : "—"} · {c4?.estado === "realizado" ? "realizada" : "marcada"}
          </p>
          <div className="ws-acoes">
            <Link className="mem-btn mem-btn--secondary" to={`/mentoradas/${dados.jornada.id}/call/4`}>
              Abrir guia da Call 4
            </Link>
          </div>
          {m5 === "aberto" ? (
            <RegistrarAposta dados={dados} recarregar={recarregar} />
          ) : (
            <p className="mem-body mem-muted">Abre quando a decisão do M4 for registrada, no início da Call 4.</p>
          )}
        </Etapa>
      )}

      <Etapa n={4} passo={passos[3]} porque="Fecha o MAPA: o que decidimos, o que levamos, o que ainda não sabemos e o que muda a partir de agora.">
        {passagem ? (
          <LeituraKaren registro={passagem} />
        ) : registrada && decisao ? (
          <PublicarPassagem dados={dados} decisao={decisao} mentoriaId={mentoriaId} aoPublicar={recarregar} />
        ) : (
          <p className="mem-body mem-muted">Abre depois que a aposta for registrada.</p>
        )}
      </Etapa>
    </section>
  );
}

// Referência para a véspera e para a call: como chegar à recomendação.
export function ComoRecomendar({ aberta = true }: { aberta?: boolean }) {
  return (
    <details className="ws-referencia" open={aberta}>
      <summary className="mem-body-sm">Como decidir a recomendação · sem somar pontos</summary>
      <ol className="ws-lista-simples mem-body-sm">
        {COMO_RECOMENDAR.map((p) => (
          <li key={p.titulo}>
            <strong>{p.titulo}</strong> {p.texto}
          </li>
        ))}
      </ol>
      <p className="mem-body-sm mem-muted">
        Na call, diga a recomendação com os critérios em voz alta (“recomendo esta porque o problema se repete, já tem gente pagando para resolver e
        você chega nessas pessoas rápido”). A escolha final é dela.
      </p>
    </details>
  );
}

// ---------------------------------------------------------------------
function ComparacaoMentora({ dados }: { dados: DadosJornada }) {
  const pv = dadosComparacao(dados).para_voce ?? {};
  const lista = comparadas(dados);
  return (
    <>
      {!soUma(dados) &&
        CRITERIOS.map((cr) => {
          const l = leituraValida(dados, cr.chave);
          return (
            <article key={cr.chave} className="mem-card ws-padrao">
              <h4 className="mem-h3">{cr.nome}</h4>
              <p className="mem-body-sm mem-muted">Para ela: “{cr.pergunta}”</p>
              <ColunasFatos dados={dados} chave={cr.chave} />
              <div className="ws-sua-leitura">
                <p className="mem-label mem-muted">Leitura dela</p>
                {l ? (
                  <p className="mem-body">
                    <strong>{nomeEscolha(dados, l.escolha)}</strong> — {l.porque}
                  </p>
                ) : (
                  <p className="mem-body-sm mem-muted">Ainda não respondeu.</p>
                )}
              </div>
            </article>
          );
        })}
      {soUma(dados) && (
        <p className="mem-body-sm mem-muted">Só uma hipótese chegou à comparação: ela responde apenas “é para você?”.</p>
      )}
      <article className="mem-card ws-padrao">
        <h4 className="mem-h3">É para ela? E tem dinheiro em volta?</h4>
        <ul className="ws-lista-simples mem-body">
          {lista.map((c) => {
            const a = ativoDa(dados, c);
            return (
              <li key={c.hipotese.id}>
                {c.nome}: <strong>{rotuloParaVoce(pv[c.hipotese.id])}</strong>
                <span className="mem-body-sm mem-muted">
                  {" "}
                  · ativo: {a.nome}
                  {a.vontade ? ` · no M2, ${a.vontade} vontade` : ""}
                </span>
                <br />
                <span className="mem-body-sm">
                  Sinal de dinheiro:{" "}
                  {sinaisDeDinheiro(dados, c).length ? sinaisDeDinheiro(dados, c).join(" · ") : <strong>nenhum (ninguém pagou e nada vende há meses)</strong>}
                </span>
              </li>
            );
          })}
        </ul>
        {duvidas(dados).length > 0 && (
          <p className="mem-body-sm">“Sem vontade” e “ainda não sei” viram conversa na call: só depois dela a hipótese pode ser a aposta.</p>
        )}
      </article>
    </>
  );
}

// ---------------------------------------------------------------------
type Fora = { razao: string; condicao: string };

function RegistrarAposta({ dados, recarregar }: { dados: DadosJornada; recarregar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const lista = comparadas(dados);
  const comp = comparacaoDe(dados);
  const pv = dadosComparacao(dados).para_voce ?? {};
  const feitas = ((comp?.conteudo_mentora ?? {}) as ComparacaoMentora).conversa_feita ?? {};
  const existente = decisaoM5(dados);
  const salvo = (existente?.conteudo_mentora ?? {}) as DecisaoM5;

  const [recAposta, setRecAposta] = useState(salvo.recomendacao?.aposta);
  const [recReserva, setRecReserva] = useState<string>(salvo.recomendacao?.reserva ?? (salvo.recomendacao ? "nenhuma" : ""));
  const [recTexto, setRecTexto] = useState(salvo.recomendacao?.texto ?? "");
  const [aposta, setAposta] = useState(salvo.aposta);
  const [porque, setPorque] = useState(salvo.porque ?? "");
  const [exigir, setExigir] = useState(!!salvo.exigir_estrategica);
  const [razaoEst, setRazaoEst] = useState(salvo.razao_estrategica ?? "");
  const [condRev, setCondRev] = useState(salvo.condicao_revisao ?? "");
  const [reserva, setReserva] = useState<string>(salvo.reserva ?? (existente || lista.length === 1 ? "nenhuma" : ""));
  const [reservaCond, setReservaCond] = useState(salvo.reserva_condicao ?? "");
  const [naoSabemos, setNaoSabemos] = useState((salvo.nao_sabemos ?? naoSabemosDerivado(dados)).join("\n"));
  const [fora, setFora] = useState<Record<string, Fora>>(() =>
    Object.fromEntries(
      lista.map((c) => {
        const f = salvo.fora?.find((x) => x.hipotese === c.hipotese.id);
        return [c.hipotese.id, { razao: f?.razao ?? "", condicao: f?.condicao_volta ?? "" }];
      }),
    ),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const bloqueio = (id: string): string | null => {
    if (!pv[id]) return "sem resposta a “é para você?”";
    if (pv[id] === "nao") return "não é para ela";
    if ((pv[id] === "sem_vontade" || pv[id] === "nao_sei") && !feitas[id]) return "converse antes";
    return null;
  };
  const opcoesHip = lista.map((c) => ({ valor: c.hipotese.id, rotulo: c.nome, detalhe: bloqueio(c.hipotese.id) ?? undefined }));
  const contra = !!aposta && !!recAposta && aposta !== recAposta;
  const pedeEstrategica = contra || exigir;
  const reservaId = reserva && reserva !== "nenhuma" ? reserva : null;
  const deFora = lista.filter((c) => c.hipotese.id !== aposta && c.hipotese.id !== reservaId);
  const linhasNaoSabemos = naoSabemos.split("\n").map((x) => x.trim()).filter(Boolean);

  const faltando = [
    !recAposta && "registrar a sua recomendação",
    !aposta && "a escolha dela",
    aposta && bloqueio(aposta) && `a hipótese escolhida: ${bloqueio(aposta)}`,
    !porque.trim() && "o porquê, nas palavras dela",
    pedeEstrategica && (!razaoEst.trim() || !condRev.trim()) && "razão estratégica e condição de revisão",
    !reserva && "dizer se há reserva",
    reservaId && !reservaCond.trim() && "a condição para a reserva entrar",
    reservaId && pv[reservaId] === "nao" && "a reserva não pode ser uma hipótese que não é para ela",
    linhasNaoSabemos.length === 0 && "o que ainda não sabemos",
    aposta && deFora.some((c) => !fora[c.hipotese.id]?.razao.trim() || !fora[c.hipotese.id]?.condicao.trim()) && "razão e condição de cada hipótese que fica de fora",
  ].filter(Boolean) as string[];

  async function marcarConversa(id: string) {
    if (!supabase || !comp) return;
    const cm = comp.conteudo_mentora as ComparacaoMentora;
    await supabase
      .from("registro")
      .update({ conteudo_mentora: { ...cm, conversa_feita: { ...(cm.conversa_feita ?? {}), [id]: true } } })
      .eq("id", comp.id);
    await recarregar();
  }

  async function registrar() {
    if (!supabase || !pessoa) return;
    setErro(null);
    setSalvando(true);
    const conteudo_mentora: DecisaoM5 = {
      aposta,
      reserva: reservaId,
      reserva_condicao: reservaId ? reservaCond.trim() : "",
      recomendacao: { aposta: recAposta, reserva: recReserva && recReserva !== "nenhuma" ? recReserva : null, texto: recTexto.trim() },
      porque: porque.trim(),
      exigir_estrategica: exigir,
      razao_estrategica: pedeEstrategica ? razaoEst.trim() : "",
      condicao_revisao: pedeEstrategica ? condRev.trim() : "",
      nao_sabemos: linhasNaoSabemos,
      fora: deFora.map((c) => ({ hipotese: c.hipotese.id, razao: fora[c.hipotese.id].razao.trim(), condicao_volta: fora[c.hipotese.id].condicao.trim() })),
    };
    const d = existente
      ? await supabase.from("registro").update({ conteudo_mentora }).eq("id", existente.id).select("id").single()
      : await supabase
          .from("registro")
          .insert({
            conta_id: dados.jornada.conta_id,
            jornada_id: dados.jornada.id,
            movimento_codigo: 5,
            tipo: "decisao_m5",
            conteudo_mentora,
            autora_papel: "mentora",
            autora_id: pessoa.id,
            pendente_publicacao: true,
          })
          .select("id")
          .single();
    if (d.error || !d.data) {
      setSalvando(false);
      return setErro("Não foi possível gravar a aposta.");
    }
    const r = await supabase.rpc("registrar_aposta_m5", { p_decisao: d.data.id });
    setSalvando(false);
    if (r.error) return setErro(r.error.message);
    await recarregar();
  }

  let k = 0;
  return (
    <>
      <Investigacao dados={dados} recarregar={recarregar} />

      {duvidas(dados).length > 0 && (
        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">Primeiro · as dúvidas de “é para você?”</span>
          {duvidas(dados).map(({ c, resposta, feita }) => (
            <div key={c.hipotese.id} className="ws-padrao__parte">
              <p className="mem-body">
                {c.nome}: ela marcou <strong>“{rotuloParaVoce(resposta).toLowerCase()}”</strong>
              </p>
              {feita ? (
                <p className="mem-body-sm mem-muted">✓ Conversa feita</p>
              ) : (
                <div>
                  <button type="button" className="mem-btn mem-btn--secondary" onClick={() => marcarConversa(c.hipotese.id)}>
                    Marcar conversa como feita
                  </button>
                </div>
              )}
            </div>
          ))}
          <Colinha serve="Pergunte do que exatamente ela não tem vontade, ou o que falta para saber. Às vezes ela gosta do problema, mas não do contexto. Se ela mudar a resposta, ela muda na tela dela." />
        </article>
      )}

      <article className="mem-card ws-padrao">
        <span className="mem-label mem-muted">A sua recomendação · antes de ela escolher</span>
        <Pergunta n={++k} feita={!!recAposta} titulo="Onde você recomenda apostar?">
          <Opcoes rotulo="Sua recomendação" opcoes={lista.map((c) => ({ valor: c.hipotese.id, rotulo: c.nome }))} valor={recAposta} aoEscolher={setRecAposta} />
        </Pergunta>
        {lista.length > 1 && (
          <Pergunta n={++k} feita={!!recReserva} titulo="E como reserva?">
            <Opcoes
              rotulo="Reserva recomendada"
              opcoes={[...lista.filter((c) => c.hipotese.id !== recAposta).map((c) => ({ valor: c.hipotese.id, rotulo: c.nome })), { valor: "nenhuma", rotulo: "Sem reserva" }]}
              valor={recReserva}
              aoEscolher={setRecReserva}
            />
          </Pergunta>
        )}
        <Pergunta n={++k} feita={!!recTexto.trim()} titulo="Os critérios que pesaram (opcional)">
          <input className="mem-input" aria-label="Critérios da recomendação" value={recTexto} onChange={(e) => setRecTexto(e.target.value)} />
          <Colinha
            serve="O método pede recomendação explícita, com os critérios declarados. Ela não vê este campo; vê a sua fala na call."
            exemplo="O problema se repete, alguém já pagou consultora e há curso vendendo há meses; ela chega nesse público rápido."
          />
        </Pergunta>
      </article>

      <article className="mem-card ws-padrao">
        <span className="mem-label mem-muted">A escolha dela</span>
        <Pergunta n={++k} feita={!!aposta && !bloqueio(aposta)} titulo="Onde ela escolheu apostar?">
          <Opcoes rotulo="Aposta" opcoes={opcoesHip} valor={aposta} aoEscolher={setAposta} />
          {aposta && bloqueio(aposta) && <p className="mem-body-sm">Esta ainda não pode ser a aposta: {bloqueio(aposta)}.</p>}
        </Pergunta>
        <Pergunta n={++k} feita={!!porque.trim()} titulo="Por que esta, agora? (nas palavras dela)">
          <textarea className="mem-input" rows={3} aria-label="Por que esta, agora" value={porque} onChange={(e) => setPorque(e.target.value)} />
          <Colinha
            serve="Duas ou três linhas. Pergunte na call e anote literal, sem melhorar: é o que ela vai precisar sustentar no NORTE. Ela pode ajustar depois."
            exemplo="É o problema que mais se repete, as pessoas querem exatamente a mudança que eu sei provocar e eu consigo chegar nelas rápido. Já tem gente pagando para resolver isso."
          />
        </Pergunta>
        {contra && <p className="mem-body-sm">A escolha dela é diferente da sua recomendação. Pode, mas pede razão estratégica e condição de revisão. Fica registrado que você recomendou diferente.</p>}
        {!contra && aposta && (
          <label className="ws-check mem-body-sm">
            <input type="checkbox" checked={exigir} onChange={(e) => setExigir(e.target.checked)} /> A escolha coincide com a minha recomendação, mas contraria os
            fatos: exigir razão estratégica
          </label>
        )}
        {pedeEstrategica && (
          <>
            <Pergunta n={++k} feita={!!razaoEst.trim()} titulo="Razão estratégica">
              <input className="mem-input" aria-label="Razão estratégica" value={razaoEst} onChange={(e) => setRazaoEst(e.target.value)} />
              <Colinha serve="Por que apostar aqui mesmo sem os fatos a favor. Uma frase dela." exemplo="Consigo chegar nesse público muito mais rápido do que no outro." />
            </Pergunta>
            <Pergunta n={++k} feita={!!condRev.trim()} titulo="Revemos a aposta se…">
              <input className="mem-input" aria-label="Condição de revisão" value={condRev} onChange={(e) => setCondRev(e.target.value)} />
              <Colinha serve="O sinal que, se aparecer no NORTE, faz vocês reverem a escolha." exemplo="ninguém aceitar pagar nas primeiras conversas de venda." />
            </Pergunta>
          </>
        )}
      </article>

      {aposta && (
        <article className="mem-card ws-padrao">
          <span className="mem-label mem-muted">O que fica guardado</span>
          {lista.length > 1 && (
            <Pergunta n={++k} feita={!!reserva} titulo="Reserva">
              <Opcoes
                rotulo="Reserva"
                opcoes={[
                  ...lista.filter((c) => c.hipotese.id !== aposta).map((c) => ({ valor: c.hipotese.id, rotulo: c.nome, detalhe: pv[c.hipotese.id] === "nao" ? "não é para ela" : undefined })),
                  { valor: "nenhuma", rotulo: "Sem reserva" },
                ]}
                valor={reserva}
                aoEscolher={setReserva}
              />
              {reservaId && (
                <>
                  <input className="mem-input" aria-label="A reserva entra se" placeholder="Entra se…" value={reservaCond} onChange={(e) => setReservaCond(e.target.value)} />
                  <Colinha serve="A rota de saída se a aposta não se sustentar. Complete a frase “entra se…”." exemplo="no NORTE ninguém aceitar pagar pela aposta, ou se você decidir trabalhar com o contexto de saúde." />
                </>
              )}
            </Pergunta>
          )}
          {deFora.map((c) => {
            const f = fora[c.hipotese.id] ?? { razao: "", condicao: "" };
            const set = (n: Partial<Fora>) => setFora({ ...fora, [c.hipotese.id]: { ...f, ...n } });
            return (
              <Pergunta key={c.hipotese.id} n={++k} feita={!!f.razao.trim() && !!f.condicao.trim()} titulo={`${c.nome} fica de fora`}>
                <input className="mem-input" aria-label="Por que fica de fora agora" placeholder="Por que fica de fora agora" value={f.razao} onChange={(e) => set({ razao: e.target.value })} />
                <input className="mem-input" aria-label="Pode voltar se" placeholder="Pode voltar se…" value={f.condicao} onChange={(e) => set({ condicao: e.target.value })} />
                <Colinha serve="Uma linha cada. Ela vê junto da hipótese, na jornada dela: nada é apagado. Confirme com ela." exemplo="Pouca gente do público foi encontrada · Pode voltar se surgir acesso a gerentes de clínica." />
              </Pergunta>
            );
          })}
        </article>
      )}

      <article className="mem-card ws-padrao">
        <span className="mem-label mem-muted">O que ainda não sabemos</span>
        <Pergunta n={++k} feita={linhasNaoSabemos.length > 0} titulo="Uma pergunta por linha">
          <textarea className="mem-input" rows={4} aria-label="O que ainda não sabemos" value={naoSabemos} onChange={(e) => setNaoSabemos(e.target.value)} />
          <Colinha
            serve="Já vem com as perguntas em que ela marcou “ainda não dá para dizer” e com a escala. Complete com o que vocês perceberam na call. Vira a lista do que o teste comercial precisa responder."
            exemplo="Se elas pagariam por uma mediação feita por mim, e não por uma consultora conhecida. Se isso cresce além das indicações da minha amiga."
          />
        </Pergunta>
      </article>

      {faltando.length > 0 && (
        <Aviso variante="warn" titulo="Para registrar, falta">
          {faltando.join("; ")}.
        </Aviso>
      )}
      {erro && (
        <Aviso variante="danger" titulo="Aposta não registrada">
          {erro}
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={faltando.length > 0 || salvando} onClick={registrar}>
          {salvando ? "Registrando" : "Registrar a aposta e abrir o NORTE"}
        </button>
      </div>
    </>
  );
}

// Empate que não se resolve nem por "dá para testar logo?".
function Investigacao({ dados, recarregar }: { dados: DadosJornada; recarregar: () => Promise<void> }) {
  const inv = investigacaoAberta(dados);
  const [abrindo, setAbrindo] = useState(false);
  const [criterio, setCriterio] = useState<ChaveCriterio | undefined>();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function abrir() {
    if (!supabase || !criterio) return;
    setErro(null);
    const r = await supabase.rpc("registrar_investigacao_m5", { p_jornada: dados.jornada.id, p_criterio: criterio, p_texto: texto.trim() });
    if (r.error) return setErro(r.error.message);
    setAbrindo(false);
    await recarregar();
  }
  async function encerrar() {
    if (!supabase || !inv) return;
    await supabase.from("registro").update({ conteudo_mentora: { ...inv.conteudo_mentora, encerrada: true } }).eq("id", inv.id);
    await recarregar();
  }

  if (inv) {
    const novas = dados.registros.filter((r) => r.tipo === "conversa" && r.movimento_codigo === 5).length;
    return (
      <div className="ws-pauta">
        <p className="mem-label">Investigação curta em andamento</p>
        <p className="mem-body">Mais conversas, só para entender: {String((inv.conteudo_mentora as { texto?: string }).texto ?? "")}</p>
        <p className="mem-body-sm">
          {novas} {novas === 1 ? "conversa nova" : "conversas novas"}. Quando voltarem, ela refaz a leitura do critério e vocês registram a aposta.
        </p>
        <div>
          <button type="button" className="mem-btn mem-btn--secondary" onClick={encerrar}>
            Encerrar investigação
          </button>
        </div>
      </div>
    );
  }
  return (
    <details className="ws-bloco" open={abrindo} onToggle={(e) => setAbrindo((e.target as HTMLDetailsElement).open)}>
      <summary className="mem-body-sm">Empate que não se resolve? Abrir uma investigação curta</summary>
      <p className="mem-body-sm mem-muted">
        Primeiro desempate: “dá para testar logo?”. Só se ainda empatar: uma ou duas conversas a mais na semana seguinte, no critério que
        empatou. A aposta fica para depois; ela vê “mais uma ou duas conversas, só para entender…”.
      </p>
      <Opcoes rotulo="Critério que empatou" opcoes={CRITERIOS.map((c) => ({ valor: c.chave, rotulo: c.nome }))} valor={criterio} aoEscolher={(v) => setCriterio(v as ChaveCriterio)} />
      <input className="mem-input" aria-label="O que ela vai investigar" placeholder="O que ela vai investigar" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <Colinha serve="Na linguagem dela. Aparece no topo da tela dela." exemplo="se o problema aparece fora do círculo da sua amiga." />
      {erro && <p className="mem-body-sm">{erro}</p>}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--secondary" disabled={!criterio || !texto.trim()} onClick={abrir}>
          Abrir investigação curta
        </button>
      </div>
    </details>
  );
}

function ResumoAposta({ dados, decisao }: { dados: DadosJornada; decisao: Registro }) {
  const c = decisao.conteudo_mentora as DecisaoM5;
  const frase = (id?: string | null) => {
    const h = hipoteses(dados).find((x) => x.id === id);
    return h ? fraseTexto(dados, dadosHipotese(h)) : "—";
  };
  return (
    <ul className="ws-lista-simples mem-body">
      <li>
        Aposta: <strong>{frase(c.aposta)}</strong>
      </li>
      <li className="ws-serif">O porquê dela: “{porqueDaAposta(decisao)}”</li>
      <li>
        Sua recomendação: {frase(c.recomendacao?.aposta)}
        {c.recomendacao?.texto ? ` — ${c.recomendacao.texto}` : ""} · {c.concordou ? "ela concordou" : "ela escolheu diferente: acompanhe esse risco de perto"}
      </li>
      {c.razao_estrategica && (
        <li>
          Razão estratégica: {c.razao_estrategica} · revemos se {c.condicao_revisao}
        </li>
      )}
      {c.reserva && (
        <li>
          Reserva: {frase(c.reserva)} · entra se {c.reserva_condicao}
        </li>
      )}
      {(c.fora ?? []).map((f) => (
        <li key={f.hipotese} className="mem-muted">
          De fora: {frase(f.hipotese)} — {f.razao} · pode voltar se {f.condicao_volta}
        </li>
      ))}
      <li>Ainda não sabemos: {(c.nao_sabemos ?? []).join(" · ")}</li>
    </ul>
  );
}

// ---------------------------------------------------------------------
// Leitura de passagem MAPA → NORTE: quatro partes.
const PARTES_PASSAGEM = [
  {
    chave: "o_que_decidimos",
    rotulo: "O que decidimos",
    exemplo: "Você escolheu apostar nas donas de pequenos negócios com sócias, com os gestores recém-promovidos como reserva.",
  },
  {
    chave: "o_que_levamos",
    rotulo: "O que levamos",
    exemplo: "As palavras deles: “cobrar sem me sentir traidor”. É com essa frase que a oferta vai começar.",
  },
  {
    chave: "o_que_nao_sabemos",
    rotulo: "O que ainda não sabemos",
    exemplo: "Se elas pagariam a você, e não a quem já vende. É a primeira pergunta do NORTE.",
  },
  {
    chave: "o_que_muda",
    rotulo: "O que muda a partir de agora",
    exemplo: "Até aqui você ouviu. Agora você vai desenhar uma oferta e colocar na frente de gente real.",
  },
] as const;

function PublicarPassagem({
  dados,
  decisao,
  mentoriaId,
  aoPublicar,
}: {
  dados: DadosJornada;
  decisao: Registro;
  mentoriaId: string;
  aoPublicar: () => Promise<void>;
}) {
  const c = decisao.conteudo_mentora as DecisaoM5;
  const c4 = call(dados, 4);
  return (
    <PublicarLeituraPartes
      mentoriaId={mentoriaId}
      movimento={5}
      tipo="passagem_norte"
      partes={PARTES_PASSAGEM}
      inicial={{ o_que_nao_sabemos: (c.nao_sabemos ?? []).join("\n") }}
      prazo={c4 ? somarHoras(c4.data_realizada ?? c4.data_atual, 48) : null}
      rotuloBotao="Publicar leitura de passagem"
      aoPublicar={aoPublicar}
    />
  );
}

