const express = require('express');
const multer = require('multer');
const router = express.Router();
const MinIOClient = require('../utils/s3Client');
const { requireAuth, validateBucketAccess, auditLog, fileSizeLimit } = require('../middleware/auth');

const minioClient = new MinIOClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// List objects in bucket
router.get('/objects', requireAuth, validateBucketAccess, auditLog('list_objects'), async (req, res) => {
  try {
    const {
      bucket,
      prefix = '',
      delimiter = '',
      token = null,
      maxKeys = 1000,
      search = ''
    } = req.query;

    let result;

    if (search) {
      // Search objects by key pattern
      result = await minioClient.searchObjects(bucket, search, prefix);
    } else {
      // Regular listing
      result = await minioClient.listObjects(
        bucket,
        prefix,
        delimiter,
        token,
        parseInt(maxKeys)
      );
    }

    res.json({
      success: true,
      bucket,
      ...result
    });

  } catch (error) {
    console.error('Error listing objects:', error);
    
    if (error.name === 'NoSuchBucket') {
      return res.status(404).json({ error: 'Bucket not found' });
    }
    
    if (error.name === 'AccessDenied') {
      return res.status(403).json({ error: 'Access denied to bucket' });
    }

    res.status(500).json({ 
      error: 'Failed to list objects',
      details: error.message 
    });
  }
});

// Get folder structure
router.get('/folders', requireAuth, validateBucketAccess, async (req, res) => {
  try {
    const { bucket, prefix = '' } = req.query;
    
    const result = await minioClient.getFolderStructure(bucket, prefix);

    res.json({
      success: true,
      bucket,
      ...result
    });

  } catch (error) {
    console.error('Error getting folder structure:', error);
    res.status(500).json({ 
      error: 'Failed to get folder structure',
      details: error.message 
    });
  }
});

// Get object metadata
router.get('/object-info', requireAuth, validateBucketAccess, async (req, res) => {
  try {
    const { bucket, key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'Object key is required' });
    }

    const metadata = await minioClient.getObjectMetadata(bucket, key);

    if (!metadata) {
      return res.status(404).json({ error: 'Object not found' });
    }

    res.json({
      success: true,
      bucket,
      object: metadata
    });

  } catch (error) {
    console.error('Error getting object info:', error);
    res.status(500).json({ 
      error: 'Failed to get object info',
      details: error.message 
    });
  }
});

// Generate signed URL for object access
router.get('/object-url', requireAuth, validateBucketAccess, auditLog('generate_signed_url'), async (req, res) => {
  try {
    const { 
      bucket, 
      key, 
      disposition = 'inline',
      expiresIn = null
    } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'Object key is required' });
    }

    const signedUrl = await minioClient.getSignedUrl(bucket, key, disposition, expiresIn ? parseInt(expiresIn) : null);

    res.json({
      success: true,
      bucket,
      key,
      ...signedUrl
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate signed URL',
      details: error.message 
    });
  }
});

// Upload single file
router.post('/upload', requireAuth, validateBucketAccess, fileSizeLimit(), upload.single('file'), auditLog('upload_file'), async (req, res) => {
  try {
    const { bucket } = req.query;
    const { path = '', metadata = '{}' } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse metadata if provided
    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (e) {
      // Ignore invalid metadata JSON
    }

    // Construct object key
    const fileName = req.file.originalname;
    const key = path ? `${path.replace(/\/$/, '')}/${fileName}` : fileName;

    const result = await minioClient.putObject(
      bucket,
      key,
      req.file.buffer,
      req.file.mimetype,
      {
        ...parsedMetadata,
        originalName: fileName,
        uploadedBy: req.session.user.email
      }
    );

    res.json({
      success: true,
      bucket,
      file: {
        ...result,
        originalName: fileName,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
});

// Upload multiple files
router.post('/upload-multiple', requireAuth, validateBucketAccess, fileSizeLimit(), upload.array('files', 10), auditLog('upload_multiple_files'), async (req, res) => {
  try {
    const { bucket } = req.query;
    const { path = '', metadata = '{}' } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (e) {
      // Ignore invalid metadata JSON
    }

    const uploadPromises = req.files.map(async (file) => {
      const fileName = file.originalname;
      const key = path ? `${path.replace(/\/$/, '')}/${fileName}` : fileName;

      try {
        const result = await minioClient.putObject(
          bucket,
          key,
          file.buffer,
          file.mimetype,
          {
            ...parsedMetadata,
            originalName: fileName,
            uploadedBy: req.session.user.email
          }
        );

        return {
          success: true,
          file: {
            ...result,
            originalName: fileName,
            size: file.size
          }
        };
      } catch (error) {
        return {
          success: false,
          file: fileName,
          error: error.message
        };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: failed.length === 0,
      bucket,
      uploaded: successful.map(r => r.file),
      failed: failed.map(r => ({ file: r.file, error: r.error })),
      total: req.files.length,
      succeeded: successful.length,
      failedCount: failed.length
    });

  } catch (error) {
    console.error('Error uploading multiple files:', error);
    res.status(500).json({ 
      error: 'Failed to upload files',
      details: error.message 
    });
  }
});

// Delete single object
router.delete('/object', requireAuth, validateBucketAccess, auditLog('delete_object'), async (req, res) => {
  try {
    const { bucket, key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'Object key is required' });
    }

    const result = await minioClient.deleteObject(bucket, key);

    res.json({
      success: true,
      bucket,
      ...result
    });

  } catch (error) {
    console.error('Error deleting object:', error);
    res.status(500).json({ 
      error: 'Failed to delete object',
      details: error.message 
    });
  }
});

// Delete multiple objects
router.delete('/objects', requireAuth, validateBucketAccess, auditLog('delete_multiple_objects'), async (req, res) => {
  try {
    const { bucket } = req.query;
    const { keys } = req.body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Object keys array is required' });
    }

    const result = await minioClient.deleteObjects(bucket, keys);

    res.json({
      success: result.success,
      bucket,
      ...result
    });

  } catch (error) {
    console.error('Error deleting objects:', error);
    res.status(500).json({ 
      error: 'Failed to delete objects',
      details: error.message 
    });
  }
});

// Validate bucket access
router.get('/bucket-access', requireAuth, async (req, res) => {
  try {
    const { bucket } = req.query;

    if (!bucket) {
      return res.status(400).json({ error: 'Bucket name is required' });
    }

    const hasAccess = await minioClient.validateBucketAccess(bucket);

    res.json({
      success: true,
      bucket,
      hasAccess
    });

  } catch (error) {
    console.error('Error validating bucket access:', error);
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ 
        error: 'Access denied to bucket',
        bucket 
      });
    }

    res.status(500).json({ 
      error: 'Failed to validate bucket access',
      details: error.message 
    });
  }
});

module.exports = router;