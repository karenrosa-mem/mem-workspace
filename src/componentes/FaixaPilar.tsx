import { PILARES } from "../lib/metodo";

// Faixa de pilar (BRAND.md: planos de brand-strong marcam as regiões do mapa).
// O pilar atual fica em bordô; o outro, em superfície rebaixada.
export default function FaixaPilar({ codigo, atual = true, compacta = false }: { codigo: number; atual?: boolean; compacta?: boolean }) {
  const i = PILARES.findIndex((p) => codigo >= p.de && codigo <= p.ate);
  if (i < 0) return null;
  const p = PILARES[i];
  return (
    <div className={`ws-pilar ${atual ? "ws-pilar--atual" : ""} ${compacta ? "ws-pilar--compacta" : ""}`}>
      <span className="ws-pilar__nome">{p.nome}</span>
      <span className="ws-pilar__meta">
        Pilar {i + 1} de 2 · movimentos {p.de} a {p.ate}
        {atual && compacta ? " · você está aqui" : ""}
      </span>
      <span className="ws-pilar__frase">{p.frase}</span>
    </div>
  );
}
