import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import logo from "../../mem-brand/logo/mem-horizontal.svg";
import { supabase } from "../lib/supabase";
import { useSessao } from "../lib/sessao";
import { useJornada } from "../lib/useJornada";
import { call, type DadosJornada, type Registro } from "../lib/jornada";
import { dataCurta } from "../lib/datas";
import { CALLS_DO_MOVIMENTO, MOVIMENTOS, PILARES } from "../lib/metodo";
import { situacoes, tituloDaSituacao, type Situacao } from "../lib/m1";
import { ROTULOS, decisaoM2, nomePadrao, porqueDaDecisao } from "../lib/m2";
import { ativosEscolhidos, dadosHipotese, fraseTexto, hipoteses } from "../lib/m3";
import { fraseDaFrente, frentes, resumo } from "../lib/m4";
import { decisaoM5, porqueDaAposta, type DecisaoM5 } from "../lib/m5";
import { dadosM10, fimDoAcesso, mentoraM10, rotuloDecisao, rotuloStatusJornada } from "../lib/m10";
import Aviso from "../componentes/Aviso";
import LeituraKaren from "../componentes/LeituraKaren";
import { OportunidadeAssumida } from "./mentorada/M6";
import { OfertaAssumida } from "./mentorada/M7";
import { PreparoAssumido } from "./mentorada/M8";
import { Resultado } from "./mentorada/M9";
import { RelatorioFinal } from "./mentorada/M10";

