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
import Lotes from './pages/Lotes/Lotes'
import LoteNuevo from './pages/LoteNuevo/LoteNuevo'
import TransformacionNueva from './pages/TransformacionNueva/TransformacionNueva'

// Panel del Administrador (Layout y vistas hijas con estructura pages/nombre/nombre.jsx)
import DashboardAdministrador from './pages/DashboardAdministrador/DashboardAdministrador'
import InicioAdmin from './pages/InicioAdmin/InicioAdmin'
import Alertas from './pages/Alertas/Alertas'
import Economia from './pages/Economia/Economia'
import Productos from './pages/Productos/Productos'
import Auditoria from './pages/Auditoria/Auditoria'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/nuestros-cacaos" element={<NuestrosCacaos />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/ficha-completa/:id" element={<FichaCompleta />} />

        {/* Solo operador */}
        <Route element={<RutaProtegida roles={['operador']} />}>
          <Route element={<PanelLayout />}>
            <Route path="/operador" element={<DashboardOperador />} />
          </Route>
        </Route>

        {/* Operador y administrador */}
        <Route element={<RutaProtegida roles={['operador', 'administrador', 'admin']} />}>
          <Route element={<PanelLayout />}>
            <Route path="/lotes" element={<Lotes />} />
            <Route path="/lotes/nuevo" element={<LoteNuevo />} />
            <Route path="/transformaciones/nueva" element={<TransformacionNueva />} />
          </Route>
        </Route>

        {/* Panel exclusivo del Administrador con Layout dedicado y rutas hijas */}
        <Route element={<RutaProtegida roles={['administrador', 'admin']} />}>
          <Route path="/admin" element={<DashboardAdministrador />}>
            <Route index element={<InicioAdmin />} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="economia" element={<Economia />} />
            <Route path="productos" element={<Productos />} />
            <Route path="auditoria" element={<Auditoria />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
