/**
 * Upload Middleware
 * 
 * Handles file uploads using multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi multer untuk menyimpan file di memory
const storage = multer.memoryStorage();

// Filter file untuk hanya menerima gambar
const fileFilter = (req, file, cb) => {
  // Hanya terima file gambar
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan (JPEG, PNG, GIF, WEBP)'), false);
  }
};

// Konfigurasi upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Maksimal 10 file
  }
});

// Middleware untuk menangani error dari multer
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Kesalahan multer khusus
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File terlalu besar. Maksimal 10MB.' });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Terlalu banyak file. Maksimal 10 file.' });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Field name tidak valid.' });
    } else {
      return res.status(400).json({ error: `Error upload: ${err.message}` });
    }
  } else if (err) {
    // Error lainnya
    return res.status(500).json({ error: err.message });
  }
  
  next();
};

// Export objek dengan semua fungsi multer dan error handler
module.exports = {
  upload,
  handleUploadErrors
}; 