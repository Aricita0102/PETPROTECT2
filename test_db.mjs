import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('c:/xampp/htdocs/PETPROTECT/.env', 'utf-8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('estudios_clinicos').select('*').limit(1);
  if (error) {
    console.error("Error connecting to estudios_clinicos:", error.message);
  } else {
    console.log("Table estudios_clinicos exists. Rows found:", data.length);
  }
}

check();
