/**
 * AI Service
 * 
 * Handles all interactions with AI models
 * Implements fallback system between different AI providers
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { buildModelPayload } = require('./modelUtils');

// Load API Keys dari file JSON
let konciadalah = {};
try {
  konciadalah = JSON.parse(fs.readFileSync(path.join(__dirname, '../../Konci/konci_adalah.json')));
} catch (err) {
  logger.error('Error loading konci_adalah.json:', err);
}

/**
 * Call AI model with fallback support
 * @param {string} model Primary model to use (or 'auto' for fallback)
 * @param {string} message User message
 * @param {string} systemPrompt System instructions
 * @param {number} temperature Temperature value (0-100)
 * @param {number} responseLength Response length setting (1-3)
 * @param {string} language Preferred language
 * @param {string} image Optional image path
 * @param {Array} chatHistory Optional chat history for context
 * @returns {Promise<object>} AI response
 */
async function callAI(model, message, systemPrompt, temperature, responseLength, language, image, chatHistory = []) {
  // Model fallback order if 'auto' is selected
  const modelOrder = model === 'auto' ? ['gemini', 'deepseek', 'openai', 'groq'] : [model];
  
  let response = null;
  let lastError = null;
  
  // Try each model in order until success
  for (const currentModel of modelOrder) {
    try {
      console.log(`Trying model: ${currentModel}`);
      
      // Convert parameters
      const temp = temperature / 100; // 0-100 to 0-1
      
      // Set max tokens based on response length
      let maxTokens;
      switch (responseLength) {
        case 1:
          maxTokens = 100;
          break;
        case 2:
          maxTokens = 500;
          break;
        case 3:
          maxTokens = 1500;
          break;
        default:
          maxTokens = 500;
      }

      // Tambahkan instruksi untuk memformat respons dalam paragraf pada system prompt
      let enhancedSystemPrompt = systemPrompt || '';
      
      // Tambahkan instruksi formatting paragraf jika tidak ada dalam prompt
      if (!enhancedSystemPrompt.includes('paragraf') && !enhancedSystemPrompt.includes('paragraph')) {
        enhancedSystemPrompt += "\n\nRespons singkat dan to the point. Jangan beri penjelasan panjang atau rekomendasi kecuali diminta dengan kata seperti 'detail', 'jelaskan lebih lengkap', 'rekomendasi', atau 'saya mau versi panjang'. Kalau diminta detail, jawab dengan penjelasan lengkap, jelas, dan tidak terpotong. Jangan gunakan kata-kata berlebihan seperti 'as expected', 'TBH', 'I mean', 'you know', 'literally', 'actually', 'basically', 'BTW', 'FYI', 'So', 'Anyway', dll. Jangan tambahkan percakapan seperti 'Master', 'gimana menurut lo', 'semoga membantu', dll. Berikan hanya informasi faktual dalam poin-poin singkat. Jangan pernah mendeklarasikan diri sebagai AI, tetaplah anonim dan langsung berikan informasi tanpa memperkenalkan diri.";
      }
      
      // Call appropriate model
      switch (currentModel) {
        case 'gemini':
          response = await callGemini(message, enhancedSystemPrompt, temp, maxTokens, language, image, chatHistory);
          break;
        case 'deepseek':
          response = await callDeepseek(message, enhancedSystemPrompt, temp, maxTokens, language, chatHistory);
          break;
        case 'openai':
          response = await callOpenAI(message, enhancedSystemPrompt, temp, maxTokens, language, chatHistory);
          break;
        case 'groq':
          response = await callGroq(message, enhancedSystemPrompt, temp, maxTokens, language, chatHistory);
          break;
        default:
          throw new Error(`Unknown model: ${currentModel}`);
      }
      
      console.log(`Success with model: ${currentModel}`);
      break;
    } catch (err) {
      console.error(`Error with model ${currentModel}:`, err.message);
      lastError = err;
    }
  }
  
  if (response) {
    // Pastikan respons dalam bentuk paragraf yang rapi
    if (response.text) {
      response.text = formatResponseToParagraphs(response.text);
    }
    return response;
  } else {
    throw new Error(lastError?.message || 'All AI models failed');
  }
}

