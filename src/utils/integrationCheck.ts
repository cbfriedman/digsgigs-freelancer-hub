/**
 * Integration Validation Utility
 * Checks if all required integrations are properly configured
 */

interface IntegrationStatus {
  name: string;
  configured: boolean;
  error?: string;
  required: boolean;
}

export const checkIntegrations = async (): Promise<IntegrationStatus[]> => {
  const statuses: IntegrationStatus[] = [];

  // Check Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  statuses.push({
    name: 'Supabase',
    configured: !!(supabaseUrl && supabaseKey),
    error: !supabaseUrl || !supabaseKey 
      ? 'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set'
      : undefined,
    required: true,
  });

  // Check Stripe (optional but recommended)
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  statuses.push({
    name: 'Stripe',
    configured: !!stripeKey,
    error: !stripeKey ? 'VITE_STRIPE_PUBLISHABLE_KEY is not set (payments will not work)' : undefined,
    required: false,
  });

  // Check Mapbox (optional)
  const mapboxKey = import.meta.env.VITE_MAPBOX_PUBLIC_KEY;
  statuses.push({
    name: 'Mapbox',
    configured: !!mapboxKey,
    error: !mapboxKey ? 'VITE_MAPBOX_PUBLIC_KEY is not set (mapping features will not work)' : undefined,
    required: false,
  });

  return statuses;
};

export const logIntegrationStatus = async () => {
  const statuses = await checkIntegrations();
  const critical = statuses.filter(s => s.required && !s.configured);
  const warnings = statuses.filter(s => !s.required && !s.configured);

  if (critical.length > 0) {
    console.error('❌ Critical integrations not configured:');
    critical.forEach(s => {
      console.error(`  - ${s.name}: ${s.error}`);
    });
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Optional integrations not configured:');
    warnings.forEach(s => {
      console.warn(`  - ${s.name}: ${s.error}`);
    });
  }

  if (critical.length === 0 && warnings.length === 0) {
    console.log('✅ All integrations configured');
  }

  return statuses;
};


