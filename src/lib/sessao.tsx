import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Pessoa = {
  id: string;
  nome: string;
  email: string | null;
  e_mentora: boolean;
};

type Sessao = {
  carregando: boolean;
  sessao: Session | null;
  pessoa: Pessoa | null;
  sair: () => Promise<void>;
};

const Contexto = createContext<Sessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(!supabase);
  const [sessao, setSessao] = useState<Session | null>(null);
  // undefined = ainda buscando; null = sem pessoa
  const [pessoa, setPessoa] = useState<Pessoa | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setPronto(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova));
    return () => data.subscription.unsubscribe();
  }, []);

  const usuario = sessao?.user.id;
  useEffect(() => {
    if (!supabase || !usuario) {
      setPessoa(null);
      return;
    }
    setPessoa(undefined);
    supabase
      .from("pessoa")
      .select("id, nome, email, e_mentora")
      .eq("id", usuario)
      .maybeSingle()
      .then(({ data }) => setPessoa((data as Pessoa | null) ?? null));
  }, [usuario]);

  async function sair() {
    await supabase?.auth.signOut();
  }

  const carregando = !pronto || (!!usuario && pessoa === undefined);

  return (
    <Contexto.Provider value={{ carregando, sessao, pessoa: pessoa ?? null, sair }}>
      {children}
    </Contexto.Provider>
  );
}

export function useSessao(): Sessao {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSessao fora do ProvedorSessao");
  return valor;
}
