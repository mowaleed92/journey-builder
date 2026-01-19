import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('⚠️ Supabase credentials not configured. Using placeholder values. Database features will not work.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
