import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import logoDuxs from '../assets/logo-duxssecurity.png';

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
  
  // Estado para controlar la visibilidad del Modal del EULA
  const [showEulaModal, setShowEulaModal] = useState(false);

  // Redirección si ya existe una sesión activa al cargar la página
  useEffect(() => {
    if (!isInitializing && user) {
      if (user.role === 'SUPERADMIN') {
        navigate('/superadmin', { replace: true });
      } else if (user.role === 'PORTERO') {
        navigate('/rounds', { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin/residents', { replace: true });
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
      const response = await login(form); 
      
      const token = response?.accessToken || response?.data?.accessToken;
      if (token) {
        localStorage.setItem('token', token);
      }

      const loggedInUser = response?.user || response?.data?.user || user;
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
          margin-bottom: 2px;
          letter-spacing: 0.5px;
        }

        .login-subtitle {
          color: #D4AF37;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          text-align: center;
          margin-top: 0;
          margin-bottom: 6px;
          letter-spacing: 1.5px;
        }

        .login-description {
          color: #a3a3a3;
          font-size: 12px;
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
        }

        .submit-btn:hover:not(:disabled) {
          background: #e5be49;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.3);
        }

        .eula-link {
          text-align: center;
          margin-top: 16px;
          font-size: 12px;
          color: #a3a3a3;
        }

        .eula-link button {
          background: none;
          border: none;
          color: #D4AF37;
          cursor: pointer;
          text-decoration: underline;
          font-size: 12px;
          padding: 0;
        }

        .eula-link button:hover {
          color: #e5be49;
        }

        /* Estilos del Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          box-sizing: border-box;
        }

        .modal-content {
          background: #16161a;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 12px;
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        }

        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #2e2e33;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #ffffff;
          font-weight: 700;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          color: #cccccc;
          font-size: 13px;
          line-height: 1.6;
        }

        .modal-footer {
          padding: 12px 20px;
          border-top: 1px solid #2e2e33;
          text-align: right;
        }

        .modal-close-btn {
          background: #D4AF37;
          color: #0c0c0e;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>

      {/* FORMULARIO - CARD PREMIUM */}
      <form className="login-card" onSubmit={handleSubmit}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '160px',
            height: '140px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            boxSizing: 'border-box'
          }}>
            <img 
              src={logoDuxs}
              alt="Logo Empresa"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>
        
        <h2 className="login-title">DUXS SECURITY</h2>
        <p className="login-description">Control de acceso y rondas</p>

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

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? <span>Ingresando...</span> : <span>Ingresar al Panel</span>}
        </button>

        {/* Enlace para abrir los Términos (EULA) */}
        <div className="eula-link">
          Al iniciar sesión acepta los <button type="button" onClick={() => setShowEulaModal(true)}>Términos de Licencia (EULA)</button>
        </div>
      </form>

      {/* MODAL DE EULA ACTUALIZADO */}
      {showEulaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Acuerdo de Licencia de Usuario Final (EULA)</span>
              <button onClick={() => setShowEulaModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div className="modal-body">
              <h3 style={{ color: '#D4AF37', marginTop: 0 }}>ACCESO SEGURO 360</h3>
              <p><strong>1. Concesión de Licencia:</strong> Se otorga una licencia de uso temporal, no exclusiva e intransferible exclusivamente para operaciones de control de accesos y rondas en la copropiedad autorizada.</p>
              <p><strong>2. Propiedad Intelectual:</strong> Todos los derechos de autor, diseño y código fuente pertenecen de forma exclusiva al Desarrollador. Queda prohibida la ingeniería inversa o redistribución no autorizada.</p>
              <p><strong>3. Protección de Datos y Tratamiento de Información:</strong> La copropiedad obra como Responsable del Tratamiento de los datos personales (cédulas, placas y registros suministrados directamente por la administración). Esta plataforma actúa estrictamente como Encargado del Tratamiento, proveyendo la infraestructura de software para su almacenamiento y gestión bajo las directrices y normatividad legal aplicable.</p>
              <p><strong>4. Limitación de Responsabilidad:</strong> El servicio se provee bajo infraestructura cloud de terceros, por lo que el desarrollador no asume pérdidas derivadas de negligencias operativas locales o interrupciones de red externas.</p>
              
              <hr style={{ border: '0', borderTop: '1px solid #2e2e33', margin: '20px 0 16px 0' }} />
              <p style={{ fontSize: '11px', color: '#888888', textAlign: 'center', margin: 0 }}>
                <em>Acceso Seguro 360 • Powered by Duxsecurity • Software con registro de Propiedad Intelectual (DNDA). Todos los derechos reservados.</em>
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowEulaModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;