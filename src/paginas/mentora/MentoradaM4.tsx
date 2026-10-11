import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { call, type DadosJornada, type Registro } from "../../lib/jornada";
import { dataHora, somarHoras } from "../../lib/datas";
import { enviadoEm } from "../../lib/envio";
import {
  contagem,
  conversasDe,
  decisaoM4,
  demonstra,
  fraseDaFrente,
  frentes,
  ideiasDe,
  meta,
  prontaFrente,
  proximoPasso,
  resumo,
  situacaoPublico,
  type Conversa,
  type Frente,
  type FrenteMentora,
  type RevisaoConversa,
} from "../../lib/m4";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";
import NotaPrivada from "../../componentes/NotaPrivada";
import { Etapa, Roteiro, type Passo } from "../../componentes/Passos";
import { Opcoes, Pergunta } from "../../componentes/Perguntas";

const NOTA_M4 = [
  {
    chave: "combinacao",
    rotulo: "O que a combinação dos fatos demonstra, por frente",
    ajuda: "Sua leitura de cada frente. Se usar forte, médio e fraco, é aqui: ela nunca vê.",
    exemplo: "H1: três casos concretos, dois tentaram resolver: forte para existência, fraco para dinheiro. H4: poucas conversas, mas um pagamento muito próximo.",
  },
  {
    chave: "opiniao",
    rotulo: "Falas que são opinião disfarçada",
    ajuda: "Frases que parecem evidência mas são previsão ou gentileza. Marque também na própria conversa, para ela aprender a ouvir a diferença.",
    exemplo: "“Isso resolveria minha vida” — previsão, não comportamento.",
  },
  {
    chave: "forcando",
    rotulo: "Onde ela parece forçar ou desvalorizar o que ouviu",
    ajuda: "Quando o desejo passa na frente da evidência, ou quando ela descarta um sinal bom por insegurança.",
    exemplo: "Ela gosta muito de H2 e leu “eu pagaria” como prova.",
  },
  {
    chave: "pagamento",
    rotulo: "Pagamentos: ligados de fato à hipótese?",
    ajuda: "Se o que a pessoa pagou resolve o problema da hipótese ou é algo só parecido.",
    exemplo: "A consultora de sociedade resolve exatamente o problema de H2; o advogado de H4 é parecido, não igual.",
  },
];

