import { ReactNode } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

interface ProtectedRouteProps {
  children: ReactNode;
  requireVerified?: boolean;
}

export const ProtectedRoute = ({ children, requireVerified = true }: ProtectedRouteProps) => {
  const { loading } = useProtectedRoute({ requireVerified });

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not loading and checks passed, render children
  return <>{children}</>;
};
