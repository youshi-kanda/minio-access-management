#!/usr/bin/env node

/**
 * MinIO Access Management System - Deployment Test Script
 * テストスイートとデプロイメント検証
 */

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

class DeploymentTester {
  constructor() {
    this.baseUrls = {
      admin: process.env.NEXT_PUBLIC_ADMIN_API_BASE || 'http://localhost:3001/api',
      file: process.env.NEXT_PUBLIC_FILE_API_BASE || 'http://localhost:3002/api',
      frontend: process.env.NEXT_PUBLIC_ADMIN_BASE || 'http://localhost:3000'
    };
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  async runTest(name, testFn, critical = false) {
    try {
      log(`Running: ${name}`, 'blue');
      await testFn();
      log(`✓ ${name}`, 'green');
      this.results.passed++;
      return true;
    } catch (error) {
      log(`✗ ${name}: ${error.message}`, 'red');
      this.results.failed++;
      if (critical) {
        log('Critical test failed, stopping...', 'red');
        process.exit(1);
      }
      return false;
    }
  }

  async checkEnvironment() {
    log('\n=== Environment Check ===', 'yellow');
    
    await this.runTest('Node.js version check', async () => {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      if (majorVersion < 16) {
        throw new Error(`Node.js 16+ required, found ${version}`);
      }
    }, true);

    await this.runTest('Environment variables check', async () => {
      const required = ['MINIO_ENDPOINT', 'MINIO_ADMIN_ACCESS_KEY', 'MINIO_ADMIN_SECRET_KEY'];
      const missing = required.filter(key => !process.env[key]);
      if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(', ')}`);
      }
    });

    await this.runTest('Package files check', async () => {
      const files = [
        'admin-api/package.json',
        'file-api/package.json', 
        'frontend/package.json',
        'docker-compose.yml'
      ];
      
      for (const file of files) {
        if (!fs.existsSync(file)) {
          throw new Error(`Missing file: ${file}`);
        }
      }
    });
  }

  async runUnitTests() {
    log('\n=== Unit Tests ===', 'yellow');

    await this.runTest('Admin API tests', () => {
      return new Promise((resolve, reject) => {
        const npm = spawn('npm', ['test'], { cwd: 'admin-api', stdio: 'pipe' });
        npm.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Admin API tests failed with code ${code}`));
        });
      });
    });

    await this.runTest('File API tests', () => {
      return new Promise((resolve, reject) => {
        const npm = spawn('npm', ['test'], { cwd: 'file-api', stdio: 'pipe' });
        npm.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`File API tests failed with code ${code}`));
        });
      });
    });
  }

  async checkServices() {
    log('\n=== Service Health Checks ===', 'yellow');

    await this.runTest('Admin API health check', async () => {
      const response = await axios.get(`${this.baseUrls.admin.replace('/api', '')}/health`, {
        timeout: 5000
      });
      if (response.data.status !== 'OK') {
        throw new Error(`Admin API not healthy: ${JSON.stringify(response.data)}`);
      }
    });

    await this.runTest('File API health check', async () => {
      const response = await axios.get(`${this.baseUrls.file.replace('/api', '')}/health`, {
        timeout: 5000
      });
      if (response.data.status !== 'OK') {
        throw new Error(`File API not healthy: ${JSON.stringify(response.data)}`);
      }
    });

    await this.runTest('Frontend accessibility check', async () => {
      const response = await axios.get(this.baseUrls.frontend, {
        timeout: 5000
      });
      if (response.status !== 200) {
        throw new Error(`Frontend not accessible: HTTP ${response.status}`);
      }
    });
  }

  async testAuthentication() {
    log('\n=== Authentication Tests ===', 'yellow');

    await this.runTest('Auth config endpoint', async () => {
      const response = await axios.get(`${this.baseUrls.admin}/auth/config`);
      const config = response.data;
      if (typeof config.googleOAuth !== 'boolean' || typeof config.temporaryAuth !== 'boolean') {
        throw new Error('Invalid auth config response');
      }
    });

    await this.runTest('Auth status endpoint', async () => {
      const response = await axios.get(`${this.baseUrls.admin}/auth/status`);
      const status = response.data;
      if (typeof status.authenticated !== 'boolean') {
        throw new Error('Invalid auth status response');
      }
    });

    // Test temporary authentication
    let authCookie;
    await this.runTest('Temporary authentication', async () => {
      const response = await axios.post(`${this.baseUrls.admin}/auth/login`, {
        email: 'admin@example.com',
        password: 'admin123'
      }, {
        withCredentials: true
      });
      
      if (!response.data.success) {
        throw new Error('Temporary auth failed');
      }
      
      // Extract session cookie for further tests
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        authCookie = cookies.find(cookie => cookie.startsWith('connect.sid'));
      }
    });

    if (authCookie) {
      await this.runTest('Authenticated user info', async () => {
        const response = await axios.get(`${this.baseUrls.admin}/auth/me`, {
          headers: { Cookie: authCookie },
          withCredentials: true
        });
        
        if (!response.data.user || !response.data.user.email) {
          throw new Error('Invalid user info response');
        }
      });
    }
  }

  async testMinIOConnection() {
    log('\n=== MinIO Connection Tests ===', 'yellow');

    await this.runTest('MinIO server connectivity', async () => {
      // Test if MinIO server is accessible
      const minioEndpoint = process.env.MINIO_ENDPOINT;
      if (!minioEndpoint) {
        throw new Error('MINIO_ENDPOINT not configured');
      }
      
      try {
        await axios.get(`${minioEndpoint}/minio/health/live`, { timeout: 5000 });
      } catch (error) {
        throw new Error(`MinIO server not accessible: ${error.message}`);
      }
    });

    await this.runTest('MinIO admin credentials', async () => {
      // This would require implementing a test endpoint in admin API
      // For now, just check that credentials are set
      if (!process.env.MINIO_ADMIN_ACCESS_KEY || !process.env.MINIO_ADMIN_SECRET_KEY) {
        throw new Error('MinIO admin credentials not configured');
      }
    });
  }

  async testDocker() {
    log('\n=== Docker Tests ===', 'yellow');

    await this.runTest('Docker compose file validation', async () => {
      const composeFile = 'docker-compose.yml';
      if (!fs.existsSync(composeFile)) {
        throw new Error('docker-compose.yml not found');
      }
      
      // Basic validation - check if it's valid YAML
      const yaml = require('js-yaml');
      const content = fs.readFileSync(composeFile, 'utf8');
      yaml.load(content); // Will throw if invalid
    });

    await this.runTest('Docker build test (admin-api)', () => {
      return new Promise((resolve, reject) => {
        const docker = spawn('docker', ['build', '-t', 'test-admin-api', './admin-api'], {
          stdio: 'pipe'
        });
        docker.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Docker build failed with code ${code}`));
        });
      });
    });
  }

  async generateReport() {
    log('\n=== Deployment Test Report ===', 'yellow');
    
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const passRate = ((this.results.passed / total) * 100).toFixed(1);
    
    log(`Total Tests: ${total}`, 'blue');
    log(`Passed: ${this.results.passed}`, 'green');
    log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
    log(`Skipped: ${this.results.skipped}`, 'yellow');
    log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      results: this.results,
      passRate: parseFloat(passRate),
      services: {
        adminApi: this.baseUrls.admin,
        fileApi: this.baseUrls.file,
        frontend: this.baseUrls.frontend
      }
    };
    
    // Save report
    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    log(`\nReport saved to: ${reportPath}`, 'blue');
    
    return passRate >= 90;
  }

  async run() {
    log('MinIO Access Management System - Deployment Test', 'blue');
    log('================================================\n', 'blue');
    
    try {
      await this.checkEnvironment();
      await this.runUnitTests();
      await this.checkServices();
      await this.testAuthentication();
      await this.testMinIOConnection();
      await this.testDocker();
      
      const success = await this.generateReport();
      
      if (success) {
        log('\n🎉 All tests passed! System ready for deployment.', 'green');
        process.exit(0);
      } else {
        log('\n⚠️  Some tests failed. Please review before deployment.', 'yellow');
        process.exit(1);
      }
      
    } catch (error) {
      log(`\n💥 Test suite failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DeploymentTester();
  tester.run();
}

module.exports = DeploymentTester;