// Seção do M4 na página da mentorada, vista pela mentora.
export default function SecaoM4({
  dados,
  mentoriaId,
  recarregar,
}: {
  dados: DadosJornada;
  mentoriaId: string;
  recarregar: () => Promise<void>;
}) {
  const m4 = dados.movimentos.find((m) => m.codigo === 4);
  if (!m4 || m4.estado === "nao_iniciado") return null;

  const lista = frentes(dados);
  const conversas = dados.registros.filter((r) => r.tipo === "conversa");
  const decisao = decisaoM4(dados);
  const registrada = !!decisao && !decisao.pendente_publicacao;
  const prontas = lista.filter((f) => prontaFrente(dados, f)).length;
  const primeiras = conversas.slice(0, 2);
  const semNota = primeiras.filter((c) => !(c.conteudo_mentora as RevisaoConversa).nota?.trim());
  const prazoRevisao = primeiras[0] ? somarHoras(primeiras[0].criado_em, 48) : null;
  const c4 = call(dados, 4);
  const env = enviadoEm(dados, 4);

  const passos: Passo[] = [
    { id: "m4-prep", titulo: "Preparar o campo (Call 3, segunda metade)", quem: "Juntas", estado: conversas.length ? "feito" : "agora" },
    {
      id: "m4-conv",
      titulo: "Conversar e registrar",
      quem: "Ela",
      estado: registrada || prontas === lista.length ? "feito" : "esperando",
      nota: env ? `enviado ${dataHora(env)}` : `${prontas} de ${lista.length} hipóteses prontas · ${conversas.length} conversas`,
    },
    {
      id: "m4-rev",
      titulo: "Revisar as primeiras conversas",
      quem: "Você",
      estado: !primeiras.length ? "depois" : semNota.length ? "agora" : "feito",
      nota: semNota.length && prazoRevisao ? `até ${dataHora(prazoRevisao)}` : undefined,
    },
    { id: "m4-nota", titulo: "Ler as frentes e escrever a nota privada", quem: "Você", estado: registrada ? "feito" : conversas.length ? "agora" : "depois", nota: "véspera da Call 4" },
    {
      id: "m4-call",
      titulo: "Call 4: decidir cada hipótese",
      quem: "Juntas",
      estado: registrada ? "feito" : conversas.length ? "agora" : "depois",
      nota: registrada ? "o M5 abriu" : c4 ? dataHora(c4.data_atual) : undefined,
    },
  ];

  return (
    <section className="ws-secao">
      <h2 className="mem-h2">M4 · Ouvir o mercado</h2>
      <Roteiro titulo="O caminho do M4" passos={passos} />

      <Etapa
        n={1}
        passo={passos[0]}
        aberta={!conversas.length}
        porque="Na segunda metade da Call 3: leiam o roteiro juntas, ensaiem a abertura, definam a meta de conversas de cada hipótese e por onde ela começa (normalmente por quem ela já ajudou). O medo de abordar se trata aqui, ao vivo."
      >
        <div className="ws-acoes">
          <Link className="mem-btn mem-btn--secondary" to={`/mentoradas/${dados.jornada.id}/call/3`}>
            Abrir guia da Call 3
          </Link>
        </div>
        {lista.map((f) => (
          <MetaFrente key={f.id} dados={dados} frente={f} travado={registrada} aoSalvar={recarregar} />
        ))}
      </Etapa>

      <Etapa
        n={2}
        passo={passos[1]}
        aberta={!registrada}
        porque="Cada conversa mostra só o que a pessoa fez. Nas primeiras, deixe uma nota curta na própria conversa. Em “em parte do público”, decida se conta. Marque as falas que são opinião ou previsão."
      >
        {lista.map((f, i) => (
          <FrenteMentoraCartao key={f.id} dados={dados} frente={f} n={i + 1} travado={registrada} aoSalvar={recarregar} />
        ))}
      </Etapa>

      <Etapa
        n={3}
        passo={passos[2]}
        aberta={!registrada && semNota.length > 0}
        porque="É a intervenção mais barata do movimento: corrigir uma pergunta no primeiro dia evita uma semana de pesquisa contaminada. A nota fica na própria conversa (passo 2)."
      >
        {primeiras.length === 0 ? (
          <p className="mem-body mem-muted">Abre quando ela registrar as primeiras conversas.</p>
        ) : semNota.length ? (
          <p className="mem-body">
            {semNota.length === 1 ? "1 das primeiras conversas ainda sem nota" : `${semNota.length} das primeiras conversas ainda sem nota`}
            {prazoRevisao ? ` · prazo ${dataHora(prazoRevisao)}` : ""}.
          </p>
        ) : (
          <p className="mem-body">As primeiras conversas já têm a sua nota.</p>
        )}
      </Etapa>

      <Etapa n={4} passo={passos[3]} aberta={!registrada} porque="Na véspera da Call 4, leia todas as hipóteses. A sua nota alimenta o guia da Call 4.">
        <NotaPrivada mentoriaId={mentoriaId} movimento={4} campos={NOTA_M4} aberta titulo="Nota privada · M4 · só você vê" />
      </Etapa>

      <DecisaoM4Etapa dados={dados} passo={passos[4]} registrada={registrada} recarregar={recarregar} />
    </section>
  );
}

function MetaFrente({ dados, frente, travado, aoSalvar }: { dados: DadosJornada; frente: Registro; travado: boolean; aoSalvar: () => Promise<void> }) {
  const [valor, setValor] = useState(String(meta(frente)));
  const [salvo, setSalvo] = useState(false);
  async function salvar() {
    if (!supabase) return;
    const n = Math.max(2, Math.min(10, Number(valor) || 3));
    const r = await supabase
      .from("registro")
      .update({ conteudo_mentora: { ...(frente.conteudo_mentora as FrenteMentora), meta: n } })
      .eq("id", frente.id);
    setSalvo(!r.error);
    if (!r.error) await aoSalvar();
  }
  return (
    <article className="mem-card ws-padrao">
      <p className="mem-body ws-serif ws-frase">{fraseDaFrente(dados, frente)}</p>
      <div className="mem-field">
        <label className="mem-field__label" htmlFor={`meta-${frente.id}`}>
          Meta de conversas do público
        </label>
        <div className="ws-acoes">
          <input
            id={`meta-${frente.id}`}
            className="mem-input ws-input-curto"
            type="number"
            min={2}
            max={10}
            disabled={travado}
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setSalvo(false);
            }}
          />
          {!travado && (
            <button type="button" className="mem-btn mem-btn--secondary" onClick={salvar}>
              Salvar meta
            </button>
          )}
          {salvo && <span className="mem-body-sm mem-muted">Salvo.</span>}
        </div>
        <Colinha serve="3 é o ponto de partida. Menos quando o acesso é difícil; mais quando os sinais vierem contraditórios. Nunca menos de 2: nenhuma conclusão sai de uma conversa só." />
      </div>
    </article>
  );
}

