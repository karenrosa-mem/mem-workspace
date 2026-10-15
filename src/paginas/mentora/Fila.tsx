import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { carregarJornada, type Encontro } from "../../lib/jornada";
import { dataHora } from "../../lib/datas";
import { itensDaFila, type ItemFila } from "../../lib/fila";
import Aviso from "../../componentes/Aviso";

type Call = { jornadaId: string; nome: string; encontro: Encontro };

// Fila da mentora: o que você precisa fazer, em todas as mentoradas, na ordem do prazo.
export default function Fila() {
  const [itens, setItens] = useState<ItemFila[] | null>(null);
  const [agenda, setAgenda] = useState<Call[]>([]);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    (async () => {
      const js = await db.from("jornada").select("id, estado, encerrada_em, conta(nome, pessoa(nome))").in("estado", ["em_andamento", "concluida"]);
      if (js.error) return setErro(true);
      type J = { id: string; estado: string; encerrada_em: string | null; conta: { nome: string | null; pessoa: { nome: string } | null } | null };
      const recentes = (js.data as unknown as J[]).filter(
        (j) => j.estado === "em_andamento" || (j.encerrada_em && Date.now() - new Date(j.encerrada_em).getTime() < 15 * 864e5),
      );
      const todos: ItemFila[] = [];
      const calls: Call[] = [];
      for (const j of recentes) {
        const d = await carregarJornada(db, j.id).catch(() => null);
        if (!d) continue;
        const nome = j.conta?.pessoa?.nome ?? j.conta?.nome ?? "—";
        todos.push(...itensDaFila(d, nome));
        d.encontros
          .filter((e) => e.tipo === "call" && e.estado === "marcado" && new Date(e.data_atual).getTime() - Date.now() < 7 * 864e5 && new Date(e.data_atual).getTime() > Date.now() - 864e5)
          .forEach((e) => calls.push({ jornadaId: j.id, nome, encontro: e }));
      }
      todos.sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
      calls.sort((a, b) => a.encontro.data_atual.localeCompare(b.encontro.data_atual));
      setItens(todos);
      setAgenda(calls);
    })();
  }, []);

  const agora = new Date().toISOString();
  const atrasados = (itens ?? []).filter((i) => i.prazo && i.prazo < agora);
  const proximos = (itens ?? []).filter((i) => !i.prazo || i.prazo >= agora);

  return (
    <>
      <span className="mem-label mem-muted">Mentora</span>
      <h1 className="mem-h1">O que fazer agora</h1>
      {erro && (
        <Aviso variante="danger" titulo="Não foi possível carregar">
          Recarregue a página.
        </Aviso>
      )}
      {itens && itens.length === 0 && <p className="mem-body ws-measure">Nada pendente com você. Quando uma mentorada enviar algo ou uma call acontecer, aparece aqui.</p>}

      {atrasados.length > 0 && <Lista titulo="Atrasado" itens={atrasados} atrasado />}
      {proximos.length > 0 && <Lista titulo={atrasados.length ? "Depois" : "Pendente com você"} itens={proximos} />}

      <section className="ws-secao">
        <h2 className="mem-h2">Calls dos próximos 7 dias</h2>
        {agenda.length === 0 ? (
          <p className="mem-body-sm mem-muted">Nenhuma call marcada para os próximos 7 dias.</p>
        ) : (
          <ul className="ws-fila">
            {agenda.map((c) => (
              <li key={c.encontro.id} className="ws-fila__item">
                <Link to={`/mentoradas/${c.jornadaId}/call/${c.encontro.numero}`} className="ws-fila__link">
                  <span className="mem-body">
                    <strong>{c.nome}</strong> · Call {c.encontro.numero}
                  </span>
                  <span className="mem-body-sm mem-muted">{dataHora(c.encontro.data_atual)} · abrir o guia</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Lista({ titulo, itens, atrasado = false }: { titulo: string; itens: ItemFila[]; atrasado?: boolean }) {
  return (
    <section className="ws-secao">
      <h2 className="mem-h2">{titulo}</h2>
      <ul className="ws-fila">
        {itens.map((i) => (
          <li key={`${i.jornadaId}-${i.titulo}`} className="ws-fila__item">
            <Link to={i.para} className="ws-fila__link">
              <span className="mem-body">
                <strong>{i.nome}</strong> · {i.titulo}
              </span>
              <span className="mem-body-sm mem-muted">
                {i.detalhe ? `${i.detalhe} · ` : ""}
                {i.prazo ? `${atrasado ? "prazo era" : "até"} ${dataHora(i.prazo)}` : "sem prazo"}
              </span>
            </Link>
            {atrasado && <span className="mem-tag mem-tag--pendencia">Atrasado</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
