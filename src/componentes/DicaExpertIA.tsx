// Dica discreta de quando o ExpertIA ajuda (decisão de 11/10/2026).
// O Workspace funciona sem ele; a dica só aponta onde ele poupa trabalho.
export default function DicaExpertIA({ children }: { children: React.ReactNode }) {
  return (
    <aside className="ws-dica-expertia">
      <span className="mem-label">Com o ExpertIA</span>
      <p className="mem-body-sm">{children}</p>
    </aside>
  );
}
