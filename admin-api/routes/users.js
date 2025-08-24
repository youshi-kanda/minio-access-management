const express = require('express');
const router = express.Router();
const MCAdminWrapper = require('../utils/mcAdmin');
const { requireAuth, auditLog } = require('../middleware/auth');
const crypto = require('crypto');

const mcAdmin = new MCAdminWrapper();

// Create new user
router.post('/', requireAuth, auditLog('user_create'), async (req, res) => {
  try {
    const { username, secret, displayName = '', email = '' } = req.body;

    if (!username || !secret) {
      return res.status(400).json({ error: 'Username and secret are required' });
    }

    // Validate username (MinIO requirements)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(username) || username.length < 3) {
      return res.status(400).json({ 
        error: 'Invalid username. Must be alphanumeric, 3+ characters, and can contain . _ -' 
      });
    }

    // Validate password strength
    if (secret.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    const result = await mcAdmin.createUser(username, secret, displayName, email);

    res.json({
      success: true,
      user: {
        username: result.user.username,
        displayName: result.user.displayName,
        email: result.user.email,
        created: result.user.created,
        status: result.user.status
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    res.status(500).json({ 
      error: 'Failed to create user',
      details: error.message 
    });
  }
});

// List all users
router.get('/', requireAuth, async (req, res) => {
  try {
    const users = await mcAdmin.listUsers();
    
    // Filter out service accounts and admin users if needed
    const filteredUsers = users.filter(user => 
      user.username !== process.env.MINIO_ADMIN_ACCESS_KEY
    );

    res.json({ users: filteredUsers });

  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ 
      error: 'Failed to list users',
      details: error.message 
    });
  }
});

// Get user details
router.get('/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const users = await mcAdmin.listUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ 
      error: 'Failed to get user',
      details: error.message 
    });
  }
});

// Enable user
router.patch('/:username/enable', requireAuth, auditLog('user_enable'), async (req, res) => {
  try {
    const { username } = req.params;
    const result = await mcAdmin.setUserStatus(username, true);

    res.json(result);

  } catch (error) {
    console.error('Error enabling user:', error);
    res.status(500).json({ 
      error: 'Failed to enable user',
      details: error.message 
    });
  }
});

// Disable user
router.patch('/:username/disable', requireAuth, auditLog('user_disable'), async (req, res) => {
  try {
    const { username } = req.params;
    const result = await mcAdmin.setUserStatus(username, false);

    res.json(result);

  } catch (error) {
    console.error('Error disabling user:', error);
    res.status(500).json({ 
      error: 'Failed to disable user',
      details: error.message 
    });
  }
});

// Delete user
router.delete('/:username', requireAuth, auditLog('user_delete'), async (req, res) => {
  try {
    const { username } = req.params;

    // Prevent deleting admin user
    if (username === process.env.MINIO_ADMIN_ACCESS_KEY) {
      return res.status(403).json({ error: 'Cannot delete admin user' });
    }

    const result = await mcAdmin.deleteUser(username);

    res.json(result);

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      error: 'Failed to delete user',
      details: error.message 
    });
  }
});

// Generate random password for invitations
router.get('/generate-password', requireAuth, (req, res) => {
  const password = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '');
  res.json({ password: password.substring(0, 12) });
});

module.exports = router;