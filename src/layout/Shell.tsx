import logo from "../../mem-brand/logo/mem-horizontal-fundo-escuro.svg";

// Estrutura do Workspace (BRAND.md §11): navegação lateral em brand-strong,
// conteúdo em surface. As telas da jornada entram aqui a partir de 13/10.
export default function Shell() {
  return (
    <div className="ws-shell">
      <nav className="ws-nav" aria-label="Navegação do Workspace">
        <img className="ws-nav__logo" src={logo} alt="MEM" />
        <span className="mem-label ws-nav__sig">Workspace · MEM</span>
      </nav>
      <main className="ws-main">
        <span className="mem-label mem-muted">Base · 09 out</span>
        <h1 className="mem-h1">Workspace</h1>
        <p className="mem-body-lg ws-measure">
          A base visual está pronta. As telas da jornada começam a ser construídas aqui.
        </p>
      </main>
    </div>
  );
}
