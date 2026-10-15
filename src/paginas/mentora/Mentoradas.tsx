import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { MOVIMENTOS } from "../../lib/metodo";
import { dataCurta, dataHora } from "../../lib/datas";
import { rotuloDecisao, rotuloStatusJornada } from "../../lib/m10";
import Aviso from "../../componentes/Aviso";

type Concluida = {
  id: string;
  nome: string;
  encerrada_em: string | null;
  status: string | null;
  publico: string;
  oferta: string;
  preco: string;
  decisao: string;
};

type Linha = {
  id: string;
  nome: string;
  email: string | null;
  data_inicio: string;
  data_limite: string;
  movimento: number | null;
  proximo: { numero: number | null; data_atual: string } | null;
  folga_restante: number | null;
};

// Tela da mentora: as jornadas em andamento e, abaixo, as concluídas, para consulta.
export default function Mentoradas() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState(false);
  const [concluidas, setConcluidas] = useState<Concluida[] | null>(null);
  const [busca, setBusca] = useState("");
  const local = useLocation();
  const recemIniciada = (local.state as { iniciada?: string } | null)?.iniciada;

  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    (async () => {
      const [jornadas, movimentos, encontros, cronogramas] = await Promise.all([
        db
          .from("jornada")
          .select("id, data_inicio, data_limite, conta(pessoa(nome, email))")
          .eq("estado", "em_andamento")
          .order("data_inicio"),
        db.from("movimento").select("jornada_id, codigo").eq("estado", "aberto"),
        db
          .from("encontro")
          .select("jornada_id, numero, data_atual")
          .eq("estado", "marcado")
          .order("data_atual"),
        db.from("jornada_cronograma").select("jornada_id, folga_restante_dias"),
      ]);
      if (jornadas.error) {
        setErro(true);
        return;
      }
      type J = {
        id: string;
        data_inicio: string;
        data_limite: string;
        conta: { pessoa: { nome: string; email: string | null } | null } | null;
      };
      setLinhas(
        (jornadas.data as unknown as J[]).map((j) => {
          const prox = encontros.data?.find((e) => e.jornada_id === j.id) ?? null;
          return {
            id: j.id,
            nome: j.conta?.pessoa?.nome ?? "—",
            email: j.conta?.pessoa?.email ?? null,
            data_inicio: j.data_inicio,
            data_limite: j.data_limite,
            movimento: movimentos.data?.find((m) => m.jornada_id === j.id)?.codigo ?? null,
            proximo: prox ? { numero: prox.numero, data_atual: prox.data_atual } : null,
            folga_restante:
              cronogramas.data?.find((c) => c.jornada_id === j.id)?.folga_restante_dias ?? null,
          };
        }),
      );

      // Jornadas concluídas: ficam para consulta, com o essencial de cada uma.
      const conc = await db
        .from("jornada")
        .select("id, encerrada_em, status_autonomia, conta(pessoa(nome))")
        .eq("estado", "concluida")
        .order("encerrada_em", { ascending: false });
      const cj = (conc.data ?? []) as unknown as { id: string; encerrada_em: string | null; status_autonomia: string | null; conta: { pessoa: { nome: string } | null } | null }[];
      if (!cj.length) return setConcluidas([]);
      const regs = await db
        .from("registro")
        .select("id, jornada_id, tipo, conteudo, conteudo_mentora")
        .in("jornada_id", cj.map((j) => j.id))
        .in("tipo", ["oferta", "decisao_m10", "decisao_m5", "hipotese"]);
      type R = { id: string; jornada_id: string; tipo: string; conteudo: Record<string, unknown>; conteudo_mentora: Record<string, unknown> };
      const rs = (regs.data ?? []) as R[];
      setConcluidas(
        cj.map((j) => {
          const de = rs.filter((r) => r.jornada_id === j.id);
          const of = de.find((r) => r.tipo === "oferta")?.conteudo as { entrega?: { texto?: string }; preco?: { valor?: number } } | undefined;
          const d10 = de.find((r) => r.tipo === "decisao_m10")?.conteudo as { decisao?: string } | undefined;
          const ap = (de.find((r) => r.tipo === "decisao_m5")?.conteudo_mentora as { aposta?: string } | undefined)?.aposta;
          const h = de.find((r) => r.id === ap)?.conteudo as { publico?: string; problema?: string } | undefined;
          return {
            id: j.id,
            nome: j.conta?.pessoa?.nome ?? "—",
            encerrada_em: j.encerrada_em,
            status: j.status_autonomia,
            publico: [h?.publico, h?.problema].filter(Boolean).join(" · "),
            oferta: of?.entrega?.texto ?? "",
            preco: typeof of?.preco?.valor === "number" ? of.preco.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "",
            decisao: d10?.decisao ? rotuloDecisao(d10.decisao) : "",
          };
        }),
      );
    })();
  }, []);

  const termo = busca.trim().toLowerCase();
  const filtradas = (concluidas ?? []).filter((c) => !termo || [c.nome, c.publico, c.oferta, c.decisao].join(" ").toLowerCase().includes(termo));

  return (
    <>
      <span className="mem-label mem-muted">Mentora</span>
      <h1 className="mem-h1">Mentoradas</h1>

      {recemIniciada && (
        <Aviso variante="done" titulo="Jornada iniciada">
          A jornada de {recemIniciada} começou no M1. Ela já pode entrar com o e-mail dela.
        </Aviso>
      )}
      {erro && (
        <Aviso variante="danger" titulo="Não foi possível carregar">
          Recarregue a página. Se continuar, a conexão com o banco caiu.
        </Aviso>
      )}

      {linhas && linhas.length === 0 && (
        <p className="mem-body ws-measure">
          Nenhuma jornada em andamento. Para começar, cadastre o e-mail da mentorada no Supabase e
          inicie a jornada dela aqui.
        </p>
      )}

      {linhas && linhas.length > 0 && (
        <div className="mem-table-wrap">
          <table className="mem-table">
            <thead>
              <tr>
                <th>Mentorada</th>
                <th>Movimento</th>
                <th>Próxima call</th>
                <th>Termina em</th>
                <th className="num">Folga</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link to={`/mentoradas/${l.id}`}>{l.nome}</Link>
                    {l.email && <div className="mem-body-sm mem-muted">{l.email}</div>}
                  </td>
                  <td>{l.movimento ? `M${l.movimento} · ${MOVIMENTOS[l.movimento]}` : "—"}</td>
                  <td>
                    {l.proximo
                      ? `Call ${l.proximo.numero ?? ""} · ${dataHora(l.proximo.data_atual)}`
                      : "—"}
                  </td>
                  <td>{dataCurta(l.data_limite)}</td>
                  <td className="num">{l.folga_restante ?? "—"} dias</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <Link className="mem-btn mem-btn--primary" to="/iniciar">
          Iniciar jornada
        </Link>
      </div>

      {concluidas && concluidas.length > 0 && (
        <section className="ws-secao">
          <h2 className="mem-h2">Jornadas concluídas</h2>
          <p className="mem-body-sm mem-muted ws-measure">
            Para consultar como vocês trabalharam. Busque por público, problema ou oferta para achar um caso parecido com o de uma mentorada nova.
          </p>
          <input className="mem-input ws-busca" type="search" aria-label="Buscar nas jornadas concluídas" placeholder="Buscar: gestores, clínica, conflito…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="mem-table-wrap">
            <table className="mem-table">
              <thead>
                <tr>
                  <th>Mentorada</th>
                  <th>Para quem e qual problema</th>
                  <th>Oferta</th>
                  <th>Decisão</th>
                  <th>Concluída em</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/mentoradas/${c.id}`}>{c.nome}</Link>
                      <div className="mem-body-sm mem-muted">{rotuloStatusJornada(c.status ?? undefined).replace("Jornada concluída · ", "")}</div>
                    </td>
                    <td className="mem-body-sm">{c.publico || "—"}</td>
                    <td className="mem-body-sm">
                      {c.oferta || "—"}
                      {c.preco && <div className="mem-muted">{c.preco}</div>}
                    </td>
                    <td>{c.decisao || "—"}</td>
                    <td>{c.encerrada_em ? dataCurta(c.encerrada_em) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtradas.length === 0 && <p className="mem-body-sm mem-muted">Nenhuma jornada concluída com “{busca}”.</p>}
        </section>
      )}
    </>
  );
}
