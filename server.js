// server.js
// Local development server. Mirrors Vercel's routing so `npm start` behaves
// the same as the production deployment: static site from /src, API from /api.
require('dotenv').config();

const express = require('express');
const path = require('path');
const weatherHandler = require('./api/weather');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/weather', (req, res) => weatherHandler(req, res));

app.use(express.static(path.join(__dirname, 'src')));

// Catch-all for any other GET request: serve the SPA shell.
// (Express 5 removed bare '*' route patterns, so this uses middleware instead.)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Weather dashboard running at http://localhost:${PORT}`);
});
