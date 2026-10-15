import { NavLink, Outlet } from "react-router-dom";
import logo from "../../mem-brand/logo/mem-horizontal-fundo-escuro.svg";
import { useSessao } from "../lib/sessao";

// Estrutura do Workspace (BRAND.md §11): navegação lateral em brand-strong,
// conteúdo em surface. A navegação muda conforme quem entrou.
export default function Shell() {
  const { pessoa, sair } = useSessao();
  const links = pessoa?.e_mentora
    ? [
        { para: "/", nome: "Fila", fim: true },
        { para: "/mentoradas", nome: "Mentoradas", fim: false },
      ]
    : [
        { para: "/", nome: "Agora", fim: true },
        { para: "/jornada", nome: "Jornada", fim: false },
      ];

  return (
    <div className="ws-shell">
      <nav className="ws-nav" aria-label="Navegação do Workspace">
        <div className="ws-nav__marca">
          <img className="ws-nav__logo" src={logo} alt="MEM" />
          <span className="mem-label ws-nav__sigla">Método Expertise Monetizada</span>
        </div>
        <ul className="ws-nav__links">
          {links.map((l) => (
            <li key={l.para}>
              <NavLink to={l.para} end={l.fim} className="ws-nav__link">
                {l.nome}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="ws-nav__pe">
          <span className="mem-body-sm ws-nav__sig">{pessoa?.nome}</span>
          <NavLink to="/senha" className="ws-nav__sair">
            Trocar senha
          </NavLink>
          <button type="button" className="ws-nav__sair" onClick={sair}>
            Sair
          </button>
        </div>
      </nav>
      <main className="ws-main">
        <Outlet />
      </main>
    </div>
  );
}
