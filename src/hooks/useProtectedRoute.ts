import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseProtectedRouteOptions {
  requireVerified?: boolean;
  redirectTo?: string;
  redirectIfAuthenticated?: boolean;
}

export const useProtectedRoute = (options: UseProtectedRouteOptions = {}) => {
  const {
    requireVerified = true,
    redirectTo = '/register',
    redirectIfAuthenticated = false,
  } = options;

  const { user, loading, userRoles } = useAuth();
  const navigate = useNavigate();
  const [hasCheckedRoles, setHasCheckedRoles] = useState(false);
  const [userHasRoles, setUserHasRoles] = useState(false);

  // Check if user has roles (for register page logic)
  useEffect(() => {
    if (user && redirectIfAuthenticated && !hasCheckedRoles) {
      const checkRoles = async () => {
        const { data, error } = await supabase
          .from('user_app_roles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        setUserHasRoles(!error && data && data.length > 0);
        setHasCheckedRoles(true);
      };
      checkRoles();
    }
  }, [user, redirectIfAuthenticated, hasCheckedRoles]);

  useEffect(() => {
    if (loading) return;

    // For register page: only redirect verified users who ALREADY have roles
    if (redirectIfAuthenticated && user && user.email_confirmed_at && hasCheckedRoles) {
      if (userHasRoles) {
        navigate('/role-dashboard');
        return;
      }
      // If verified but no roles, let them stay on register to complete role setup
      return;
    }

    // Allow unverified authenticated users to stay on register page for verification completion
    if (redirectIfAuthenticated && user && !user.email_confirmed_at) {
      // Don't redirect - let them complete verification
      return;
    }

    // Require authentication
    // Don't redirect if we're on the register page in sign-in mode (OTP flow)
    const isRegisterPage = window.location.pathname === '/register';
    const isSignInMode = new URLSearchParams(window.location.search).get('mode') === 'signin';
    
    if (!redirectIfAuthenticated && !user && !(isRegisterPage && isSignInMode)) {
      toast.error('Please log in to access this page');
      navigate(redirectTo);
      return;
    }

    // Require email verification (but allow access to register page for unverified users)
    // Note: For OTP-based sign-in, email_confirmed_at may be set via admin API, so we check if user exists and has roles
    if (requireVerified && user && !user.email_confirmed_at) {
      // Check if user has roles - if they do, they've completed registration and OTP verification
      // This handles the case where email_confirmed_at might not be immediately updated after OTP verification
      if (userRoles && userRoles.length > 0) {
        // User has roles, so they're verified - allow access
        return;
      }
      toast.error('Please verify your email to access this page. Check your inbox for the confirmation link.');
      navigate('/register');
      return;
    }
  }, [user, loading, navigate, requireVerified, redirectTo, redirectIfAuthenticated, hasCheckedRoles, userHasRoles, userRoles]);

  return { user, loading, isVerified: !!user?.email_confirmed_at };
};
