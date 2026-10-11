import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useSessao } from "../lib/sessao";
import type { DadosJornada } from "../lib/jornada";
import { call } from "../lib/jornada";
import { envioDe, enviadoEm, mudouDepoisDoEnvio } from "../lib/envio";
import { dataHora } from "../lib/datas";

// Fecho da parte dela em cada movimento: "Enviar para a Karen".
export default function EnviarParaKaren({
  dados,
  movimento,
  numeroCall,
  falta,
  aoSalvar,
}: {
  dados: DadosJornada;
  movimento: number;
  numeroCall: number;
  falta: string[]; // vazio = pronta
  aoSalvar: () => Promise<void>;
}) {
  const { pessoa } = useSessao();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(false);
  const registro = envioDe(dados, movimento);
  const em = enviadoEm(dados, movimento);
  const mudou = mudouDepoisDoEnvio(dados, movimento);
  const c = call(dados, numeroCall);
  const pronta = falta.length === 0;

  async function enviar() {
    if (!supabase || !pessoa) return;
    setEnviando(true);
    setErro(false);
    const conteudo = { enviado_em: new Date().toISOString() };
    const r = registro
      ? await supabase.from("registro").update({ conteudo }).eq("id", registro.id)
      : await supabase.from("registro").insert({
          conta_id: dados.jornada.conta_id,
          jornada_id: dados.jornada.id,
          movimento_codigo: movimento,
          tipo: "envio",
          conteudo,
          autora_papel: "mentorada",
          autora_id: pessoa.id,
        });
    setEnviando(false);
    if (r.error) return setErro(true);
    await aoSalvar();
  }

  if (em && !mudou)
    return (
      <section className="ws-envio ws-envio--feito" aria-live="polite">
        <span className="ws-envio__marca" aria-hidden="true">✓</span>
        <div>
          <p className="mem-h4 ws-envio__titulo">Enviado para a Karen</p>
          <p className="mem-body-sm">
            {dataHora(em)}. Ela lê antes da Call {numeroCall}
            {c ? ` (${dataHora(c.data_atual)})` : ""}. Se quiser, ainda dá para ajustar até lá.
          </p>
        </div>
      </section>
    );

  return (
    <section className={`ws-envio ${pronta ? "ws-envio--pronta" : ""}`}>
      <div>
        <p className="mem-h4 ws-envio__titulo">
          {em ? "Você mudou algo depois de enviar" : pronta ? "Tudo pronto da sua parte" : "Quando terminar, envie para a Karen"}
        </p>
        <p className="mem-body-sm">
          {pronta
            ? `Envie para a Karen ler antes da Call ${numeroCall}${c ? ` (${dataHora(c.data_atual)})` : ""}.`
            : `Falta: ${falta.join("; ")}.`}
        </p>
        {erro && <p className="mem-body-sm">Não foi possível enviar. Tente de novo.</p>}
      </div>
      <button type="button" className="mem-btn mem-btn--primary" disabled={!pronta || enviando} onClick={enviar}>
        {enviando ? "Enviando" : em ? "Enviar de novo" : "Enviar para a Karen"}
      </button>
    </section>
  );
}
