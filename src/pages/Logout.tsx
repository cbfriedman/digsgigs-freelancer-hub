import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const signOut = async () => {
      await supabase.auth.signOut({ scope: 'global' });
      localStorage.clear();
      sessionStorage.clear();
      
      try {
        indexedDB.deleteDatabase('supabase');
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
