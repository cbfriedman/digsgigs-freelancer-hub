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
  const [hasCheckedDatabaseRoles, setHasCheckedDatabaseRoles] = useState(false);

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

    // CRITICAL: Check if we're in sign-in OTP flow - if so, don't redirect
    // This prevents redirecting authenticated users who are in the middle of OTP verification
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    if (isInOtpFlow && redirectIfAuthenticated) {
      // User is in OTP flow - don't redirect, let them complete verification
      return;
    }

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
      
      // If userRoles is empty, it might be because roles haven't loaded yet
      // Check database directly to avoid false redirects
      // Only do this check once to avoid infinite loops
      if (!hasCheckedDatabaseRoles) {
        setHasCheckedDatabaseRoles(true);
        
        const checkRolesOnce = async () => {
          try {
            const { data: roles } = await supabase
              .from('user_app_roles')
              .select('app_role')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .limit(1);
            
            if (roles && roles.length > 0) {
              // User has roles, so they're verified - allow access
              // Don't redirect, just return (component will re-render with updated state)
              return;
            }
            
            // No roles found - user needs to complete registration
            // Only redirect if we're not already on the register page
            if (window.location.pathname !== '/register') {
              toast.error('Please verify your email to access this page. Check your inbox for the confirmation link.');
              navigate('/register');
            }
          } catch (error) {
            console.error('Error checking roles in database:', error);
            // On error, allow access (better than blocking)
          }
        };
        
        // Wait a bit for roles to load, then check database
        setTimeout(() => {
          checkRolesOnce();
        }, 1000);
        
        // Don't redirect immediately - wait for database check
        return;
      }
      
      // Already checked database and no roles found - redirect to register
      // Only redirect if we're not already on the register page
      if (window.location.pathname !== '/register') {
        toast.error('Please verify your email to access this page. Check your inbox for the confirmation link.');
        navigate('/register');
      }
      return;
    }
  }, [user, loading, navigate, requireVerified, redirectTo, redirectIfAuthenticated, hasCheckedRoles, userHasRoles, userRoles, hasCheckedDatabaseRoles]);

  return { user, loading, isVerified: !!user?.email_confirmed_at };
};