// A jornada completa, para imprimir ou salvar em PDF: o resumo final e, movimento a
// movimento, o que ela construiu e as leituras da Karen. É o material que ela leva
// quando a jornada termina. Nada da mentora que seja privado entra aqui.
export default function JornadaCompleta() {
  const { id } = useParams();
  const { pessoa } = useSessao();
  const { dados, erro } = useJornada(id);
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (!id || !supabase) return;
    supabase
      .from("jornada")
      .select("conta(nome, pessoa(nome))")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        const c = (data as unknown as { conta?: { nome?: string | null; pessoa?: { nome?: string } | null } } | null)?.conta;
        setNome(c?.pessoa?.nome ?? c?.nome ?? "");
      });
  }, [id]);

  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;
  const quem = id ? nome : pessoa?.nome ?? "";
  const voltar = id ? `/mentoradas/${id}` : "/jornada/10";
  const m = mentoraM10(dados);

  if (dados.jornada.estado !== "concluida")
    return (
      <>
        <h1 className="mem-h1">A jornada completa</h1>
        <p className="mem-body">Fica disponível quando a jornada for concluída, na Call 10.</p>
      </>
    );

  return (
    <article className="ws-dossie">
      <div className="ws-acoes ws-dossie__topo">
        <Link to={voltar} className="mem-btn mem-btn--quiet">
          Voltar
        </Link>
        <button type="button" className="mem-btn mem-btn--primary" onClick={() => window.print()}>
          Imprimir ou salvar em PDF
        </button>
        <span className="mem-body-sm mem-muted">
          Na janela de impressão, escolha “Salvar como PDF”.
          {fimDoAcesso(dados) && (id ? ` O acesso dela fecha em ${dataCurta(fimDoAcesso(dados)!)}.` : ` Salve até ${dataCurta(fimDoAcesso(dados)!)}: depois disso o seu acesso fecha.`)}
        </span>
      </div>

      <header className="ws-dossie__capa">
        <img src={logo} alt="MEM · Método Expertise Monetizada" className="ws-dossie__logo" />
        <span className="mem-label mem-muted">Jornada completa</span>
        <h1 className="mem-display">{quem || "A sua jornada"}</h1>
        <p className="mem-body-lg">
          {dataComAno(dados.jornada.data_inicio)} a {dataComAno(dados.jornada.encerrada_em ?? m.gate_em ?? dados.jornada.data_limite)}
        </p>
        <p className="mem-body">{rotuloStatusJornada(m.status_jornada)}</p>
        {dadosM10(dados).decisao && (
          <p className="mem-body-lg ws-serif">
            Onde você chegou: {rotuloDecisao(dadosM10(dados).decisao).toLowerCase()}. A decisão completa e o plano estão no fim, no Movimento 10.
          </p>
        )}
        <div className="ws-dossie__sumario">
          {PILARES.map((p) => (
            <div key={p.nome} className="ws-dossie__sumario-pilar">
              <p className="mem-label">{p.nome}</p>
              <p className="mem-body-sm mem-muted">{p.frase}</p>
              <ul className="mem-body">
                {numeros(p.de, p.ate).map((n) => (
                  <li key={n}>
                    <span className="mem-label mem-muted">{String(n).padStart(2, "0")}</span> {MOVIMENTOS[n]}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </header>


      {PILARES.map((p, i) => (
        <div key={p.nome} className="ws-dossie__pilar-grupo">
          <section className="ws-dossie__parte ws-dossie__abertura">
            <div className="ws-pilar ws-pilar--atual">
              <span className="ws-pilar__nome">{p.nome}</span>
              <span className="ws-pilar__meta">
                Pilar {i + 1} de 2 · movimentos {p.de} a {p.ate}
              </span>
              <span className="ws-pilar__frase">{p.frase}</span>
            </div>
            <ol className="ws-dossie__perguntas">
              {numeros(p.de, p.ate).map((n) => (
                <li key={n}>
                  <span className="mem-label mem-muted">
                    {String(n).padStart(2, "0")} · {MOVIMENTOS[n]}
                  </span>
                  <span className="mem-h3 ws-serif">{PERGUNTA[n]}</span>
                </li>
              ))}
            </ol>
          </section>
          {numeros(p.de, p.ate).map((n) => (
            <section key={n} className="ws-dossie__parte">
              <SecaoNumero n={`${p.nome} · ${String(n).padStart(2, "0")}`} titulo={MOVIMENTOS[n]} sub={rotuloCall(dados, n)} pergunta={PERGUNTA[n]} />
              <Construido dados={dados} n={n} />
              <Leituras dados={dados} n={n} />
            </section>
          ))}
        </div>
      ))}

      <footer className="ws-dossie__rodape mem-body-sm mem-muted">
        MEM · Método Expertise Monetizada · gerado em {dataComAno(new Date().toISOString())}
      </footer>
    </article>
  );
}

function dataComAno(v: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00-03:00`) : new Date(v);
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

// A pergunta que cada movimento respondeu, na linguagem dela.
const PERGUNTA: Record<number, string> = {
  1: "O que você já fez, na prática?",
  2: "O que você sabe fazer que resolve o problema de alguém?",
  3: "Para quem isso pode valer dinheiro?",
  4: "O que as pessoas fizeram, e não só o que acharam?",
  5: "Onde vale apostar primeiro?",
  6: "Qual é, exatamente, a oportunidade?",
  7: "O que você vende, como e por quanto?",
  8: "Como você apresenta a oferta e chega até as pessoas?",
  9: "Alguém compra?",
  10: "O que o teste mostrou, e o que você decide?",
};

function numeros(de: number, ate: number): number[] {
  return Array.from({ length: ate - de + 1 }, (_, i) => de + i);
}

function SecaoNumero({ n, titulo, sub, pergunta }: { n: string; titulo: string; sub?: string; pergunta?: string }) {
  return (
    <div className="ws-dossie__secao">
      <span className="mem-label mem-muted">
        {n}
        {sub ? ` · ${sub}` : ""}
      </span>
      <h2 className="mem-h1">{titulo}</h2>
      {pergunta && <p className="mem-body-lg ws-serif mem-muted">{pergunta}</p>}
    </div>
  );
}

function rotuloCall(d: DadosJornada, n: number): string {
  const c = CALLS_DO_MOVIMENTO[n];
  if (!c) return "";
  const e = call(d, c.decide);
  const quando = e ? ` (${dataCurta(e.data_realizada ?? e.data_atual)})` : "";
  return c.comeca && c.comeca !== c.decide ? `Calls ${c.comeca} e ${c.decide}${quando}` : `Call ${c.decide}${quando}`;
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="ws-dossie__bloco">
      <h3 className="mem-h3">{titulo}</h3>
      {children}
    </div>
  );
}

// O que ela construiu em cada movimento, a partir dos registros.
function Construido({ dados, n }: { dados: DadosJornada; n: number }) {
  if (n === 1) {
    const s = [...situacoes(dados)].sort((a, b) => Number((a.conteudo as Situacao).ano ?? 0) - Number((b.conteudo as Situacao).ano ?? 0));
    return (
      <Bloco titulo="As situações da sua história">
        <ul className="ws-lista-simples mem-body">
          {s.map((r) => {
            const x = r.conteudo as Situacao;
            return (
              <li key={r.id}>
                <strong>
                  {x.ano} · {tituloDaSituacao(r)}
                </strong>
                {x.contexto && <span> · {x.contexto}</span>}
                {x.o_que_mudou && <span className="mem-muted"> · o que mudou: {x.o_que_mudou}</span>}
              </li>
            );
          })}
        </ul>
      </Bloco>
    );
  }
  if (n === 2) {
    const dec = decisaoM2(dados);
    const nao = ((dec?.conteudo_mentora as { nao_seguiram?: { padrao: string; razao?: string; condicao_volta?: string }[] })?.nao_seguiram ?? []);
    return (
      <Bloco titulo="O que você sabe fazer que resolve o problema de alguém">
        <ul className="ws-lista-simples mem-body">
          {ativosEscolhidos(dados).map((a) => (
            <li key={a.id}>
              <strong>{a.nome}</strong> · {ROTULOS[a.rotulo].toLowerCase()}
              {a.quemTinha && <span className="mem-muted"> · quem tinha o problema: {a.quemTinha}</span>}
            </li>
          ))}
        </ul>
        {nao.length > 0 && (
          <p className="mem-body-sm mem-muted">
            Ficaram de fora: {nao.map((x) => `${nomePadrao(dados, x.padrao)}${x.razao ? ` (${x.razao})` : ""}`).join(" · ")}
          </p>
        )}
        {porqueDaDecisao(dec).texto && <p className="mem-body ws-serif">“{porqueDaDecisao(dec).texto}”</p>}
      </Bloco>
    );
  }
  if (n === 3)
    return (
      <Bloco titulo="As hipóteses">
        <ul className="ws-lista-simples mem-body">
          {hipoteses(dados).map((h) => {
            const cm = h.conteudo_mentora as { status?: string; razao?: string };
            return (
              <li key={h.id}>
                {fraseTexto(dados, dadosHipotese(h))}
                <span className="mem-muted"> · {cm.status === "guardada" ? `ficou guardada${cm.razao ? `: ${cm.razao}` : ""}` : "foi para o mercado"}</span>
              </li>
            );
          })}
        </ul>
      </Bloco>
    );
  if (n === 4)
    return (
      <Bloco titulo="O que o mercado mostrou">
        <ul className="ws-lista-simples mem-body">
          {frentes(dados).map((f) => (
            <li key={f.id}>
              <strong>{fraseDaFrente(dados, f)}</strong>
              <br />
              <span className="mem-muted">{resumo(dados, f)}</span>
            </li>
          ))}
        </ul>
      </Bloco>
    );
  if (n === 5) {
    const dec = decisaoM5(dados);
    if (!dec) return null;
    const c = dec.conteudo_mentora as DecisaoM5;
    const frase = (hid?: string) => {
      const h = hipoteses(dados).find((x) => x.id === hid);
      return h ? fraseTexto(dados, dadosHipotese(h)) : "—";
    };
    return (
      <Bloco titulo="A aposta">
        <p className="mem-body">
          <strong>{frase(c.aposta)}</strong>
        </p>
        {porqueDaAposta(dec) && <p className="mem-body ws-serif">“{porqueDaAposta(dec)}”</p>}
        {c.reserva && (
          <p className="mem-body-sm mem-muted">
            Reserva: {frase(c.reserva)} · entra se {c.reserva_condicao}
          </p>
        )}
        {(c.nao_sabemos ?? []).length > 0 && <p className="mem-body-sm mem-muted">O que ainda não sabíamos: {(c.nao_sabemos ?? []).join(" · ")}</p>}
      </Bloco>
    );
  }
  if (n === 6) return <OportunidadeAssumida dados={dados} />;
  if (n === 7) return <OfertaAssumida dados={dados} />;
  if (n === 8) return <PreparoAssumido dados={dados} />;
  if (n === 9) return <Resultado dados={dados} final />;
  return <RelatorioFinal dados={dados} final />;
}

// As leituras que a Karen publicou neste movimento, em ordem.
function Leituras({ dados, n }: { dados: DadosJornada; n: number }) {
  const lista = dados.registros
    .filter((r: Registro) => r.tipo === "leitura" && r.movimento_codigo === n && !r.pendente_publicacao && r.conteudo_mentora.tipo_leitura !== "mensagem_abertura")
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  if (!lista.length) return null;
  return (
    <div className="ws-dossie__leituras">
      {lista.map((r) => (
        <LeituraKaren key={r.id} registro={r} />
      ))}
    </div>
  );
}
