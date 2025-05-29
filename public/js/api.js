/**
 * API Routes
 * 
 * Handles all API endpoints for the application
 */

const express = require('express');
const router = express.Router();
const aiService = require('./aiService');
const uploadMiddleware = require('./upload');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Chat API route dengan sistem fallback
router.post('/chat', async (req, res) => {
  const { message, model, systemPrompt, language, temperature, responseLength, image, chatHistory } = req.body;
  
  try {
    // Log untuk debugging
    console.log('Chat request:', {
      hasImage: !!image,
      imageLength: image ? image.length : 0,
      messageLength: message ? message.length : 0,
      hasChatHistory: !!chatHistory,
      chatHistoryLength: chatHistory ? chatHistory.length : 0
    });

    const response = await aiService.callAI(
      model || 'auto', 
      message, 
      systemPrompt, 
      temperature, 
      responseLength, 
      language, 
      image,
      chatHistory
    );
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response', 
      details: error.message 
    });
  }
});

// Upload endpoint dengan dukungan multiple file
router.post('/upload', 
  uploadMiddleware.upload.array('files', 10), 
  uploadMiddleware.handleUploadErrors,
  async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Tidak ada file yang diupload' });
        }

        // Log untuk debugging
        console.log('Processing uploaded files:', {
            count: req.files.length,
            fileDetails: req.files.map(f => ({
                mimetype: f.mimetype,
                size: f.size,
                name: f.originalname
            }))
        });

        const uploadedFiles = [];
        
        // Proses setiap file satu per satu untuk menghindari error saat konversi
        for (const file of req.files) {
            try {
                // Convert buffer to base64
                const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                
                uploadedFiles.push({
                    filePath: base64Image,
                    fileType: file.mimetype,
                    fileName: file.originalname,
                    fileSize: file.size
                });
            } catch (fileError) {
                console.error(`Error processing file ${file.originalname}:`, fileError);
                // Lanjutkan ke file berikutnya
            }
        }

        if (uploadedFiles.length === 0) {
            return res.status(500).json({ error: 'Gagal memproses semua file yang diupload' });
        }

        // Response dengan file yang berhasil diproses
        res.json({
            files: uploadedFiles,
            message: `${uploadedFiles.length} file berhasil diupload`
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Gagal mengupload file: ' + error.message });
    }
});

module.exports = router; 