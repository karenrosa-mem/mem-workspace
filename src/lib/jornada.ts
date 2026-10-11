import type { SupabaseClient } from "@supabase/supabase-js";

export type Jornada = {
  id: string;
  conta_id: string;
  data_inicio: string;
  data_limite: string;
  folga_total_dias: number;
  estado: string;
};

export type Movimento = { codigo: number; estado: "nao_iniciado" | "aberto" | "fechado" };

export type Encontro = {
  id: string;
  tipo: string;
  numero: number | null;
  data_atual: string;
  data_realizada: string | null;
  estado: "marcado" | "realizado" | "cancelado";
};

export type Registro = {
  id: string;
  tipo: string;
  movimento_codigo: number | null;
  conteudo: Record<string, unknown>;
  conteudo_mentora: Record<string, unknown>;
  estado_edicao: "aberto" | "fechado";
  autora_papel: "mentorada" | "mentora" | "workspace";
  pendente_publicacao: boolean;
  versao_atual?: number;
  criado_em: string;
  atualizado_em: string;
};

export type DadosJornada = {
  jornada: Jornada;
  movimentos: Movimento[];
  encontros: Encontro[];
  registros: Registro[];
  folgaRestante: number;
};

// Carrega tudo o que as telas de uma jornada precisam. As regras de acesso
// do banco decidem o que cada uma vê; aqui só se pede.
export async function carregarJornada(
  db: SupabaseClient,
  jornadaId?: string,
): Promise<DadosJornada | null> {
  let consulta = db
    .from("jornada")
    .select("id, conta_id, data_inicio, data_limite, folga_total_dias, estado");
  consulta = jornadaId
    ? consulta.eq("id", jornadaId)
    : consulta.order("criada_em", { ascending: false }).limit(1);
  const j = await consulta.maybeSingle();
  if (j.error) throw j.error;
  if (!j.data) return null;
  const id = j.data.id as string;

  const [m, e, r, c] = await Promise.all([
    db.from("movimento").select("codigo, estado").eq("jornada_id", id).order("codigo"),
    db
      .from("encontro")
      .select("id, tipo, numero, data_atual, data_realizada, estado")
      .eq("jornada_id", id)
      .order("data_atual"),
    db
      .from("registro")
      .select(
        "id, tipo, movimento_codigo, conteudo, conteudo_mentora, estado_edicao, autora_papel, pendente_publicacao, versao_atual, criado_em, atualizado_em",
      )
      .eq("jornada_id", id)
      .order("criado_em"),
    db.from("jornada_cronograma").select("folga_restante_dias").eq("jornada_id", id).maybeSingle(),
  ]);
  for (const res of [m, e, r]) if (res.error) throw res.error;

  return {
    jornada: j.data as Jornada,
    movimentos: (m.data ?? []) as Movimento[],
    encontros: (e.data ?? []) as Encontro[],
    registros: (r.data ?? []) as Registro[],
    folgaRestante: (c.data?.folga_restante_dias as number | undefined) ?? j.data.folga_total_dias,
  };
}

export function movimentoAtual(d: DadosJornada): number | null {
  return d.movimentos.find((m) => m.estado === "aberto")?.codigo ?? null;
}

export function leitura(d: DadosJornada, tipo: string): Registro | undefined {
  return d.registros.find((r) => r.tipo === "leitura" && r.conteudo_mentora.tipo_leitura === tipo);
}

export function call(d: DadosJornada, numero: number): Encontro | undefined {
  return d.encontros.find((e) => e.tipo === "call" && e.numero === numero);
}
