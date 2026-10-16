import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import Home from "./pages/Home";
import Login from "./pages/Login/Login";
import NuestrosCacaos from "./pages/NuestrosCacaos/NuestrosCacaos";
import Nosotros from "./pages/Nosotros/Nosotros";
import FichaCompleta from "./pages/FichaCompleta/FichaCompleta";
import RutaProtegida from './component/RutaProtegida'
import PanelLayout from './layouts/PanelLayout'
import DashboardOperador from './pages/DashboardOperador/DashboardOperador'

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

        {/* Solo operador */}
      <Route element={<RutaProtegida roles={['operador']} />}>
        <Route element={<PanelLayout />}>
          <Route path="/operador" element={<DashboardOperador />} />
        </Route>
      </Route>

      {/* Operador y administrador: se irán sumando aquí */}
      <Route element={<RutaProtegida roles={['operador', 'administrador']} />}>
        <Route element={<PanelLayout />}>
          {/* /lotes, /lotes/nuevo, /lotes/:id, /transformaciones/nueva */}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
