const express = require('express');
const router = express.Router();
const MCAdminWrapper = require('../utils/mcAdmin');
const { requireAuth, auditLog } = require('../middleware/auth');

const mcAdmin = new MCAdminWrapper();

// Initialize MC alias on startup
mcAdmin.initAlias().catch(console.error);

// Create new bucket
router.post('/', requireAuth, auditLog('bucket_create'), async (req, res) => {
  try {
    const { 
      name, 
      versioning = true, 
      defaultPolicy = 'RW', 
      initialMember = true 
    } = req.body;

    if (!name || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name)) {
      return res.status(400).json({ 
        error: 'Invalid bucket name. Must be lowercase, alphanumeric, and hyphens only.' 
      });
    }

    // 1. Create bucket with versioning
    await mcAdmin.createBucket(name, versioning);

    // 2. Create RW and RO policies for the bucket
    const rwPolicyName = `rw-${name}`;
    const roPolicyName = `ro-${name}`;
    
    await mcAdmin.createPolicy(rwPolicyName, name, 'rw');
    await mcAdmin.createPolicy(roPolicyName, name, 'ro');

    // 3. Create RW and RO groups
    const rwGroupName = `grp-${name}-rw`;
    const roGroupName = `grp-${name}-ro`;
    
    await mcAdmin.createGroup(rwGroupName);
    await mcAdmin.createGroup(roGroupName);

    // 4. Attach policies to groups
    await mcAdmin.attachPolicyToGroup(rwPolicyName, rwGroupName);
    await mcAdmin.attachPolicyToGroup(roPolicyName, roGroupName);

    // 5. Add initial member (tsuji01) to RW group if requested
    if (initialMember) {
      const defaultMember = process.env.DEFAULT_INITIAL_MEMBER || 'tsuji01';
      try {
        await mcAdmin.addUserToGroup(defaultMember, rwGroupName);
      } catch (error) {
        console.warn(`Could not add ${defaultMember} to group (user may not exist):`, error.message);
      }
    }

    res.json({
      success: true,
      bucket: {
        name,
        versioning,
        defaultPolicy,
        rwPolicy: rwPolicyName,
        roPolicy: roPolicyName,
        rwGroup: rwGroupName,
        roGroup: roGroupName,
        initialMemberAdded: initialMember
      }
    });

  } catch (error) {
    console.error('Error creating bucket:', error);
    res.status(500).json({ 
      error: 'Failed to create bucket',
      details: error.message 
    });
  }
});

// List all buckets
router.get('/', requireAuth, async (req, res) => {
  try {
    const buckets = await mcAdmin.listBuckets();
    
    // Enhance bucket info with versioning status
    const enhancedBuckets = await Promise.all(
      buckets.map(async (bucket) => {
        try {
          const versioning = await mcAdmin.getBucketVersioning(bucket.name);
          return { ...bucket, versioning };
        } catch (error) {
          return { ...bucket, versioning: false };
        }
      })
    );

    res.json({ buckets: enhancedBuckets });
  } catch (error) {
    console.error('Error listing buckets:', error);
    res.status(500).json({ 
      error: 'Failed to list buckets',
      details: error.message 
    });
  }
});

// Get bucket members by role
router.get('/:bucketName/members', requireAuth, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { role = 'rw' } = req.query;

    if (!['rw', 'ro'].includes(role.toLowerCase())) {
      return res.status(400).json({ error: 'Role must be either "rw" or "ro"' });
    }

    const groupName = `grp-${bucketName}-${role.toLowerCase()}`;
    const members = await mcAdmin.listGroupMembers(groupName);

    res.json({
      bucket: bucketName,
      role: role.toLowerCase(),
      group: groupName,
      members
    });

  } catch (error) {
    console.error('Error getting bucket members:', error);
    res.status(500).json({ 
      error: 'Failed to get bucket members',
      details: error.message 
    });
  }
});

// Add member to bucket
router.post('/:bucketName/members', requireAuth, auditLog('bucket_member_add'), async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { username, role = 'rw' } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!['rw', 'ro'].includes(role.toLowerCase())) {
      return res.status(400).json({ error: 'Role must be either "rw" or "ro"' });
    }

    const groupName = `grp-${bucketName}-${role.toLowerCase()}`;
    await mcAdmin.addUserToGroup(username, groupName);

    res.json({
      success: true,
      bucket: bucketName,
      user: username,
      role: role.toLowerCase(),
      group: groupName
    });

  } catch (error) {
    console.error('Error adding bucket member:', error);
    res.status(500).json({ 
      error: 'Failed to add bucket member',
      details: error.message 
    });
  }
});

// Remove member from bucket
router.delete('/:bucketName/members', requireAuth, auditLog('bucket_member_remove'), async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { username, role = 'rw' } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!['rw', 'ro'].includes(role.toLowerCase())) {
      return res.status(400).json({ error: 'Role must be either "rw" or "ro"' });
    }

    const groupName = `grp-${bucketName}-${role.toLowerCase()}`;
    await mcAdmin.removeUserFromGroup(username, groupName);

    res.json({
      success: true,
      bucket: bucketName,
      user: username,
      role: role.toLowerCase(),
      group: groupName
    });

  } catch (error) {
    console.error('Error removing bucket member:', error);
    res.status(500).json({ 
      error: 'Failed to remove bucket member',
      details: error.message 
    });
  }
});

// Update bucket default policy (UI helper)
router.patch('/:bucketName/policy', requireAuth, auditLog('bucket_policy_update'), async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { defaultPolicy } = req.body;

    if (!['RW', 'RO'].includes(defaultPolicy)) {
      return res.status(400).json({ error: 'Default policy must be either "RW" or "RO"' });
    }

    // This is mainly for UI state management
    // The actual policies are already created and attached to groups
    res.json({
      success: true,
      bucket: bucketName,
      defaultPolicy
    });

  } catch (error) {
    console.error('Error updating bucket policy:', error);
    res.status(500).json({ 
      error: 'Failed to update bucket policy',
      details: error.message 
    });
  }
});

module.exports = router;