import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AppLayout = () => {
  const { user, tenantSlug, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Control de Acceso</h1>
          <p className="app-header__tenant">
            Unidad:{' '}
            <strong>{tenantSlug ?? user?.tenantId ?? 'Sin especificar'}</strong>
          </p>
        </div>
        <div className="app-header__user">
          <div>
            <p className="app-header__user-name">{user?.fullName}</p>
            <span className="badge">{user?.role}</span>
          </div>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <NavLink to="/residents" className={({ isActive }) => (isActive ? 'link link--active' : 'link')}>
          Residentes
        </NavLink>
        <NavLink to="/visitors" className={({ isActive }) => (isActive ? 'link link--active' : 'link')}>
          Visitantes
        </NavLink>
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;

