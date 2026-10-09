import { useState, type FormEvent } from "react";
import logo from "../../mem-brand/logo/mem-horizontal.svg";
import { supabase } from "../lib/supabase";
import Aviso from "../componentes/Aviso";

// Entrada por link no e-mail, sem senha. Só entra quem já foi cadastrada
// pela mentora (shouldCreateUser: false).
export default function Entrar() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"livre" | "enviando" | "enviado">("livre");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setErro(null);
    setEstado("enviando");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    if (error) {
      setEstado("livre");
      const semCadastro = /signup|not allowed|not found/i.test(error.message);
      const limite = /rate|too many|seconds/i.test(error.message);
      setErro(
        semCadastro
          ? "Este e-mail não tem acesso ao Workspace. Confira se é o mesmo e-mail que você passou para a Karen."
          : limite
            ? "Muitos pedidos de link em pouco tempo. Espere alguns minutos e peça de novo."
            : "Não foi possível enviar o link agora. Tente de novo em instantes.",
      );
      return;
    }
    setEstado("enviado");
  }

  return (
    <main className="ws-entrar">
      <img className="ws-entrar__logo" src={logo} alt="MEM" />
      <span className="mem-label mem-muted">Workspace · MEM</span>
      <h1 className="mem-h2">Entrar</h1>

      {!supabase && (
        <Aviso variante="danger" titulo="Workspace sem conexão">
          As chaves do banco não foram configuradas neste endereço.
        </Aviso>
      )}

      {estado === "enviado" ? (
        <Aviso variante="done" titulo="Link enviado">
          Enviamos um link de entrada para {email.trim()}. Abra o e-mail neste mesmo aparelho e
          navegador. Se não chegar em alguns minutos, olhe a caixa de spam.
        </Aviso>
      ) : (
        <form className="ws-form" onSubmit={enviar}>
          <div className="mem-field">
            <label className="mem-field__label" htmlFor="email">
              Seu e-mail
            </label>
            <input
              className="mem-input"
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="mem-field__help">
              Você recebe um link para entrar. Não há senha para lembrar.
            </span>
          </div>
          {erro && (
            <Aviso variante="danger" titulo="Link não enviado">
              {erro}
            </Aviso>
          )}
          <button className="mem-btn mem-btn--primary" type="submit" disabled={estado === "enviando" || !supabase}>
            {estado === "enviando" ? "Enviando o link" : "Receber link de entrada"}
          </button>
        </form>
      )}
    </main>
  );
}
