import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useJornada } from "../../lib/useJornada";
import { call, type DadosJornada } from "../../lib/jornada";
import { dataHora } from "../../lib/datas";
import { situacoes, tituloDaSituacao, type Situacao } from "../../lib/m1";
import {
  RECONHECE,
  VONTADE,
  dadosPadrao,
  escolhaDois,
  nomePadrao,
  padroes,
  pautaDoPadrao,
  reacaoDe,
  textoComoSabe,
  type Reacao,
} from "../../lib/m2";
import { LASTRO, dadosHipotese, disputaPublico, fraseTexto, hipoteses } from "../../lib/m3";
import { ROTEIRO, ROTEIRO_NUNCA, contagem, conversasDe, fraseDaFrente, frentes, ideiasDe, meta, resumo, situacaoPublico, type Conversa, type Frente } from "../../lib/m4";
import { CRITERIOS, comparadas, duvidas, leituraValida, naoSabemosDerivado, nomeEscolha, rotuloParaVoce, soUma, dadosComparacao } from "../../lib/m5";
import { CALLS_DO_MOVIMENTO } from "../../lib/metodo";
import { listasIncertezas, mentoraOportunidade, valorItem } from "../../lib/m6";
import { clientesSimultaneos, dadosOferta, etapas, limitesDaOferta, reais } from "../../lib/m7";
import { VARIAVEIS, dadosTeste, fatosVariavel, resumoFatos, rotuloLeitura } from "../../lib/m9";
import { CAMINHO, ROTAS, dadosPreparo, falasDesejo, tentativas, vocabularioMem } from "../../lib/m8";
import { CAPACIDADES, dadosM10, rotuloDecisao, rotuloEstatuto } from "../../lib/m10";
import Aviso from "../../componentes/Aviso";
import NotaPrivada from "../../componentes/NotaPrivada";

// Guia da call: uma página só para a call, com o roteiro do método e o que é
// desta mentorada (sua nota privada, as pistas, as respostas dela). Os itens
// marcados ficam guardados neste navegador; as anotações vão para a nota privada.

type Nota = Record<string, string | undefined>;

const GUIAS_PRONTOS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

// A nota privada que o guia lê: até a Call 4, a do movimento de mesmo número;
// depois, a do movimento decidido naquela call (Call 5 → M6).
function movimentoDaNota(numero: number): number {
  if (numero <= 4) return numero;
  const ms = Object.entries(CALLS_DO_MOVIMENTO).filter(([, c]) => c.decide === numero || c.comeca === numero).map(([m]) => Number(m));
  return ms.length ? Math.max(...ms) : numero;
}

export default function GuiaCall() {
  const { id, n } = useParams();
  const numero = Number(n);
  const { dados, erro } = useJornada(id);
  const [nome, setNome] = useState("");
  const [mentoriaId, setMentoriaId] = useState<string | null>(null);
  const [nota, setNota] = useState<Nota>({});
  const [nota5, setNota5] = useState<Nota>({});

  useEffect(() => {
    if (!supabase || !id) return;
    supabase
      .from("jornada")
      .select("conta(nome, email_convite, pessoa(nome)), mentoria(id)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as unknown as { conta: { nome: string | null; email_convite: string | null; pessoa: { nome: string } | null }; mentoria: { id: string } | null } | null;
        setNome(d?.conta?.pessoa?.nome ?? d?.conta?.nome ?? d?.conta?.email_convite ?? "");
        setMentoriaId(d?.mentoria?.id ?? null);
      });
  }, [id]);

  useEffect(() => {
    if (!supabase || !mentoriaId) return;
    supabase
      .from("nota_privada")
      .select("conteudo")
      .eq("mentoria_id", mentoriaId)
      .eq("movimento_codigo", movimentoDaNota(numero))
      .order("criada_em")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        try {
          setNota(data ? JSON.parse(data.conteudo as string) : {});
        } catch {
          setNota({});
        }
      });
  }, [mentoriaId, numero]);

  // A Call 4 tem duas partes: fim do M4 e o M5 inteiro.
  useEffect(() => {
    if (!supabase || !mentoriaId || numero !== 4) return;
    supabase
      .from("nota_privada")
      .select("conteudo")
      .eq("mentoria_id", mentoriaId)
      .eq("movimento_codigo", 5)
      .order("criada_em")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        try {
          setNota5(data ? JSON.parse(data.conteudo as string) : {});
        } catch {
          setNota5({});
        }
      });
  }, [mentoriaId, numero]);

  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados || !id) return null;

  const c = call(dados, numero);
  const voltar = `/mentoradas/${id}`;

  return (
    <div className="ws-guia">
      <span className="mem-label mem-muted">
        <Link to="/mentoradas" className="ws-voltar">
          Mentoradas
        </Link>{" "}
        ·{" "}
        <Link to={voltar} className="ws-voltar">
          {nome || "Mentorada"}
        </Link>{" "}
        · Guia da call
      </span>
      <h1 className="mem-h1">
        Call {numero} com {nome || "ela"}
      </h1>
      <p className="mem-body-lg">
        {c ? dataHora(c.data_atual) : "—"} · {c?.estado === "realizado" ? "realizada" : "marcada"}
      </p>

      {!GUIAS_PRONTOS.has(numero) ? (
        <Aviso variante="warn" titulo="Guia ainda não montado">
          O guia desta call entra quando o movimento dela for construído.
        </Aviso>
      ) : numero === 1 ? (
        <GuiaCall1 dados={dados} nota={nota} chave={`${id}:1`} />
      ) : numero === 2 ? (
        <GuiaCall2 dados={dados} nota={nota} chave={`${id}:2`} />
      ) : numero === 3 ? (
        <GuiaCall3 dados={dados} nota={nota} chave={`${id}:3`} />
      ) : numero === 4 ? (
        <GuiaCall4 dados={dados} nota={nota} nota5={nota5} chave={`${id}:4`} />
      ) : numero === 5 ? (
        <GuiaCall5 dados={dados} nota={nota} chave={`${id}:5`} />
      ) : numero === 6 ? (
        <GuiaCall6 dados={dados} nota={nota} chave={`${id}:6`} />
      ) : numero === 7 ? (
        <GuiaCall7 dados={dados} nota={nota} chave={`${id}:7`} />
      ) : numero === 8 ? (
        <GuiaCall8 dados={dados} nota={nota} chave={`${id}:8`} />
      ) : numero === 9 ? (
        <GuiaCall9 dados={dados} nota={nota} chave={`${id}:9`} />
      ) : (
        <GuiaCall10 dados={dados} nota={nota} chave={`${id}:10`} />
      )}

      {mentoriaId && GUIAS_PRONTOS.has(numero) && (
        <NotaPrivada
          mentoriaId={mentoriaId}
          movimento={movimentoDaNota(numero)}
          aberta
          titulo="Anotações durante a call · só você vê"
          campos={[
            {
              chave: "anotacoes_call",
              rotulo: "O que ela disse que você não quer perder",
              ajuda: "Frases dela, situações novas, decisões. Fica na sua nota privada deste movimento e serve para escrever a leitura depois.",
            },
          ]}
        />
      )}

      <div className="ws-acoes">
        <Link className="mem-btn mem-btn--secondary" to={voltar}>
          Voltar para a página dela
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Itens marcáveis (guardados neste navegador)
// ---------------------------------------------------------------------
function useMarcados(chave: string) {
  const k = `mem-guia:${chave}`;
  const [marcados, setMarcados] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? "{}");
    } catch {
      return {};
    }
  });
  function alternar(item: string) {
    const novo = { ...marcados, [item]: !marcados[item] };
    setMarcados(novo);
    try {
      localStorage.setItem(k, JSON.stringify(novo));
    } catch {
      /* sem armazenamento: o guia funciona, só não lembra */
    }
  }
  return { marcados, alternar };
}

