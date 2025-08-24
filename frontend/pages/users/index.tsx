import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRequireAuth } from '../../hooks/useAuth';
import { users } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { MinIOUser, CreateUserRequest, TableColumn } from '../../types';

export default function UsersPage() {
  const { isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const [userList, setUserList] = useState<MinIOUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    username: '',
    secret: '',
    displayName: '',
    email: '',
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (router.query.action === 'create') {
      setShowCreateModal(true);
      router.replace('/users', undefined, { shallow: true });
    }
  }, [router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await users.list();
      setUserList(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('ユーザー一覧の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.username.trim() || !createForm.secret.trim()) {
      toast.error('ユーザー名とパスワードを入力してください');
      return;
    }

    if (createForm.secret.length < 8) {
      toast.error('パスワードは8文字以上である必要があります');
      return;
    }

    setCreateLoading(true);
    try {
      await users.create(createForm);
      toast.success('ユーザーが作成されました');
      setShowCreateModal(false);
      setCreateForm({
        username: '',
        secret: '',
        displayName: '',
        email: '',
      });
      await loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const generatePassword = async () => {
    try {
      const response = await users.generatePassword();
      setCreateForm(prev => ({ ...prev, secret: response.password }));
      toast.success('パスワードを生成しました');
    } catch (error) {
      console.error('Failed to generate password:', error);
      toast.error('パスワードの生成に失敗しました');
    }
  };

  const toggleUserStatus = async (username: string, currentStatus: string) => {
    const isEnabled = currentStatus === 'enabled';
    const action = isEnabled ? 'disable' : 'enable';
    const actionText = isEnabled ? '無効化' : '有効化';

    if (!confirm(`${username} を${actionText}しますか？`)) {
      return;
    }

    try {
      if (isEnabled) {
        await users.disable(username);
      } else {
        await users.enable(username);
      }
      toast.success(`ユーザーを${actionText}しました`);
      await loadUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      toast.error(`ユーザーの${actionText}に失敗しました`);
    }
  };

  const deleteUser = async (username: string) => {
    if (!confirm(`${username} を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      await users.delete(username);
      toast.success('ユーザーを削除しました');
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('ユーザーの削除に失敗しました');
    }
  };

  const columns: TableColumn<MinIOUser>[] = [
    {
      key: 'username',
      label: 'ユーザー名',
      sortable: true,
      render: (user) => (
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 text-sm font-medium">
              {user.username[0]?.toUpperCase()}
            </span>
          </div>
          <span className="font-medium">{user.username}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'ステータス',
      render: (user) => (
        <div className="flex items-center space-x-2">
          {user.status === 'enabled' ? (
            <>
              <CheckCircleIcon className="h-4 w-4 text-success-500" />
              <span className="badge badge-success">有効</span>
            </>
          ) : (
            <>
              <XCircleIcon className="h-4 w-4 text-danger-500" />
              <span className="badge badge-danger">無効</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'memberOf',
      label: 'グループ',
      render: (user) => (
        <div className="space-y-1">
          {user.memberOf.length > 0 ? (
            user.memberOf.slice(0, 3).map((group, index) => (
              <span key={index} className="badge badge-info mr-1">
                {group}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">なし</span>
          )}
          {user.memberOf.length > 3 && (
            <span className="text-xs text-gray-500">
              +{user.memberOf.length - 3} more
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'アクション',
      render: (user) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleUserStatus(user.username, user.status)}
            className={`text-sm ${
              user.status === 'enabled'
                ? 'text-warning-600 hover:text-warning-900'
                : 'text-success-600 hover:text-success-900'
            }`}
            title={user.status === 'enabled' ? '無効化' : '有効化'}
          >
            {user.status === 'enabled' ? (
              <XCircleIcon className="h-4 w-4" />
            ) : (
              <CheckCircleIcon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => deleteUser(user.username)}
            className="text-danger-600 hover:text-danger-900 text-sm"
            title="削除"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout title="ユーザー管理">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">ユーザー一覧</h2>
            <p className="text-sm text-gray-600">
              MinIO ユーザーの作成と管理を行います
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            新規ユーザー
          </button>
        </div>

        {/* Users Table */}
        <Table
          columns={columns}
          data={userList}
          loading={loading}
          emptyMessage="ユーザーがありません。新規作成してください。"
        />

        {/* Create User Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="新規ユーザー作成"
          size="md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="label">
                ユーザー名 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="例: user123"
                value={createForm.username}
                onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                required
                pattern="^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$"
                title="英数字、ドット、アンダースコア、ハイフンのみ使用可能です"
              />
              <p className="text-xs text-gray-500 mt-1">
                英数字、ドット、アンダースコア、ハイフンのみ使用可能（3文字以上）
              </p>
            </div>

            <div>
              <label className="label">
                パスワード <span className="text-danger-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  className="input flex-1"
                  placeholder="8文字以上のパスワード"
                  value={createForm.secret}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, secret: e.target.value }))}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="btn-outline px-3"
                  title="パスワード生成"
                >
                  <KeyIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                8文字以上の安全なパスワードを設定してください
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">表示名</label>
                <input
                  type="text"
                  className="input"
                  placeholder="例: 田中太郎"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, displayName: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">メールアドレス</label>
                <input
                  type="email"
                  className="input"
                  placeholder="例: user@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
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