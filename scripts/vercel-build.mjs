// Vercel runs `npm run vercel-build` instead of `npm run build` when it exists.
// With Supabase variables set in the Vercel project, this is the normal production build.
// Without them, it builds the clearly labeled client preview (showcase demo data).
import { execSync } from 'node:child_process';

const live = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
console.log(live ? 'Supabase configured: building the live site.' : 'No Supabase variables: building the client preview (demo data).');
execSync(live ? 'vite build' : 'vite build --mode demo', { stdio: 'inherit' });
