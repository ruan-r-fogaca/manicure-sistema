import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
