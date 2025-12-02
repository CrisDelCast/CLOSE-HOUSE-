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
  tenantId: string | null;
  tenantSlug: string | null;
}

interface AuthContextValue extends AuthState {
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

const initialState: AuthState = {
  user: null,
  token: null,
  tenantId: null,
  tenantSlug: null,
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
        setState(parsed);
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    setIsInitializing(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginRequest(payload);
    const newState: AuthState = {
      user: response.user,
      token: response.accessToken,
      tenantId: response.user.tenantId,
      tenantSlug: payload.tenantSlug,
    };

    setState(newState);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
  }, []);

  const logout = useCallback(() => {
    setState(initialState);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isInitializing,
      login,
      logout,
    }),
    [state, isInitializing, login, logout],
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

