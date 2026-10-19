// Regra de senha do Workspace (decisão de 19/10/2026). A mesma regra está no banco
// (supabase/migrations/0018_senha_forte.sql), para o primeiro acesso por código.
const COMUNS = new Set(["12345678", "123456789", "1234567890", "senha123", "senha1234", "senha12345", "password1", "password123", "qwerty123", "abc12345", "abcd1234", "mudar123", "brasil123", "mem12345", "mentoria1", "mentoria123", "10203040", "1q2w3e4r", "1q2w3e4r5t", "a1b2c3d4", "iloveyou1", "deus1234", "jesus123", "flamengo1", "12341234", "admin123", "teste123", "teste1234", "amor1234", "familia1"]);

// Devolve o problema da senha, ou null se ela serve.
export function problemaDaSenha(senha: string, email?: string): string | null {
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/[0-9]/.test(senha)) return "Use letras e números na senha.";
  if (COMUNS.has(senha.toLowerCase()) || /^(.)\1+$/.test(senha)) return "Essa senha é muito comum. Escolha outra.";
  const nome = (email ?? "").split("@")[0]?.toLowerCase();
  if (nome && nome.length >= 4 && senha.toLowerCase().includes(nome)) return "A senha não pode conter o seu e-mail.";
  return null;
}

export const AJUDA_SENHA = "Pelo menos 8 caracteres, com letras e números. Evite senhas óbvias, como 12345678 ou senha123.";
