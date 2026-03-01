import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<'admin' | 'delivery' | 'employee'>;
  redirectTo?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/login'
}) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Não está logado, redireciona para login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!userRole || !allowedRoles.includes(userRole as 'admin' | 'employee' | 'delivery')) {
    // Está logado mas não tem o papel permitido
    // Redireciona baseado no papel que tem
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (userRole === 'delivery') {
      return <Navigate to="/delivery" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Tem o papel permitido, renderiza o conteúdo
  return <>{children}</>;
};