import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { fileApi } from '../../lib/fileApi';
import toast from 'react-hot-toast';
import { FolderIcon } from '@heroicons/react/24/outline';

export default function FilesLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if already authenticated
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const status = await fileApi.auth.getStatus();
      if (status.authenticated) {
        router.push('/files');
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fileApi.auth.login(email, password);
      
      if (response.success) {
        toast.success('ログインしました');
        router.push('/files');
      } else {
        toast.error('メールアドレスまたはパスワードが正しくありません');
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <>
        <Head>
          <title>認証確認中... - MinIO Files</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="spinner mb-4 mx-auto"></div>
            <p className="text-gray-600">認証状態を確認しています...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>ログイン - MinIO Files</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
              <FolderIcon className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              MinIO Files
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              ファイル管理システムにログインしてください
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="label">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="spinner mr-2"></span>
                    ログイン中...
                  </>
                ) : (
                  'ログイン'
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                開発環境では任意のメールアドレスと「admin123」でログインできます
              </p>
            </div>
          </form>

          {/* Development help */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                開発モード
              </h3>
              <p className="text-xs text-yellow-700">
                メール: user@example.com<br />
                パスワード: admin123
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-500">
              バケットへのアクセス権限は管理者が設定します
            </p>
            <a 
              href="/admin" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-500 text-sm"
            >
              管理画面を開く
            </a>
          </div>
        </div>
      </div>
    </>
  );
}