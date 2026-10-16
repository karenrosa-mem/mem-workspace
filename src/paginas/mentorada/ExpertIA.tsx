import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSessao } from "../../lib/sessao";
import { useJornada } from "../../lib/useJornada";
import { dataCurta } from "../../lib/datas";
import { MOVIMENTOS } from "../../lib/metodo";
import { movimentoDaConversa, notasExpertIA } from "../../lib/expertia";
import { AbrirExpertIA } from "../../componentes/DicaExpertIA";
import Aviso from "../../componentes/Aviso";
import Colinha from "../../componentes/Colinha";

// Conversa avulsa com o ExpertIA, em qualquer momento da jornada (decisão de 16/10/2026).
// Leva junto o que ela escreveu; o que ela guarda aqui vai nas próximas conversas.
export default function ExpertIA() {
  const { pessoa } = useSessao();
  const { dados, erro, recarregar } = useJornada();
  const [pergunta, setPergunta] = useState("");
  const [nota, setNota] = useState("");
  const [estado, setEstado] = useState<"" | "salvando" | "erro">("");

  if (erro)
    return (
      <Aviso variante="danger" titulo="Não foi possível carregar">
        Recarregue a página.
      </Aviso>
    );
  if (!dados) return null;
  const n = movimentoDaConversa(dados);
  const notas = notasExpertIA(dados);

  async function guardar() {
    if (!supabase || !pessoa || !dados || !nota.trim()) return;
    setEstado("salvando");
    const { error } = await supabase.from("registro").insert({
      conta_id: dados.jornada.conta_id,
      jornada_id: dados.jornada.id,
      movimento_codigo: null,
      tipo: "nota_expertia",
      conteudo: { texto: nota.trim(), movimento: n },
      autora_papel: "mentorada",
      autora_id: pessoa.id,
    });
    if (error) return setEstado("erro");
    setNota("");
    setEstado("");
    await recarregar();
  }

  async function apagar(id: string) {
    if (!supabase) return;
    await supabase.from("registro").delete().eq("id", id);
    await recarregar();
  }

  return (
    <>
      <span className="mem-label mem-muted">ExpertIA</span>
      <h1 className="mem-h1">Converse com o ExpertIA</h1>
      <p className="mem-body-lg ws-measure">
        O assistente da mentoria. Ele ajuda a lembrar, explorar, organizar e pesquisar. Não decide por você e não valida nada: isso é com a Karen.
      </p>

      <section className="mem-card ws-padrao">
        <span className="mem-label mem-muted">
          Você está no movimento {n} · {MOVIMENTOS[n]}
        </span>
        <div className="mem-field">
          <label className="mem-field__label" htmlFor="pergunta">
            Sobre o que você quer conversar?
          </label>
          <textarea className="mem-input" id="pergunta" rows={3} value={pergunta} onChange={(e) => setPergunta(e.target.value)} />
          <Colinha
            serve="Opcional. O que você escrever aqui vira a primeira mensagem. Se deixar em branco, ele começa perguntando."
            exemplo="Estou em dúvida entre dois públicos para a minha ideia. Me ajuda a pensar no que diferencia um do outro?"
          />
        </div>
        <AbrirExpertIA dados={dados} tarefa="livre" foco={`movimento ${n} da jornada, ${MOVIMENTOS[n]}`} pergunta={pergunta} />
      </section>

      <section className="ws-bloco">
        <h2 className="mem-h2">Guardar o que saiu da conversa</h2>
        <p className="mem-body ws-measure">
          Ele não lembra das conversas anteriores. O que você guarda aqui vai junto nas próximas, e a Karen também vê.
        </p>
        <div className="mem-field">
          <label className="mem-field__label" htmlFor="nota">
            O que vale guardar
          </label>
          <textarea className="mem-input" id="nota" rows={5} value={nota} onChange={(e) => setNota(e.target.value)} />
          <Colinha
            serve="Cole o resumo que ele entregou no fim (o trecho depois de “PARA O WORKSPACE”), ou escreva com as suas palavras o que ficou."
            exemplo={"Palavras que esse público usa: “equipe não entrega”, “gestão de pessoas”\nAinda não sei se donas de clínica pagariam por isso"}
          />
        </div>
        {estado === "erro" && (
          <Aviso variante="danger" titulo="Não foi possível guardar">
            Tente de novo.
          </Aviso>
        )}
        <div className="ws-acoes">
          <button type="button" className="mem-btn mem-btn--primary" disabled={!nota.trim() || estado === "salvando"} onClick={guardar}>
            {estado === "salvando" ? "Guardando" : "Guardar"}
          </button>
        </div>

        {notas.length > 0 && (
          <ul className="ws-notas-expertia">
            {[...notas].reverse().map((r) => {
              const c = r.conteudo as { texto?: string; movimento?: number };
              return (
                <li key={r.id} className="mem-card ws-nota-expertia">
                  <span className="mem-body-sm mem-muted">
                    {dataCurta(r.criado_em)}
                    {c.movimento ? ` · movimento ${c.movimento}` : ""}
                  </span>
                  <p className="mem-body ws-pre">{c.texto}</p>
                  {r.estado_edicao === "aberto" && (
                    <div>
                      <button type="button" className="mem-btn mem-btn--quiet" onClick={() => apagar(r.id)}>
                        Apagar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
