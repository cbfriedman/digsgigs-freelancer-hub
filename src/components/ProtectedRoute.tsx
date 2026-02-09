import { ReactNode } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

interface ProtectedRouteProps {
  children: ReactNode;
  requireVerified?: boolean;
  /** When set, only users with this role can access (e.g. 'gigger' for My Gigs). */
  requireRole?: 'gigger' | 'digger' | 'admin';
}

export const ProtectedRoute = ({ children, requireVerified = false, requireRole }: ProtectedRouteProps) => {
  const { loading, rolesFetched } = useProtectedRoute({ requireVerified, requireRole });

  // Show spinner while checking auth or (when role required) while roles are loading
  const stillLoading = loading || (requireRole && !rolesFetched);
  if (stillLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not loading and checks passed, render children
  return <>{children}</>;
};
