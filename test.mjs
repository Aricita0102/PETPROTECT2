import fs from 'fs';

const envContent = fs.readFileSync('c:/xampp/htdocs/PETPROTECT/.env', 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

fetch(`${url}/rest/v1/pacientes?select=nombre,foto_url`, {
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