/**
 * Format respons AI menjadi paragraf yang rapi
 * @param {string} text Teks respons dari AI
 * @returns {string} Teks yang diformat menjadi paragraf
 */
function formatResponseToParagraphs(text) {
  if (!text) return '';
  
  // Bersihkan whitespace berlebih
  text = text.trim();
  
  // Hapus tanda ' \- ' di awal paragraf atau list
  text = text.replace(/^\s*\\?-\s+/gm, '');
  text = text.replace(/\n\s*\\?-\s+/g, '\n');
  
  // Split berdasarkan baris kosong atau line break
  let paragraphs = text.split(/\n\s*\n/);
  
  // Hapus pemecahan paragraf panjang menjadi pendek (tidak perlu untuk respons singkat)
  // dan hanya memastikan format HTML yang benar
  
  // Pastikan semua paragraf dibungkus dengan tag <p>
  const wrappedParagraphs = paragraphs
    .map(p => p.trim())
    .filter(p => p)  // Hapus paragraf kosong
    .map(p => `<p>${p}</p>`)
    .join('');
  
  return wrappedParagraphs;
}

/**
 * Call Gemini API
 * @param {string} message User message
 * @param {string} systemPrompt System instructions
 * @param {number} temperature Temperature (0-1)
 * @param {number} maxTokens Max tokens to generate
 * @param {string} language Preferred language
 * @param {string} base64Image Optional image data as base64 string
 * @param {Array} chatHistory Optional chat history for context
 * @returns {Promise<object>} Response with text and model info
 */
async function callGemini(message, systemPrompt, temperature, maxTokens, language, base64Image, chatHistory = []) {
  const config = konciadalah.gemini;
  if (!config.konci_rahasia) throw new Error('Gemini konci not configured');
  
  const url = `${config.kuncine_url}?key=${config.konci_rahasia}`;
  
  // Perbaikan format untuk Gemini API yang tidak mendukung "system" role
  const contents = [];
  
  // Tambahkan history percakapan jika ada
  if (chatHistory && chatHistory.length > 0) {
    // Struktur khusus untuk Gemini
    for (const chat of chatHistory) {
      if (chat.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: chat.content }]
        });
      } else if (chat.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: chat.content }]
        });
      }
    }
  }
  
  // Kombinasikan system prompt dengan user message
  let userMessageText = message;
  if (systemPrompt) {
    userMessageText = `[Instructions: ${systemPrompt}]\n\n${message}`;
  }
  
  // Add user message
  const userMessageParts = [{ text: userMessageText }];
  
  // Add image if present
  if (base64Image) {
    try {
      // Extract mime type from base64 string
      const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z0-9]+);base64,/);
      if (!mimeMatch || !mimeMatch[1]) {
          console.warn('Invalid base64 image format, cannot extract mime type.');
          // Continue without image if format is invalid
      } else {
          const mimeType = mimeMatch[1];
          const base64Data = base64Image.split(',')[1];
          
          // Log for debugging
          console.log('Received base64 image for Gemini:', {
              mimeType: mimeType,
              dataLength: base64Data ? base64Data.length : 0
          });
          
          userMessageParts.unshift({
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          });
      }
    } catch (err) {
      console.error('Error processing base64 image for Gemini:', err);
      // Continue without image if processing fails
    }
  }
  
  contents.push({
      role: 'user',
      parts: userMessageParts
  });
  
  const payload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP: 0.9,
    }
  };
  
  try {
    const response = await axios.post(url, payload);
    
    if (response.data && response.data.candidates && response.data.candidates[0] &&
        response.data.candidates[0].content && response.data.candidates[0].content.parts) {
      return {
        text: response.data.candidates[0].content.parts[0].text || "Tidak ada respons dari model.",
        model: 'gemini'
      };
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    // Add more detailed error for debugging
    if (error.response) {
      console.error('Gemini API full error:', error.response.data);
      throw new Error(`Gemini API error: ${error.response.status} - ${error.message}`);
    } else {
      throw error;
    }
  }
}

