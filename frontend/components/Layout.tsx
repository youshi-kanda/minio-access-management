import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import {
  HomeIcon,
  FolderIcon,
  UsersIcon,
  CogIcon,
  LogoutIcon,
  MailIcon,
} from '@heroicons/react/outline';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: HomeIcon },
  { name: 'バケット管理', href: '/buckets', icon: FolderIcon },
  { name: 'ユーザー管理', href: '/users', icon: UsersIcon },
  { name: '招待管理', href: '/invitations', icon: MailIcon },
];

export default function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">MinIO Access</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 text-sm font-medium">
                    {user?.displayName?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.displayName || 'ユーザー'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                href="/settings"
                className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <CogIcon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                設定
              </Link>
              <button
                onClick={handleLogout}
                className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <LogoutIcon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div>
                {title && (
                  <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <Link
                  href="/files"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  ファイル管理
                </Link>
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}