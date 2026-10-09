import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { carregarJornada, type DadosJornada } from "./jornada";

// undefined = carregando · null = não há jornada
export function useJornada(jornadaId?: string) {
  const [dados, setDados] = useState<DadosJornada | null | undefined>(undefined);
  const [erro, setErro] = useState(false);

  const recarregar = useCallback(async () => {
    if (!supabase) return;
    try {
      setDados(await carregarJornada(supabase, jornadaId));
      setErro(false);
    } catch {
      setErro(true);
    }
  }, [jornadaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, erro, recarregar };
}