/**
 * Call DeepSeek API
 * @param {string} message User message
 * @param {string} systemPrompt System instructions
 * @param {number} temperature Temperature (0-1)
 * @param {number} maxTokens Max tokens to generate
 * @param {string} language Preferred language
 * @param {Array} chatHistory Optional chat history for context
 * @returns {Promise<object>} Response with text and model info
 */
async function callDeepseek(message, systemPrompt, temperature, maxTokens, language, chatHistory = []) {
  const config = konciadalah.deepseek;
  if (!config.konci_rahasia) throw new Error('DeepSeek konci not configured');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.konci_rahasia}`
  };

  // Buat payload dengan chat history jika ada
  const messages = [];
  
  // Tambahkan system prompt
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt
    });
  }
  
  // Tambahkan history percakapan
  if (chatHistory && chatHistory.length > 0) {
    messages.push(...chatHistory);
  }
  
  // Tambahkan pesan pengguna saat ini
  messages.push({
    role: "user",
    content: message
  });

  const payload = {
    model: "deepseek-chat",
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
  };

  const response = await axios.post(config.kuncine_url, payload, { headers });
  return {
    text: response.data.choices[0].message.content,
    model: 'deepseek'
  };
}

/**
 * Call Groq API
 * @param {string} message User message
 * @param {string} systemPrompt System instructions
 * @param {number} temperature Temperature (0-1)
 * @param {number} maxTokens Max tokens to generate
 * @param {string} language Preferred language
 * @param {Array} chatHistory Optional chat history for context
 * @returns {Promise<object>} Response with text and model info
 */
async function callGroq(message, systemPrompt, temperature, maxTokens, language, chatHistory = []) {
  const config = konciadalah.groq;
  if (!config.konci_rahasia) throw new Error('Groq konci not configured');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.konci_rahasia}`
  };

  // Buat payload dengan chat history jika ada
  const messages = [];
  
  // Tambahkan system prompt
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt
    });
  }
  
  // Tambahkan history percakapan
  if (chatHistory && chatHistory.length > 0) {
    messages.push(...chatHistory);
  }
  
  // Tambahkan pesan pengguna saat ini
  messages.push({
    role: "user",
    content: message
  });

  const payload = {
    model: "llama3-8b-8192",
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
  };

  const response = await axios.post(config.kuncine_url, payload, { headers });
  return {
    text: response.data.choices[0].message.content,
    model: 'groq'
  };
}

/**
 * Call OpenAI API
 * @param {string} message User message
 * @param {string} systemPrompt System instructions
 * @param {number} temperature Temperature (0-1)
 * @param {number} maxTokens Max tokens to generate
 * @param {string} language Preferred language
 * @param {Array} chatHistory Optional chat history for context
 * @returns {Promise<object>} Response with text and model info
 */
async function callOpenAI(message, systemPrompt, temperature, maxTokens, language, chatHistory = []) {
  const config = konciadalah.openai;
  if (!config.konci_rahasia) throw new Error('OpenAI konci not configured');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.konci_rahasia}`
  };

  // Buat payload dengan chat history jika ada
  const messages = [];
  
  // Tambahkan system prompt
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt
    });
  }
  
  // Tambahkan history percakapan
  if (chatHistory && chatHistory.length > 0) {
    messages.push(...chatHistory);
  }
  
  // Tambahkan pesan pengguna saat ini
  messages.push({
    role: "user",
    content: message
  });

  const payload = {
    model: "gpt-3.5-turbo",
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
  };

  const response = await axios.post(config.kuncine_url, payload, { headers });
  return {
    text: response.data.choices[0].message.content,
    model: 'openai'
  };
}

module.exports = {
  callAI
};
