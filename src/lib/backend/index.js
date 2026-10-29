import { createSupabaseBackend } from './supabaseBackend.js';
import { createDemoBackend } from './demoBackend.js';
import { SHOWCASE_ITEMS } from './demoData.js';

/**
 * Chooses the backend from build-time configuration ONLY. A production database error never
 * switches the site to demo data: if Supabase is configured, errors are shown as errors.
 */
export function backendFromEnv(env = import.meta.env) {
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (url && anonKey) return { backend: createSupabaseBackend({ url, anonKey }) };
  if (env.VITE_DEMO_MODE === 'true') {
    if (env.VITE_DEMO_SHOWCASE === 'true') {
      return { backend: createDemoBackend({ items: SHOWCASE_ITEMS, latencyMs: 120, lastPublishedAt: new Date().toISOString() }) };
    }
    return { backend: createDemoBackend({ latencyMs: 150 }) };
  }
  return { backend: null, configError: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or VITE_DEMO_MODE=true for the demo.' };
}
