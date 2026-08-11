const express = require('express');
const supabase = require('./supabaseClient');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SmartPantry backend is running!');
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