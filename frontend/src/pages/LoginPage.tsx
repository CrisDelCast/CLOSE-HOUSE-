import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import logoDuxs from '../assets/logo-duxssecurity.png'; // Ajusta la ruta según tu carpeta

const LoginPage = () => {
  const { login, user, isInitializing } = useAuthContext() as any; 
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    tenantSlug: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirección si ya existe una sesión activa al cargar la página
  useEffect(() => {
    if (!isInitializing && user) {
      if (user.role === 'SUPERADMIN') {
        navigate('/superadmin', { replace: true });
      } else if (user.role === 'PORTERO') {
        navigate('/rounds', { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/residents', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isInitializing, user, navigate]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(form);
      const role = loggedInUser?.role || user?.role;

      if (role === 'SUPERADMIN') {
        navigate('/superadmin', { replace: true });
      } else if (role === 'PORTERO') {
        navigate('/rounds', { replace: true });
      } else if (role === 'ADMIN') {
        navigate('/residents', { replace: true });
      } else {
        const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/';
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Sin mensaje de error';
      const errorCode = err.code || 'Sin código de error';
      const status = err.response?.status || 'No response status (undefined)';
      const responseData = err.response?.data ? JSON.stringify(err.response.data) : 'No response data';
      const configUrl = err.config?.url || 'No URL configured';

      alert(
        `🚨 DIAGNÓSTICO DE RED LOCAL:\n\n` +
        `• Error: ${errorMsg}\n` +
        `• Código Axios: ${errorCode}\n` +
        `• Status: ${status}\n` +
        `• URL intentada: ${configUrl}\n` +
        `• Respuesta: ${responseData}`
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No fue posible iniciar sesión.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box',
      margin: 0,
      padding: '20px',
      backgroundColor: '#0c0c0e',
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.08) 0%, rgba(12, 12, 14, 0) 70%),
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 24px 24px, 24px 24px',
    }}>
      
      <style>{`
        .login-card {
          width: 100%;
          max-width: 400px;
          background: rgba(22, 22, 26, 0.95);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 16px;
          padding: 30px 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(212, 175, 55, 0.03);
          backdrop-filter: blur(8px);
          box-sizing: border-box;
        }

        .login-title {
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          text-align: center;
          margin-top: 0;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }

        .login-subtitle {
          color: #a3a3a3;
          font-size: 13px;
          text-align: center;
          margin-bottom: 28px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }

        .input-label {
          color: rgba(212, 175, 55, 0.9);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .login-input {
          background-color: #121214 !important;
          border: 1px solid #2e2e33 !important;
          color: #ffffff !important;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: all 0.20s ease;
          box-sizing: border-box;
          width: 100%;
        }

        .login-input:focus {
          border-color: #D4AF37 !important;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15) !important;
        }

        .error-message {
          color: #f87171;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.2);
          padding: 10px;
          border-radius: 6px;
          font-size: 12px;
          margin-bottom: 20px;
          text-align: center;
        }

        .submit-btn {
          width: 100%;
          background: #D4AF37;
          color: #0c0c0e;
          border: none;
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
          WebkitAppearance: none;
          MozAppearance: none;
          appearance: none;
        }

        .submit-btn:hover:not(:disabled) {
          background: #e5be49;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.3);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(1px) scale(0.98);
        }

        .submit-btn:disabled {
          background: #5a4b22;
          color: #a3a3a3;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>

      {/* FORMULARIO - CARD PREMIUM */}
      <form className="login-card" onSubmit={handleSubmit}>
        
        {/* CONTENEDOR DEL LOGO DE LA EMPRESA */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '160px', // Incrementamos el tamaño para que el logo real destaque bien
            height: '140px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)', // Fondo oscuro muy sutil para aislar el logo
            border: '1px solid rgba(212, 175, 55, 0.15)', // Delicado borde dorado a juego
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            padding: '0.001px', // Espacio interno para que el logo no toque los bordes
            boxSizing: 'border-box'
          }}>
            <img 
              src={logoDuxs}// 👈 REEMPLAZA AQUÍ con la ruta o URL de tu imagen
              alt="Logo Empresa"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain' // Asegura que no se deforme la imagen
              }}
              onError={(e) => {
                // Fallback elegante si por alguna razón la imagen no carga
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
        
        <h2 className="login-title">DUXS SECURITY</h2>
        <p className="login-subtitle">Control de acceso y rondas</p>

        {/* INPUT: SLUG */}
        <div className="input-group">
          <label className="input-label">Slug de la unidad residencial</label>
          <input
            className="login-input"
            name="tenantSlug"
            placeholder="ej. conjunto-demo"
            value={form.tenantSlug}
            onChange={handleChange}
            required
          />
        </div>

        {/* INPUT: CORREO */}
        <div className="input-group">
          <label className="input-label">Correo electrónico</label>
          <input
            className="login-input"
            type="email"
            name="email"
            placeholder="porteria@demo.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* INPUT: CONTRASEÑA */}
        <div className="input-group" style={{ marginBottom: '26px' }}>
          <label className="input-label">Contraseña</label>
          <input
            className="login-input"
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        {/* ERROR BOX */}
        {error && <p className="error-message">{error}</p>}

        {/* BOTÓN DE ACCESO */}
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <svg style={{
                animation: 'spin 1s linear infinite',
                width: '16px',
                height: '16px',
                marginRight: '4px'
              }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Ingresando...</span>
            </>
          ) : (
            <span>Ingresar al Panel</span>
          )}
        </button>
          
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </form>
    </div>
  );
};

export default LoginPage;