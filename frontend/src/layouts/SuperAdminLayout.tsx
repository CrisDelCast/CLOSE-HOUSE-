import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function SuperAdminLayout() {
  const { logout, user } = useAuthContext();
  const navigate = useNavigate();

  return (
    <div className="superadmin-layout">
      {/* BARRA SUPERIOR DEL SUPER ADMIN */}
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#1e293b', color: '#fff' }}>
        <div>
          <strong>Control de Acceso</strong> <span style={{ background: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>SUPER PANEL</span>
        </div>
        <div>
          <span>{user?.fullName}</span>
          <button onClick={logout} style={{ marginLeft: '10px' }}>Cerrar Sesión</button>
        </div>
      </header>

      {/* PESTAÑAS O MENÚ EXCLUSIVO DEL SUPER ADMIN */}
      <nav style={{ display: 'flex', gap: '20px', padding: '1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Link to="/superadmin/dashboard">📊 Dashboard Global</Link>
        <Link to="/superadmin/tenants">🏢 Gestionar Conjuntos (Tenants)</Link>
        <Link to="/superadmin/settings">⚙️ Configuración del Sistema</Link>
      </nav>

      {/* AQUÍ SE RENDERIZAN LAS SUBPÁGINAS */}
      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}