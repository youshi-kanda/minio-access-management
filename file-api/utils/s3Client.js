const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const mimeTypes = require('mime-types');

class MinIOClient {
  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT,
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ADMIN_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_ADMIN_SECRET_KEY,
      },
      forcePathStyle: true, // Required for MinIO
    });
    
    this.signUrlExpires = parseInt(process.env.SIGN_URL_EXPIRES) || 300; // 5 minutes default
  }

  // List objects in bucket with prefix
  async listObjects(bucketName, prefix = '', delimiter = '', token = null, maxKeys = 1000) {
    try {
      const params = {
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: delimiter,
        MaxKeys: maxKeys,
        ContinuationToken: token || undefined
      };

      const command = new ListObjectsV2Command(params);
      const response = await this.s3Client.send(command);

      return {
        objects: response.Contents || [],
        commonPrefixes: response.CommonPrefixes || [],
        isTruncated: response.IsTruncated || false,
        nextToken: response.NextContinuationToken,
        prefix: prefix,
        delimiter: delimiter
      };
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  }

  // Get object metadata
  async getObjectMetadata(bucketName, key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      
      return {
        key,
        size: response.ContentLength,
        lastModified: response.LastModified,
        contentType: response.ContentType,
        etag: response.ETag,
        metadata: response.Metadata || {}
      };
    } catch (error) {
      if (error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  // Generate signed URL for object access
  async getSignedUrl(bucketName, key, disposition = 'inline', expiresIn = null) {
    try {
      const expires = expiresIn || this.signUrlExpires;
      
      const params = {
        Bucket: bucketName,
        Key: key,
        ResponseContentDisposition: disposition === 'download' 
          ? `attachment; filename="${key.split('/').pop()}"` 
          : 'inline'
      };

      const command = new GetObjectCommand(params);
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expires });

      return {
        url: signedUrl,
        expiresIn: expires,
        expiresAt: new Date(Date.now() + expires * 1000),
        disposition
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  // Upload object
  async putObject(bucketName, key, body, contentType = null, metadata = {}) {
    try {
      // Auto-detect content type if not provided
      if (!contentType) {
        contentType = mimeTypes.lookup(key) || 'application/octet-stream';
      }

      const params = {
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadedBy: 'minio-file-api',
          uploadedAt: new Date().toISOString()
        }
      };

      const command = new PutObjectCommand(params);
      const response = await this.s3Client.send(command);

      return {
        success: true,
        key,
        etag: response.ETag,
        contentType,
        size: body.length || body.size || 0,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error uploading object:', error);
      throw error;
    }
  }

  // Delete object
  async deleteObject(bucketName, key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      });

      await this.s3Client.send(command);

      return {
        success: true,
        key,
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error deleting object:', error);
      throw error;
    }
  }

  // Delete multiple objects
  async deleteObjects(bucketName, keys) {
    const results = [];
    const errors = [];

    for (const key of keys) {
      try {
        const result = await this.deleteObject(bucketName, key);
        results.push(result);
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      deleted: results,
      errors: errors,
      total: keys.length,
      succeeded: results.length,
      failed: errors.length
    };
  }

  // Search objects by key pattern
  async searchObjects(bucketName, searchTerm, prefix = '') {
    try {
      const allObjects = [];
      let token = null;
      
      do {
        const result = await this.listObjects(bucketName, prefix, '', token);
        allObjects.push(...result.objects);
        token = result.nextToken;
      } while (token);

      // Filter objects by search term
      const searchRegex = new RegExp(searchTerm, 'i');
      const filteredObjects = allObjects.filter(obj => 
        searchRegex.test(obj.Key)
      );

      return {
        objects: filteredObjects,
        total: filteredObjects.length,
        searchTerm,
        prefix
      };
    } catch (error) {
      console.error('Error searching objects:', error);
      throw error;
    }
  }

  // Get folder structure (common prefixes)
  async getFolderStructure(bucketName, prefix = '') {
    try {
      const result = await this.listObjects(bucketName, prefix, '/');
      
      const folders = result.commonPrefixes.map(cp => ({
        name: cp.Prefix.replace(prefix, '').replace('/', ''),
        fullPath: cp.Prefix,
        type: 'folder'
      }));

      const files = result.objects.map(obj => ({
        name: obj.Key.replace(prefix, ''),
        fullPath: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
        type: 'file'
      }));

      return {
        currentPrefix: prefix,
        folders,
        files,
        totalFolders: folders.length,
        totalFiles: files.length
      };
    } catch (error) {
      console.error('Error getting folder structure:', error);
      throw error;
    }
  }

  // Validate bucket access
  async validateBucketAccess(bucketName) {
    try {
      await this.listObjects(bucketName, '', '', null, 1);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchBucket') {
        return false;
      }
      // If we get access denied, the bucket exists but we don't have permission
      if (error.name === 'AccessDenied') {
        throw new Error('Access denied to bucket');
      }
      throw error;
    }
  }
}

module.exports = MinIOClient;