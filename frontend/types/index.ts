// User and Authentication types
export interface User {
  email: string;
  displayName: string;
  isAdmin: boolean;
  loginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: User | null;
}

// Bucket types
export interface Bucket {
  name: string;
  created: string;
  size: number;
  versioning?: boolean;
}

export interface BucketCreateRequest {
  name: string;
  versioning?: boolean;
  defaultPolicy?: 'RW' | 'RO';
  initialMember?: boolean;
}

export interface BucketMember {
  username: string;
  status: 'enabled' | 'disabled';
  memberOf: string[];
}

export interface BucketMembersResponse {
  bucket: string;
  role: 'rw' | 'ro';
  group: string;
  members: string[];
}

// User Management types
export interface MinIOUser {
  username: string;
  status: 'enabled' | 'disabled';
  policyName?: string;
  memberOf: string[];
}

export interface CreateUserRequest {
  username: string;
  secret: string;
  displayName?: string;
  email?: string;
}

// Invitation types
export interface InviteRequest {
  email: string;
  bucket: string;
  role: 'rw' | 'ro';
  recipientName?: string;
}

export interface InviteDetails {
  email: string;
  bucket: string;
  role: 'rw' | 'ro';
  expiresAt: string;
  valid: boolean;
}

export interface InviteAcceptRequest {
  token: string;
  newSecret: string;
  displayName?: string;
}

export interface ActiveInvite {
  token: string;
  email: string;
  bucket: string;
  role: 'rw' | 'ro';
  createdAt: string;
  expiresAt: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// File types (for File UI)
export interface MinIOObject {
  Key: string;
  Size: number;
  LastModified: string;
  ETag: string;
  StorageClass?: string;
}

export interface CommonPrefix {
  Prefix: string;
}

export interface ListObjectsResponse {
  objects: MinIOObject[];
  commonPrefixes: CommonPrefix[];
  isTruncated: boolean;
  nextToken?: string;
  prefix: string;
  delimiter: string;
}

export interface SignedUrlResponse {
  url: string;
  expiresIn: number;
  expiresAt: string;
  disposition: 'inline' | 'download';
}

export interface UploadResult {
  success: boolean;
  key: string;
  etag: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

// UI State types
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortOptions<T> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

// Toast/Notification types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

// Dashboard types
export interface DashboardStats {
  totalBuckets: number;
  totalUsers: number;
  totalObjects: number;
  totalStorage: number;
  recentActivity: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details?: string;
  status: 'success' | 'error';
}