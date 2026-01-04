import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserAppRole = 'digger' | 'gigger' | 'admin';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: 'free' | 'pro' | 'premium';
  subscription_status: 'active' | 'inactive';
  subscription_end: string | null;
  product_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: UserAppRole[];
  activeRole: UserAppRole | null;
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  hasRole: (role: UserAppRole) => boolean;
  getRoles: () => UserAppRole[];
  switchRole: (role: UserAppRole) => Promise<void>;
  checkSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  // Backward compatibility
  isDigger: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserAppRole[]>([]);
  const [activeRole, setActiveRole] = useState<UserAppRole | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user roles from user_app_roles table
  const fetchUserRoles = async (userId: string): Promise<void> => {
    try {
      console.log('Fetching roles for user:', userId);
      
      // Try using the safe function first (if available)
      // Fallback to direct query if function doesn't exist
      let data, error;
      
      try {
        const { data: functionData, error: functionError } = await (supabase
          .rpc as any)('get_user_app_roles_safe', { _user_id: userId });
        
        if (!functionError && functionData) {
          data = functionData;
          error = null;
        } else {
          // RPC function might not exist (migrations not applied)
          // Don't fallback to direct query - it will cause 500 errors due to RLS recursion
          console.warn('RPC function get_user_app_roles_safe not available. Please apply database migrations.');
          data = null;
          error = functionError || new Error('RPC function not available - migrations may not be applied');
        }
      } catch (rpcError) {
        // Function doesn't exist - don't try direct query (causes 500 errors)
        console.warn('RPC function get_user_app_roles_safe failed. Migrations may not be applied:', rpcError);
        data = null;
        error = rpcError as any;
      }

      if (error) {
        console.error('Error fetching user roles:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // If RPC function doesn't exist, show helpful message
        if (error.message?.includes('RPC function not available') || 
            error.message?.includes('function') && error.message?.includes('does not exist')) {
          console.error('⚠️ CRITICAL: Database migrations not applied!');
          console.error('Please apply migrations: 20251230000004 and 20251230000005');
          console.error('See: FIX_500_ERROR_USER_APP_ROLES.md for instructions');
        }
        
        // Don't clear existing roles on error - keep what we have
        // This prevents blocking users if there's a temporary error
        return;
      }

      const roles = (data || []).map(r => r.app_role as UserAppRole);
      console.log('Fetched roles:', roles);
      setUserRoles(roles);

      // Set active role to the most recently used, or first role if none set
      if (roles.length > 0) {
        const mostRecentRole = roles[0];
        setActiveRole(mostRecentRole);
        
        // If user has digger role, check subscription
        if (roles.includes('digger')) {
          await checkSubscription();
        }
      } else {
        console.warn('No active roles found for user:', userId);
      }
    } catch (error) {
      console.error('Exception fetching user roles:', error);
      // Don't clear existing roles on error - keep what we have
      // This prevents blocking users if there's a temporary error
    }
  };

  // Check if user has a specific role
  const hasRole = (role: UserAppRole): boolean => {
    return userRoles.includes(role);
  };

  // Get all user roles
  const getRoles = (): UserAppRole[] => {
    return userRoles;
  };

  // Switch active role and update last_used_at
  const switchRole = async (role: UserAppRole): Promise<void> => {
    if (!user || !hasRole(role)) {
      toast.error('You do not have access to this role');
      return;
    }

    try {
      // Update last_used_at for this role (with error handling for 500 errors)
      const { error } = await supabase
        .from('user_app_roles')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('app_role', role as any);

      // Handle 500 errors gracefully - still switch role even if update fails
      if (error) {
        console.error('Error updating last_used_at:', error);
        // If it's a 500 error, still allow role switch (update is non-critical)
        if (error.code === '500' || error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
          console.warn('500 error updating last_used_at - proceeding with role switch anyway');
          // Continue with role switch even if update fails
        } else {
          // For other errors, still try to switch role but log the error
          console.warn('Error updating last_used_at, but proceeding with role switch:', error);
        }
      }

      // Always set active role (even if update failed)
      setActiveRole(role);
      
      // If switching to digger role, check subscription
      if (role === 'digger') {
        await checkSubscription();
      }

      // Only show success if update succeeded or was a 500 error (non-critical)
      if (!error || (error.code === '500' || error.message?.includes('500'))) {
        toast.success(`Switched to ${role} mode`);
      } else {
        toast.success(`Switched to ${role} mode (some features may be limited)`);
      }
    } catch (error) {
      console.error('Exception switching role:', error);
      // Even on exception, try to set the role locally
      setActiveRole(role);
      toast.success(`Switched to ${role} mode`);
    }
  };

  const checkSubscription = async () => {
    try {
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setSubscriptionStatus(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setActiveRole(null);
      setSubscriptionStatus(null);

      // Clear all Supabase-specific storage keys first
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Sign out with global scope
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;

      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      try {
        indexedDB.deleteDatabase('supabase');
        indexedDB.deleteDatabase('supabase-auth');
      } catch (e) {
        console.warn('Could not clear IndexedDB:', e);
      }

      toast.success('Signed out successfully');

      // Use replace instead of href to prevent back button issues
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
      
      // Force clear everything on error
      localStorage.clear();
      sessionStorage.clear();
      
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {  // CRITICAL: Remove async to prevent deadlock
        console.log('Auth state changed:', event, session);

        // Ignore SIGNED_OUT events to prevent re-authentication
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserRoles([]);
          setActiveRole(null);
          setSubscriptionStatus(null);
          return;
        }

        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);

        // Defer all Supabase calls with setTimeout to prevent blocking auth flow
        if (session?.user) {
          setTimeout(async () => {
            try {
              // Handle password recovery before other flows
              if (event === 'PASSWORD_RECOVERY') {
                console.log('Password recovery mode activated');
                return;
              }

              // Fetch user roles instead of checking user_type
              try {
                await fetchUserRoles(session.user.id);
              } catch (error) {
                console.error('Error fetching user roles:', error);
              }

              // Handle email confirmation callback
              if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
                // Clear the hash from URL
                window.history.replaceState(null, '', window.location.pathname);

                // Check if user has completed registration by checking for roles
                // Use RPC function to bypass RLS and avoid 500 errors
                let roles = null;
                let rolesError = null;
                
                try {
                  const { data: rpcRoles, error: rpcError } = await (supabase
                    .rpc as any)('get_user_app_roles_safe', { _user_id: session.user.id });
                  
                  if (!rpcError && rpcRoles) {
                    roles = (rpcRoles as any[]).map((r: any) => ({ app_role: r.app_role }));
                  } else {
                    rolesError = rpcError || new Error('RPC function not available');
                  }
                } catch (rpcException) {
                  rolesError = rpcException as any;
                }

                if (rolesError) {
                  console.error('Error checking roles:', rolesError);
                  // On error, default to dashboard (users signing in likely have roles)
                  toast.success('Welcome back! Successfully signed in.');
                  window.location.href = '/role-dashboard';
                  return;
                }

                if (!roles || roles.length === 0) {
                  // User hasn't selected roles yet, redirect to registration
                  toast.success('Email verified! Please complete your registration.');
                  window.location.href = '/register';
                } else {
                  // User has roles, redirect to dashboard
                  toast.success('Welcome back! Successfully signed in.');
                  window.location.href = '/role-dashboard';
                }
              }
            } catch (error) {
              console.error('Error in auth state handler:', error);
            }
          }, 0);
        } else {
          setUserRoles([]);
          setActiveRole(null);
          setSubscriptionStatus(null);
        }
      }
    );

    // Safety timeout to ensure loading always completes
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, 5000);

    // THEN check for existing session with error handling
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserRoles(session.user.id);
        }

        setLoading(false);
        clearTimeout(loadingTimeout);
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        setLoading(false);
        clearTimeout(loadingTimeout);
      });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Auto-refresh subscription status every 60 seconds for diggers
  useEffect(() => {
    if (!hasRole('digger') || !session) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [userRoles, session]);

  const value = {
    user,
    session,
    userRoles,
    activeRole,
    subscriptionStatus,
    loading,
    hasRole,
    getRoles,
    switchRole,
    checkSubscription,
    signOut,
    refreshRoles: async () => {
      if (user?.id) {
        await fetchUserRoles(user.id);
      }
    },
    // Backward compatibility: isDigger checks if user has digger role
    isDigger: userRoles.includes('digger'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
