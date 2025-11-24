import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserAppRole = 'digger' | 'gigger' | 'telemarketer' | 'admin';

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
  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_app_roles')
        .select('app_role, last_used_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const roles = (data || []).map(r => r.app_role as UserAppRole);
      setUserRoles(roles);

      // Set active role to the most recently used, or first role if none set
      if (roles.length > 0) {
        const mostRecentRole = roles[0];
        setActiveRole(mostRecentRole);
        
        // If user has digger role, check subscription
        if (roles.includes('digger')) {
          checkSubscription().catch((error) => {
            console.error('Error checking subscription:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles([]);
      setActiveRole(null);
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
      // Update last_used_at for this role
      const { error } = await supabase
        .from('user_app_roles')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('app_role', role as any);

      if (error) throw error;

      setActiveRole(role);
      
      // If switching to digger role, check subscription
      if (role === 'digger') {
        await checkSubscription();
      }

      toast.success(`Switched to ${role} mode`);
    } catch (error) {
      console.error('Error switching role:', error);
      toast.error('Failed to switch role');
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setActiveRole(null);
      setSubscriptionStatus(null);
      
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user roles instead of checking user_type
          await fetchUserRoles(session.user.id).catch((error) => {
            console.error('Error fetching user roles:', error);
          });

          // Handle email confirmation callback
          if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);

            // Check if user has completed registration by checking for roles
            const { data: roles } = await supabase
              .from('user_app_roles')
              .select('app_role')
              .eq('user_id', session.user.id);

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
        } else {
          setUserRoles([]);
          setActiveRole(null);
          setSubscriptionStatus(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRoles(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    // Backward compatibility: isDigger checks if user has digger role
    isDigger: userRoles.includes('digger'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
