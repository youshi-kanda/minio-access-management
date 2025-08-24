import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { invites } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationIcon,
  XCircleIcon,
} from '@heroicons/react/outline';
import type { InviteDetails } from '../../types';

export default function AcceptInvitePage() {
  const router = useRouter();
  const token = router.query.token as string;
  
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    newSecret: '',
    confirmSecret: '',
    displayName: '',
  });

  useEffect(() => {
    if (token) {
      loadInviteDetails();
    }
  }, [token]);

  const loadInviteDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await invites.getDetails(token);
      setInviteDetails(details);
    } catch (error: any) {
      console.error('Failed to load invite details:', error);
      if (error.response?.status === 404) {
        setError('招待リンクが無効です');
      } else if (error.response?.status === 409) {
        setError('この招待は既に使用されています');
      } else if (error.response?.status === 410) {
        setError('招待の有効期限が切れています');
      } else {
        setError('招待情報の読み込みに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newSecret || !formData.confirmSecret) {
      toast.error('パスワードを入力してください');
      return;
    }

    if (formData.newSecret !== formData.confirmSecret) {
      toast.error('パスワードが一致しません');
      return;
    }

    if (formData.newSecret.length < 8) {
      toast.error('パスワードは8文字以上である必要があります');
      return;
    }

    setAccepting(true);
    try {
      const result = await invites.accept({
        token,
        newSecret: formData.newSecret,
        displayName: formData.displayName,
      });

      setAccepted(true);
      toast.success('アカウントの設定が完了しました！');
      
      // Show success message for a few seconds then redirect
      setTimeout(() => {
        window.location.href = process.env.NEXT_PUBLIC_FILES_BASE || '/files';
      }, 3000);
      
    } catch (error: any) {
      console.error('Failed to accept invite:', error);
      if (error.response?.status === 409) {
        setError('このメールアドレスは既に使用されています');
      } else if (error.response?.status === 410) {
        setError('招待の有効期限が切れています');
      } else {
        toast.error('アカウント設定に失敗しました');
      }
    } finally {
      setAccepting(false);
    }
  };

  const getTimeRemaining = () => {
    if (!inviteDetails) return '';
    
    const now = new Date();
    const expiry = new Date(inviteDetails.expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      return '期限切れ';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) {
      return `${minutes}分後に期限切れ`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours}時間${minutes % 60}分後に期限切れ`;
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>招待を確認中... - MinIO Access Management</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="spinner mb-4 mx-auto"></div>
            <p className="text-gray-600">招待を確認しています...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>招待エラー - MinIO Access Management</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <XCircleIcon className="mx-auto h-12 w-12 text-danger-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">招待エラー</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => window.close()}
                className="btn-outline"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (accepted) {
    return (
      <>
        <Head>
          <title>設定完了 - MinIO Access Management</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-success-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">設定完了！</h2>
              <p className="text-gray-600 mb-6">
                アカウントの設定が完了しました。<br />
                まもなくファイル管理画面にリダイレクトされます。
              </p>
              <div className="animate-pulse">
                <div className="spinner mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">リダイレクト中...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!inviteDetails) {
    return null;
  }

  return (
    <>
      <Head>
        <title>招待受諾 - MinIO Access Management</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              MinIO アクセス招待
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              バケットアクセスのセットアップを完了してください
            </p>
          </div>

          {/* Invite Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">招待詳細</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">メールアドレス:</span>
                <span className="text-sm font-medium">{inviteDetails.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">バケット:</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {inviteDetails.bucket}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">権限:</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  inviteDetails.role === 'rw' 
                    ? 'bg-success-100 text-success-800' 
                    : 'bg-primary-100 text-primary-800'
                }`}>
                  {inviteDetails.role === 'rw' ? '読み取り・書き込み' : '読み取り専用'}
                </span>
              </div>
            </div>

            {/* Expiry Warning */}
            <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-md">
              <div className="flex items-center space-x-2">
                <ExclamationIcon className="h-4 w-4 text-warning-600" />
                <span className="text-sm text-warning-800">
                  {getTimeRemaining()}
                </span>
              </div>
            </div>
          </div>

          {/* Setup Form */}
          <form onSubmit={handleAcceptInvite} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">アカウント設定</h3>
            
            <div>
              <label className="label">表示名（任意）</label>
              <input
                type="text"
                className="input"
                placeholder="例: 田中太郎"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">
                パスワード <span className="text-danger-500">*</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="8文字以上のパスワード"
                value={formData.newSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, newSecret: e.target.value }))}
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                8文字以上の安全なパスワードを設定してください
              </p>
            </div>

            <div>
              <label className="label">
                パスワード確認 <span className="text-danger-500">*</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="パスワードを再入力"
                value={formData.confirmSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmSecret: e.target.value }))}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={accepting}
              className="w-full btn-primary"
            >
              {accepting ? (
                <>
                  <span className="spinner mr-2"></span>
                  設定中...
                </>
              ) : (
                '設定完了'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              設定完了後、MinIOファイル管理システムにアクセスできます
            </p>
          </div>
        </div>
      </div>
    </>
  );
}