import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { dataHora } from "../lib/datas";
import Aviso from "./Aviso";

type Situacao = { entrou: boolean; codigo_valido_ate: string | null };

// Acesso da mentorada sem e-mail: a mentora gera um código (uso único, 7 dias)
// e manda pelo WhatsApp. Serve para o primeiro acesso e para senha nova.
export default function CodigoAcesso({ jornadaId, nome, abrirJa = false }: { jornadaId: string; nome?: string; abrirJa?: boolean }) {
  const [sit, setSit] = useState<Situacao | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function carregar() {
    if (!supabase) return;
    const r = await supabase.rpc("situacao_acesso", { p_jornada: jornadaId });
    if (!r.error) setSit(r.data as Situacao);
  }
  async function gerar() {
    if (!supabase) return;
    setErro(null);
    setCopiado(false);
    const r = await supabase.rpc("gerar_codigo_acesso", { p_jornada: jornadaId });
    if (r.error) return setErro(r.error.message);
    setCodigo(r.data as string);
    await carregar();
  }
  useEffect(() => {
    carregar().then(() => {
      if (abrirJa) gerar();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaId]);

  const primeiro = (nome ?? "").trim().split(/\s+/)[0];
  const link = codigo ? `${window.location.origin}/?codigo=${codigo}` : "";
  const mensagem = codigo
    ? sit?.entrou
      ? `Oi${primeiro ? `, ${primeiro}` : ""}! Para criar uma senha nova no Workspace do MEM, abra ${link}, use o seu e-mail e escolha a senha. O código ${codigo} vale por 7 dias.`
      : `Oi${primeiro ? `, ${primeiro}` : ""}! Seu Workspace do MEM está pronto. Abra ${link}, use o seu e-mail e crie a sua senha. O código ${codigo} vale por 7 dias.`
    : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section className="ws-bloco ws-acesso">
      <span className="mem-label mem-muted">Acesso dela ao Workspace</span>
      <p className="mem-body">
        {sit === null
          ? "—"
          : sit.entrou
            ? "Ela já entrou e tem a senha dela."
            : sit.codigo_valido_ate
              ? `Ela ainda não entrou. Há um código válido até ${dataHora(sit.codigo_valido_ate)}.`
              : "Ela ainda não entrou e não há código válido."}
      </p>
      {codigo ? (
        <div className="ws-form">
          <p className="mem-h2 ws-acesso__codigo">{codigo}</p>
          <p className="mem-body-sm mem-muted">Mande pelo WhatsApp. O código aparece só agora; se perder, gere outro (o anterior deixa de valer).</p>
          <textarea className="mem-input" rows={3} readOnly aria-label="Mensagem para o WhatsApp" value={mensagem} />
          <div className="ws-acoes">
            <button type="button" className="mem-btn mem-btn--primary" onClick={copiar}>
              {copiado ? "Copiado" : "Copiar mensagem"}
            </button>
            <a className="mem-btn mem-btn--secondary" href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer">
              Abrir no WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--secondary" onClick={gerar}>
            {sit?.entrou ? "Gerar código para senha nova" : "Gerar código de acesso"}
          </button>
        </div>
      )}
      {erro && (
        <Aviso variante="danger" titulo="Código não gerado">
          {erro}
        </Aviso>
      )}
    </section>
  );
}
