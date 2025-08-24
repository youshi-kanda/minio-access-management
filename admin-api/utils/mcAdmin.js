const { execSync, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class MCAdminWrapper {
  constructor() {
    this.alias = process.env.MINIO_ALIAS || 'myminio';
    this.endpoint = process.env.MINIO_ENDPOINT;
    this.accessKey = process.env.MINIO_ADMIN_ACCESS_KEY;
    this.secretKey = process.env.MINIO_ADMIN_SECRET_KEY;
  }

  // Initialize mc alias if not exists
  async initAlias() {
    try {
      const cmd = `mc alias set ${this.alias} ${this.endpoint} ${this.accessKey} ${this.secretKey} --api S3v4`;
      execSync(cmd, { stdio: 'pipe' });
      console.log(`MC alias ${this.alias} initialized`);
    } catch (error) {
      console.error('Failed to initialize mc alias:', error.message);
      throw error;
    }
  }

  // Execute mc command with error handling
  async execMC(command) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000 // 30 seconds timeout
      });
      return result.trim();
    } catch (error) {
      console.error(`MC command failed: ${command}`);
      console.error('Error:', error.message);
      throw new Error(`MinIO command failed: ${error.message}`);
    }
  }

  // Create bucket with versioning
  async createBucket(bucketName, versioning = true) {
    await this.execMC(`mc mb ${this.alias}/${bucketName}`);
    
    if (versioning) {
      await this.execMC(`mc version enable ${this.alias}/${bucketName}`);
    }
    
    return { success: true, bucket: bucketName, versioning };
  }

  // List all buckets
  async listBuckets() {
    const result = await this.execMC(`mc ls ${this.alias} --json`);
    const buckets = result.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(item => item.type === 'folder');
    
    return buckets.map(bucket => ({
      name: bucket.key,
      created: bucket.lastModified,
      size: bucket.size || 0
    }));
  }

  // Create policy from template
  async createPolicy(policyName, bucketName, type = 'rw') {
    const templatePath = path.join(__dirname, '../../policies', `${type}-template.json`);
    const template = await fs.readFile(templatePath, 'utf8');
    const policy = template.replace(/\$BUCKET/g, bucketName);
    
    const policyPath = path.join(__dirname, '../../policies', `${policyName}.json`);
    await fs.writeFile(policyPath, policy);
    
    await this.execMC(`mc admin policy add ${this.alias} ${policyName} ${policyPath}`);
    
    return { success: true, policy: policyName, type };
  }

  // Create group
  async createGroup(groupName) {
    await this.execMC(`mc admin group add ${this.alias} ${groupName}`);
    return { success: true, group: groupName };
  }

  // Attach policy to group
  async attachPolicyToGroup(policyName, groupName) {
    await this.execMC(`mc admin policy attach ${this.alias} ${policyName} --group ${groupName}`);
    return { success: true, policy: policyName, group: groupName };
  }

  // Add user to group
  async addUserToGroup(username, groupName) {
    await this.execMC(`mc admin group add ${this.alias} ${groupName} ${username}`);
    return { success: true, user: username, group: groupName };
  }

  // Remove user from group
  async removeUserFromGroup(username, groupName) {
    await this.execMC(`mc admin group remove ${this.alias} ${groupName} ${username}`);
    return { success: true, user: username, group: groupName };
  }

  // List group members
  async listGroupMembers(groupName) {
    try {
      const result = await this.execMC(`mc admin group info ${this.alias} ${groupName} --json`);
      const info = JSON.parse(result);
      return info.members || [];
    } catch (error) {
      if (error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  // Create user
  async createUser(username, password, displayName = '', email = '') {
    await this.execMC(`mc admin user add ${this.alias} ${username} ${password}`);
    
    // Store additional user info (in a real system, this would be in a database)
    const userInfo = {
      username,
      displayName,
      email,
      created: new Date().toISOString(),
      status: 'enabled'
    };
    
    return { success: true, user: userInfo };
  }

  // List users
  async listUsers() {
    const result = await this.execMC(`mc admin user list ${this.alias} --json`);
    const users = result.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
    
    return users.map(user => ({
      username: user.accessKey,
      status: user.status,
      policyName: user.policyName || '',
      memberOf: user.memberOf || []
    }));
  }

  // Enable/disable user
  async setUserStatus(username, enabled = true) {
    const action = enabled ? 'enable' : 'disable';
    await this.execMC(`mc admin user ${action} ${this.alias} ${username}`);
    return { success: true, user: username, status: enabled ? 'enabled' : 'disabled' };
  }

  // Delete user
  async deleteUser(username) {
    await this.execMC(`mc admin user remove ${this.alias} ${username}`);
    return { success: true, user: username };
  }

  // Get bucket versioning status
  async getBucketVersioning(bucketName) {
    try {
      const result = await this.execMC(`mc version info ${this.alias}/${bucketName} --json`);
      const info = JSON.parse(result);
      return info.status === 'Enabled';
    } catch (error) {
      return false;
    }
  }
}

module.exports = MCAdminWrapper;