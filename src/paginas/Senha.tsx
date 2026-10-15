import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import Aviso from "../componentes/Aviso";

// Trocar a própria senha, já logada. Não envia e-mail.
export default function Senha() {
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [estado, setEstado] = useState<"" | "salvando" | "feito">("");
  const [erro, setErro] = useState<string | null>(null);

  async function trocar(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setErro(null);
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== senha2) return setErro("As duas senhas não estão iguais.");
    setEstado("salvando");
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setEstado("");
      return setErro(/same|different/i.test(error.message) ? "A senha nova precisa ser diferente da atual." : "Não foi possível trocar agora. Tente de novo.");
    }
    setEstado("feito");
    setSenha("");
    setSenha2("");
  }

  return (
    <>
      <span className="mem-label mem-muted">Sua conta</span>
      <h1 className="mem-h1">Trocar a senha</h1>
      <form className="ws-form ws-measure" onSubmit={trocar}>
        <div className="mem-field">
          <label className="mem-field__label" htmlFor="nova">
            Senha nova
          </label>
          <input className="mem-input" id="nova" type="password" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          <span className="mem-field__help">Pelo menos 8 caracteres.</span>
        </div>
        <div className="mem-field">
          <label className="mem-field__label" htmlFor="nova2">
            Repita a senha nova
          </label>
          <input className="mem-input" id="nova2" type="password" autoComplete="new-password" required value={senha2} onChange={(e) => setSenha2(e.target.value)} />
        </div>
        {erro && (
          <Aviso variante="danger" titulo="Senha não trocada">
            {erro}
          </Aviso>
        )}
        {estado === "feito" && (
          <Aviso variante="done" titulo="Senha trocada">
            Na próxima vez, entre com a senha nova.
          </Aviso>
        )}
        <div>
          <button className="mem-btn mem-btn--primary" type="submit" disabled={estado === "salvando"}>
            {estado === "salvando" ? "Trocando" : "Trocar a senha"}
          </button>
        </div>
      </form>
    </>
  );
}
