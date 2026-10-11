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
import Aviso from "../../componentes/Aviso";
import NotaPrivada from "../../componentes/NotaPrivada";

// Guia da call: uma página só para a call, com o roteiro do método e o que é
// desta mentorada (sua nota privada, as pistas, as respostas dela). Os itens
// marcados ficam guardados neste navegador; as anotações vão para a nota privada.

type Nota = Record<string, string | undefined>;

const GUIAS_PRONTOS = new Set([1, 2, 3, 4]);

export default function GuiaCall() {
  const { id, n } = useParams();
  const numero = Number(n);
  const { dados, erro } = useJornada(id);
  const [nome, setNome] = useState("");
  const [mentoriaId, setMentoriaId] = useState<string | null>(null);
  const [nota, setNota] = useState<Nota>({});

  useEffect(() => {
    if (!supabase || !id) return;
    supabase
      .from("jornada")
      .select("conta(pessoa(nome)), mentoria(id)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as unknown as { conta: { pessoa: { nome: string } }; mentoria: { id: string } | null } | null;
        setNome(d?.conta?.pessoa?.nome ?? "");
        setMentoriaId(d?.mentoria?.id ?? null);
      });
  }, [id]);

  useEffect(() => {
    if (!supabase || !mentoriaId) return;
    supabase
      .from("nota_privada")
      .select("conteudo")
      .eq("mentoria_id", mentoriaId)
      .eq("movimento_codigo", numero)
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
        <Link to="/" className="ws-voltar">
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
      ) : (
        <GuiaCall4 dados={dados} nota={nota} chave={`${id}:4`} />
      )}

      {mentoriaId && GUIAS_PRONTOS.has(numero) && (
        <NotaPrivada
          mentoriaId={mentoriaId}
          movimento={numero}
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
    { id: "m4-meta", texto: "Defina a meta de conversas de cada hipótese.", detalhe: "3 é o ponto de partida; menos se o acesso é difícil. Nunca menos de 2." },
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
function GuiaCall4({ dados, nota, chave }: { dados: DadosJornada; nota: Nota; chave: string }) {
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
    { id: "d4-criterio", texto: "Só segue para comparação quem tem 2 ou mais conversas do público com caso concreto." },
    { id: "d4-dela", texto: "Entre as que podem seguir, a escolha é dela. Uma hipótese sem sinal não segue só porque ela gosta." },
    { id: "d4-validacao", texto: "Diga com todas as letras: seguir não é validar. É ter material para comparar." },
    { id: "d4-registrar", texto: "Registre a decisão de cada hipótese, com a razão. O M5 abre e vocês seguem para a segunda parte da call." },
  ];

  const todos = [...porFrente, ...daNota, ...decidir];
  const feitos = todos.filter((i) => marcados[i.id]).length;

  return (
    <>
      <Objetivo
        objetivo="Início da Call 4: para cada hipótese, o que apareceu, o que não apareceu e o que ainda é dúvida. Depois, ela decide o que segue para comparação."
        sai={["A decisão de cada hipótese (segue, volta ou guardada), com a razão", "O M5 aberto, para a segunda parte da call"]}
      />
      <Progresso total={todos.length} feitos={feitos} />
      <Bloco n={1} titulo="Hipótese por hipótese" porque="Só os fatos, sem nota nem ranking." itens={porFrente} marcados={marcados} alternar={alternar} vazio="Nenhuma hipótese em teste." />
      <Bloco n={2} titulo="Da sua nota privada" itens={daNota} marcados={marcados} alternar={alternar} vazio="Nada anotado na nota privada do M4." />
      <Bloco n={3} titulo="Decidir" itens={decidir} marcados={marcados} alternar={alternar} />
      <Aviso variante="warn" titulo="Segunda parte da call">
        A comparação (M5) ganha guia quando o M5 for construído.
      </Aviso>
    </>
  );
}
