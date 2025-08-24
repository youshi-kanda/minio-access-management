// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // In a real system, check user role from database
  // For now, assume all authenticated users are admins
  if (!req.session.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Audit log middleware
const auditLog = (action) => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to log after response
    res.json = function(data) {
      // Log the action
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: req.session?.user?.email || 'anonymous',
        action: action,
        method: req.method,
        path: req.path,
        params: req.params,
        body: req.body,
        success: res.statusCode < 400,
        statusCode: res.statusCode
      };
      
      console.log('AUDIT:', JSON.stringify(logEntry));
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  requireAuth,
  requireAdmin,
  auditLog
};