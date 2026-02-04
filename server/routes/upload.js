// File Upload Routes
// Handle file uploads, media management, and storage

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// All upload routes require authentication
router.use(protect);

// Ensure uploads directory exists
const ensureUploadDir = async (dir) => {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    await ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'text/plain': true,
    'text/csv': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new AppError('File type not allowed', 400), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files at once
  }
});

// Upload single file
router.post('/single', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Save file record to database
    const fileRecord = await saveFileRecord(req.file, req.user.id);

    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        file: fileRecord
      }
    });
  } catch (error) {
    // Clean up uploaded file if database save fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }
    next(error);
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }

    const fileRecords = [];
    const errors = [];

    // Save each file record to database
    for (const file of req.files) {
      try {
        const fileRecord = await saveFileRecord(file, req.user.id);
        fileRecords.push(fileRecord);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
        // Clean up failed file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Failed to clean up file:', unlinkError);
        }
      }
    }

    if (fileRecords.length === 0) {
      return next(new AppError('Failed to upload any files', 400));
    }

    res.status(201).json({
      status: 'success',
      message: `${fileRecords.length} file(s) uploaded successfully`,
      data: {
        files: fileRecords,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get file information
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT f.*, u.email as uploaded_by_email
       FROM files f
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('File not found', 404));
    }

    const file = result.rows[0];

    // Check if user has access to this file
    if (file.uploaded_by !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('Access denied', 403));
    }

    res.json({
      status: 'success',
      data: {
        file
      }
    });
  } catch (error) {
    next(error);
  }
});

// Download file
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('File not found', 404));
    }

    const file = result.rows[0];

    // Check if user has access to this file
    if (file.uploaded_by !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('Access denied', 403));
    }

    // Check if file exists
    try {
      await fs.access(file.file_path);
    } catch (error) {
      return next(new AppError('File not found on disk', 404));
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type);

    // Stream file to response
    const fileStream = require('fs').createReadStream(file.file_path);
    fileStream.pipe(res);

    // Update download count
    await pool.query(
      'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
      [id]
    );
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('File not found', 404));
    }

    const file = result.rows[0];

    // Check if user can delete this file
    if (file.uploaded_by !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('Access denied', 403));
    }

    // Delete file from disk
    try {
      await fs.unlink(file.file_path);
    } catch (error) {
      console.error('Failed to delete file from disk:', error);
    }

    // Delete file record from database
    await pool.query('DELETE FROM files WHERE id = $1', [id]);

    res.json({
      status: 'success',
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get user's files
router.get('/user/files', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', file_type = '' } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT f.*, u.email as uploaded_by_email
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
      WHERE f.uploaded_by = $1
    `;
    
    const params = [req.user.id];
    let paramIndex = 2;
    
    if (search) {
      query += ` AND (f.original_name ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (file_type) {
      query += ` AND f.file_type = $${paramIndex}`;
      params.push(file_type);
      paramIndex++;
    }
    
    query += ` ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM files WHERE uploaded_by = $1';
    const countParams = [req.user.id];
    let countIndex = 2;
    
    if (search) {
      countQuery += ` AND (original_name ILIKE $${countIndex} OR description ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }
    
    if (file_type) {
      countQuery += ` AND file_type = $${countIndex}`;
      countParams.push(file_type);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalFiles = parseInt(countResult.rows[0].count);
    
    res.json({
      status: 'success',
      data: {
        files: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalFiles,
          pages: Math.ceil(totalFiles / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to save file record to database
async function saveFileRecord(file, userId) {
  const fileStats = await fs.stat(file.path);
  const fileType = getFileType(file.mimetype);
  
  const result = await pool.query(`
    INSERT INTO files (
      id, original_name, file_name, file_path, mime_type, file_size, 
      file_type, uploaded_by, description
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    uuidv4(),
    file.originalname,
    file.filename,
    file.path,
    file.mimetype,
    fileStats.size,
    fileType,
    userId,
    null // Description can be added later
  ]);
  
  return result.rows[0];
}

// Helper function to determine file type category
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'document';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('text')) return 'text';
  return 'other';
}

// Get file statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const userId = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' ? null : req.user.id;
    
    let query = `
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_files,
        COUNT(CASE WHEN file_type = 'document' THEN 1 END) as document_files,
        COUNT(CASE WHEN file_type = 'spreadsheet' THEN 1 END) as spreadsheet_files,
        COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_files,
        COUNT(CASE WHEN file_type = 'audio' THEN 1 END) as audio_files,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_size,
        MAX(file_size) as max_size,
        MIN(file_size) as min_size
      FROM files
    `;
    
    const params = [];
    
    if (userId) {
      query += ' WHERE uploaded_by = $1';
      params.push(userId);
    }
    
    const result = await pool.query(query, params);
    
    // Get files by type distribution
    let typeQuery = `
      SELECT file_type, COUNT(*) as count, SUM(file_size) as total_size
      FROM files
    `;
    
    const typeParams = [];
    
    if (userId) {
      typeQuery += ' WHERE uploaded_by = $1';
      typeParams.push(userId);
    }
    
    typeQuery += ' GROUP BY file_type ORDER BY count DESC';
    
    const typeResult = await pool.query(typeQuery, typeParams);
    
    // Get recent uploads
    let recentQuery = `
      SELECT id, original_name, file_size, created_at
      FROM files
    `;
    
    const recentParams = [];
    
    if (userId) {
      recentQuery += ' WHERE uploaded_by = $1';
      recentParams.push(userId);
    }
    
    recentQuery += ' ORDER BY created_at DESC LIMIT 10';
    
    const recentResult = await pool.query(recentQuery, recentParams);
    
    res.json({
      status: 'success',
      data: {
        overview: result.rows[0],
        by_type: typeResult.rows,
        recent_uploads: recentResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update file metadata
router.patch('/:id/metadata', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, tags } = req.body;

    const result = await pool.query(
      `UPDATE files 
       SET description = COALESCE($1, description),
           tags = COALESCE($2, tags),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND uploaded_by = $4
       RETURNING *`,
      [description, tags, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('File not found or access denied', 404));
    }

    res.json({
      status: 'success',
      message: 'File metadata updated successfully',
      data: {
        file: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
