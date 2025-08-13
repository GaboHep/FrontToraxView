import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage"; // Puedes crear esta luego
import Dashboard from "./Dashboard";
import Resultados from "./Resultados";
import Usuarios from "./Usuarios";
import Feedbacks from "./Feedbacks"; // ajusta la ruta si está en subcarpeta



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resultados" element={<Resultados />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/feedbacks" element={<Feedbacks />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
