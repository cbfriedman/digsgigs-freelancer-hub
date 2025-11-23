import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseProtectedRouteOptions {
  requireVerified?: boolean;
  redirectTo?: string;
  redirectIfAuthenticated?: boolean;
}

export const useProtectedRoute = (options: UseProtectedRouteOptions = {}) => {
  const {
    requireVerified = true,
    redirectTo = '/auth',
    redirectIfAuthenticated = false,
  } = options;

  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Redirect VERIFIED authenticated users away (for pages like register/login)
    if (redirectIfAuthenticated && user && user.email_confirmed_at) {
      navigate('/role-dashboard');
      return;
    }

    // Require authentication
    if (!redirectIfAuthenticated && !user) {
      toast.error('Please log in to access this page');
      navigate(redirectTo);
      return;
    }

    // Require email verification (but allow access to register page for unverified users)
    if (requireVerified && user && !user.email_confirmed_at) {
      toast.error('Please verify your email to access this page. Check your inbox for the confirmation link.');
      navigate('/auth');
      return;
    }
  }, [user, loading, navigate, requireVerified, redirectTo, redirectIfAuthenticated]);

  return { user, loading, isVerified: !!user?.email_confirmed_at };
};
