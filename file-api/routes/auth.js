const express = require('express');
const router = express.Router();

// Shared session authentication for file API
// This should use the same session store as admin API in production

// Get current user (shared session)
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    user: {
      email: req.session.user.email,
      displayName: req.session.user.displayName,
      isAdmin: req.session.user.isAdmin,
      provider: req.session.user.provider,
      avatar: req.session.user.avatar,
      loginAt: req.session.user.loginAt
    }
  });
});

// Check auth status (shared session)
router.get('/status', (req, res) => {
  const isAuthenticated = !!(req.session && req.session.user);
  
  res.json({
    authenticated: isAuthenticated,
    user: isAuthenticated ? {
      email: req.session.user.email,
      displayName: req.session.user.displayName,
      isAdmin: req.session.user.isAdmin,
      provider: req.session.user.provider,
      avatar: req.session.user.avatar
    } : null
  });
});

// Temporary login (for development - should redirect to admin login in production)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // In production, this should redirect to admin OAuth
  if (process.env.NODE_ENV === 'production') {
    return res.status(400).json({ 
      error: 'Please login through the admin interface',
      redirectUrl: process.env.NEXT_PUBLIC_ADMIN_BASE + '/login'
    });
  }

  // Simple temporary auth - same as admin API
  if (email && password === 'admin123') {
    req.session.user = {
      email,
      displayName: email.split('@')[0],
      isAdmin: true,
      provider: 'temporary-file',
      loginAt: new Date().toISOString()
    };

    res.json({
      success: true,
      user: {
        email: req.session.user.email,
        displayName: req.session.user.displayName,
        isAdmin: req.session.user.isAdmin,
        provider: req.session.user.provider
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout (shared session)
router.post('/logout', (req, res) => {
  const email = req.session?.user?.email;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    console.log('User logged out from file API:', email);
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;