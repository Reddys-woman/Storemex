const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Check local .env, ai/.env, and root .env
[
  path.join(__dirname, '.env'),
  path.join(__dirname, 'ai', '.env'),
  path.join(__dirname, '..', '.env')
].forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;