import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  HomeIcon,
  FolderIcon,
  SearchIcon,
  UploadIcon,
  LogoutIcon,
  CogIcon,
  UserIcon,
} from '@heroicons/react/outline';
import { fileApi } from '../lib/fileApi';

interface FileLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function FileLayout({ children, title }: FileLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const status = await fileApi.auth.getStatus();
      setIsAuthenticated(status.authenticated);
      setUser(status.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fileApi.auth.logout();
      setUser(null);
      setIsAuthenticated(false);
      router.push('/files/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">認証が必要です</h2>
          <Link href="/files/login" className="btn-primary">
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/files" className="flex items-center space-x-2">
                <FolderIcon className="h-6 w-6 text-primary-600" />
                <h1 className="text-xl font-bold text-gray-900">MinIO Files</h1>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/files/upload"
                className="btn-primary"
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                アップロード
              </Link>
              
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 text-sm font-medium">
                    {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.displayName || user?.email}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-gray-600"
                    title="ログアウト"
                  >
                    <LogoutIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          </div>
        )}
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>MinIO Access Management System</p>
            <div className="flex items-center space-x-4">
              <Link href="/admin" target="_blank" rel="noopener noreferrer">
                管理画面
              </Link>
              <span>•</span>
              <span>{new Date().toLocaleDateString('ja-JP')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}