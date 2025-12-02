import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { login, user, isInitializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    tenantSlug: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitializing && user) {
      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/residents';
      navigate(redirectTo, { replace: true });
    }
  }, [isInitializing, user, navigate, location.state]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(form);
      navigate('/residents', { replace: true });
    } catch (err) {
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
    <div className="login-page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Acceso a portería</h2>
        <label>
          Slug de la unidad residencial
          <input
            name="tenantSlug"
            placeholder="ej. conjunto-demo"
            value={form.tenantSlug}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Correo
          <input
            type="email"
            name="email"
            placeholder="porteria@demo.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;

