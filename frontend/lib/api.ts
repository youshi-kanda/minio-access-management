import axios, { AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import type { 
  AuthResponse, 
  AuthStatus, 
  Bucket, 
  BucketCreateRequest,
  BucketMembersResponse,
  MinIOUser,
  CreateUserRequest,
  InviteRequest,
  InviteDetails,
  InviteAcceptRequest,
  ActiveInvite
} from '../types';

// API base URLs
const ADMIN_API_BASE = process.env.NEXT_PUBLIC_ADMIN_BASE || '/api/admin';
const FILES_API_BASE = process.env.NEXT_PUBLIC_FILES_BASE || '/api/files';

// Create axios instances
const adminApi: AxiosInstance = axios.create({
  baseURL: ADMIN_API_BASE,
  withCredentials: true,
  timeout: 30000,
});

const filesApi: AxiosInstance = axios.create({
  baseURL: FILES_API_BASE,
  withCredentials: true,
  timeout: 60000, // Longer timeout for file operations
});

// Request interceptor for error handling
const setupInterceptors = (api: AxiosInstance, apiName: string) => {
  api.interceptors.request.use(
    (config) => {
      // Add request timestamp for debugging (store in config params for debugging)
      if (process.env.NODE_ENV === 'development') {
        console.log(`${apiName} Request:`, config.url, new Date());
      }
      return config;
    },
    (error) => {
      console.error(`${apiName} Request Error:`, error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log response time in development
      if (process.env.NODE_ENV === 'development') {
        const endTime = new Date();
        const duration = endTime.getTime() - (response.config.metadata?.startTime?.getTime() || endTime.getTime());
        console.log(`${apiName} ${response.config.method?.toUpperCase()} ${response.config.url}: ${duration}ms`);
      }
      return response;
    },
    (error) => {
      console.error(`${apiName} Response Error:`, error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        // Redirect to login or show auth required message
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } else if (error.response?.status >= 500) {
        toast.error('サーバーエラーが発生しました。しばらく後にもう一度お試しください。');
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      }
      
      return Promise.reject(error);
    }
  );
};

setupInterceptors(adminApi, 'AdminAPI');
setupInterceptors(filesApi, 'FilesAPI');

// Auth API
export const auth = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await adminApi.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (): Promise<{ success: boolean }> => {
    const response = await adminApi.post('/auth/logout');
    return response.data;
  },

  getUser: async (): Promise<AuthResponse> => {
    const response = await adminApi.get('/auth/me');
    return response.data;
  },

  getStatus: async (): Promise<AuthStatus> => {
    const response = await adminApi.get('/auth/status');
    return response.data;
  },
};

// Buckets API
export const buckets = {
  list: async (): Promise<{ buckets: Bucket[] }> => {
    const response = await adminApi.get('/buckets');
    return response.data;
  },

  create: async (data: BucketCreateRequest): Promise<any> => {
    const response = await adminApi.post('/buckets', data);
    return response.data;
  },

  getMembers: async (bucketName: string, role: 'rw' | 'ro' = 'rw'): Promise<BucketMembersResponse> => {
    const response = await adminApi.get(`/buckets/${bucketName}/members?role=${role}`);
    return response.data;
  },

  addMember: async (bucketName: string, username: string, role: 'rw' | 'ro' = 'rw'): Promise<any> => {
    const response = await adminApi.post(`/buckets/${bucketName}/members`, { username, role });
    return response.data;
  },

  removeMember: async (bucketName: string, username: string, role: 'rw' | 'ro' = 'rw'): Promise<any> => {
    const response = await adminApi.delete(`/buckets/${bucketName}/members`, { data: { username, role } });
    return response.data;
  },

  updatePolicy: async (bucketName: string, defaultPolicy: 'RW' | 'RO'): Promise<any> => {
    const response = await adminApi.patch(`/buckets/${bucketName}/policy`, { defaultPolicy });
    return response.data;
  },
};

// Users API
export const users = {
  list: async (): Promise<{ users: MinIOUser[] }> => {
    const response = await adminApi.get('/users');
    return response.data;
  },

  create: async (data: CreateUserRequest): Promise<any> => {
    const response = await adminApi.post('/users', data);
    return response.data;
  },

  get: async (username: string): Promise<{ user: MinIOUser }> => {
    const response = await adminApi.get(`/users/${username}`);
    return response.data;
  },

  enable: async (username: string): Promise<any> => {
    const response = await adminApi.patch(`/users/${username}/enable`);
    return response.data;
  },

  disable: async (username: string): Promise<any> => {
    const response = await adminApi.patch(`/users/${username}/disable`);
    return response.data;
  },

  delete: async (username: string): Promise<any> => {
    const response = await adminApi.delete(`/users/${username}`);
    return response.data;
  },

  generatePassword: async (): Promise<{ password: string }> => {
    const response = await adminApi.get('/users/generate-password');
    return response.data;
  },
};

// Invitations API
export const invites = {
  send: async (data: InviteRequest): Promise<any> => {
    const response = await adminApi.post('/invite', data);
    return response.data;
  },

  getDetails: async (token: string): Promise<InviteDetails> => {
    const response = await adminApi.get(`/invite/details/${token}`);
    return response.data;
  },

  accept: async (data: InviteAcceptRequest): Promise<any> => {
    const response = await adminApi.post('/invite/accept', data);
    return response.data;
  },

  list: async (): Promise<{ invitations: ActiveInvite[] }> => {
    const response = await adminApi.get('/invite');
    return response.data;
  },
};

// Helper functions
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  } else if (error.message) {
    return error.message;
  } else {
    return '予期しないエラーが発生しました';
  }
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const message = errorMessage || handleApiError(error);
    toast.error(message);
    throw error;
  }
};

// Export API instances for direct use if needed
export { adminApi, filesApi };