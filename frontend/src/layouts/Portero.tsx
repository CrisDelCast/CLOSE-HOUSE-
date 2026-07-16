import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PorteroLayout = () => {
  const { user, tenantSlug, logout } = useAuth();

  return (
    <div className="portero-layout" style={{ 
      fontFamily: 'sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      /* 🎨 FONDO PREMIUM UNIFICADO */
      backgroundColor: '#0c0c0e',
      backgroundImage: `
        radial-gradient(circle at 50% 150px, rgba(212, 175, 55, 0.06) 0%, rgba(12, 12, 14, 0) 60%),
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 24px 24px, 24px 24px',
    }}>
      {/* 🚀 ESTILOS RESPONSIVOS E INTERACTIVOS LOCALES */}
      <style>{`
        /* --- ESTILOS PARA CELULAR (Por defecto) --- */
        .responsive-header {
          padding: 12px 14px;
        }
        .responsive-title {
          font-size: 13px;
        }
        .responsive-badge {
          font-size: 9px;
          padding: 2px 5px;
        }
        .responsive-username {
          font-size: 11px;
        }
        .responsive-btn-logout {
          padding: 4px 8px;
          font-size: 11px;
        }

        /* --- ENLACES DE NAVEGACIÓN ESTILO DARK PREMIUM --- */
        .nav-link {
          text-decoration: none;
          color: #a3a3a3; /* Gris claro neutro por defecto */
          font-size: 13px;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid transparent;
        }

        /* Hover (PC): Iluminación con dorado suave y bordes sutiles */
        @media (hover: hover) {
          .nav-link:hover {
            background-color: rgba(212, 175, 55, 0.08);
            border-color: rgba(212, 175, 55, 0.2);
            color: #D4AF37; /* El texto brilla en dorado */
          }
        }

        /* Clase activa para NavLink de React Router */
        .nav-link-active {
          background-color: rgba(212, 175, 55, 0.12) !important;
          border-color: rgba(212, 175, 55, 0.3) !important;
          color: #D4AF37 !important;
        }

        /* Touch (Celular): Retroalimentación táctil óptima */
        .nav-link:active {
          background-color: rgba(212, 175, 55, 0.15);
          transform: scale(0.97);
        }

        /* --- ESTILOS PARA PC (Pantallas grandes) --- */
        @media (min-width: 768px) {
          .responsive-header {
            padding: 16px 24px;
          }
          .responsive-title {
            font-size: 18px;
          }
          .responsive-badge {
            font-size: 11px;
            padding: 3px 8px;
          }
          .responsive-username {
            font-size: 14px;
          }
          .responsive-btn-logout {
            padding: 8px 16px;
            font-size: 13px;
          }
          .nav-link {
            font-size: 14px;
          }
        }
      `}</style>

      {/* BARRA SUPERIOR CON CRISTAL TRANSLÚCIDO (Glassmorphism) */}
      <header 
        className="responsive-header"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'rgba(18, 18, 22, 0.85)', 
          color: '#fff',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)', /* Delicada línea dorada */
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'padding 0.2s ease',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong className="responsive-title" style={{ letterSpacing: '0.5px', transition: 'font-size 0.2s', color: '#ffffff' }}>
              Control de Acceso
            </strong> 
            <span 
              className="responsive-badge"
              style={{ 
                background: '#D4AF37', 
                color: '#0c0c0e', 
                borderRadius: '4px', 
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              PORTERÍA
            </span>
          </div>
          {/* Nombre de la Unidad bajo el título */}
          <span style={{ fontSize: '11px', color: '#a3a3a3' }}>
            Unidad:{' '}
            <strong style={{ color: '#D4AF37' }}>
              {tenantSlug ?? user?.tenantId ?? 'Sin especificar'}
            </strong>
          </span>
        </div>

        {/* CONTENEDOR DEL USUARIO Y BOTÓN DE SALIDA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span 
            className="responsive-username"
            style={{ 
              fontWeight: 500, 
              color: 'rgba(255, 255, 255, 0.85)',
              transition: 'font-size 0.2s'
            }}
          >
            {user?.fullName}
          </span>
          
          <button 
            onClick={logout} 
            className="responsive-btn-logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: '#D4AF37',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'all 0.15s ease',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D4AF37';
              e.currentTarget.style.color = '#0c0c0e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
              e.currentTarget.style.color = '#D4AF37';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg 
              style={{ width: '14px', height: '14px', transition: 'color 0.15s' }} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* PESTAÑAS O MENÚ EXCLUSIVO DE PORTERÍA */}
      <nav style={{ 
        display: 'flex', 
        gap: '10px', 
        padding: '10px 16px', 
        background: 'rgba(12, 12, 14, 0.9)', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        zIndex: 9
      }}>
        <NavLink 
          to="/rounds" 
          className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
        >
          <span>🔄</span> Ronda
        </NavLink>
        <NavLink 
          to="/gate" 
          className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
        >
          <span>🚪</span> Puerta
        </NavLink>
      </nav>

      {/* AQUÍ SE RENDERIZAN LAS SUBPÁGINAS (Heredan el fondo oscuro) */}
      <main style={{ 
        flex: 1, 
        padding: '2rem 1rem', 
        color: '#ffffff',
        boxSizing: 'border-box'
      }}>
        <Outlet />
      </main>
    </div>
  );
};

export default PorteroLayout;