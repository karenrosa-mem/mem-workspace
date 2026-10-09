import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { MOVIMENTOS } from "../../lib/metodo";
import { dataCurta, dataHora } from "../../lib/datas";
import Aviso from "../../componentes/Aviso";

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

// Tela da mentora: as jornadas em andamento que ela acompanha.
export default function Mentoradas() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState(false);
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
    })();
  }, []);

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
    </>
  );
}
