const path = require('path');
const express = require('express');
const supabase = require('./supabaseClient');
const { smartScan } = require('./ai/smartScan');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.send('SmartPantry backend is running!');
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
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json({ message: 'Signup successful', user: data.user });
});

const PORT = 3000;
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json({ message: 'Login successful', user: data.user, session: data.session });
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});