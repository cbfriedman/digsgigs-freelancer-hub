import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useProxyEmail(userId: string | null) {
  const [proxyEmail, setProxyEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProxyEmail(null);
      return;
    }

    const fetchProxyEmail = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-proxy-email', {
          body: { user_id: userId }
        });

        if (fnError) throw fnError;
        
        if (data?.proxy_email) {
          setProxyEmail(data.proxy_email);
        }
      } catch (err: any) {
        console.error("Error fetching proxy email:", err);
        setError(err.message || "Failed to fetch proxy email");
      } finally {
        setLoading(false);
      }
    };

    fetchProxyEmail();
  }, [userId]);

  return { proxyEmail, loading, error };
}
