import { Route, Routes } from "react-router-dom";
import Shell from "./layout/Shell";

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Shell />} />
    </Routes>
  );
}
