import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { loginRequest } from '../api/auth';
import { AUTH_STORAGE_KEY } from '../constants/storage';
import type { LoginPayload, User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  tenantId: string | null; // El tenant base/original del usuario
  tenantSlug: string | null;
  activeTenantId: string | null; // 👁️ El tenant del conjunto que se está visualizando activamente
}

interface AuthContextValue extends AuthState {
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  logout: () => void;
  switchTenant: (tenantId: string) => void; // 🔄 Función para cambiar de conjunto (Superadmin)
}

const initialState: AuthState = {
  user: null,
  token: null,
  tenantId: null,
  tenantSlug: null,
  activeTenantId: null,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(initialState);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthState;
        
        // Si por alguna razón al recuperar el estado no hay un activeTenantId pero sí un tenantId base, 
        // lo inicializamos con su propio conjunto.
        if (parsed.tenantId && !parsed.activeTenantId) {
          parsed.activeTenantId = parsed.tenantId;
        }
        
        setState(parsed);
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    setIsInitializing(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    const response = await loginRequest(payload);
    const newState: AuthState = {
      user: response.user,
      token: response.accessToken,
      tenantId: response.user.tenantId,
      tenantSlug: payload.tenantSlug,
      activeTenantId: response.user.tenantId,
    };

    setState(newState);
    
    // 👈 AQUÍ ESTABA EL DETALLE: Guardamos tanto el estado global como el token individual
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
      window.localStorage.setItem('token', response.accessToken); // 👈 ¡Esta línea faltaba para Axios!
    }

    return response.user;
  }, []);

  const logout = useCallback(() => {
    setState(initialState);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem('token'); // 👈 Limpiamos también el token al salir
    }
  }, []);

  // 🔄 Cambia de conjunto guardando el cambio en el estado global y persistencia
  const switchTenant = useCallback((tenantId: string) => {
    setState((prev) => {
      if (!prev.user) return prev; // Seguridad por si no hay sesión activa

      const updatedState: AuthState = {
        ...prev,
        activeTenantId: tenantId,
      };

      // Guardamos en localStorage para persistir el cambio al recargar pantalla
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedState));
      }

      return updatedState;
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isInitializing,
      login,
      logout,
      switchTenant,
    }),
    [state, isInitializing, login, logout, switchTenant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  }

  return ctx;
};