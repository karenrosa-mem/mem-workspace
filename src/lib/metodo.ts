// Nomes oficiais dos movimentos (índice canônico, 09/10).
export const MOVIMENTOS: Record<number, string> = {
  1: "Contar sua trajetória",
  2: "Enxergar seus ativos",
  3: "Formular hipóteses",
  4: "Ouvir o mercado",
  5: "Escolher onde apostar",
  6: "Navegação",
  7: "Desenhar a Oferta",
  8: "Preparar para o Mercado",
  9: "Teste Comercial",
  10: "Aprender e Decidir",
};

export const SEMANAS_DA_JORNADA = 12;

// Os dois pilares (frases aprovadas pela Karen em 09/10).
export const PILARES = [
  {
    nome: "MAPA",
    de: 1,
    ate: 5,
    frase: "Descobrir o que você sabe fazer que vale dinheiro e escolher onde apostar.",
  },
  {
    nome: "NORTE",
    de: 6,
    ate: 10,
    frase: "Transformar a aposta numa oferta e testar com gente de verdade.",
  },
] as const;

export function pilarDe(codigo: number) {
  return PILARES.find((p) => codigo >= p.de && codigo <= p.ate)!;
}
