import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import Home from "./pages/Home";
import Login from "./pages/Login/Login";
import NuestrosCacaos from "./pages/NuestrosCacaos/NuestrosCacaos";
import Nosotros from "./pages/Nosotros/Nosotros";
import FichaCompleta from "./pages/FichaCompleta/FichaCompleta";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/nuestros-cacaos" element={<NuestrosCacaos />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/ficha-completa/:id" element={<FichaCompleta />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
