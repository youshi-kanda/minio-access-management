import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useRequireAuth } from '../hooks/useAuth';
import { invites, buckets } from '../lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MailIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshIcon,
} from '@heroicons/react/outline';
import type { Bucket, Invitation } from '../types';

export default function InvitationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [bucketsList, setBucketsList] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    bucket: '',
    role: 'rw' as 'rw' | 'ro',
    recipientName: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invitationsData, bucketsData] = await Promise.all([
        invites.list(),
        buckets.list(),
      ]);
      
      setInvitations(invitationsData.invitations || []);
      setBucketsList(bucketsData.buckets || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.bucket) {
      toast.error('メールアドレスとバケットを選択してください');
      return;
    }

    setSending(true);
    try {
      await invites.send({
        email: formData.email,
        bucket: formData.bucket,
        role: formData.role,
        recipientName: formData.recipientName,
      });

      toast.success('招待メールを送信しました');
      setFormData({
        email: '',
        bucket: '',
        role: 'rw',
        recipientName: '',
      });
      setShowCreateForm(false);
      await loadData(); // Reload data
    } catch (error: any) {
      console.error('Failed to send invite:', error);
      toast.error(error.response?.data?.error || '招待の送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      return '期限切れ';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) {
      return `${minutes}分`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours}時間${minutes % 60}分`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout title="招待管理">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">招待管理</h1>
            <p className="text-gray-600 mt-1">
              MinIOバケットへのアクセス招待を管理します
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-outline"
            >
              <RefreshIcon className="h-4 w-4 mr-2" />
              更新
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              招待を送信
            </button>
          </div>
        </div>

        {/* Create Invitation Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  新しい招待を送信
                </h3>
              </div>
              
              <form onSubmit={handleSendInvite} className="p-6 space-y-4">
                <div>
                  <label className="label">
                    メールアドレス <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="input"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">
                    受信者名 (オプション)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="山田 太郎"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">
                    バケット <span className="text-danger-500">*</span>
                  </label>
                  <select
                    required
                    className="input"
                    value={formData.bucket}
                    onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
                  >
                    <option value="">バケットを選択</option>
                    {bucketsList.map((bucket) => (
                      <option key={bucket.name} value={bucket.name}>
                        {bucket.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">権限</label>
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'rw' | 'ro' })}
                  >
                    <option value="rw">読み取り・書き込み</option>
                    <option value="ro">読み取り専用</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-outline"
                    disabled={sending}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn-primary"
                  >
                    {sending ? (
                      <>
                        <span className="spinner mr-2"></span>
                        送信中...
                      </>
                    ) : (
                      '招待を送信'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invitations List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              送信済み招待 ({invitations.length})
            </h3>
          </div>
          
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="spinner"></div>
              </div>
            ) : invitations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        受信者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        バケット
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        権限
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        有効期限
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        送信日時
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invitations.map((invitation) => (
                      <tr key={invitation.token}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MailIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {invitation.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {invitation.bucket}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invitation.role === 'rw'
                              ? 'bg-success-100 text-success-800'
                              : 'bg-primary-100 text-primary-800'
                          }`}>
                            {invitation.role === 'rw' ? '読み取り・書き込み' : '読み取り専用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {new Date(invitation.expiresAt) > new Date() ? (
                              <>
                                <ClockIcon className="h-4 w-4 text-warning-500 mr-1" />
                                <span className="text-sm text-warning-600">待機中</span>
                              </>
                            ) : (
                              <>
                                <XCircleIcon className="h-4 w-4 text-danger-500 mr-1" />
                                <span className="text-sm text-danger-600">期限切れ</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimeRemaining(invitation.expiresAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invitation.createdAt).toLocaleString('ja-JP')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <MailIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  送信済み招待がありません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  新しい招待を送信してバケットアクセスを共有しましょう
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="btn-primary"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    最初の招待を送信
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            招待システムについて
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• 招待メールには一時的なセットアップリンクが含まれます</p>
            <p>• 受信者はリンクから新しいパスワードを設定してアカウントを作成します</p>
            <p>• 招待リンクは{process.env.INVITE_TTL_MINUTES || '10'}分間有効です</p>
            <p>• 作成されたアカウントで直接ファイル管理システムにアクセスできます</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}