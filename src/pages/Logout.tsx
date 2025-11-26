import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const signOut = async () => {
      // Clear Supabase-specific keys first
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      await supabase.auth.signOut({ scope: 'global' });
      
      localStorage.clear();
      sessionStorage.clear();
      
      try {
        indexedDB.deleteDatabase('supabase');
        indexedDB.deleteDatabase('supabase-auth');
      } catch (e) {
        console.warn('Could not clear IndexedDB:', e);
      }
      
      navigate('/');
    };
    signOut();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Signing out...</p>
    </div>
  );
}
