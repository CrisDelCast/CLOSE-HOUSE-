import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import ResidentsPage from './pages/ResidentsPage';
import VisitorsPage from './pages/VisitorsPage';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import TenantsManagement from './pages/superadmin/TenantsManagement';
import GlobalSettings from './pages/superadmin/GlobalSettings';
import { useAuthContext } from './context/AuthContext'; 
import RondaDashboard from './pages/portero/RondaPage';
import PuertaDashboard from './pages/portero/PuertaPage';
import PorteroLayout from './layouts/Portero';

const RootRedirect = () => {
  const { user } = useAuthContext();

  if (user?.role === 'SUPERADMIN') {
    return <Navigate to="/superadmin" replace />;
  }
  
  if (user?.role === 'PORTERO') {
    return <Navigate to="/rounds" replace />;
  }

  // Si es ADMIN va a residentes
  return <Navigate to="/residents" replace />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* 🔐 FILTRO GENERAL: Usuarios logueados */}
      <Route element={<ProtectedRoute />}>
        
        {/* La ruta raíz (/) decide el destino según el rol */}
        <Route index element={<RootRedirect />} />

        {/* 🏢 AREA DE CONJUNTOS: Solo para Administradores */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<AppLayout />}>
            <Route path="residents" element={<ResidentsPage />} />
            <Route path="visitors" element={<VisitorsPage />} />
          </Route>    
        </Route>

        {/* 👑 AREA GLOBAL: Exclusiva de SUPERADMIN */}
        <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
          <Route path="superadmin" element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="tenants" element={<TenantsManagement />} />
            <Route path="settings" element={<GlobalSettings />} />
          </Route>
        </Route>
    
        {/* 👮 AREA DE PORTERÍA: Exclusiva de PORTERO (Usa AppLayout con sus 2 pestañas) */}
        <Route element={<ProtectedRoute allowedRoles={['PORTERO']} />}>
          <Route element={<PorteroLayout />}>
            <Route path="rounds" element={<RondaDashboard />} />
            <Route path="gate" element={<PuertaDashboard />} />
          </Route>
        </Route>

      </Route>
      
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;