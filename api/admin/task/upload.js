const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');

/**
 * Upload task attachments (photos/files)
 * POST /api/v1/admin/task/upload-attachments
 */
router.post('/upload-attachments', async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('Request headers:', req.headers);
    console.log('Files:', req.files);
    console.log('Environment:', process.env.NODE_ENV);

    if (!req.files || !req.files.attachments) {
      console.error('❌ No files in request');
      return res.status(400).json({ 
        success: false,
        error: 'No files uploaded' 
      });
    }

    // Handle single or multiple files
    const files = Array.isArray(req.files.attachments) 
      ? req.files.attachments 
      : [req.files.attachments];

    console.log(`📁 Processing ${files.length} file(s)`);

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../../../uploads/tasks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('📂 Created uploads directory');
    }

    const uploadedFiles = [];
    
    for (const file of files) {
      // Validate file type (images, videos, documents)
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        console.warn(`⚠️ Skipping invalid file type: ${file.mimetype}`);
        continue;
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        console.warn(`⚠️ Skipping file too large: ${file.name} (${file.size} bytes)`);
        continue;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const ext = path.extname(file.name);
      const fileName = `${timestamp}_${randomStr}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      
      // Move file to uploads directory
      await file.mv(filePath);
      
      // Store relative path (for database)
      const relativePath = `/uploads/tasks/${fileName}`;
      uploadedFiles.push(relativePath);
      
      console.log(`✅ Uploaded: ${fileName}`);
    }

    console.log(`🎉 Successfully uploaded ${uploadedFiles.length} file(s)`);
    console.log('📁 File paths:', uploadedFiles);

    return res.status(200).json({ 
      success: true, 
      files: uploadedFiles,
      count: uploadedFiles.length,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to upload files',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
