import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PorteroLayout = () => {
  const { user, tenantSlug, logout } = useAuth();

  return (
    <div className="app-shell app-shell--portero">
      {/* Encabezado optimizado para el Portero */}
      <header className="app-header" style={{ backgroundColor: '#0f172a' }}> 
        <div>
          <h1>Control de Acceso (Portería)</h1>
          <p className="app-header__tenant">
            Unidad:{' '}
            <strong>{tenantSlug ?? user?.tenantId ?? 'Sin especificar'}</strong>
          </p>
        </div>
        <div className="app-header__user">
          <div>
            <p className="app-header__user-name">{user?.fullName}</p>
            <span className="badge badge--portero" style={{ backgroundColor: '#10b981' }}>
              {user?.role}
            </span>
          </div>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Menú de navegación exclusivo: Solo Ronda y Puerta */}
      <nav className="app-nav">
        <NavLink 
          to="/rounds" 
          className={({ isActive }) => (isActive ? 'link link--active' : 'link')}
        >
          🔄 Ronda
        </NavLink>
        <NavLink 
          to="/gate" 
          className={({ isActive }) => (isActive ? 'link link--active' : 'link')}
        >
          🚪 Puerta
        </NavLink>
      </nav>

      {/* Contenido dinámico (RondaDashboard o PuertaDashboard) */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default PorteroLayout;