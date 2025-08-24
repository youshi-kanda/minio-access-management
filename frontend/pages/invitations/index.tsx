import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRequireAuth } from '../../hooks/useAuth';
import { invites, buckets } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MailIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/outline';
import type { ActiveInvite, InviteRequest, Bucket, TableColumn } from '../../types';

export default function InvitationsPage() {
  const { isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const [inviteList, setInviteList] = useState<ActiveInvite[]>([]);
  const [bucketList, setBucketList] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState<InviteRequest>({
    email: '',
    bucket: '',
    role: 'rw',
    recipientName: '',
  });
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (router.query.action === 'send') {
      setShowSendModal(true);
      router.replace('/invitations', undefined, { shallow: true });
    }
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invitesData, bucketsData] = await Promise.all([
        invites.list(),
        buckets.list(),
      ]);
      
      setInviteList(invitesData.invitations);
      setBucketList(bucketsData.buckets);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sendForm.email.trim() || !sendForm.bucket.trim()) {
      toast.error('メールアドレスとバケットを選択してください');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sendForm.email)) {
      toast.error('有効なメールアドレスを入力してください');
      return;
    }

    setSendLoading(true);
    try {
      await invites.send(sendForm);
      toast.success('招待メールを送信しました');
      setShowSendModal(false);
      setSendForm({
        email: '',
        bucket: '',
        role: 'rw',
        recipientName: '',
      });
      await loadData();
    } catch (error) {
      console.error('Failed to send invite:', error);
    } finally {
      setSendLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      return '期限切れ';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) {
      return `${minutes}分後`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours}時間${minutes % 60}分後`;
  };

  const columns: TableColumn<ActiveInvite>[] = [
    {
      key: 'email',
      label: 'メールアドレス',
      sortable: true,
      render: (invite) => (
        <div className="flex items-center space-x-2">
          <MailIcon className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{invite.email}</span>
        </div>
      ),
    },
    {
      key: 'bucket',
      label: 'バケット',
      sortable: true,
      render: (invite) => (
        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
          {invite.bucket}
        </span>
      ),
    },
    {
      key: 'role',
      label: '権限',
      render: (invite) => (
        <span className={`badge ${invite.role === 'rw' ? 'badge-success' : 'badge-info'}`}>
          {invite.role === 'rw' ? '読み取り・書き込み' : '読み取り専用'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: '送信日時',
      sortable: true,
      render: (invite) => (
        <span className="text-sm text-gray-600">
          {formatDate(invite.createdAt)}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      label: '有効期限',
      render: (invite) => {
        const timeRemaining = getTimeRemaining(invite.expiresAt);
        const isExpired = timeRemaining === '期限切れ';
        
        return (
          <div className="flex items-center space-x-2">
            <ClockIcon className={`h-4 w-4 ${isExpired ? 'text-danger-500' : 'text-warning-500'}`} />
            <span className={`text-sm ${isExpired ? 'text-danger-600' : 'text-warning-600'}`}>
              {timeRemaining}
            </span>
          </div>
        );
      },
    },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout title="招待管理">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">招待一覧</h2>
            <p className="text-sm text-gray-600">
              バケットアクセスの招待メール送信と管理を行います
            </p>
          </div>
          <button
            onClick={() => setShowSendModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            招待を送信
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-semibold text-primary-600">
                {inviteList.length}
              </div>
              <div className="text-sm text-gray-600">アクティブな招待</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-semibold text-success-600">
                {inviteList.filter(invite => new Date(invite.expiresAt) > new Date()).length}
              </div>
              <div className="text-sm text-gray-600">有効な招待</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-semibold text-danger-600">
                {inviteList.filter(invite => new Date(invite.expiresAt) <= new Date()).length}
              </div>
              <div className="text-sm text-gray-600">期限切れ</div>
            </div>
          </div>
        </div>

        {/* Invitations Table */}
        <Table
          columns={columns}
          data={inviteList}
          loading={loading}
          emptyMessage="アクティブな招待はありません。"
        />

        {/* Send Invite Modal */}
        <Modal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          title="招待メール送信"
          size="md"
        >
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="label">
                メールアドレス <span className="text-danger-500">*</span>
              </label>
              <input
                type="email"
                className="input"
                placeholder="例: user@example.com"
                value={sendForm.email}
                onChange={(e) => setSendForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">受信者名（任意）</label>
              <input
                type="text"
                className="input"
                placeholder="例: 田中太郎"
                value={sendForm.recipientName}
                onChange={(e) => setSendForm(prev => ({ ...prev, recipientName: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                メール本文で使用される名前です
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  バケット <span className="text-danger-500">*</span>
                </label>
                <select
                  className="input"
                  value={sendForm.bucket}
                  onChange={(e) => setSendForm(prev => ({ ...prev, bucket: e.target.value }))}
                  required
                >
                  <option value="">バケットを選択</option>
                  {bucketList.map((bucket) => (
                    <option key={bucket.name} value={bucket.name}>
                      {bucket.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">権限レベル</label>
                <select
                  className="input"
                  value={sendForm.role}
                  onChange={(e) => setSendForm(prev => ({ ...prev, role: e.target.value as 'rw' | 'ro' }))}
                >
                  <option value="rw">読み取り・書き込み</option>
                  <option value="ro">読み取り専用</option>
                </select>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <ClockIcon className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">招待の有効期限について</p>
                  <p>招待リンクは送信から10分間有効です。受信者は期限内に設定を完了する必要があります。</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="btn-outline"
                disabled={sendLoading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={sendLoading}
              >
                {sendLoading ? (
                  <>
                    <span className="spinner mr-2"></span>
                    送信中...
                  </>
                ) : (
                  <>
                    <MailIcon className="h-4 w-4 mr-2" />
                    送信
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}