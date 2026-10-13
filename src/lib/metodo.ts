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

// Em qual call cada movimento acontece (especificações M1–M10; o M8 cobre as Calls 7 e 8).
// Um movimento pode começar numa call e ser decidido na seguinte, e uma call
// pode cobrir dois movimentos (a Call 4 fecha o M4 e decide o M5).
export const CALLS_DO_MOVIMENTO: Record<number, { comeca?: number; decide: number }> = {
  1: { decide: 1 },
  2: { decide: 2 },
  3: { decide: 3 },
  4: { comeca: 3, decide: 4 },
  5: { decide: 4 },
  6: { decide: 5 },
  7: { decide: 6 },
  8: { comeca: 7, decide: 8 },
  9: { decide: 9 },
  10: { decide: 10 },
};

// Os movimentos tratados numa call, em ordem.
export function movimentosDaCall(numero: number): number[] {
  return Object.entries(CALLS_DO_MOVIMENTO)
    .filter(([, c]) => c.decide === numero || c.comeca === numero)
    .map(([m]) => Number(m));
}
