/**
 * Ayana AI Chatbot Server
 * 
 * Main entry point for the application
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const apiRoutes = require('./api');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
// Tambahkan array port alternatif
const ALTERNATIVE_PORTS = [3001, 3002, 8080, 8000];

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files - frontend app
app.use(express.static(path.join(__dirname, '../')));

// Serve component HTML files for frontend JavaScript
app.use('/components', express.static(path.join(__dirname, '../../views/components')));

// Load API Keys dari file JSON
let konciadalah = {};
try {
  konciadalah = JSON.parse(fs.readFileSync(path.join(__dirname, '../../Konci/konci_adalah.json')));

  // Update API config
  konciadalah.gemini = {
    konci_rahasia: process.env.GEMINI_API_KEY || konciadalah.gemini.konci_rahasia,
    kuncine_url: "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent"
  };

  konciadalah.deepseek = {
    konci_rahasia: process.env.DEEPSEEK_API_KEY || konciadalah.deepseek.konci_rahasia,
    kuncine_url: "https://api.deepseek.com/v1/chat/completions"
  };

  konciadalah.groq = {
    konci_rahasia: process.env.GROQ_API_KEY || konciadalah.groq.konci_rahasia,
    kuncine_url: "https://api.groq.com/openai/v1/chat/completions"
  };
} catch (err) {
  console.log('No konci_adalah.json file found or invalid format.');
}

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Serve HTML files from views directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../views', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong'
  });
});

// Fungsi untuk mencoba port dan port alternatif jika gagal
function startServer(port) {
  const server = app.listen(port)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} sudah digunakan. Mencoba port alternatif...`);
        if (ALTERNATIVE_PORTS.length > 0) {
          const nextPort = ALTERNATIVE_PORTS.shift();
          startServer(nextPort);
        } else {
          console.error('Semua port alternatif sudah digunakan. Silakan hentikan aplikasi lain yang menggunakan port tersebut atau tentukan port manual dengan PORT=xxxx npm start');
          process.exit(1);
        }
      } else {
        console.error('Error starting server:', err);
        process.exit(1);
      }
    })
    .on('listening', () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Open http://localhost:${port} in your browser`);
    });
}

// Start server dengan mencoba port-port yang tersedia
startServer(PORT); 