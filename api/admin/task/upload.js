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
    console.log('Files:', req.files);

    if (!req.files || !req.files.attachments) {
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
      // Validate file type (images only)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        console.warn(`⚠️ Skipping invalid file type: ${file.mimetype}`);
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

    res.json({ 
      success: true, 
      files: uploadedFiles,
      count: uploadedFiles.length
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
