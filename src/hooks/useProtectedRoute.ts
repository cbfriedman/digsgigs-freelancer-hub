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

  const { user, loading } = useAuth();
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
    if (!redirectIfAuthenticated && !user) {
      toast.error('Please log in to access this page');
      navigate(redirectTo);
      return;
    }

    // Require email verification (but allow access to register page for unverified users)
    if (requireVerified && user && !user.email_confirmed_at) {
      toast.error('Please verify your email to access this page. Check your inbox for the confirmation link.');
      navigate('/register');
      return;
    }
  }, [user, loading, navigate, requireVerified, redirectTo, redirectIfAuthenticated, hasCheckedRoles, userHasRoles]);

  return { user, loading, isVerified: !!user?.email_confirmed_at };
};