type Item = { id: string; texto: ReactNode; detalhe?: ReactNode; grupo?: string };

function Bloco({
  n,
  titulo,
  porque,
  itens,
  marcados,
  alternar,
  vazio,
}: {
  n: number;
  titulo: string;
  porque?: string;
  itens: Item[];
  marcados: Record<string, boolean>;
  alternar: (id: string) => void;
  vazio?: string;
}) {
  const feitos = itens.filter((i) => marcados[i.id]).length;
  return (
    <section className="ws-guia__bloco">
      <div className="ws-etapa__cabeca">
        <span className={`ws-etapa__n ${itens.length && feitos === itens.length ? "ws-etapa__n--feito" : ""}`} aria-hidden="true">
          {itens.length && feitos === itens.length ? "✓" : n}
        </span>
        <div className="ws-etapa__titulos">
          <span className="mem-label mem-muted">
            {itens.length ? `${feitos} de ${itens.length}` : "—"}
          </span>
          <h2 className="mem-h3 ws-etapa__titulo">{titulo}</h2>
        </div>
      </div>
      <div className="ws-etapa__corpo">
        {porque && <p className="mem-body mem-muted ws-measure">{porque}</p>}
        {itens.length === 0 && vazio && <p className="mem-body-sm mem-muted">{vazio}</p>}
        <ul className="ws-guia__itens">
          {itens.map((i, k) => (
            <li key={i.id} className={marcados[i.id] ? "ws-guia__item--feito" : ""}>
              {i.grupo && i.grupo !== itens[k - 1]?.grupo && <p className="mem-h4 ws-guia__grupo">{i.grupo}</p>}
              <label className="ws-guia__item">
                <input type="checkbox" checked={!!marcados[i.id]} onChange={() => alternar(i.id)} />
                <span className="ws-guia__texto">
                  <span className="mem-body">{i.texto}</span>
                  {i.detalhe && <span className="mem-body-sm mem-muted">{i.detalhe}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Progresso({ total, feitos }: { total: number; feitos: number }) {
  return (
    <div className="ws-guia__progresso" aria-live="polite">
      <span className="mem-label mem-muted">Cobertos</span>
      <span className="mem-body">
        <strong>{feitos}</strong> de {total}
      </span>
      <span className="ws-guia__barra" aria-hidden="true">
        <span style={{ width: `${total ? (feitos / total) * 100 : 0}%` }} />
      </span>
    </div>
  );
}

function linhas(texto?: string): string[] {
  return (texto ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/^[-•·\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function Objetivo({ objetivo, sai }: { objetivo: string; sai: string[] }) {
  return (
    <section className="ws-guia__objetivo">
      <p className="mem-label">Objetivo da call</p>
      <p className="mem-body-lg">{objetivo}</p>
      <p className="mem-label">Você sai da call com</p>
      <ul className="ws-lista-simples mem-body">
        {sai.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------
// Call 1 · Contar sua trajetória
// ---------------------------------------------------------------------
function GuiaCall1({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const sits = situacoes(dados);

  const abertura: Item[] = [
    {
      id: "abre-leitura",
      texto: "Abra pela sua leitura do material dela, citando situações e anos.",
      detalhe: "“Você contou três situações, em anos bem diferentes, em que…”",
    },
    {
      id: "abre-pergunta",
      texto: "Antes de dizer o que você vê, pergunte o que ela percebe.",
      detalhe: "“Lendo isso, o que você percebe que se repete?”",
    },
  ];
  const pontos: Item[] = linhas(nota.pontos).map((t, i) => ({ id: `ponto-${i}`, texto: t }));
  const situacoesItens: Item[] = sits.map((s) => {
    const c = s.conteudo as Situacao;
    const pista = s.conteudo_mentora.candidata === true ? ` · pista: ${String(s.conteudo_mentora.nome_provisorio ?? "")}` : "";
    return {
      id: `sit-${s.id}`,
      texto: `${c.ano ?? "—"} · ${tituloDaSituacao(s)}`,
      detalhe: `Pergunte como ela decidiu o que fazer. Se vier vago: “me conta a última vez”.${pista}`,
    };
  });
  const confrontar: Item[] = [
    ...linhas(nota.contradicoes).map((t, i) => ({ id: `contra-${i}`, texto: t, detalhe: "Contradição" })),
    ...linhas(nota.naturalizacao).map((t, i) => ({ id: `natu-${i}`, texto: t, detalhe: "Naturalização: mostre o tamanho do que ela chama de “só”" })),
  ];
  const fechamento: Item[] = [
    { id: "fecha-novas", texto: "Situações novas que surgiram: anote o título de cada uma.", detalhe: "Na página dela, passo 4. Ela completa depois." },
    { id: "fecha-pistas", texto: "Marque as pistas de ativo, com nome provisório.", detalhe: "Pode ser logo depois da call." },
    { id: "fecha-proximo", texto: "Diga a ela o que vem: a sua leitura em até 48 h e o que ela vai fazer depois." },
  ];

  const todos = [...abertura, ...pontos, ...situacoesItens, ...confrontar, ...fechamento];
  const feitos = todos.filter((i) => marcados[i.id]).length;

  return (
    <>
      <Objetivo
        objetivo="Investigar as situações que ela contou e encontrar o que se repete — sem concluir por ela."
        sai={["As pistas de ativo, com um nome provisório", "Os títulos das situações novas que ela contou ao vivo", "Material para escrever a leitura em até 48 h"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      {nota.sinais && (
        <Aviso variante="warn" titulo="Para conduzir com cuidado">
          {nota.sinais}
        </Aviso>
      )}
      <Bloco n={1} titulo="Abrir" porque="Você chega com hipóteses, não conclusões. Ela fala primeiro sobre o que se repete." itens={abertura} marcados={marcados} alternar={alternar} />
      <Bloco
        n={2}
        titulo="Seus pontos de investigação"
        porque="O que você anotou na nota privada antes da call, um por linha."
        itens={pontos}
        marcados={marcados}
        alternar={alternar}
        vazio="Você ainda não escreveu pontos de investigação na nota privada (passo 3 da página dela)."
      />
      <Bloco
        n={3}
        titulo="Passar pelas situações"
        porque="Atividade, não cargo. Em cada uma: como ela decidiu o que fazer e o que mudou depois."
        itens={situacoesItens}
        marcados={marcados}
        alternar={alternar}
        vazio="Ela ainda não contou situações."
      />
      <Bloco
        n={4}
        titulo="Confrontar com cuidado"
        porque="Contradições e naturalizações da sua nota privada."
        itens={confrontar}
        marcados={marcados}
        alternar={alternar}
        vazio="Nenhuma contradição ou naturalização anotada."
      />
      <Bloco n={5} titulo="Fechar" itens={fechamento} marcados={marcados} alternar={alternar} />
    </>
  );
}

// ---------------------------------------------------------------------
// Call 2 · Enxergar seus ativos
// ---------------------------------------------------------------------
function GuiaCall2({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const lista = padroes(dados);
  const reacoes = lista.map((p) => ({ p, r: reacaoDe(dados, p)?.conteudo as Reacao | undefined }));
  const rotulo = (l: readonly { valor: string; rotulo: string }[], v?: string) => l.find((o) => o.valor === v)?.rotulo ?? "—";

  const divergencias: Item[] = reacoes
    .filter(({ r }) => r?.reconhece === "em_parte" || r?.reconhece === "nao_reconheco" || !r?.reconhece)
    .map(({ p, r }) => ({
      id: `div-${p.id}`,
      texto: dadosPadrao(p).nome ?? "Possível ativo",
      detalhe: r?.reconhece
        ? `${rotulo(RECONHECE, r.reconhece)}${r.frase ? ` — “${r.frase}”` : ""}. Pergunte o que não bate.`
        : "Ela não respondeu: comece perguntando se ela se vê nisso.",
    }));

  const aprofundar: Item[] = reacoes.flatMap(({ p, r }) => {
    const nome = dadosPadrao(p).nome ?? "Possível ativo";
    const resumo = r?.reconhece ? `Ela: ${textoComoSabe(r)} · vontade ${rotulo(VONTADE, r.vontade).toLowerCase()}` : undefined;
    return [
      { grupo: nome, id: `passo-${p.id}`, texto: "Peça o passo a passo, ao vivo.", detalhe: resumo ? `Se ela hesitar, é risco de ensinar, não eliminatório. ${resumo}` : "Se ela hesitar, é risco de ensinar, não eliminatório." },
      { grupo: nome, id: `outro-${p.id}`, texto: "“Você faria isso em outro lugar?”" },
      { grupo: nome, id: `ref-${p.id}`, texto: "“Você sabe fazer ou é referência nisso? Por quê?”" },
      ...pautaDoPadrao(dados, p, r)
        .filter((t) => !t.startsWith("Nada pede") && !t.startsWith("Ela ainda não respondeu"))
        .map((t, i) => ({ grupo: nome, id: `pauta-${p.id}-${i}`, texto: t })),
    ];
  });

  const tensoes: Item[] = [
    ...linhas(nota.tensoes).map((t, i) => ({ id: `tensao-${i}`, texto: t, detalhe: "Tensão entre prova e vontade: nomeie, não empurre" })),
    ...linhas(nota.concordancia).map((t, i) => ({ id: `conc-${i}`, texto: t, detalhe: "Suspeita de concordância automática: peça um exemplo com as palavras dela" })),
  ];

  const escolha = escolhaDois(dados)?.conteudo as { padroes?: string[]; linha?: string } | undefined;
  const decidir: Item[] = [
    ...(escolha?.padroes?.length
      ? [
          {
            id: "dec-dois",
            texto: `Retome a escolha dela: ${escolha.padroes.map((x) => nomePadrao(dados, x)).join(" e ")}.`,
            detalhe: escolha.linha ? `“${escolha.linha}”` : undefined,
          },
        ]
      : []),
    { id: "dec-comparar", texto: "Se ela não decide, compare os possíveis ativos dois a dois até surgir uma ordem que ela reconheça como dela." },
    { id: "dec-decisao", texto: "A decisão é dela: de 1 a 3 seguem para o mercado.", detalhe: "Mais de 3 só com justificativa." },
    { id: "dec-nao", texto: "Para cada um que não segue: a razão e em que condição pode voltar." },
    {
      id: "dec-porque",
      texto: "Pergunte: “em uma frase, por que esses?”",
      detalhe: "Anote literal, sem melhorar. Vai no formulário da decisão (passo 4 da página dela).",
    },
    { id: "dec-proximo", texto: "Diga o que vem: você publica a decisão em até 48 h e o próximo movimento abre na hora." },
  ];

  const todos = [...divergencias, ...aprofundar, ...tensoes, ...decidir];
  const feitos = todos.filter((i) => marcados[i.id]).length;

  return (
    <>
      <Objetivo
        objetivo="Ela decide quais possíveis ativos seguem para o mercado — de 1 a 3."
        sai={["A decisão dela sobre cada possível ativo, com o rótulo final", "A razão de cada um que não segue", "O porquê dela, em uma frase, com as palavras dela", "Material para a leitura curta em até 48 h"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco
        n={1}
        titulo="Começar pelo que ela não reconheceu"
        porque="Reconhecer ou não, sozinho, não valida nem derruba nada: a divergência é a pauta."
        itens={divergencias}
        marcados={marcados}
        alternar={alternar}
        vazio="Ela se viu em todos os possíveis ativos. Siga para o bloco 2."
      />
      <Bloco
        n={2}
        titulo="Aprofundar cada possível ativo"
        porque="Ensinar (passo a passo), repetir em outro lugar e o nível dela. Mais o que as respostas dela pedem."
        itens={aprofundar}
        marcados={marcados}
        alternar={alternar}
        vazio="Nenhum possível ativo publicado ainda."
      />
      <Bloco
        n={3}
        titulo="Nomear as tensões"
        porque="Da sua nota privada do M2. Prova forte com pouca vontade; muita vontade com pouca prova."
        itens={tensoes}
        marcados={marcados}
        alternar={alternar}
        vazio="Nenhuma tensão ou concordância anotada na nota privada."
      />
      <Bloco n={4} titulo="Decidir" itens={decidir} marcados={marcados} alternar={alternar} />
    </>
  );
}

// ---------------------------------------------------------------------
// Call 3 · primeira metade: Formular hipóteses
// ---------------------------------------------------------------------
function GuiaCall3({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const lista = hipoteses(dados);

  const abrir: Item[] = [
    { id: "abre-ler", texto: "Abra lendo as hipóteses dela, uma a uma.", detalhe: "Nada aqui é bom ou ruim ainda: tudo é hipótese." },
  ];
  const confrontar: Item[] = lista.flatMap((h, i) => {
    const x = dadosHipotese(h);
    const grupo = `Hipótese ${i + 1}`;
    const itens: Item[] = [
      { grupo, id: `voz-${h.id}`, texto: "Leia em voz alta e pergunte: “isso serve para quem mais?”", detalhe: fraseTexto(dados, x) },
      { grupo, id: `ativo-${h.id}`, texto: "O ativo aparece no problema e na transformação, ou só no fim da frase?" },
    ];
    if (x.lastro === "imagino")
      itens.push({ grupo, id: `imag-${h.id}`, texto: "Imaginada: “pode ir, sabendo que você vai precisar encontrar pessoas que nunca viu”." });
    if (disputaPublico(dados, h) > 0)
      itens.push({ grupo, id: `disp-${h.id}`, texto: "Mesmo público de outra hipótese: padrão mais forte ou só repetição?" });
    const lastro = LASTRO.find((l) => l.valor === x.lastro);
    if (lastro) itens[0].detalhe = `${fraseTexto(dados, x)} · ${lastro.rotulo}`;
    return itens;
  });
  const daNota: Item[] = [
    ...linhas(nota.genericas).map((t, i) => ({ id: `gen-${i}`, texto: t, detalhe: "Genérica" })),
    ...linhas(nota.imaginadas).map((t, i) => ({ id: `ima-${i}`, texto: t, detalhe: "Imaginada" })),
    ...linhas(nota.ativo_usado).map((t, i) => ({ id: `atv-${i}`, texto: t, detalhe: "Ativo usado ou só citado" })),
    ...linhas(nota.disputa).map((t, i) => ({ id: `dis-${i}`, texto: t, detalhe: "Disputa de público" })),
    ...linhas(nota.ideia_entrada).map((t, i) => ({ id: `ide-${i}`, texto: t, detalhe: "Ideia de entrada (ela não vê esta ligação)" })),
  ];
  const decidir: Item[] = [
    { id: "dec-reescrever", texto: "Se uma frase mudar, ela reescreve na tela dela; a versão anterior fica guardada." },
    { id: "dec-coerentes", texto: "Entre as coerentes, a escolha é dela. Incoerente não vai só porque ela quer.", detalhe: "Normalmente de 3 a 5 vão a campo." },
    { id: "dec-guardadas", texto: "Para cada uma que fica guardada: a razão e em que condição pode voltar." },
    { id: "dec-porque", texto: "Pergunte: “em uma frase, por que essas?”", detalhe: "Anote literal, no passo 4 da página dela." },
    { id: "dec-registrar", texto: "Registre a decisão: o M4 abre e vocês seguem para a segunda metade da call." },
  ];

  const segundaMetade: Item[] = [
    { id: "m4-roteiro", texto: "Leiam o roteiro juntas.", detalhe: ROTEIRO.join(" · ") },
    {
      id: "m4-abertura",
      texto: "Ensaiem a abertura duas vezes.",
      detalhe: "“Estou pesquisando como [público] lida com [problema]. Posso te fazer umas perguntas sobre a sua experiência?”",
    },
    { id: "m4-nunca", texto: "Combine o que ela nunca pergunta.", detalhe: ROTEIRO_NUNCA.map((x) => `“${x}”`).join(" · ") },
    { id: "m4-trilha", texto: "Para cada hipótese, ajude a escolher a trilha: pesquisa de mercado, conversas ou as duas.", detalhe: "Quem tem acesso fácil ao público (já ajudou alguém assim) ganha com a conversa. Para quem trava, a pesquisa vem primeiro." },
    { id: "m4-meta", texto: "Defina a meta de conversas de cada hipótese que terá conversa.", detalhe: "2 é o ponto de partida. Nunca menos de 2." },
    { id: "m4-comeco", texto: "Por onde ela começa: normalmente por quem já ajudou." },
    { id: "m4-medo", texto: "Pergunte se ela tem receio de abordar alguém. Trate aqui, ao vivo." },
    { id: "m4-registro", texto: "Mostre o registro: logo depois de cada conversa, pelo celular, ~3 min." },
  ];

  const todos = [...abrir, ...confrontar, ...daNota, ...decidir, ...segundaMetade];
  const feitos = todos.filter((i) => marcados[i.id]).length;

  return (
    <>
      <Objetivo
        objetivo="Primeira metade: decidir quais hipóteses vão a campo. Segunda metade: preparar as conversas com pessoas reais."
        sai={["As hipóteses que vão a campo e as guardadas, com a razão", "O porquê dela, em uma frase", "O M4 aberto, para preparar as conversas"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco n={1} titulo="Abrir" itens={abrir} marcados={marcados} alternar={alternar} />
      <Bloco
        n={2}
        titulo="Confrontar cada hipótese"
        porque="Genérica, ativo de verdade, imaginada, disputa de público. Sem desqualificar: apontar."
        itens={confrontar}
        marcados={marcados}
        alternar={alternar}
        vazio="Ela ainda não montou hipóteses."
      />
      <Bloco
        n={3}
        titulo="Da sua nota privada"
        porque="O que você anotou na véspera, um item por linha."
        itens={daNota}
        marcados={marcados}
        alternar={alternar}
        vazio="Nada anotado na nota privada do M3 (passo 3 da página dela)."
      />
      <Bloco n={4} titulo="Decidir" itens={decidir} marcados={marcados} alternar={alternar} />
      <Bloco
        n={5}
        titulo="Segunda metade: preparar as conversas"
        porque="Depois de registrar a decisão, o M4 abre. Defina a meta de cada hipótese no passo 1 do M4, na página dela."
        itens={segundaMetade}
        marcados={marcados}
        alternar={alternar}
      />
    </>
  );
}

// ---------------------------------------------------------------------
// Call 4 · início: o que cada hipótese mostrou
// ---------------------------------------------------------------------
function GuiaCall4({ dados, nota, nota5, chave }: { dados: DadosJornada; nota: Nota; nota5: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const lista = frentes(dados);

  const porFrente: Item[] = lista.flatMap((f, i) => {
    const grupo = `Hipótese ${i + 1}: ${fraseDaFrente(dados, f)}`;
    const k = contagem(dados, f);
    const conv = conversasDe(dados, f);
    const fr = f.conteudo as Frente;
    const itens: Item[] = [
      { grupo, id: `apareceu-${f.id}`, texto: "O que apareceu", detalhe: `${resumo(dados, f)} · meta ${meta(f)}` },
      {
        grupo,
        id: `nao-${f.id}`,
        texto: "O que não apareceu",
        detalhe:
          [k.tentou === 0 && "ninguém tentou resolver", k.pagou.length === 0 && "ninguém pagou", k.caso < 2 && "menos de 2 casos concretos"]
            .filter(Boolean)
            .join(" · ") || "—",
      },
      { grupo, id: `duvida-${f.id}`, texto: "O que ainda é dúvida: pergunte a ela." },
    ];
    const falas = conv.flatMap((c) => ((c.conteudo as Conversa).falas ?? []).slice(0, 1));
    if (falas.length) itens.push({ grupo, id: `falas-${f.id}`, texto: "Releia as falas com ela", detalhe: falas.map((x) => `“${x}”`).join(" · ") });
    if (k.aAvaliar) itens.push({ grupo, id: `avaliar-${f.id}`, texto: `${k.aAvaliar} conversa(s) “em parte do público”: decida se contam antes de registrar.` });
    if (fr.sem_acesso) itens.push({ grupo, id: `acesso-${f.id}`, texto: `Ela não conseguiu acesso: ${fr.sem_acesso}` });
    ideiasDe(dados, f).forEach((x) =>
      itens.push({ grupo, id: `ideia-${x.id}`, texto: `Ideia nova dela: ${String((x.conteudo as { texto?: string }).texto ?? "")}`, detalhe: "É hipótese, não prova." }),
    );
    if (conv.some((c) => situacaoPublico(c) === "nao_conta")) itens.push({ grupo, id: `fora-${f.id}`, texto: "Há conversas que não contam: mostre por quê, sem sermão." });
    return itens;
  });
  const daNota: Item[] = [
    ...linhas(nota.combinacao).map((t, i) => ({ id: `comb-${i}`, texto: t, detalhe: "Sua leitura (ela não vê forte/médio/fraco)" })),
    ...linhas(nota.forcando).map((t, i) => ({ id: `forc-${i}`, texto: t, detalhe: "Desejo passando na frente da evidência?" })),
    ...linhas(nota.pagamento).map((t, i) => ({ id: `pag-${i}`, texto: t, detalhe: "Pagamento ligado à hipótese?" })),
  ];
  const decidir: Item[] = [
    {
      id: "d4-criterio",
      texto: "Pode seguir para a comparação a hipótese que tem UM destes dois:",
      detalhe: "pelas conversas: 2 pessoas do público contaram um caso real · pela pesquisa: 3 relatos com caso real + 1 sinal de que o tema vende há meses",
    },
    { id: "d4-trilha", texto: "Se a hipótese passou só pela pesquisa, diga: no teste comercial (M9) ela vai confirmar se este público responde a ela." },
    { id: "d4-dela", texto: "Entre as que podem seguir, a escolha é dela. Uma hipótese sem sinal não segue só porque ela gosta." },
    { id: "d4-validacao", texto: "Diga com todas as letras: seguir não é validar. É ter material para comparar." },
    { id: "d4-registrar", texto: "Registre a decisão de cada hipótese, com a razão. O M5 abre e vocês seguem para a segunda parte da call." },
  ];

  // Segunda parte: M5 · escolher onde apostar.
  const pv = dadosComparacao(dados).para_voce ?? {};
  const leituras: Item[] = [
    ...(soUma(dados)
      ? []
      : CRITERIOS.map((cr) => {
          const l = leituraValida(dados, cr.chave);
          return {
            id: `m5-${cr.chave}`,
            texto: `${cr.nome}. Ela leu: ${l ? nomeEscolha(dados, l.escolha) : "sem resposta"}`,
            detalhe: l ? `“${l.porque}” · Os fatos sustentam? Se não: “o que sustenta isso?”` : "Faça a leitura com ela na call.",
          };
        })),
    ...linhas(nota5.distancia).map((t, i) => ({ id: `m5-dist-${i}`, texto: t, detalhe: "Da sua nota: leitura × fatos" })),
  ];
  const paraVoce: Item[] = [
    ...comparadas(dados).map((c) => ({ id: `m5-pv-${c.hipotese.id}`, texto: `${c.nome}: ${rotuloParaVoce(pv[c.hipotese.id])}` })),
    ...duvidas(dados).map(({ c, resposta }) => ({
      id: `m5-duv-${c.hipotese.id}`,
      texto: `Conversar sobre “${rotuloParaVoce(resposta).toLowerCase()}” em ${c.nome}`,
      detalhe: "Do que ela não tem vontade, ou o que falta para saber? Marque a conversa como feita na página dela.",
    })),
    { id: "m5-sim", texto: "Nos “sim, e quero”: é convicção ou medo de dizer não?" },
    ...linhas(nota5.desejo).map((t, i) => ({ id: `m5-des-${i}`, texto: t, detalhe: "Da sua nota: evidência × desejo" })),
  ];
  const apostar: Item[] = [
    ...linhas(nota5.recomendacao).map((t, i) => ({ id: `m5-rec-${i}`, texto: t, detalhe: "Sua recomendação (da nota)" })),
    {
      id: "m5-recomendar",
      texto: "Faça a sua recomendação antes de ela escolher, com os critérios declarados. Não se esconda atrás de neutralidade.",
      detalhe: "Ordem: o problema pesa e se repete → tem sinal de dinheiro (alguém pagou ou algo vende há meses) → dá para testar logo. Nenhuma com dinheiro: investigação curta antes de apostar.",
    },
    ...linhas(nota5.empates).map((t, i) => ({ id: `m5-emp-${i}`, texto: t, detalhe: "Empate: primeiro desempate é “dá para testar logo?”" })),
    { id: "m5-escolha", texto: "A escolha é dela. Se for diferente da sua recomendação: razão estratégica escrita e condição de revisão." },
    { id: "m5-porque", texto: "Peça o porquê, agora, nas palavras dela. Anote literal." },
    { id: "m5-reserva", texto: "Reserva e em que condição ela entra. As de fora: por que agora não e quando podem voltar." },
    {
      id: "m5-nao-sabemos",
      texto: "O que ainda não sabemos",
      detalhe: naoSabemosDerivado(dados).join(" · "),
    },
    { id: "m5-nao-valida", texto: "Diga com todas as letras: apostar não é validar. É a hipótese que merece as próximas semanas." },
    { id: "m5-registrar", texto: "Registre a aposta na página dela. O NORTE abre." },
  ];

  const todos = [...porFrente, ...daNota, ...decidir, ...leituras, ...paraVoce, ...apostar];
  const feitos = todos.filter((i) => marcados[i.id]).length;

  return (
    <>
      <Objetivo
        objetivo="Primeira parte: para cada hipótese, o que apareceu e o que não apareceu; ela decide o que segue para comparação. Segunda parte: a comparação dela e a escolha de onde apostar."
        sai={["A decisão de cada hipótese do M4 (segue, volta ou guardada), com a razão", "A aposta, com o porquê dela, a reserva e o que ainda não sabemos", "A sua recomendação registrada, concordando ou não"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco n={1} titulo="Hipótese por hipótese" porque="Só os fatos, sem nota nem ranking." itens={porFrente} marcados={marcados} alternar={alternar} vazio="Nenhuma hipótese em teste." />
      <Bloco n={2} titulo="Da sua nota privada" itens={daNota} marcados={marcados} alternar={alternar} vazio="Nada anotado na nota privada do M4." />
      <Bloco n={3} titulo="Decidir" itens={decidir} marcados={marcados} alternar={alternar} />
      <h2 className="mem-h2 ws-guia__parte">Segunda parte · escolher onde apostar</h2>
      <Bloco n={4} titulo="Onde a leitura dela se afasta dos fatos" porque="Percorra só os critérios em que a leitura dela e os fatos se distanciam. Nenhum placar: ela nunca vê quantas vezes escolheu cada hipótese." itens={leituras} marcados={marcados} alternar={alternar} vazio="Ela ainda não comparou." />
      <Bloco n={5} titulo="É para ela?" itens={paraVoce} marcados={marcados} alternar={alternar} />
      <Bloco n={6} titulo="Recomendar e decidir" itens={apostar} marcados={marcados} alternar={alternar} />
    </>
  );
}

// ---------------------------------------------------------------------
// Call 5 · Navegação (M6)
// ---------------------------------------------------------------------
function GuiaCall5({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const m = mentoraOportunidade(dados);
  const { apostando, naoSabemos } = listasIncertezas(dados);
  const explicar: Item[] = [
    { id: "c5-explicar", texto: "Antes de abrir o texto: “me explica a sua oportunidade em um minuto, com as suas palavras”.", detalhe: "Para quem, que problema, o que muda, como você ajuda." },
    { id: "c5-ler", texto: "Agora ela lê a oportunidade montada na tela dela. Note onde a explicação e o texto se afastam.", detalhe: "Anote em “Posse”, na sua nota." },
  ];
  const confrontar: Item[] = [
    ...linhas(nota.confrontos).map((t, i) => ({ id: `c5-conf-${i}`, texto: t, detalhe: "Da sua nota · em cada ponto, ela mantém ou ajusta na tela dela" })),
    { id: "c5-ouviu", texto: "“O que você ouviu que te faz dizer isso?”" },
    { id: "c5-fora", texto: "“Como alguém de fora perceberia que isso mudou?”", detalhe: `Destino: ${valorItem(dados, "destino") || "—"}` },
    { id: "c5-caminho", texto: "“Isso é o caminho, ou já é o formato?”", detalhe: `Direção: ${valorItem(dados, "direcao") || "—"}` },
    { id: "c5-paga", texto: "“Se essa pessoa não pagar, quem pagaria, e o que você ouviu sobre isso?”", detalhe: `Comprador: ${valorItem(dados, "comprador") || "ainda não sabe"}${m.comprador_critico ? " · aposta crítica" : ""}` },
    { id: "c5-manteve", texto: "“O que você manteve da sua aposta, e por quê?”" },
    { id: "c5-nivel3", texto: "Se surgir uma mudança de nível 3 (pessoa ou problema que não foi ouvido): não é ajuste, é retorno. Ela decide, com a sua recomendação explícita." },
  ];
  const separar: Item[] = [
    ...apostando.map((t, i) => ({ id: `c5-ap-${i}`, texto: t, detalhe: "O que estamos apostando" })),
    ...naoSabemos.map((t, i) => ({ id: `c5-ns-${i}`, texto: t, detalhe: "O que ainda não sabemos e vamos acompanhar" })),
    ...(m.limites ?? []).filter((x) => x.trim()).map((t, i) => ({ id: `c5-lim-${i}`, texto: t, detalhe: "O que a oferta não poderá prometer · ela concorda ou discute" })),
  ];
  const assumir: Item[] = [
    ...linhas(nota.recomendacao).map((t, i) => ({ id: `c5-rec-${i}`, texto: t, detalhe: "Sua recomendação (da nota)" })),
    { id: "c5-confere", texto: "Confira: quem vive o problema foi ouvido; o problema é o que apareceu nas conversas e na pesquisa; nenhuma aposta ficou implícita; a direção não fala de formato." },
    { id: "c5-assume", texto: "Ela assume a oportunidade como a aposta que vai para o NORTE. Registre na página dela: o M7 abre." },
    { id: "c5-nao-valida", texto: "Diga: assumida não é validada. A oferta é construída no M7 e testada no M9." },
  ];
  const todos = [...explicar, ...confrontar, ...separar, ...assumir];
  const feitos = todos.filter((i) => marcados[i.id]).length;
  return (
    <>
      <Objetivo
        objetivo="Que ela assuma, com posse e coerência, a oportunidade sobre a qual a oferta vai ser construída."
        sai={["A oportunidade assumida, com o que estamos apostando, o que ainda não sabemos e o que a oferta não poderá prometer", "O M7 aberto"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco n={1} titulo="Explicar sem olhar, depois ler" porque="~10 min. A explicação dela é o teste de posse." itens={explicar} marcados={marcados} alternar={alternar} />
      <Bloco n={2} titulo="Confrontar" porque="25 a 35 min. Só os até três pontos da véspera e o que surgiu entre a explicação e o texto." itens={confrontar} marcados={marcados} alternar={alternar} />
      <Bloco n={3} titulo="Separar o que sabemos do que apostamos" porque="~10 min, em linguagem comum." itens={separar} marcados={marcados} alternar={alternar} vazio="Roteie as incertezas e rascunhe os limites na página dela, no passo 2 do M6." />
      <Bloco n={4} titulo="Assumir" itens={assumir} marcados={marcados} alternar={alternar} />
    </>
  );
}

// ---------------------------------------------------------------------
// Call 6 · Desenhar a Oferta (M7)
// ---------------------------------------------------------------------
function GuiaCall6({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const o = dadosOferta(dados);
  const cs = clientesSimultaneos(o);
  const deps = Object.entries(o.como?.competencia ?? {});
  const confrontos = linhas(nota.confrontos).map((t, i) => ({ id: `c6-conf-${i}`, texto: t, detalhe: "Da sua nota · trate dentro do momento a que pertence" }));
  const explicar: Item[] = [
    { id: "c6-explicar", texto: "Sem a tela: “me explica como a oferta funciona”.", detalhe: "Para quem, o que entrega, como, em que forma. É explicar o instrumento, não vender." },
  ];
  const coerencia: Item[] = [
    { id: "c6-contida", texto: "“Ao final, o que estará concretamente diferente para essa pessoa?”", detalhe: `Entrega: ${o.entrega?.texto || "—"} · destino do M6: ${valorItem(dados, "destino") || "—"}` },
    { id: "c6-fora", texto: "“Que parte do destino fica de fora — e você está confortável com isso?”", detalhe: `Fica de fora: ${o.entrega?.fora || "—"}` },
    { id: "c6-promessa", texto: "“O que você está prometendo aqui sem perceber?”" },
  ];
  const comoForma: Item[] = [
    ...etapas(o).map((e, i) => ({ id: `c6-etapa-${i}`, texto: `“Essa etapa serve a quê na entrega?” · ${i + 1}) ${e}` })),
    { id: "c6-dif", texto: "“O que isso faz que o que essa pessoa já tentou não fez?”", detalhe: `Diferencial: ${o.como?.diferencial || "—"}` },
    { id: "c6-assim", texto: "“Por que assim, e não de outro jeito?”", detalhe: `Forma: ${o.forma?.texto || "—"}` },
  ];
  const capacidade: Item[] = [
    { id: "c6-cabe", texto: "“Com o tempo que você tem hoje, isso cabe?”", detalhe: `${o.capacidade?.horas_semana ?? "—"} h/semana · ${o.capacidade?.horas_cliente ?? "—"} h/cliente → ${cs === null ? "—" : `até ${cs}`}` },
    { id: "c6-exclui", texto: "O que não está incluído", detalhe: o.forma?.exclui || "—" },
    ...deps.map(([i, c]) => ({ id: `c6-dep-${i}`, texto: `“Essa parte depende de algo que você ainda não fez de verdade?” · etapa ${Number(i) + 1}`, detalhe: `${c.qual || "—"} · já fez de parecido: ${c.ja_fez || "—"}` })),
  ];
  const preco: Item[] = [
    { id: "c6-preco", texto: "“Por que começar nesse preço?”", detalhe: `${reais(o.preco?.valor)}, ${o.preco?.condicao || "—"} · ${o.preco?.racional || "—"}` },
    { id: "c6-hip", texto: "Diga: assumir a oferta não é assumir que o preço está certo. É hipótese." },
  ];
  const assumir: Item[] = [
    ...linhas(nota.recomendacao).map((t, i) => ({ id: `c6-rec-${i}`, texto: t, detalhe: "Sua recomendação (da nota)" })),
    { id: "c6-verif", texto: "Confira as sete verificações na página dela." },
    { id: "c6-assume", texto: "Ela assume a oferta. Registre as recomendações e se ela concordou: o M8 abre." },
  ];
  const todos = [...explicar, ...confrontos, ...coerencia, ...comoForma, ...capacidade, ...preco, ...assumir];
  const feitos = todos.filter((i) => marcados[i.id]).length;
  return (
    <>
      <Objetivo
        objetivo="Que ela explique, sustente e assuma o instrumento que construiu. Não é apresentação comercial e você não aprova: confere se a passagem é possível."
        sai={["A oferta assumida, com o que é hipótese e os limites", "Suas recomendações e se ela concordou", "O M8 aberto"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco n={1} titulo="Explicar sem olhar" porque="~5 min." itens={explicar} marcados={marcados} alternar={alternar} />
      {confrontos.length > 0 && <Bloco n={2} titulo="Seus pontos de confronto" itens={confrontos} marcados={marcados} alternar={alternar} />}
      <Bloco n={3} titulo="Oportunidade, destino e entrega" porque="15 a 20 min." itens={coerencia} marcados={marcados} alternar={alternar} />
      <Bloco n={4} titulo="O como e a forma" porque="10 a 15 min." itens={comoForma} marcados={marcados} alternar={alternar} />
      <Bloco n={5} titulo="Capacidade, limites e dependências" porque="~10 min." itens={capacidade} marcados={marcados} alternar={alternar} />
      <Bloco n={6} titulo="Preço" porque="5 a 10 min." itens={preco} marcados={marcados} alternar={alternar} />
      <Bloco n={7} titulo="Assumir" itens={assumir} marcados={marcados} alternar={alternar} />
    </>
  );
}

// ---------------------------------------------------------------------
// Call 7 · Traduzir (M8)
// ---------------------------------------------------------------------
function GuiaCall7({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const p = dadosPreparo(dados);
  const o = dadosOferta(dados);
  const vocab = vocabularioMem(p.resumo);
  const confrontos: Item[] = linhas(nota.confrontos).map((t, i) => ({ id: `c7-conf-${i}`, texto: t, detalhe: "Da sua nota" }));
  const promessa: Item[] = [
    { id: "c7-ler", texto: "Ela lê a promessa.", detalhe: `“${p.promessa?.texto ?? "—"}”` },
    { id: "c7-cumpre", texto: "“Se ela receber exatamente o que você entrega, vai reconhecer que isso foi cumprido?”", detalhe: `Entrega: ${o.entrega?.texto ?? "—"}` },
    { id: "c7-origem", texto: "“Essa mudança já está na entrega, ou você está acrescentando?”" },
    { id: "c7-fora", texto: "“Isso está na lista do que fica de fora?”", detalhe: `Fica de fora: ${o.entrega?.fora ?? "—"} · limites: ${limitesDaOferta(dados).join(" · ") || "—"}` },
    { id: "c7-m7", texto: "Se a promessa só fica de pé com uma entrega maior: registre o possível retorno ao M7, na decisão da entrega." },
  ];
  const abordagem: Item[] = [
    { id: "c7-ab", texto: "Confere com o diferencial do M7, sem superioridade inventada?", detalhe: `Dela: ${p.abordagem?.texto ?? "—"} · diferencial: ${o.como?.diferencial ?? "—"}` },
  ];
  const falada: Item[] = [
    { id: "c7-fala", texto: "Ela apresenta em até um minuto, sem olhar." },
    { id: "c7-vocab", texto: "“Uma pessoa que nunca te ouviu entenderia essa palavra?”", detalhe: vocab.length ? `No resumo: ${vocab.join(", ")}` : "Nenhuma palavra da mentoria no resumo." },
    { id: "c7-cresceu", texto: "Aponte onde a fala cresceu além da entrega." },
  ];
  const rota: Item[] = [
    { id: "c7-rota", texto: "“Por que essa rota, com o acesso que você já mostrou?”", detalhe: `${ROTAS.find((r) => r.valor === p.rota?.tipo)?.rotulo ?? "—"} · ${p.rota?.porque ?? "—"}` },
    { id: "c7-pagar", texto: "“O que precisa estar disponível para alguém conseguir pagar?”", detalhe: "Liste com ela o que falta para os quatro passos: interesse, aceite, pagamento, início." },
  ];
  const todos = [...confrontos, ...promessa, ...abordagem, ...falada, ...rota];
  const feitos = todos.filter((i) => marcados[i.id]).length;
  return (
    <>
      <Objetivo
        objetivo="Traduzir: promessa contida, “por que do seu jeito” e apresentação prontos para o ensaio; rota inicial escolhida. Você não reescreve: diz o que não funciona e por quê."
        sai={["Promessa que passa nas duas perguntas", "Apresentação falada e escrita para ensaiar", "Rota inicial, como hipótese, e a lista do que falta no caminho"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      {confrontos.length > 0 && <Bloco n={1} titulo="Seus pontos de confronto" itens={confrontos} marcados={marcados} alternar={alternar} />}
      <Bloco n={2} titulo="Promessa" porque="15 a 20 min." itens={promessa} marcados={marcados} alternar={alternar} />
      <Bloco n={3} titulo="Por que do seu jeito" porque="~10 min." itens={abordagem} marcados={marcados} alternar={alternar} />
      <Bloco n={4} titulo="Apresentação falada" porque="~15 min." itens={falada} marcados={marcados} alternar={alternar} />
      <Bloco n={5} titulo="Rota e caminho" porque="~10 min." itens={rota} marcados={marcados} alternar={alternar} />
    </>
  );
}

// ---------------------------------------------------------------------
// Call 8 · Ensaiar e passar (M8) + handoff para o M9
// ---------------------------------------------------------------------
function GuiaCall8({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const p = dadosPreparo(dados);
  const papel: Item[] = [
    ...linhas(nota.papel).map((t, i) => ({ id: `c8-papel-${i}`, texto: t, detalhe: "O seu papel (da nota)" })),
    ...falasDesejo(dados).slice(0, 3).map((t, i) => ({ id: `c8-fala-${i}`, texto: t, detalhe: "Fala do M4 para usar no papel" })),
    ...tentativas(dados).slice(0, 2).map((t, i) => ({ id: `c8-tent-${i}`, texto: `Já tentei: ${t}`, detalhe: "Duvide a partir disso" })),
    { id: "c8-nunca", texto: "No papel: pergunte, duvide, peça o preço. Nunca diga “eu compraria”." },
  ];
  const devolucao: Item[] = [
    { id: "c8-sair", texto: "Saia do papel e conte o que entendeu: o que é, para quem, que mudança, o que recebe, quanto, como avança." },
    { id: "c8-compreensao", texto: "Onde você não conseguiu dizer: problema de compreensão." },
    { id: "c8-contencao", texto: "Onde entendeu algo maior que a entrega: problema de contenção." },
  ];
  const caminho: Item[] = CAMINHO.map((x) => ({ id: `c8-${x.chave}`, texto: `Percorram juntas: ${x.titulo.toLowerCase()}`, detalhe: p.caminho?.[x.chave]?.como ?? "—" }));
  const fechar: Item[] = [
    { id: "c8-obj", texto: "Registrem até três objeções previsíveis, com origem, e a resposta dela dentro da entrega." },
    { id: "c8-gate", texto: "Confiram o Gate 6 e ela assume a oferta preparada." },
    { id: "c8-nao", texto: "Diga: o ensaio não é validação. É “estamos prontos para descobrir”." },
  ];
  const handoff: Item[] = [
    { id: "c8-b1", texto: "Parte B: registrem o ponto de partida, os materiais, as hipóteses que chegam ao M9 e os limites do teste." },
    { id: "c8-b2", texto: "Sem definir quem abordar, quantas pessoas, duração ou metas: isso é do M9, por escrito, logo depois da call." },
  ];
  const todos = [...papel, ...devolucao, ...caminho, ...fechar, ...handoff];
  const feitos = todos.filter((i) => marcados[i.id]).length;
  return (
    <>
      <Objetivo
        objetivo="Parte A: verificar compreensão, contenção e caminho no ensaio, e o Gate 6. Parte B: o registro do que o M9 recebe."
        sai={["A oferta preparada para teste, assumida por ela", "Até três objeções previsíveis, com origem", "O handoff para o M9"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco n={1} titulo="Ensaio: ela apresenta, você no papel" porque="~10 min." itens={papel} marcados={marcados} alternar={alternar} />
      <Bloco n={2} titulo="Devolução" porque="~10 min." itens={devolucao} marcados={marcados} alternar={alternar} />
      <Bloco n={3} titulo="Percorrer o caminho" porque="5 a 10 min. Cada passo está disponível e pode ser percorrido sem improviso?" itens={caminho} marcados={marcados} alternar={alternar} />
      <Bloco n={4} titulo="Objeções e Gate 6" porque="5 a 10 min." itens={fechar} marcados={marcados} alternar={alternar} />
      <Bloco n={5} titulo="Parte B · handoff para o M9" porque="10 a 15 min." itens={handoff} marcados={marcados} alternar={alternar} />
    </>
  );
}

// ---------------------------------------------------------------------
// Call 9 · Leitura e Gate 7 (M9)
// ---------------------------------------------------------------------
function GuiaCall9({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const t = dadosTeste(dados);
  const r = resumoFatos(dados);
  const narrar: Item[] = [
    { id: "c9-narrar", texto: "Sem olhar: “me conta o teste: quantas pessoas, até onde chegaram, o que disseram”.", detalhe: "Note o que ela lembra e o que esquece." },
  ];
  const acesso: Item[] = [
    { id: "c9-acesso", texto: "A rota chegou a quem devia?", detalhe: `${r.tentados} contatos → ${r.alcancados} responderam → ${r.total} exposições completas` },
    { id: "c9-compat", texto: "“Essa pessoa era de quem você espera que compre? Ela chegou a receber uma proposta concreta?”" },
    ...linhas(nota.acesso_oferta).map((x, i) => ({ id: `c9-ao-${i}`, texto: x, detalhe: "Da sua nota" })),
  ];
  const variaveis: Item[] = [
    ...VARIAVEIS.map((v) => ({ id: `c9-v-${v.chave}`, texto: v.rotulo, detalhe: fatosVariavel(dados, v.chave).join(" · ") })),
    { id: "c9-fez", texto: "“Isso foi o que ela fez, ou o que ela disse? Esse motivo apareceu mais de uma vez?”" },
  ];
  const limites: Item[] = [
    { id: "c9-mud", texto: "O que mudou durante o teste, e com que ponto de corte?", detalhe: (t.mudancas ?? []).map((m) => `${m.tipo}: ${m.o_que}`).join(" · ") || "Nenhuma mudança registrada" },
    { id: "c9-nao", texto: "“O que essa leitura não pode dizer?”", detalhe: t.leitura?.limites ?? "—" },
  ];
  const classificar: Item[] = [
    ...linhas(nota.confrontos).map((x, i) => ({ id: `c9-conf-${i}`, texto: x, detalhe: "Seu ponto de confronto" })),
    { id: "c9-leitura", texto: `Ela apresenta a leitura: ${rotuloLeitura(t.leitura?.geral)}`, detalhe: t.leitura?.sintese ?? "—" },
    { id: "c9-gate", texto: "Confiram o Gate 7. Se discordarem, registrem as duas leituras." },
    { id: "c9-naodecide", texto: "Não decidam mudar preço, oferta, rota ou comprador, nem continuar ou parar: isso é do M10." },
  ];
  const todos = [...narrar, ...acesso, ...variaveis, ...limites, ...classificar];
  const feitos = todos.filter((i) => marcados[i.id]).length;
  return (
    <>
      <Objetivo objetivo="Organizar o que aconteceu, classificar a evidência e passar pelo Gate 7, sem decidir o próximo passo." sai={["A evidência por parte, com o que permite e o que não permite dizer", "A leitura classificada (e a sua, se diferente)", "O M10 aberto"]} />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco n={1} titulo="O que aconteceu" porque="~10 min." itens={narrar} marcados={marcados} alternar={alternar} />
      <Bloco n={2} titulo="Acesso × oferta" porque="~10 min. Só as exposições completas leem a oferta." itens={acesso} marcados={marcados} alternar={alternar} />
      <Bloco n={3} titulo="Comportamento e motivos, parte por parte" porque="15 a 20 min." itens={variaveis} marcados={marcados} alternar={alternar} />
      <Bloco n={4} titulo="Mudanças e limites" porque="5 a 10 min." itens={limites} marcados={marcados} alternar={alternar} />
      <Bloco n={5} titulo="Classificação e Gate 7" porque="~10 min." itens={classificar} marcados={marcados} alternar={alternar} />
    </>
  );
}

function GuiaCall10({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
  const { marcados, alternar } = useMarcados(chave);
  const x = dadosM10(dados);
  const cap = (k: string) => CAPACIDADES.find((c) => c.chave === k)!;
  const regra = "Só a abertura e, se precisar, esclarecimento. Registre cada pergunta na página dela.";
  const reconstruir: Item[] = [
    { id: "c10-rec", texto: `“${cap("reconstruir").abertura}”`, detalhe: regra },
    { id: "c10-acont", texto: "“E o que aconteceu no teste?”", detalhe: "Corrija só fatos ou classificações mal sustentadas." },
  ];
  const sugere: Item[] = [
    { id: "c10-sug", texto: "Ela apresenta o que o teste sugere e o que aprendeu.", detalhe: x.sugere ?? "—" },
    ...linhas(nota.confrontos).map((t, i) => ({ id: `c10-conf-${i}`, texto: t, detalhe: "Seu ponto de confronto" })),
    { id: "c10-dist", texto: `“${cap("distinguir").abertura}”`, detalhe: linhas(nota.conclusoes).join(" · ") || "Escolha as conclusões na nota privada" },
  ];
  const decidir: Item[] = [
    { id: "c10-dec", texto: `“${cap("justificar").abertura}”`, detalhe: `Ela escreveu: ${rotuloDecisao(x.decisao)} · ${x.porque ?? "—"}` },
    { id: "c10-ev", texto: "“Qual evidência sustenta isso?”" },
    { id: "c10-op", texto: "“Você está decidindo sobre o que aconteceu ou sobre o que gostaria que tivesse acontecido?”" },
    { id: "c10-sem", texto: "“Se tirarmos a sua opinião, o que sobra?”" },
    { id: "c10-est", texto: "O estado da hipótese combina com a decisão?", detalhe: rotuloEstatuto(x.estatuto) },
    { id: "c10-ret", texto: "Se volta um passo: é o menor retorno capaz de corrigir o que travou?" },
  ];
  const continuidade: Item[] = [
    { id: "c10-prox", texto: `“${cap("proximo").abertura}”`, detalhe: `Plano dela: ${x.plano?.acao ?? "—"} · ${x.plano?.pergunta ?? "—"}` },
    ...(x.ativo?.criterio ? [{ id: "c10-ativo", texto: "O critério do que está a confirmar demonstra a competência?", detalhe: x.ativo.criterio }] : []),
  ];
  const fechar: Item[] = [
    { id: "c10-a", texto: "Confiram a qualidade da decisão (parte A)." },
    { id: "c10-b", texto: "Marquem cada capacidade: demonstrada ou não nesta call, com o que faltou." },
    { id: "c10-fim", texto: "A decisão é dela. Fechem a jornada." },
    { id: "c10-pdf", texto: "Avise: o PDF da jornada completa fica no relatório final, e o acesso fecha 60 dias depois desta call." },
  ];
  const todos = [...reconstruir, ...sugere, ...decidir, ...continuidade, ...fechar];
  const feitos = todos.filter((i) => marcados[i.id]).length;
  return (
    <>
      <Objetivo
        objetivo="Ela decide o que fazer com a aposta e mostra que sabe continuar decidindo sozinha. Você confronta e verifica; não escolhe por ela."
        sai={["A decisão, com fundamento, limite e o que faria rever", "As quatro capacidades marcadas", "A jornada fechada, com o relatório final"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco n={1} titulo="Reconstruir sem olhar" porque="~10 min. Ela conta sem a tela." itens={reconstruir} marcados={marcados} alternar={alternar} />
      <Bloco n={2} titulo="O que sugere e o que aprendeu" porque="~15 min." itens={sugere} marcados={marcados} alternar={alternar} />
      <Bloco n={3} titulo="Decidir e testar a decisão" porque="~15 min." itens={decidir} marcados={marcados} alternar={alternar} />
      <Bloco n={4} titulo="Continuidade" porque="~10 min." itens={continuidade} marcados={marcados} alternar={alternar} />
      <Bloco n={5} titulo="Fechamento" porque="~10 min." itens={fechar} marcados={marcados} alternar={alternar} />
    </>
  );
}
