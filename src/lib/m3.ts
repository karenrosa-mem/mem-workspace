// Regras do M3 · Formular hipóteses (Especificação V1 do M3 e Modelo por movimento, M3).
import type { DadosJornada, Registro } from "./jornada";
import { dadosPadrao, decisaoM2, reacaoDe, situacoesDoPadrao, type Reacao, type Rotulo } from "./m2";

export const DEFINICAO_HIPOTESE = "Uma hipótese é uma ideia de para quem isso vale, que ainda vai ser testada com pessoas reais.";

export const LASTRO = [
  { valor: "ja_ajudei", rotulo: "Já ajudei", detalhe: "ajudei alguém assim com esse problema" },
  { valor: "vi_de_perto", rotulo: "Vi de perto", detalhe: "convivi com alguém que passava por isso" },
  { valor: "imagino", rotulo: "Imagino", detalhe: "faz sentido, mas nunca vi de perto" },
] as const;

export type Ativo = { id: string; nome: string; rotulo: Rotulo; quemTinha?: string; registro: Registro };

export type QuemMais = { ativo?: string; ja_ajudei?: string; outro_tipo?: string; motivo_sem_hipotese?: string };

export type Hipotese = {
  ativo?: string;
  publico?: string;
  problema?: string;
  contexto?: string;
  transformacao?: string;
  lastro?: string;
};

export type OrigemPublico = "m2" | "ja_ajudei" | "outro_tipo" | "novo";
export type Publico = { descricao: string; origem: OrigemPublico; ativo?: string };

export const ROTULO_ORIGEM: Record<OrigemPublico, string> = {
  m2: "do Movimento 2",
  ja_ajudei: "quem você já ajudou",
  outro_tipo: "outro tipo de pessoa",
  novo: "criado numa hipótese",
};

// Os ativos que ela escolheu no M2, na ordem da decisão.
export function ativosEscolhidos(d: DadosJornada): Ativo[] {
  const dec = decisaoM2(d);
  const esc = ((dec?.conteudo_mentora as { escolhidos?: { padrao: string; rotulo: Rotulo }[] })?.escolhidos ?? []);
  return esc
    .map((e) => {
      const p = d.registros.find((r) => r.id === e.padrao);
      if (!p) return null;
      const reac = reacaoDe(d, p)?.conteudo as Reacao | undefined;
      return {
        id: p.id,
        nome: dadosPadrao(p).nome ?? "Ativo",
        rotulo: e.rotulo,
        quemTinha: reac?.quem_tinha?.trim() || dadosPadrao(p).quem_tinha_o_problema?.trim() || undefined,
        registro: p,
      };
    })
    .filter(Boolean) as Ativo[];
}

export function nomeAtivo(d: DadosJornada, id?: string): string {
  return ativosEscolhidos(d).find((a) => a.id === id)?.nome ?? "—";
}

export function situacoesDoAtivo(d: DadosJornada, a: Ativo): Registro[] {
  return situacoesDoPadrao(d, a.registro);
}

export function quemMaisDe(d: DadosJornada, ativoId: string): Registro | undefined {
  return d.registros.find((r) => r.tipo === "quem_mais" && (r.conteudo as QuemMais).ativo === ativoId);
}

export function quemMaisRespondido(d: DadosJornada, ativoId: string): boolean {
  const q = quemMaisDe(d, ativoId)?.conteudo as QuemMais | undefined;
  return !!(q?.ja_ajudei?.trim() || q?.outro_tipo?.trim());
}

export function hipoteses(d: DadosJornada): Registro[] {
  return d.registros.filter((r) => r.tipo === "hipotese");
}

export function dadosHipotese(r: Registro): Hipotese {
  return r.conteudo as Hipotese;
}

export function hipoteseCompleta(h: Hipotese): boolean {
  return !!(h.ativo && h.publico?.trim() && h.problema?.trim() && h.contexto?.trim() && h.transformacao?.trim() && h.lastro);
}

