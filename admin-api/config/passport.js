const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Google OAuth 2.0 Strategy (only if configured)
const hasGoogleConfig = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (hasGoogleConfig) {
  console.log('Initializing Google OAuth strategy...');
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user information from Google profile
      const userInfo = {
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        avatar: profile.photos?.[0]?.value,
        provider: 'google',
        accessToken,
        refreshToken
      };

      // Domain restriction check
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
      if (allowedDomain && userInfo.email) {
        const emailDomain = userInfo.email.split('@')[1];
        if (emailDomain !== allowedDomain) {
          return done(null, false, { 
            message: `Only ${allowedDomain} domain emails are allowed` 
          });
        }
      }

      // Check if email exists
      if (!userInfo.email) {
        return done(null, false, { 
          message: 'Email address is required from Google account' 
        });
      }

      console.log('Google OAuth Success:', {
        email: userInfo.email,
        displayName: userInfo.displayName,
        domain: userInfo.email.split('@')[1]
      });

      return done(null, userInfo);

    } catch (error) {
      console.error('Google OAuth Error:', error);
      return done(error, null);
    }
  }));
} else {
  console.log('Google OAuth not configured - using temporary auth only');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  // Store minimal user info in session
  const sessionUser = {
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    isAdmin: true, // All authenticated users are admins for now
    provider: user.provider,
    loginAt: new Date().toISOString()
  };
  done(null, sessionUser);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;