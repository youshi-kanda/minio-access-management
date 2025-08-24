import axios, { AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import type { 
  ListObjectsResponse,
  SignedUrlResponse,
  UploadResult,
  MinIOObject
} from '../types';

// Files API base URL
const FILES_API_BASE = process.env.NEXT_PUBLIC_FILES_BASE || '/api/files';

// Create axios instance for files API
const filesApi: AxiosInstance = axios.create({
  baseURL: FILES_API_BASE,
  withCredentials: true,
  timeout: 60000, // Longer timeout for file operations
});

// Request/Response interceptors
filesApi.interceptors.request.use(
  (config) => {
    // Add request timestamp for debugging (store in config params for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('Files API Request:', config.url, new Date());
    }
    return config;
  },
  (error) => {
    console.error('Files API Request Error:', error);
    return Promise.reject(error);
  }
);

filesApi.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Files API ${response.config.method?.toUpperCase()} ${response.config.url}: ${response.status}`);
    }
    return response;
  },
  (error) => {
    console.error('Files API Response Error:', error);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else if (error.response?.status >= 500) {
      toast.error('ファイルサーバーエラーが発生しました。しばらく後にもう一度お試しください。');
    } else if (error.response?.data?.error) {
      toast.error(error.response.data.error);
    }
    
    return Promise.reject(error);
  }
);

// Files API functions
export const fileApi = {
  // List objects in bucket
  listObjects: async (
    bucket: string,
    prefix: string = '',
    delimiter: string = '',
    token?: string,
    maxKeys: number = 1000
  ): Promise<ListObjectsResponse> => {
    const params = new URLSearchParams({
      bucket,
      prefix,
      delimiter,
      maxKeys: maxKeys.toString(),
    });
    
    if (token) {
      params.append('token', token);
    }

    const response = await filesApi.get(`/objects?${params}`);
    return response.data;
  },

  // Search objects
  searchObjects: async (
    bucket: string,
    searchTerm: string,
    prefix: string = ''
  ): Promise<{ objects: MinIOObject[]; total: number }> => {
    const params = new URLSearchParams({
      bucket,
      search: searchTerm,
      prefix,
    });

    const response = await filesApi.get(`/objects?${params}`);
    return {
      objects: response.data.objects,
      total: response.data.total,
    };
  },

  // Get folder structure
  getFolderStructure: async (
    bucket: string,
    prefix: string = ''
  ): Promise<{
    currentPrefix: string;
    folders: Array<{ name: string; fullPath: string; type: string }>;
    files: Array<{ name: string; fullPath: string; size: number; lastModified: string; type: string }>;
  }> => {
    const params = new URLSearchParams({
      bucket,
      prefix,
    });

    const response = await filesApi.get(`/folders?${params}`);
    return response.data;
  },

  // Get object metadata
  getObjectInfo: async (bucket: string, key: string): Promise<any> => {
    const params = new URLSearchParams({
      bucket,
      key,
    });

    const response = await filesApi.get(`/object-info?${params}`);
    return response.data.object;
  },

  // Generate signed URL
  getSignedUrl: async (
    bucket: string,
    key: string,
    disposition: 'inline' | 'download' = 'inline',
    expiresIn?: number
  ): Promise<SignedUrlResponse> => {
    const params = new URLSearchParams({
      bucket,
      key,
      disposition,
    });

    if (expiresIn) {
      params.append('expiresIn', expiresIn.toString());
    }

    const response = await filesApi.get(`/object-url?${params}`);
    return response.data;
  },

  // Upload single file
  uploadFile: async (
    bucket: string,
    file: File,
    path: string = '',
    metadata: Record<string, string> = {},
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await filesApi.post(`/upload?bucket=${bucket}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.file;
  },

  // Upload multiple files
  uploadMultipleFiles: async (
    bucket: string,
    files: File[],
    path: string = '',
    metadata: Record<string, string> = {},
    onProgress?: (progress: number) => void
  ): Promise<{
    uploaded: UploadResult[];
    failed: Array<{ file: string; error: string }>;
    total: number;
    succeeded: number;
    failedCount: number;
  }> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('path', path);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await filesApi.post(`/upload-multiple?bucket=${bucket}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  // Delete single object
  deleteObject: async (bucket: string, key: string): Promise<void> => {
    const params = new URLSearchParams({
      bucket,
      key,
    });

    await filesApi.delete(`/object?${params}`);
  },

  // Delete multiple objects
  deleteMultipleObjects: async (bucket: string, keys: string[]): Promise<{
    deleted: Array<{ key: string; success: boolean }>;
    errors: Array<{ key: string; error: string }>;
    total: number;
    succeeded: number;
    failed: number;
  }> => {
    const params = new URLSearchParams({
      bucket,
    });

    const response = await filesApi.delete(`/objects?${params}`, {
      data: { keys },
    });

    return response.data;
  },

  // Check bucket access
  validateBucketAccess: async (bucket: string): Promise<{ hasAccess: boolean }> => {
    const params = new URLSearchParams({
      bucket,
    });

    const response = await filesApi.get(`/bucket-access?${params}`);
    return response.data;
  },

  // Auth endpoints (shared with admin)
  auth: {
    getStatus: async (): Promise<{ authenticated: boolean; user: any }> => {
      const response = await filesApi.get('/auth/status');
      return response.data;
    },

    login: async (email: string, password: string): Promise<{ success: boolean; user?: any }> => {
      const response = await filesApi.post('/auth/login', { email, password });
      return response.data;
    },

    logout: async (): Promise<{ success: boolean }> => {
      const response = await filesApi.post('/auth/logout');
      return response.data;
    },
  },
};

// Helper functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

export const isImageFile = (filename: string): boolean => {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  return imageExts.includes(getFileExtension(filename));
};

export const isVideoFile = (filename: string): boolean => {
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  return videoExts.includes(getFileExtension(filename));
};

export const isTextFile = (filename: string): boolean => {
  const textExts = ['txt', 'md', 'json', 'xml', 'csv', 'log', 'js', 'ts', 'html', 'css'];
  return textExts.includes(getFileExtension(filename));
};

export const isPdfFile = (filename: string): boolean => {
  return getFileExtension(filename) === 'pdf';
};

export const getFileIcon = (filename: string): string => {
  const ext = getFileExtension(filename);
  
  if (isImageFile(filename)) return '🖼️';
  if (isVideoFile(filename)) return '🎥';
  if (isPdfFile(filename)) return '📄';
  if (isTextFile(filename)) return '📝';
  if (ext === 'zip' || ext === 'rar' || ext === '7z') return '📦';
  if (ext === 'exe' || ext === 'dmg' || ext === 'app') return '⚙️';
  
  return '📄'; // Default file icon
};

export default filesApi;