import { useState, type FormEvent } from "react";
import logo from "../../mem-brand/logo/mem-horizontal.svg";
import { supabase } from "../lib/supabase";
import Aviso from "../componentes/Aviso";
import Colinha from "../componentes/Colinha";

// Entrada sem e-mail (decisão de 15/10): e-mail + senha. No primeiro acesso,
// ou para criar uma senha nova, ela usa o código que a Karen mandou pelo WhatsApp.
export default function Entrar() {
  const [modo, setModo] = useState<"entrar" | "codigo">(() => (new URLSearchParams(window.location.search).has("codigo") ? "codigo" : "entrar"));
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [codigo, setCodigo] = useState(() => new URLSearchParams(window.location.search).get("codigo") ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) setErro("E-mail ou senha não conferem. Se esqueceu a senha, peça um código novo à Karen.");
  }

  async function comCodigo(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setErro(null);
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== senha2) return setErro("As duas senhas não estão iguais.");
    setEnviando(true);
    const db = supabase;
    const mail = email.trim().toLowerCase();
    const cod = codigo.trim().toUpperCase();
    const r = await db.rpc("definir_senha_com_codigo", { p_email: mail, p_codigo: cod, p_senha: senha });
    if (r.error) {
      setEnviando(false);
      return setErro(r.error.message);
    }
    if (r.data === "codigo_errado") {
      setEnviando(false);
      return setErro("O código não confere. Confira as letras e os números (sem 0 nem O, sem 1 nem I).");
    }
    if (r.data === "pronto") {
      const s = await db.auth.signInWithPassword({ email: mail, password: senha });
      setEnviando(false);
      if (s.error) setErro("A senha foi criada, mas não foi possível entrar agora. Tente entrar com ela.");
      return;
    }
    // Primeiro acesso: cria o login e liga a conta pelo código.
    const s = await db.auth.signUp({ email: mail, password: senha });
    if (s.error || !s.data.session) {
      setEnviando(false);
      return setErro(
        s.data.user && !s.data.session
          ? "O cadastro está pedindo confirmação por e-mail. Avise a Karen: falta desligar “Confirm email” no Supabase."
          : "Não foi possível criar o seu acesso agora. Tente de novo em instantes.",
      );
    }
    const v = await db.rpc("vincular_conta", { p_codigo: cod });
    if (v.error || v.data !== "pronto") {
      setEnviando(false);
      return setErro(v.error?.message ?? "O código não confere. Peça um código novo à Karen.");
    }
    window.location.assign("/");
  }

  return (
    <main className="ws-entrar">
      <img className="ws-entrar__logo" src={logo} alt="MEM" />
      <span className="mem-label mem-muted">Workspace · Método Expertise Monetizada</span>
      <h1 className="mem-h2">{modo === "entrar" ? "Entrar" : "Primeiro acesso ou senha nova"}</h1>

      {!supabase && (
        <Aviso variante="danger" titulo="Workspace sem conexão">
          As chaves do banco não foram configuradas neste endereço.
        </Aviso>
      )}

      {modo === "entrar" ? (
        <form className="ws-form" onSubmit={entrar}>
          <div className="mem-field">
            <label className="mem-field__label" htmlFor="email">
              Seu e-mail
            </label>
            <input className="mem-input" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mem-field">
            <label className="mem-field__label" htmlFor="senha">
              Senha
            </label>
            <input className="mem-input" id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && (
            <Aviso variante="danger" titulo="Não foi possível entrar">
              {erro}
            </Aviso>
          )}
          <button className="mem-btn mem-btn--primary" type="submit" disabled={enviando || !supabase}>
            {enviando ? "Entrando" : "Entrar"}
          </button>
          <button
            type="button"
            className="mem-btn mem-btn--quiet"
            onClick={() => {
              setModo("codigo");
              setErro(null);
              setSenha("");
            }}
          >
            É o meu primeiro acesso, ou esqueci a senha
          </button>
        </form>
      ) : (
        <form className="ws-form" onSubmit={comCodigo}>
          <p className="mem-body ws-measure">Use o código que a Karen mandou pelo WhatsApp e crie a sua senha. O código vale uma vez, por 7 dias.</p>
          <div className="mem-field">
            <label className="mem-field__label" htmlFor="email2">
              Seu e-mail
            </label>
            <input className="mem-input" id="email2" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Colinha serve="O mesmo e-mail que você passou para a Karen." />
          </div>
          <div className="mem-field">
            <label className="mem-field__label" htmlFor="codigo">
              Código
            </label>
            <input
              className="mem-input ws-input-curto"
              id="codigo"
              required
              autoComplete="one-time-code"
              placeholder="XXXX-XXXX"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
          </div>
          <div className="mem-field">
            <label className="mem-field__label" htmlFor="nova">
              Crie a sua senha
            </label>
            <input className="mem-input" id="nova" type="password" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            <span className="mem-field__help">Pelo menos 8 caracteres. Só você sabe; dá para trocar depois, dentro do Workspace.</span>
          </div>
          <div className="mem-field">
            <label className="mem-field__label" htmlFor="nova2">
              Repita a senha
            </label>
            <input className="mem-input" id="nova2" type="password" autoComplete="new-password" required value={senha2} onChange={(e) => setSenha2(e.target.value)} />
          </div>
          {erro && (
            <Aviso variante="danger" titulo="Ainda não foi">
              {erro}
            </Aviso>
          )}
          <button className="mem-btn mem-btn--primary" type="submit" disabled={enviando || !supabase}>
            {enviando ? "Criando" : "Criar senha e entrar"}
          </button>
          <button
            type="button"
            className="mem-btn mem-btn--quiet"
            onClick={() => {
              setModo("entrar");
              setErro(null);
            }}
          >
            Já tenho senha
          </button>
        </form>
      )}
    </main>
  );
}