function FrenteMentoraCartao({ dados, frente, n, travado, aoSalvar }: { dados: DadosJornada; frente: Registro; n: number; travado: boolean; aoSalvar: () => Promise<void> }) {
  const lista = conversasDe(dados, frente);
  const k = contagem(dados, frente);
  const fr = frente.conteudo as Frente;
  return (
    <article className="mem-card ws-padrao">
      <span className="mem-label mem-muted">Hipótese {n}</span>
      <p className="mem-body-lg ws-serif ws-frase">{fraseDaFrente(dados, frente)}</p>
      <p className="mem-body">
        <strong>
          {k.doPublico} de {meta(frente)}
        </strong>{" "}
        · {resumo(dados, frente)}
      </p>
      {fr.checagem && (
        <p className="mem-body-sm">
          Alguém já cobra? {fr.checagem === "sim" ? `Sim: ${(fr.checagem_links ?? []).join("; ")}` : "Não encontrou"}
        </p>
      )}
      {fr.sem_acesso && <p className="mem-body-sm">Não conseguiu acesso: {fr.sem_acesso}</p>}
      {!travado && (
        <div className="ws-pauta">
          <p className="mem-label">O que ela vê como próximo passo</p>
          <p className="mem-body-sm">{proximoPasso(dados, frente)}</p>
        </div>
      )}
      {lista.map((c, i) => (
        <RevisaoConversaCartao key={c.id} registro={c} n={i + 1} travado={travado} aoSalvar={aoSalvar} />
      ))}
      {ideiasDe(dados, frente).length > 0 && (
        <p className="mem-body-sm">
          Ideias novas dela: {ideiasDe(dados, frente).map((x) => String((x.conteudo as { texto?: string }).texto ?? "")).join("; ")}
        </p>
      )}
    </article>
  );
}

