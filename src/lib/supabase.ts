import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://jfahhjxzqrhobxgthxnu.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_95CpMMDjcF6msJ2SltKELg_TUOvUJfu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
