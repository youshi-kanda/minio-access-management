import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRequireAuth } from '../../hooks/useAuth';
import { buckets } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  CogIcon,
  UsersIcon,
  EyeIcon,
} from '@heroicons/react/outline';
import type { Bucket, BucketCreateRequest, TableColumn } from '../../types';

export default function BucketsPage() {
  const { isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const [bucketList, setBucketList] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<BucketCreateRequest>({
    name: '',
    versioning: true,
    defaultPolicy: 'RW',
    initialMember: true,
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadBuckets();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (router.query.action === 'create') {
      setShowCreateModal(true);
      // Remove query parameter
      router.replace('/buckets', undefined, { shallow: true });
    }
  }, [router]);

  const loadBuckets = async () => {
    try {
      setLoading(true);
      const data = await buckets.list();
      setBucketList(data.buckets);
    } catch (error) {
      console.error('Failed to load buckets:', error);
      toast.error('バケット一覧の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name.trim()) {
      toast.error('バケット名を入力してください');
      return;
    }

    // Validate bucket name
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(createForm.name)) {
      toast.error('バケット名は小文字の英数字とハイフンのみ使用できます');
      return;
    }

    setCreateLoading(true);
    try {
      await buckets.create(createForm);
      toast.success('バケットが作成されました');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        versioning: true,
        defaultPolicy: 'RW',
        initialMember: true,
      });
      await loadBuckets();
    } catch (error) {
      console.error('Failed to create bucket:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const columns: TableColumn<Bucket>[] = [
    {
      key: 'name',
      label: 'バケット名',
      sortable: true,
      render: (bucket) => (
        <div className="flex items-center space-x-2">
          <span className="font-medium">{bucket.name}</span>
          {bucket.versioning && (
            <span className="badge badge-info">V</span>
          )}
        </div>
      ),
    },
    {
      key: 'created',
      label: '作成日時',
      sortable: true,
      render: (bucket) => (
        <span className="text-sm text-gray-600">
          {new Date(bucket.created).toLocaleString('ja-JP')}
        </span>
      ),
    },
    {
      key: 'size',
      label: 'オブジェクト数',
      render: (bucket) => (
        <span className="text-sm">
          {bucket.size?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'アクション',
      render: (bucket) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push(`/buckets/${bucket.name}`)}
            className="text-primary-600 hover:text-primary-900 text-sm"
            title="詳細を表示"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push(`/buckets/${bucket.name}/members`)}
            className="text-green-600 hover:text-green-900 text-sm"
            title="メンバー管理"
          >
            <UsersIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push(`/buckets/${bucket.name}/settings`)}
            className="text-gray-600 hover:text-gray-900 text-sm"
            title="設定"
          >
            <CogIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout title="バケット管理">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">バケット一覧</h2>
            <p className="text-sm text-gray-600">
              MinIO バケットの作成と管理を行います
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            新規バケット
          </button>
        </div>

        {/* Buckets Table */}
        <Table
          columns={columns}
          data={bucketList}
          loading={loading}
          emptyMessage="バケットがありません。新規作成してください。"
        />

        {/* Create Bucket Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="新規バケット作成"
          size="md"
        >
          <form onSubmit={handleCreateBucket} className="space-y-4">
            <div>
              <label className="label">
                バケット名 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="例: my-project-bucket"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                required
                pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
                title="小文字の英数字とハイフンのみ使用可能です"
              />
              <p className="text-xs text-gray-500 mt-1">
                小文字の英数字とハイフンのみ使用できます（3文字以上）
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">既定ポリシー</label>
                <select
                  className="input"
                  value={createForm.defaultPolicy}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    defaultPolicy: e.target.value as 'RW' | 'RO' 
                  }))}
                >
                  <option value="RW">読み取り・書き込み</option>
                  <option value="RO">読み取り専用</option>
                </select>
              </div>

              <div className="flex items-center space-x-4 pt-8">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600"
                    checked={createForm.versioning}
                    onChange={(e) => setCreateForm(prev => ({ 
                      ...prev, 
                      versioning: e.target.checked 
                    }))}
                  />
                  <span className="ml-2 text-sm">バージョニング</span>
                </label>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="initialMember"
                className="rounded border-gray-300 text-primary-600"
                checked={createForm.initialMember}
                onChange={(e) => setCreateForm(prev => ({ 
                  ...prev, 
                  initialMember: e.target.checked 
                }))}
              />
              <label htmlFor="initialMember" className="ml-2 text-sm text-gray-700">
                作成後に tsuji01 を読み取り・書き込みメンバーとして追加
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-outline"
                disabled={createLoading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <span className="spinner mr-2"></span>
                    作成中...
                  </>
                ) : (
                  '作成'
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}