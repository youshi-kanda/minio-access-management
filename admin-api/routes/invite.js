const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const MCAdminWrapper = require('../utils/mcAdmin');
const { requireAuth, auditLog } = require('../middleware/auth');

const mcAdmin = new MCAdminWrapper();

// In-memory token store (in production, use Redis or database)
const inviteTokens = new Map();

// Create SMTP transporter
const createTransporter = () => {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP configuration not found');
  }

  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Generate invite token
const generateInviteToken = (email, bucket, role) => {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + (parseInt(process.env.INVITE_TTL_MINUTES) || 10));

  inviteTokens.set(token, {
    email,
    bucket,
    role: role.toLowerCase(),
    expiresAt,
    used: false,
    createdAt: new Date()
  });

  return token;
};

// Send invitation email
router.post('/', requireAuth, auditLog('invite_send'), async (req, res) => {
  try {
    const { email, bucket, role = 'rw', recipientName = '' } = req.body;

    if (!email || !bucket) {
      return res.status(400).json({ error: 'Email and bucket are required' });
    }

    if (!['rw', 'ro'].includes(role.toLowerCase())) {
      return res.status(400).json({ error: 'Role must be either "rw" or "ro"' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Generate invite token
    const token = generateInviteToken(email, bucket, role);
    const ttlMinutes = parseInt(process.env.INVITE_TTL_MINUTES) || 10;
    
    // Create invite URL
    const baseUrl = process.env.NEXT_PUBLIC_ADMIN_BASE || 'https://admin.tunagu.app';
    const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;

    // Prepare email content
    const roleText = role.toLowerCase() === 'rw' ? '読み取り・書き込み' : '読み取り専用';
    const recipientText = recipientName || 'ユーザー';

    const emailContent = {
      from: process.env.FROM_ADDR || 'minio-noreply@tunagu.tech',
      to: email,
      subject: `[MinIO] ${bucket} へのアクセス招待`,
      html: `
        <h2>MinIO アクセス招待</h2>
        <p>${recipientText} 様</p>
        
        <p><strong>${bucket}</strong> バケットに <strong>${roleText}</strong> 権限で招待されました。</p>
        
        <p>下記のリンクから初回セットアップを行ってください：</p>
        <p><a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">招待を受諾する</a></p>
        
        <p>または以下のURLをブラウザにコピーしてください：</p>
        <p><code>${inviteUrl}</code></p>
        
        <hr>
        <p><small>
          • この招待リンクは <strong>${ttlMinutes} 分</strong> で失効します<br>
          • 1回限りの使用となります<br>
          • セットアップ後、新しいパスワードを設定してください
        </small></p>
        
        <p><small>MinIO Access Management System</small></p>
      `,
      text: `
MinIO アクセス招待

${recipientText} 様

${bucket} バケットに ${roleText} 権限で招待されました。

下記のリンクから初回セットアップを行ってください：
${inviteUrl}

• この招待リンクは ${ttlMinutes} 分で失効します
• 1回限りの使用となります
• セットアップ後、新しいパスワードを設定してください

MinIO Access Management System
      `
    };

    // Send email
    const transporter = createTransporter();
    await transporter.sendMail(emailContent);

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      email,
      bucket,
      role: role.toLowerCase(),
      expiresAt: inviteTokens.get(token).expiresAt
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    
    if (error.code === 'EAUTH') {
      return res.status(500).json({ error: 'SMTP authentication failed' });
    }
    
    res.status(500).json({ 
      error: 'Failed to send invitation',
      details: error.message 
    });
  }
});

// Accept invitation and complete setup
router.post('/accept', auditLog('invite_accept'), async (req, res) => {
  try {
    const { token, newSecret, displayName = '' } = req.body;

    if (!token || !newSecret) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password strength
    if (newSecret.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    // Check token validity
    const invite = inviteTokens.get(token);
    if (!invite) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    if (invite.used) {
      return res.status(409).json({ error: 'Invitation already used' });
    }

    if (new Date() > invite.expiresAt) {
      inviteTokens.delete(token);
      return res.status(410).json({ error: 'Invitation expired' });
    }

    // Generate username from email (remove @ and domain, make safe)
    const username = invite.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const finalUsername = username || `user${Date.now()}`;

    try {
      // Create MinIO user
      await mcAdmin.createUser(finalUsername, newSecret, displayName, invite.email);

      // Add user to appropriate group
      const groupName = `grp-${invite.bucket}-${invite.role}`;
      await mcAdmin.addUserToGroup(finalUsername, groupName);

      // Mark token as used
      invite.used = true;
      invite.usedAt = new Date();
      invite.username = finalUsername;

      res.json({
        success: true,
        message: 'Account setup completed successfully',
        username: finalUsername,
        bucket: invite.bucket,
        role: invite.role,
        displayName
      });

    } catch (mcError) {
      console.error('MinIO operation failed:', mcError);
      
      // Clean up if user creation partially failed
      try {
        await mcAdmin.deleteUser(finalUsername);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }

      throw mcError;
    }

  } catch (error) {
    console.error('Error accepting invitation:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: 'User already exists with similar credentials' });
    }
    
    res.status(500).json({ 
      error: 'Failed to complete setup',
      details: error.message 
    });
  }
});

// Get invitation details (for preview)
router.get('/details/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const invite = inviteTokens.get(token);

    if (!invite) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    if (invite.used) {
      return res.status(409).json({ error: 'Invitation already used' });
    }

    if (new Date() > invite.expiresAt) {
      inviteTokens.delete(token);
      return res.status(410).json({ error: 'Invitation expired' });
    }

    res.json({
      email: invite.email,
      bucket: invite.bucket,
      role: invite.role,
      expiresAt: invite.expiresAt,
      valid: true
    });

  } catch (error) {
    console.error('Error getting invitation details:', error);
    res.status(500).json({ 
      error: 'Failed to get invitation details',
      details: error.message 
    });
  }
});

// List active invitations (admin only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const activeInvites = [];

    for (const [token, invite] of inviteTokens.entries()) {
      if (!invite.used && invite.expiresAt > now) {
        activeInvites.push({
          token,
          email: invite.email,
          bucket: invite.bucket,
          role: invite.role,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt
        });
      }
    }

    res.json({ invitations: activeInvites });

  } catch (error) {
    console.error('Error listing invitations:', error);
    res.status(500).json({ 
      error: 'Failed to list invitations',
      details: error.message 
    });
  }
});

// Cleanup expired tokens (run periodically)
setInterval(() => {
  const now = new Date();
  for (const [token, invite] of inviteTokens.entries()) {
    if (invite.expiresAt < now) {
      inviteTokens.delete(token);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = router;