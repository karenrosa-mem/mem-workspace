import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./layout/Shell";
import Entrar from "./paginas/Entrar";
import Agora from "./paginas/mentorada/Agora";
import Mentoradas from "./paginas/mentora/Mentoradas";
import IniciarJornada from "./paginas/mentora/IniciarJornada";
import Aviso from "./componentes/Aviso";
import { useSessao } from "./lib/sessao";

export default function App() {
  const { carregando, sessao, pessoa, sair } = useSessao();

  if (carregando) return null;
  if (!sessao) return <Entrar />;
  if (!pessoa)
    return (
      <main className="ws-entrar">
        <Aviso variante="danger" titulo="Acesso não configurado">
          Seu login existe, mas o cadastro no Workspace não foi encontrado. Avise a Karen.
        </Aviso>
        <button className="mem-btn mem-btn--quiet" type="button" onClick={sair}>
          Sair
        </button>
      </main>
    );

  return (
    <Routes>
      <Route element={<Shell />}>
        {pessoa.e_mentora ? (
          <>
            <Route index element={<Mentoradas />} />
            <Route path="iniciar" element={<IniciarJornada />} />
          </>
        ) : (
          <Route index element={<Agora />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
