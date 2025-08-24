const express = require('express');
const passport = require('../config/passport');
const router = express.Router();

// Initialize passport middleware
router.use(passport.initialize());
router.use(passport.session());

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login?error=oauth_failed',
    failureMessage: true
  }),
  async (req, res) => {
    try {
      // Log successful authentication
      console.log('OAuth callback success:', {
        email: req.user.email,
        displayName: req.user.displayName
      });

      // Redirect to frontend with success
      const redirectUrl = process.env.NODE_ENV === 'production' 
        ? 'https://admin.tunagu.app/'
        : 'http://localhost:3000/';
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=callback_failed');
    }
  }
);

// Temporary login (development and fallback)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Check if Google OAuth is properly configured
  const hasGoogleConfig = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  
  if (!hasGoogleConfig) {
    console.warn('Google OAuth not configured, using temporary auth');
  }

  // Simple temporary auth - in production use Google OAuth
  if (email && (password === 'admin123' || !hasGoogleConfig)) {
    // Domain check (same as Google OAuth)
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (allowedDomain) {
      const emailDomain = email.split('@')[1];
      if (emailDomain !== allowedDomain) {
        return res.status(403).json({ 
          error: `Only ${allowedDomain} domain emails are allowed` 
        });
      }
    }

    req.session.user = {
      email,
      displayName: email.split('@')[0],
      isAdmin: true,
      provider: 'temporary',
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

// Logout
router.post('/logout', (req, res) => {
  const email = req.session?.user?.email;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    console.log('User logged out:', email);
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Get current user
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

// Check auth status
router.get('/status', (req, res) => {
  const isAuthenticated = !!(req.session && req.session.user);
  
  res.json({
    authenticated: isAuthenticated,
    hasGoogleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    allowedDomain: process.env.ALLOWED_EMAIL_DOMAIN,
    user: isAuthenticated ? {
      email: req.session.user.email,
      displayName: req.session.user.displayName,
      isAdmin: req.session.user.isAdmin,
      provider: req.session.user.provider,
      avatar: req.session.user.avatar
    } : null
  });
});

// Get OAuth configuration (for frontend)
router.get('/config', (req, res) => {
  const hasGoogleConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  res.json({
    googleOAuth: hasGoogleConfig,
    allowedDomain: process.env.ALLOWED_EMAIL_DOMAIN,
    temporaryAuth: !hasGoogleConfig || process.env.NODE_ENV === 'development'
  });
});

module.exports = router;