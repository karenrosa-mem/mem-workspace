// "Enviar para a Karen": marca que ela terminou a parte dela do movimento.
// Não trava nada (o "pronto" continua contado no conteúdo); dá fechamento a ela
// e avisa a mentora. Um registro "envio" por movimento; reenviar atualiza a data.
import type { DadosJornada, Registro } from "./jornada";

export function envioDe(d: DadosJornada, movimento: number): Registro | undefined {
  return d.registros.find((r) => r.tipo === "envio" && r.movimento_codigo === movimento);
}

export function enviadoEm(d: DadosJornada, movimento: number): string | null {
  return (envioDe(d, movimento)?.conteudo as { enviado_em?: string } | undefined)?.enviado_em ?? null;
}

// Ela mudou algo da parte dela depois de enviar?
export function mudouDepoisDoEnvio(d: DadosJornada, movimento: number): boolean {
  const em = enviadoEm(d, movimento);
  if (!em) return false;
  const limite = new Date(em).getTime() + 2000;
  return d.registros.some(
    (r) =>
      r.autora_papel === "mentorada" &&
      r.tipo !== "envio" &&
      (r.movimento_codigo === movimento || (r.tipo === "situacao" && movimento <= 2)) &&
      new Date(r.atualizado_em).getTime() > limite,
  );
}