function RevisaoConversaCartao({ registro, n, travado, aoSalvar }: { registro: Registro; n: number; travado: boolean; aoSalvar: () => Promise<void> }) {
  const c = registro.conteudo as Conversa;
  const inicial = registro.conteudo_mentora as RevisaoConversa;
  const [m, setM] = useState<RevisaoConversa>(inicial);
  const [estado, setEstado] = useState<"" | "salvo" | "erro">("");
  const sit = situacaoPublico({ ...registro, conteudo_mentora: m });

  async function salvar() {
    if (!supabase) return;
    const r = await supabase.from("registro").update({ conteudo_mentora: m }).eq("id", registro.id);
    setEstado(r.error ? "erro" : "salvo");
    if (!r.error) await aoSalvar();
  }

  return (
    <div className="ws-conversa">
      <div className="ws-situacao__topo">
        <span className="mem-label mem-muted">
          Conversa {n} · {dataHora(registro.criado_em)}
        </span>
        {sit === "nao_conta" && <span className="mem-tag mem-tag--relato">Não conta</span>}
        {sit === "a_avaliar" && <span className="mem-tag mem-tag--pendencia">Em parte do público: decida</span>}
        {c.ideia_antes && <span className="mem-tag mem-tag--pendencia">Ideia antes do problema</span>}
      </div>
      <ul className="ws-chips">
        {demonstra(registro).map((t) => (
          <li key={t} className="ws-chip">
            {t}
          </li>
        ))}
      </ul>
      {(c.falas ?? []).map((f, i) => (
        <label key={i} className="ws-marca__check mem-body-sm">
          <input
            type="checkbox"
            disabled={travado}
            checked={!!m.falas_opiniao?.includes(i)}
            onChange={(e) => {
              const atual = m.falas_opiniao ?? [];
              setM({ ...m, falas_opiniao: e.target.checked ? [...atual, i] : atual.filter((x) => x !== i) });
              setEstado("");
            }}
          />
          <span>
            “{f}” <span className="mem-muted">· marcar como opinião ou previsão</span>
          </span>
        </label>
      ))}
      {c.percebi && <p className="mem-body-sm mem-muted">Ela percebeu: {c.percebi}</p>}
      {c.publico === "em_parte" && (
        <Pergunta n={1} feita={m.conta_publico !== undefined} titulo="Essa conversa conta para a hipótese?">
          <Opcoes
            rotulo="Conta"
            opcoes={[
              { valor: "sim", rotulo: "Conta" },
              { valor: "nao", rotulo: "Não conta" },
            ]}
            valor={m.conta_publico === undefined ? undefined : m.conta_publico ? "sim" : "nao"}
            aoEscolher={(v) => {
              setM({ ...m, conta_publico: v === "sim" });
              setEstado("");
            }}
          />
        </Pergunta>
      )}
      {!travado && (
        <div className="mem-field">
          <label className="mem-field__label" htmlFor={`nota-${registro.id}`}>
            Nota para ela (aparece na conversa)
          </label>
          <textarea
            id={`nota-${registro.id}`}
            className="mem-input"
            rows={2}
            value={m.nota ?? ""}
            onChange={(e) => {
              setM({ ...m, nota: e.target.value });
              setEstado("");
            }}
          />
          <Colinha
            serve="Curta: o que estava bom, o que faltou perguntar, se a ideia veio antes do problema."
            exemplo="Ótima. A fala do “cara de traidor” é ouro, guarde. Na próxima, pergunte se ele já pagou por algo."
          />
          <div className="ws-acoes">
            <button type="button" className="mem-btn mem-btn--secondary" onClick={salvar}>
              Salvar revisão
            </button>
            {estado === "salvo" && <span className="mem-body-sm mem-muted">Salvo. Ela já vê.</span>}
            {estado === "erro" && <span className="mem-body-sm">Não foi possível salvar.</span>}
          </div>
        </div>
      )}
      {travado && m.nota && <p className="mem-body-sm">Sua nota: {m.nota}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------
type Linha = { resultado?: "segue" | "volta" | "guardada"; razao: string; condicao: string };

function DecisaoM4Etapa({ dados, passo, registrada, recarregar }: { dados: DadosJornada; passo: Passo; registrada: boolean; recarregar: () => Promise<void> }) {
  const { pessoa } = useSessao();
  const lista = frentes(dados);
  const existente = decisaoM4(dados);
  const salvo = ((existente?.conteudo_mentora as { frentes?: { frente: string; resultado: Linha["resultado"]; razao?: string; condicao_volta?: string }[] })?.frentes ?? []);
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(
      lista.map((f) => {
        const s = salvo.find((x) => x.frente === f.id);
        return [f.id, { resultado: s?.resultado, razao: s?.razao ?? "", condicao: s?.condicao_volta ?? "" }];
      }),
    ),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (registrada)
    return (
      <Etapa n={5} passo={passo} aberta={false} porque="A decisão foi registrada. O M5 abriu.">
        <ul className="ws-lista-simples mem-body">
          {lista.map((f) => {
            const m = f.conteudo_mentora as FrenteMentora;
            return (
              <li key={f.id}>
                <strong>{m.resultado === "segue" ? "Segue" : m.resultado === "volta" ? "Volta" : "Guardada"}</strong>: {fraseDaFrente(dados, f)}
                {m.razao ? ` — ${m.razao}` : ""}
              </li>
            );
          })}
        </ul>
      </Etapa>
    );

  const semDecisao = lista.filter((f) => !linhas[f.id]?.resultado);
  const semRazao = lista.filter((f) => linhas[f.id]?.resultado && !linhas[f.id].razao.trim());
  const algumSegue = lista.some((f) => linhas[f.id]?.resultado === "segue");
  const faltando = [
    semDecisao.length > 0 && `decidir ${semDecisao.length === 1 ? "1 hipótese" : `${semDecisao.length} hipóteses`}`,
    semRazao.length > 0 && "escrever a razão de cada decisão",
    semDecisao.length === 0 && !algumSegue && "pelo menos uma hipótese precisa seguir para comparação",
  ].filter(Boolean) as string[];

  async function registrar() {
    if (!supabase || !pessoa) return;
    setErro(null);
    setSalvando(true);
    const conteudo_mentora = {
      frentes: lista.map((f) => ({
        frente: f.id,
        resultado: linhas[f.id].resultado,
        razao: linhas[f.id].razao.trim(),
        condicao_volta: linhas[f.id].condicao.trim(),
      })),
    };
    const d = existente
      ? await supabase.from("registro").update({ conteudo_mentora }).eq("id", existente.id).select("id").single()
      : await supabase
          .from("registro")
          .insert({
            conta_id: dados.jornada.conta_id,
            jornada_id: dados.jornada.id,
            movimento_codigo: 4,
            tipo: "decisao_m4",
            conteudo_mentora,
            autora_papel: "mentora",
            autora_id: pessoa.id,
            pendente_publicacao: true,
          })
          .select("id")
          .single();
    if (d.error || !d.data) {
      setSalvando(false);
      return setErro("Não foi possível gravar a decisão.");
    }
    const r = await supabase.rpc("registrar_decisao_m4", { p_decisao: d.data.id });
    setSalvando(false);
    if (r.error) return setErro(r.error.message);
    await recarregar();
  }

  return (
    <Etapa
      n={5}
      passo={passo}
      porque="No início da Call 4, hipótese por hipótese: o que apareceu, o que não apareceu, o que ainda é dúvida. A escolha é dela, dentro do critério: só segue para comparação quem tem pelo menos 2 conversas do público com caso concreto. Seguir não é validar."
    >
      <div className="ws-acoes">
        <Link className="mem-btn mem-btn--primary" to={`/mentoradas/${dados.jornada.id}/call/4`}>
          Abrir guia da Call 4
        </Link>
      </div>
      {lista.map((f, i) => {
        const l = linhas[f.id] ?? { razao: "", condicao: "" };
        const set = (n: Partial<Linha>) => setLinhas({ ...linhas, [f.id]: { ...l, ...n } });
        const casos = contagem(dados, f).caso;
        const pode = casos >= 2;
        let k = 0;
        return (
          <article key={f.id} className="mem-card ws-padrao">
            <span className="mem-label mem-muted">Hipótese {i + 1}</span>
            <p className="mem-body ws-serif ws-frase">{fraseDaFrente(dados, f)}</p>
            <p className="mem-body-sm">{resumo(dados, f)}</p>
            <Pergunta n={++k} feita={!!l.resultado} titulo="O que acontece com esta hipótese?">
              <Opcoes
                rotulo="Decisão"
                opcoes={[
                  ...(pode ? [{ valor: "segue", rotulo: "Segue para comparação", detalhe: "vai para o M5" }] : []),
                  { valor: "volta", rotulo: "Volta", detalhe: "reformular, segmentar ou trocar" },
                  { valor: "guardada", rotulo: "Fica guardada", detalhe: "visível, com condição" },
                ]}
                valor={l.resultado}
                aoEscolher={(v) => set({ resultado: v as Linha["resultado"] })}
              />
              {!pode && (
                <p className="mem-body-sm mem-muted">
                  Não pode seguir para comparação: {casos === 1 ? "1 conversa" : `${casos} conversas`} do público com caso concreto (o mínimo é 2).
                </p>
              )}
            </Pergunta>
            <Pergunta n={++k} feita={!!l.razao.trim()} titulo="Por quê?">
              <input className="mem-input" aria-label="Razão" value={l.razao} onChange={(e) => set({ razao: e.target.value })} />
              <Colinha serve="Em uma frase, a partir do que apareceu nas conversas. Ela vê." exemplo="Só uma conversa válida com caso concreto; a outra sócia não tinha o problema." />
            </Pergunta>
            {l.resultado && l.resultado !== "segue" && (
              <Pergunta n={++k} feita={!!l.condicao.trim()} titulo="Em que condição pode voltar? (opcional)">
                <input className="mem-input" aria-label="Condição para voltar" value={l.condicao} onChange={(e) => set({ condicao: e.target.value })} />
                <Colinha serve="O que precisaria aparecer para valer olhar de novo." exemplo="Duas conversas com sócias que dividem o capital de forma desigual." />
              </Pergunta>
            )}
          </article>
        );
      })}
      {faltando.length > 0 && (
        <Aviso variante="warn" titulo="Para registrar, falta">
          {faltando.join("; ")}.
        </Aviso>
      )}
      {erro && (
        <Aviso variante="danger" titulo="Decisão não registrada">
          {erro}
        </Aviso>
      )}
      <div className="ws-acoes">
        <button type="button" className="mem-btn mem-btn--primary" disabled={faltando.length > 0 || salvando} onClick={registrar}>
          {salvando ? "Registrando" : "Registrar decisão e abrir o M5"}
        </button>
      </div>
    </Etapa>
  );
}
