import { Outlet, NavLink } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function AdminLayout() {
  const { logout, user, tenantSlug } = useAuthContext();

  return (
    <div
      className="admin-layout"
      style={{
        fontFamily: 'sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0c0c0e',
        backgroundImage: `
        radial-gradient(circle at 50% 150px, rgba(212, 175, 55, 0.06) 0%, rgba(12, 12, 14, 0) 60%),
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
      `,
        backgroundSize: '100% 100%, 24px 24px, 24px 24px',
      }}
    >
      <style>{`
        .responsive-header { padding: 12px 14px; }
        .responsive-title { font-size: 13px; }
        .responsive-badge { font-size: 9px; padding: 2px 5px; }
        .responsive-username { font-size: 11px; }
        .responsive-btn-logout { padding: 4px 8px; font-size: 11px; }
        .nav-link {
          text-decoration: none;
          color: #a3a3a3;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .nav-link.active {
          background-color: rgba(212, 175, 55, 0.12) !important;
          border-color: rgba(212, 175, 55, 0.3) !important;
          color: #D4AF37 !important;
        }
        @media (hover: hover) {
          .nav-link:hover {
            background-color: rgba(212, 175, 55, 0.08);
            border-color: rgba(212, 175, 55, 0.2);
            color: #D4AF37;
          }
        }
        @media (min-width: 768px) {
          .responsive-header { padding: 16px 24px; }
          .responsive-title { font-size: 18px; }
          .responsive-badge { font-size: 11px; padding: 3px 8px; }
          .responsive-username { font-size: 14px; }
          .responsive-btn-logout { padding: 8px 16px; font-size: 13px; }
          .nav-link { font-size: 14px; }
        }
      `}</style>

      <header
        className="responsive-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(18, 18, 22, 0.85)',
          color: '#fff',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <strong className="responsive-title" style={{ letterSpacing: '0.5px', color: '#ffffff' }}>
            Control de Acceso
          </strong>
          <span
            className="responsive-badge"
            style={{
              background: '#D4AF37',
              color: '#0c0c0e',
              borderRadius: '4px',
              fontWeight: 'bold',
            }}
          >
            ADMIN
          </span>
          {tenantSlug && (
            <span style={{ fontSize: '11px', color: '#888' }}>
              · {tenantSlug}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="responsive-username" style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>
            {user?.fullName}
          </span>
          <button
            type="button"
            onClick={logout}
            className="responsive-btn-logout"
            style={{
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: '#D4AF37',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <nav
        style={{
          display: 'flex',
          gap: '10px',
          padding: '10px 16px',
          background: 'rgba(12, 12, 14, 0.9)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <NavLink to="/admin/residents" className="nav-link">
          <span>👥</span> Gestión de Unidades
        </NavLink>
      </nav>

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          color: '#ffffff',
          boxSizing: 'border-box',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
