import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { dataCurta, hojeBrasilia, isoBrasilia, somarDias, diasEntre } from "../../lib/datas";
import Aviso from "../../componentes/Aviso";

type Call = { data: string; hora: string };

function sugerirCalls(inicio: string, hora: string): Call[] {
  // Sugestão semanal a partir do início; a mentora ajusta cada data.
  return Array.from({ length: 10 }, (_, i) => ({ data: somarDias(inicio, i * 7), hora }));
}

// Tela da mentora: cria a jornada, a mentoria, os dez movimentos e as dez calls planejadas.
export default function IniciarJornada() {
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [inicio, setInicio] = useState(hojeBrasilia());
  const [calls, setCalls] = useState<Call[]>(() => sugerirCalls(hojeBrasilia(), "19:00"));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const limite = somarDias(inicio, 84);

  const problemas = useMemo(() => {
    const p: string[] = [];
    calls.forEach((c, i) => {
      if (!c.data || !c.hora) p.push(`Falta a data ou a hora da Call ${i + 1}.`);
      else if (c.data < inicio || c.data > limite)
        p.push(`A Call ${i + 1} está fora das 12 semanas (${dataCurta(inicio)} a ${dataCurta(limite)}).`);
      if (i > 0 && c.data && calls[i - 1].data && c.data < calls[i - 1].data)
        p.push(`A Call ${i + 1} está antes da Call ${i}.`);
    });
    return p;
  }, [calls, inicio, limite]);

  function mudarInicio(novo: string) {
    setInicio(novo);
    if (novo) setCalls(sugerirCalls(novo, calls[0]?.hora || "19:00"));
  }

  function mudarCall(i: number, campo: keyof Call, valor: string) {
    setCalls((atual) => atual.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));
  }

  async function iniciar(e: FormEvent) {
    e.preventDefault();
    if (!supabase || problemas.length) return;
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.rpc("iniciar_jornada", {
      p_email: email.trim(),
      p_data_inicio: inicio,
      p_calls: calls.map((c) => isoBrasilia(c.data, c.hora)),
    });
    setEnviando(false);
    if (error) {
      // As mensagens do banco já são escritas para a mentora.
      setErro(
        /duplicate|jornada_uma_em_andamento/i.test(error.message)
          ? "Esta mentorada já tem uma jornada em andamento."
          : error.message,
      );
      return;
    }
    navegar("/", { state: { iniciada: email.trim() } });
  }

  const ultima = calls[9]?.data;
  const folgaFinal = ultima ? diasEntre(ultima, limite) : null;

  return (
    <>
      <span className="mem-label mem-muted">Mentora · Nova jornada</span>
      <h1 className="mem-h1">Iniciar jornada</h1>
      <p className="mem-body-lg ws-measure">
        A jornada começa no M1 e tem no máximo 12 semanas. Marque as datas planejadas das 10 calls,
        já contando a janela do teste comercial. Elas ficam guardadas como o combinado original.
      </p>

      <form className="ws-form" onSubmit={iniciar}>
        <div className="mem-field">
          <label className="mem-field__label" htmlFor="email">
            E-mail da mentorada
          </label>
          <input
            className="mem-input"
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <span className="mem-field__help">
            O mesmo e-mail cadastrado em Authentication → Users no Supabase.
          </span>
        </div>

        <div className="mem-field">
          <label className="mem-field__label" htmlFor="inicio">
            Início da jornada
          </label>
          <input
            className="mem-input ws-input-curto"
            id="inicio"
            type="date"
            required
            value={inicio}
            onChange={(e) => mudarInicio(e.target.value)}
          />
          <span className="mem-field__help">
            Termina no máximo em {dataCurta(limite)}. Ao mudar o início, as calls são sugeridas de
            novo, uma por semana.
          </span>
        </div>

        <fieldset className="ws-calls">
          <legend className="mem-field__label">Calls planejadas</legend>
          {calls.map((c, i) => (
            <div className="ws-calls__linha" key={i}>
              <span className="mem-label ws-calls__nome">Call {i + 1}</span>
              <input
                className="mem-input"
                type="date"
                aria-label={`Data da Call ${i + 1}`}
                value={c.data}
                onChange={(e) => mudarCall(i, "data", e.target.value)}
              />
              <input
                className="mem-input"
                type="time"
                aria-label={`Hora da Call ${i + 1}`}
                value={c.hora}
                onChange={(e) => mudarCall(i, "hora", e.target.value)}
              />
            </div>
          ))}
          {folgaFinal !== null && folgaFinal >= 0 && (
            <span className="mem-field__help">
              Entre a Call 10 e o fim das 12 semanas sobram {folgaFinal} dias.
            </span>
          )}
        </fieldset>

        {problemas.length > 0 && (
          <Aviso variante="warn" titulo="Ajuste as datas">
            {problemas[0]}
          </Aviso>
        )}
        {erro && (
          <Aviso variante="danger" titulo="Jornada não iniciada">
            {erro}
          </Aviso>
        )}

        <div className="ws-acoes">
          <button
            className="mem-btn mem-btn--primary"
            type="submit"
            disabled={enviando || problemas.length > 0}
          >
            {enviando ? "Iniciando" : "Iniciar jornada"}
          </button>
          <button className="mem-btn mem-btn--quiet" type="button" onClick={() => navegar("/")}>
            Voltar
          </button>
        </div>
      </form>
    </>
  );
}
