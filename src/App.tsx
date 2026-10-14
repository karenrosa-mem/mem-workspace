import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./layout/Shell";
import Entrar from "./paginas/Entrar";
import Agora from "./paginas/mentorada/Agora";
import Mentoradas from "./paginas/mentora/Mentoradas";
import IniciarJornada from "./paginas/mentora/IniciarJornada";
import M3 from "./paginas/mentorada/M3";
import M4 from "./paginas/mentorada/M4";
import M5 from "./paginas/mentorada/M5";
import M6 from "./paginas/mentorada/M6";
import M7 from "./paginas/mentorada/M7";
import M8 from "./paginas/mentorada/M8";
import M9 from "./paginas/mentorada/M9";
import M10 from "./paginas/mentorada/M10";
import JornadaCompleta from "./paginas/JornadaCompleta";
import GuiaCall from "./paginas/mentora/GuiaCall";
import MentoradaM1 from "./paginas/mentora/MentoradaM1";
import Jornada, { MovimentoEmConstrucao, MOVIMENTOS_PRONTOS } from "./paginas/mentorada/Jornada";
import M1 from "./paginas/mentorada/M1";
import M2 from "./paginas/mentorada/M2";
import { useParams } from "react-router-dom";
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
            <Route path="mentoradas/:id" element={<MentoradaM1 />} />
            <Route path="mentoradas/:id/call/:n" element={<GuiaCall />} />
            <Route path="mentoradas/:id/jornada-completa" element={<JornadaCompleta />} />
          </>
        ) : (
          <>
            <Route index element={<Agora />} />
            <Route path="jornada" element={<Jornada />} />
            <Route path="jornada/completa" element={<JornadaCompleta />} />
            <Route path="jornada/:n" element={<PaginaMovimento />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function PaginaMovimento() {
  const n = Number(useParams().n);
  if (n === 1) return <M1 />;
  if (n === 2) return <M2 />;
  if (n === 3) return <M3 />;
  if (n === 4) return <M4 />;
  if (n === 5) return <M5 />;
  if (n === 6) return <M6 />;
  if (n === 7) return <M7 />;
  if (n === 8) return <M8 />;
  if (n === 9) return <M9 />;
  if (n === 10) return <M10 />;
  if (!MOVIMENTOS_PRONTOS.has(n) && n >= 1 && n <= 10) return <MovimentoEmConstrucao codigo={n} />;
  return <Navigate to="/jornada" replace />;
}
