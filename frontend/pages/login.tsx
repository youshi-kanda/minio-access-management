import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/api';
import toast from 'react-hot-toast';

interface AuthConfig {
  googleOAuth: boolean;
  allowedDomain: string;
  temporaryAuth: boolean;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check for OAuth errors in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      switch (error) {
        case 'oauth_failed':
          toast.error('Google OAuth認証に失敗しました');
          break;
        case 'callback_failed':
          toast.error('認証処理中にエラーが発生しました');
          break;
        default:
          toast.error('認証エラーが発生しました');
      }
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load auth configuration
  useEffect(() => {
    loadAuthConfig();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const loadAuthConfig = async () => {
    try {
      const response = await fetch('/api/admin/auth/config');
      const config = await response.json();
      setAuthConfig(config);
    } catch (error) {
      console.error('Failed to load auth config:', error);
      // Set default config if API fails
      setAuthConfig({
        googleOAuth: false,
        allowedDomain: '',
        temporaryAuth: true
      });
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
      const success = await login(email, password);
      
      if (success) {
        toast.success('ログインしました');
        router.push('/');
      } else {
        toast.error('メールアドレスまたはパスワードが正しくありません');
      }
    } catch (error) {
      toast.error('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/admin/auth/google';
  };

  if (isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (!authConfig) {
    return (
      <>
        <Head>
          <title>ログイン中... - MinIO Access Management</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="spinner mb-4 mx-auto"></div>
            <p className="text-gray-600">認証設定を読み込んでいます...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>ログイン - MinIO Access Management</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              MinIO Access Management
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              管理者アカウントでログインしてください
            </p>
            {authConfig.allowedDomain && (
              <p className="mt-1 text-center text-xs text-primary-600">
                {authConfig.allowedDomain} ドメインのみ許可
              </p>
            )}
          </div>

          <div className="space-y-6">
            {/* Google OAuth Login */}
            {authConfig.googleOAuth && (
              <div>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google でログイン
                </button>

                {authConfig.temporaryAuth && (
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-50 text-gray-500">または</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Traditional Login Form */}
            {authConfig.temporaryAuth && (
              <form className="space-y-6" onSubmit={handleSubmit}>
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
                      placeholder="admin@example.com"
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

                {process.env.NODE_ENV === 'development' && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      開発環境では任意のメールアドレスと「admin123」でログインできます
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Development help */}
          {process.env.NODE_ENV === 'development' && authConfig.temporaryAuth && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                開発モード
              </h3>
              <p className="text-xs text-yellow-700">
                メール: admin@example.com<br />
                パスワード: admin123
              </p>
              {!authConfig.googleOAuth && (
                <p className="text-xs text-yellow-700 mt-2">
                  Google OAuth は設定されていません。<br />
                  GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を .env に設定してください。
                </p>
              )}
            </div>
          )}

          {/* Production OAuth Notice */}
          {process.env.NODE_ENV === 'production' && authConfig.googleOAuth && !authConfig.temporaryAuth && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                本番環境では Google OAuth 認証のみ利用可能です
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}