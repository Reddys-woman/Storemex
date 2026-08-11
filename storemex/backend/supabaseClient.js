require('dns').setDefaultResultOrder('ipv4first');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const customFetch = async (url, options = {}) => {
  const response = await axios({
    url,
    method: options.method || 'GET',
    headers: options.headers,
    data: options.body,
    validateStatus: () => true,
  });

  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    headers: {
      get: (name) => response.headers[name.toLowerCase()] || null,
    },
    json: async () => response.data,
    text: async () => JSON.stringify(response.data),
  };
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { global: { fetch: customFetch } }
);

module.exports = supabase;