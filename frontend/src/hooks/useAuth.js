import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated === null) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}