const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const eventsUploadsDir = path.join(uploadsDir, 'events');

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(eventsUploadsDir)) {
  fs.mkdirSync(eventsUploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, eventsUploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `event-${uniqueSuffix}-${sanitizedName}`);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 10MB.' 
      });
    case 'LIMIT_FILE_COUNT':
      return res.status(400).json({ 
        error: 'Too many files. Maximum 5 files allowed.' 
      });
    case 'LIMIT_UNEXPECTED_FILE':
      return res.status(400).json({ 
        error: 'Unexpected file field.' 
      });
    default:
      return res.status(400).json({ 
        error: 'File upload error: ' + error.message 
      });
    }
  } else if (error) {
    return res.status(400).json({ 
      error: error.message 
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError,
  uploadsDir,
  eventsUploadsDir
};
