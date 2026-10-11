import { FAMILIAS_ATIVO, TESTE_CLASSIFICACAO } from "../lib/familias";

// Referências da mentora, recolhidas por padrão. Ela nunca vê.

export function FamiliasAtivo() {
  return (
    <details className="ws-referencia">
      <summary className="mem-body-sm">Ver famílias de ativo</summary>
      <p className="mem-body-sm mem-muted">
        Para lembrar o que procurar, não para copiar: o nome final usa as palavras da história dela.
      </p>
      <ul className="ws-referencia__lista">
        {FAMILIAS_ATIVO.map((f) => (
          <li key={f.nome}>
            <span className="mem-body-sm ws-referencia__nome">{f.nome}</span>
            <span className="mem-body-sm mem-muted">{f.verbos}</span>
            <span className="mem-body-sm">“{f.exemplo}”</span>
            <span className="mem-body-sm mem-muted">Costuma aparecer em: {f.ondeAparece}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function TesteClassificacao() {
  return (
    <details className="ws-referencia">
      <summary className="mem-body-sm">Ver o teste das quatro perguntas</summary>
      <p className="mem-body-sm mem-muted">
        Responda na ordem. No primeiro “não”, a classificação para ali. Quatro “sim”: ativo.
      </p>
      <ol className="ws-referencia__teste">
        {TESTE_CLASSIFICACAO.map((t) => (
          <li key={t.pergunta} className="mem-body-sm">
            {t.pergunta} <span className="mem-muted">Se não: {t.seNao}.</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