export function frase(d: DadosJornada, h: Hipotese): { partes: { texto: string; lacuna: boolean }[] } {
  const v = (x?: string, vazio = "…") => ({ texto: x?.trim() || vazio, lacuna: !x?.trim() });
  return {
    partes: [
      { texto: "Ajudo ", lacuna: false },
      v(h.publico ? h.publico.charAt(0).toLowerCase() + h.publico.slice(1) : undefined, "[público]"),
      { texto: " que sofre com ", lacuna: false },
      v(h.problema, "[problema]"),
      { texto: ", em ", lacuna: false },
      v(h.contexto, "[contexto]"),
      { texto: ", a alcançar ", lacuna: false },
      v(h.transformacao, "[transformação]"),
      { texto: ", usando ", lacuna: false },
      v(h.ativo ? nomeAtivo(d, h.ativo).toLowerCase() : undefined, "[ativo]"),
      { texto: ".", lacuna: false },
    ],
  };
}

export function fraseTexto(d: DadosJornada, h: Hipotese): string {
  return frase(d, h).partes.map((p) => p.texto).join("");
}

function linhas(t?: string): string[] {
  return (t ?? "")
    .split(/\n|;/)
    .map((x) => x.replace(/^[-•·\s]+/, "").trim())
    .filter(Boolean);
}

const chave = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// Lista de públicos dela: M2 + "Quem mais?" (uma linha = um público) + criados numa hipótese.
export function publicos(d: DadosJornada): Publico[] {
  const lista: Publico[] = [];
  const vistos = new Set<string>();
  const add = (p: Publico) => {
    const k = chave(p.descricao);
    if (!k || vistos.has(k)) return;
    vistos.add(k);
    lista.push(p);
  };
  for (const a of ativosEscolhidos(d)) {
    if (a.quemTinha) add({ descricao: a.quemTinha, origem: "m2", ativo: a.id });
    const q = quemMaisDe(d, a.id)?.conteudo as QuemMais | undefined;
    linhas(q?.ja_ajudei).forEach((t) => add({ descricao: t, origem: "ja_ajudei", ativo: a.id }));
    linhas(q?.outro_tipo).forEach((t) => add({ descricao: t, origem: "outro_tipo", ativo: a.id }));
  }
  for (const h of hipoteses(d)) {
    const x = dadosHipotese(h);
    if (x.publico?.trim()) add({ descricao: x.publico.trim(), origem: "novo", ativo: x.ativo });
  }
  return lista;
}

// Hipóteses que usam o mesmo público (nenhuma é eliminada por isso).
export function disputaPublico(d: DadosJornada, h: Registro): number {
  const p = chave(dadosHipotese(h).publico ?? "");
  if (!p) return 0;
  return hipoteses(d).filter((x) => x.id !== h.id && chave(dadosHipotese(x).publico ?? "") === p).length;
}

export function hipotesesCompletas(d: DadosJornada): number {
  return hipoteses(d).filter((h) => hipoteseCompleta(dadosHipotese(h))).length;
}

export function ativosSemHipotese(d: DadosJornada): Ativo[] {
  return ativosEscolhidos(d).filter((a) => {
    const tem = hipoteses(d).some((h) => dadosHipotese(h).ativo === a.id);
    const motivo = (quemMaisDe(d, a.id)?.conteudo as QuemMais | undefined)?.motivo_sem_hipotese?.trim();
    return !tem && !motivo;
  });
}

export function prontaCall3(d: DadosJornada): boolean {
  const ativos = ativosEscolhidos(d);
  return (
    ativos.every((a) => quemMaisRespondido(d, a.id)) && hipotesesCompletas(d) >= 3 && ativosSemHipotese(d).length === 0
  );
}

export function decisaoM3(d: DadosJornada): Registro | undefined {
  return d.registros.find((r) => r.tipo === "decisao_m3");
}

export type DecisaoM3 = {
  vao?: string[];
  guardadas?: { hipotese: string; razao?: string; condicao_volta?: string }[];
  porque?: string;
};
