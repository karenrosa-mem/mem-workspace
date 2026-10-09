import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MOVIMENTOS, SEMANAS_DA_JORNADA } from "../../lib/metodo";
import { dataCurta, dataHora, diasEntre, hojeBrasilia } from "../../lib/datas";
import Aviso from "../../componentes/Aviso";

type Jornada = { id: string; data_inicio: string; data_limite: string; folga_total_dias: number };
type Encontro = { numero: number | null; data_atual: string; estado: string };

function semanaDe(inicio: string, data: string): number {
  return Math.floor(diasEntre(inicio, data) / 7) + 1;
}

// Tela "Agora" da mentorada: onde ela está, o próximo encontro e a linha das 12 semanas.
export default function Agora() {
  const [jornada, setJornada] = useState<Jornada | null | undefined>(undefined);
  const [movimento, setMovimento] = useState<number | null>(null);
  const [encontros, setEncontros] = useState<Encontro[]>([]);
  const [folgaRestante, setFolgaRestante] = useState<number | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    (async () => {
      const j = await db
        .from("jornada")
        .select("id, data_inicio, data_limite, folga_total_dias")
        .eq("estado", "em_andamento")
        .maybeSingle();
      if (j.error) return setErro(true);
      setJornada(j.data as Jornada | null);
      if (!j.data) return;
      const [m, e, c] = await Promise.all([
        db.from("movimento").select("codigo").eq("jornada_id", j.data.id).eq("estado", "aberto").maybeSingle(),
        db
          .from("encontro")
          .select("numero, data_atual, estado")
          .eq("jornada_id", j.data.id)
          .eq("tipo", "call")
          .order("data_atual"),
        db.from("jornada_cronograma").select("folga_restante_dias").eq("jornada_id", j.data.id).maybeSingle(),
      ]);
      setMovimento(m.data?.codigo ?? null);
      setEncontros((e.data as Encontro[]) ?? []);
      setFolgaRestante(c.data?.folga_restante_dias ?? null);
    })();
  }, []);

  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página. Se continuar, avise a Karen pelo WhatsApp.
      </Aviso>
    );
  if (jornada === undefined) return null;
  if (jornada === null)
    return (
      <>
        <span className="mem-label mem-muted">Agora</span>
        <h1 className="mem-h1">Sua jornada ainda não começou</h1>
        <p className="mem-body-lg ws-measure">
          A Karen abre a sua jornada aqui antes da primeira call. Quando isso acontecer, esta tela
          mostra onde você está e o que fazer em seguida.
        </p>
      </>
    );

  const hoje = hojeBrasilia();
  const semanaAtual = Math.min(Math.max(semanaDe(jornada.data_inicio, hoje), 1), SEMANAS_DA_JORNADA);
  const antesDoInicio = hoje < jornada.data_inicio;
  const proxima = encontros.find((e) => e.estado === "marcado");
  const callsPorSemana = new Map<number, number[]>();
  encontros.forEach((e) => {
    const s = semanaDe(jornada.data_inicio, e.data_atual.slice(0, 10));
    callsPorSemana.set(s, [...(callsPorSemana.get(s) ?? []), e.numero ?? 0]);
  });

  return (
    <>
      <span className="mem-label mem-muted">Agora</span>
      <h1 className="mem-h1">
        {movimento ? `M${movimento} · ${MOVIMENTOS[movimento]}` : "Sua jornada"}
      </h1>

      {proxima && (
        <section className="ws-bloco">
          <span className="mem-label mem-muted">Próximo encontro · com a Karen</span>
          <p className="mem-h3">
            Call {proxima.numero} · {dataHora(proxima.data_atual)}
          </p>
        </section>
      )}

      <p className="mem-body ws-measure mem-muted">
        As atividades do movimento entram nesta tela na próxima etapa da construção.
      </p>

      <section className="ws-bloco" aria-labelledby="linha-12">
        <span className="mem-label mem-muted" id="linha-12">
          Linha da jornada · {antesDoInicio ? `começa em ${dataCurta(jornada.data_inicio)}` : `semana ${semanaAtual} de ${SEMANAS_DA_JORNADA}`}
        </span>
        <ol className="ws-semanas">
          {Array.from({ length: SEMANAS_DA_JORNADA }, (_, i) => {
            const s = i + 1;
            const estado = antesDoInicio || s > semanaAtual ? "next" : s === semanaAtual ? "current" : "done";
            const calls = callsPorSemana.get(s);
            return (
              <li key={s} className="ws-semanas__item" aria-current={estado === "current" ? "step" : undefined}>
                <span className={`mem-marker mem-marker--${estado}`} aria-hidden="true" />
                <span className="mem-data">S{s}</span>
                <span className="mem-body-sm mem-muted">{calls ? calls.map((n) => `Call ${n}`).join(" · ") : ""}</span>
              </li>
            );
          })}
        </ol>
        <p className="mem-body-sm">
          Termina em <strong>{dataCurta(jornada.data_limite)}</strong> · Folga:{" "}
          <strong>{folgaRestante ?? jornada.folga_total_dias} dias</strong>
        </p>
        <p className="mem-body-sm mem-muted ws-measure">
          A jornada tem até 12 semanas, com uma semana de folga para imprevistos. Adiar uma call
          para outra semana usa folga; quando a remarcação é da Karen, a sua folga não muda.
        </p>
      </section>
    </>
  );
}
