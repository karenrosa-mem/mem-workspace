// Datas no horário de Brasília (sem horário de verão desde 2019).
const FUSO = "America/Sao_Paulo";

export function isoBrasilia(data: string, hora: string): string {
  return `${data}T${hora}:00-03:00`;
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(de: string, ate: string): number {
  const a = new Date(`${de}T12:00:00-03:00`).getTime();
  const b = new Date(`${ate}T12:00:00-03:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function hojeBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

export function dataCurta(valor: string): string {
  const d = valor.length === 10 ? new Date(`${valor}T12:00:00-03:00`) : new Date(valor);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short" })
    .format(d)
    .replace(".", "");
}

export function dataHora(valor: string): string {
  const d = new Date(valor);
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(d)
    .replace(/\./g, "");
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${dia}, ${hora}`;
}

// "quinta", "segunda"… (sem o "-feira")
export function diaDaSemana(valor: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long" })
    .format(new Date(valor))
    .split("-")[0];
}

export function somarHoras(valor: string, horas: number): string {
  return new Date(new Date(valor).getTime() + horas * 3_600_000).toISOString();
}

export function horasAte(valor: string): number {
  return (new Date(valor).getTime() - Date.now()) / 3_600_000;
}

// Dia (AAAA-MM-DD) de um instante, no horário de Brasília.
export function diaBrasilia(valor: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(valor));
}

// "Na quinta" / "No sábado"
export function naDia(dia: string): string {
  return /^(sábado|domingo)/.test(dia) ? `No ${dia}` : `Na ${dia}`;
}
