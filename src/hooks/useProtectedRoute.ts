import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'gigger' | 'digger' | 'admin';

interface UseProtectedRouteOptions {
  requireVerified?: boolean;
  requireRole?: AppRole;
  redirectTo?: string;
  redirectIfAuthenticated?: boolean;
}

export const useProtectedRoute = (options: UseProtectedRouteOptions = {}) => {
  const {
    requireVerified = false, // Changed default: allow unverified users to access platform
    requireRole,
    redirectTo = '/register',
    redirectIfAuthenticated = false,
  } = options;

  const { user, loading, userRoles, rolesFetched, activeRole } = useAuth();
  const navigate = useNavigate();
  const [hasCheckedRoles, setHasCheckedRoles] = useState(false);
  const [userHasRoles, setUserHasRoles] = useState(false);
  const [hasCheckedDatabaseRoles, setHasCheckedDatabaseRoles] = useState(false);
  
  // Check if user is completing registration (coming from dashboard with no roles)
  const isCompletingRegistration = new URLSearchParams(window.location.search).get('complete') === 'true';
  
  // Check if user just completed registration (bypass role check temporarily)
  const justRegistered = new URLSearchParams(window.location.search).get('registered') === 'true';

  // Check if user has roles (for register page logic)
  useEffect(() => {
    if (user && redirectIfAuthenticated && !hasCheckedRoles) {
      const checkRoles = async () => {
        try {
          // Use RPC function to bypass RLS and avoid 500 errors
          let hasRoles = false;
          
          try {
            const { data: rpcRoles, error: rpcError } = await (supabase
              .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
            
            if (!rpcError && rpcRoles && (rpcRoles as any[]).length > 0) {
              hasRoles = true;
            } else if (rpcError) {
              // On error, assume user has roles (safer than blocking access)
              console.warn('RPC function error (non-fatal):', rpcError);
              hasRoles = true;
            }
          } catch (rpcException) {
            // RPC function might not exist, assume user has roles to prevent blocking
            console.warn('RPC function not available:', rpcException);
            hasRoles = true;
          }
          
          setUserHasRoles(hasRoles);
          setHasCheckedRoles(true);
        } catch (err) {
          console.error('Error checking roles:', err);
          // On error, assume user has roles to prevent blocking
          setUserHasRoles(true);
          setHasCheckedRoles(true);
        }
      };
      checkRoles();
    }
  }, [user, redirectIfAuthenticated, hasCheckedRoles]);

  useEffect(() => {
    if (loading) return;

    // CRITICAL: Check if we're in sign-in OTP flow - if so, don't redirect
    // This prevents redirecting authenticated users who are in the middle of OTP verification
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    if (isInOtpFlow) {
      // User is in OTP flow - don't redirect, let them complete verification
      // This applies to both redirectIfAuthenticated and requireVerified checks
      return;
    }

    // For register page: check if user has roles (from AuthContext or direct check)
    // Priority: userRoles from AuthContext > direct database check
    // BUT: Skip redirect if user is completing registration (has no roles) OR just registered
    if (redirectIfAuthenticated && user && !isCompletingRegistration && !justRegistered) {
      // First check: If userRoles are already loaded from AuthContext, use them immediately
      if (userRoles && userRoles.length > 0) {
        console.log('User has roles from AuthContext, redirecting:', userRoles);
        navigate('/role-dashboard');
        return;
      }
      
      // Second check: If email is verified and we've checked database
      if (user.email_confirmed_at && hasCheckedRoles && userHasRoles) {
        console.log('User has roles from database check, redirecting');
        navigate('/role-dashboard');
        return;
      }
      
      // If verified but no roles found, let them stay on register to complete role setup
      if (user.email_confirmed_at && hasCheckedRoles && !userHasRoles) {
        // No roles - stay on register page
        return;
      }
    }

    // Allow unverified authenticated users to stay on register page for verification completion
    // OR if they're completing registration (coming from dashboard) OR just registered
    if (redirectIfAuthenticated && user && (!user.email_confirmed_at || isCompletingRegistration || justRegistered)) {
      // Don't redirect - let them complete verification or registration
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

    // Require specific role (e.g. only giggers can access My Gigs)
    if (requireRole && user && rolesFetched && Array.isArray(userRoles)) {
      const hasRequiredRole = userRoles.includes(requireRole);
      // For My Gigs: user must have gigger role AND be in Gigger mode (not Digger mode)
      const mustBeInGiggerMode = requireRole === 'gigger';
      const isInCorrectMode = !mustBeInGiggerMode || activeRole === 'gigger';

      if (!hasRequiredRole) {
        const message = requireRole === 'gigger'
          ? 'My Gigs is for clients. Switch to Gigger or sign up as a client to post and manage projects.'
          : requireRole === 'digger'
            ? 'This page is for Diggers. Switch to Digger mode in the dashboard.'
            : 'You don\'t have access to this page.';
        toast.error(message);
        navigate('/role-dashboard');
        return;
      }
      if (mustBeInGiggerMode && !isInCorrectMode) {
        toast.info('My Gigs is for client (Gigger) mode. Switch to Gigger in the menu to manage your projects.');
        navigate('/role-dashboard');
        return;
      }
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
            // Use RPC function to bypass RLS and avoid 500 errors
            let roles = null;
            let rolesError = null;
            
            try {
              const { data: rpcRoles, error: rpcError } = await (supabase
                .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
              
              if (!rpcError && rpcRoles) {
                roles = (rpcRoles as any[]).map((r: any) => ({ app_role: r.app_role }));
              } else {
                // RPC function might not exist (migrations not applied)
                // Don't fallback to direct query - it will cause 500 errors
                console.warn('RPC function get_user_app_roles_safe not available. Please apply database migrations.');
                rolesError = rpcError || new Error('RPC function not available');
              }
            } catch (rpcException) {
              // RPC function doesn't exist - don't try direct query (causes 500 errors)
              console.warn('RPC function get_user_app_roles_safe failed. Migrations may not be applied:', rpcException);
              rolesError = rpcException as any;
            }
            
            if (rolesError) {
              console.error('Error checking roles:', rolesError);
              // On error, allow access (better than blocking registered users)
              return;
            }
            
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
  }, [user, loading, navigate, requireVerified, requireRole, redirectTo, redirectIfAuthenticated, hasCheckedRoles, userHasRoles, userRoles, rolesFetched, hasCheckedDatabaseRoles]);

  return { user, loading, userRoles, rolesFetched, isVerified: !!user?.email_confirmed_at };
};
