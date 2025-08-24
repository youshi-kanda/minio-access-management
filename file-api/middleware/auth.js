// Authentication middleware for File API
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Bucket access validation middleware
const validateBucketAccess = (req, res, next) => {
  const bucketName = req.params.bucket || req.query.bucket;
  
  if (!bucketName) {
    return res.status(400).json({ error: 'Bucket name is required' });
  }

  // In a real implementation, check if user has access to this bucket
  // For now, we'll allow access to all authenticated users
  // You would typically check user's group membership against bucket groups
  
  req.bucketName = bucketName;
  next();
};

// File operation audit log
const auditLog = (action) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: req.session?.user?.email || 'anonymous',
        action: action,
        method: req.method,
        path: req.path,
        bucket: req.bucketName || req.query.bucket || req.params.bucket,
        key: req.query.key || req.body.key,
        success: res.statusCode < 400,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent')
      };
      
      console.log('FILE_AUDIT:', JSON.stringify(logEntry));
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// File size limit middleware
const fileSizeLimit = (maxSize = 100 * 1024 * 1024) => { // 100MB default
  return (req, res, next) => {
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
      return res.status(413).json({ 
        error: 'File too large',
        maxSize: maxSize,
        receivedSize: parseInt(req.headers['content-length'])
      });
    }
    next();
  };
};

// Content type validation
const validateContentType = (allowedTypes = []) => {
  return (req, res, next) => {
    if (allowedTypes.length === 0) {
      return next(); // No restriction
    }

    const contentType = req.headers['content-type'];
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({ 
        error: 'Unsupported content type',
        allowedTypes: allowedTypes,
        receivedType: contentType
      });
    }
    next();
  };
};

module.exports = {
  requireAuth,
  validateBucketAccess,
  auditLog,
  fileSizeLimit,
  validateContentType
};