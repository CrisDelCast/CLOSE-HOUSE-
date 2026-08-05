import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ResidentsPage from './pages/superadmin/ResidentsPage';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import AdminLayout from './layouts/AdminLayout';
import TenantsManagement from './pages/superadmin/TenantsManagement';
import { useAuthContext } from './context/AuthContext';
import RondaDashboard from './pages/portero/RondaPage';
import PuertaDashboard from './pages/portero/PuertaPage';
import PorteroLayout from './layouts/Portero';
import RoundsAuditPage from './pages/superadmin/RoundsAuditPage';
import UsersManagement from './pages/superadmin/UsersManagement';
import MinutaPage from './pages/portero/MinutaPage';
import MinutaGeneralPage from './pages/portero/MinutaGeneralPage';

const RootRedirect = () => {
  const { user } = useAuthContext();

  if (!user) {
    return null;
  }

  if (user.role === 'SUPERADMIN') {
    return <Navigate to="/superadmin" replace />;
  }

  if (user.role === 'PORTERO') {
    return <Navigate to="/rounds" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/residents" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route index element={<RootRedirect />} />

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="residents" replace />} />
            <Route path="residents" element={<ResidentsPage mode="admin" />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
          <Route path="superadmin" element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="tenants" replace />} />
            <Route path="tenants" element={<TenantsManagement />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="residents" element={<ResidentsPage mode="superadmin" />} />
            <Route path="roundsaudits" element={<RoundsAuditPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['PORTERO']} />}>
          <Route element={<PorteroLayout />}>
            <Route path="rounds" element={<RondaDashboard />} />
            <Route path="gate" element={<PuertaDashboard />} />
            <Route path="minuta" element={<MinutaPage />} />
            <Route path="minuta-general" element={<MinutaGeneralPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
