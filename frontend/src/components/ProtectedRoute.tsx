import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[]; 
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, isInitializing } = useAuthContext();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="page page--center">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
    
  // Si la ruta pide roles específicos y el usuario no los tiene, lo saca
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/residents" replace />; 
  }

  return <Outlet />;
};
  
export default ProtectedRoute;