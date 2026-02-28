import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sahuyzvmsbmpejzxrkly.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sMRJavVGKgJvnPdcT8L6AA_5o4P3Syv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
