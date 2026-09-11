import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../loading-screen/LoadingScreen';

export function ProtectedRoute({ authenticated, guest, component: Component, ...rest }) {
  const { isAuthenticated } = useAuth();


  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  if (authenticated && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (guest && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <Component {...rest} />;
}