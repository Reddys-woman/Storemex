require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is missing from backend/.env");
}

if (!supabaseKey) {
    throw new Error(
        "SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY is missing from backend/.env"
    );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;