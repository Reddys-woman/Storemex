const path = require('path');
const express = require('express');
const supabase = require('./supabaseClient');
const { smartScan, lookupBarcode } = require('./ai/smartScan');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.send('SmartPantry backend is running!');
});

// ---------- AUTH ----------

// Signup
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json({ message: 'Signup successful', user: data.user });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json({ message: 'Login successful', user: data.user, session: data.session });
});

// ---------- AI SCAN (Yamini) ----------

// Direct Barcode Lookup API (Zero Gemini Quota)
app.get('/api/barcode/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await lookupBarcode(code);
    if (result) {
      return res.json({ success: true, data: result });
    }
    return res.status(404).json({ success: false, error: 'Product not found in Open Food Facts database' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// AI Product & Barcode Scan API
app.post('/api/scan', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    const result = await smartScan(image);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Scan API Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ---------- PRODUCTS ----------

// Add a new product
app.post('/products', async (req, res) => {
  const { user_id, name, brand, category, quantity, unit, expiry_date, ai_confidence } = req.body;

  const { data, error } = await supabase
    .from('products')
    .insert([{ user_id, name, brand, category, quantity, unit, expiry_date, ai_confidence }])
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json({ message: 'Product added', product: data[0] });
});

// Get all products for a user, with freshness/quantity status
app.get('/products/:user_id', async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const productsWithStatus = data.map(product => {
    const daysLeft = (new Date(product.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);

    let freshness_status = 'fresh';
    if (daysLeft <= 1) freshness_status = 'critical';
    else if (daysLeft <= 4) freshness_status = 'expiring';

    const quantity_status = product.quantity <= 2 ? 'low' : 'normal';

    return { ...product, freshness_status, quantity_status };
  });

  res.status(200).json({ products: productsWithStatus });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});