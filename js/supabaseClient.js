import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://nbcjttbzvhkivzmcckcz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lQS5xwOmHQgndNF4fiLhlw_WCYja1ei';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
