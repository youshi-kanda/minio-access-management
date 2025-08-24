import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import { useRequireAuth } from '../../hooks/useAuth';
import { buckets } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  UserAddIcon,
  UserRemoveIcon,
  CogIcon,
  ArrowLeftIcon,
} from '@heroicons/react/outline';
import type { BucketMembersResponse } from '../../types';

export default function BucketDetailPage() {
  const { isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const bucketName = router.query.bucket as string;
  
  const [rwMembers, setRwMembers] = useState<string[]>([]);
  const [roMembers, setRoMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rw' | 'ro'>('rw');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'rw' | 'ro'>('rw');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && bucketName) {
      loadMembers();
    }
  }, [isAuthenticated, bucketName]);

  const loadMembers = async () => {
    if (!bucketName) return;

    try {
      setLoading(true);
      const [rwData, roData] = await Promise.all([
        buckets.getMembers(bucketName, 'rw'),
        buckets.getMembers(bucketName, 'ro'),
      ]);
      
      setRwMembers(rwData.members);
      setRoMembers(roData.members);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('メンバー情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMemberUsername.trim()) {
      toast.error('ユーザー名を入力してください');
      return;
    }

    setAddLoading(true);
    try {
      await buckets.addMember(bucketName, newMemberUsername, newMemberRole);
      toast.success('メンバーを追加しました');
      setShowAddModal(false);
      setNewMemberUsername('');
      await loadMembers();
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = async (username: string, role: 'rw' | 'ro') => {
    if (!confirm(`${username} を ${role.toUpperCase()} メンバーから削除しますか？`)) {
      return;
    }

    try {
      await buckets.removeMember(bucketName, username, role);
      toast.success('メンバーを削除しました');
      await loadMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('メンバーの削除に失敗しました');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (!bucketName) {
    return (
      <Layout title="バケット詳細">
        <div className="text-center py-8">
          <p className="text-gray-500">バケットが指定されていません</p>
        </div>
      </Layout>
    );
  }

  const currentMembers = activeTab === 'rw' ? rwMembers : roMembers;

  return (
    <Layout title={`バケット: ${bucketName}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/buckets')}
              className="btn-outline"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              戻る
            </button>
            <div>
              <h2 className="text-lg font-medium text-gray-900">{bucketName}</h2>
              <p className="text-sm text-gray-600">バケットメンバー管理</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              <UserAddIcon className="h-4 w-4 mr-2" />
              メンバー追加
            </button>
            <button
              onClick={() => router.push(`/buckets/${bucketName}/settings`)}
              className="btn-outline"
            >
              <CogIcon className="h-4 w-4 mr-2" />
              設定
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('rw')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'rw'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              読み取り・書き込み ({rwMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('ro')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'ro'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              読み取り専用 ({roMembers.length})
            </button>
          </nav>
        </div>

        {/* Members List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              {activeTab === 'rw' ? '読み取り・書き込み' : '読み取り専用'}メンバー
            </h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="spinner"></div>
              </div>
            ) : currentMembers.length > 0 ? (
              <div className="space-y-3">
                {currentMembers.map((username, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 text-sm font-medium">
                          {username[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{username}</p>
                        <p className="text-xs text-gray-500">
                          {activeTab === 'rw' ? '読み取り・書き込み権限' : '読み取り専用権限'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(username, activeTab)}
                      className="text-danger-600 hover:text-danger-900"
                      title="メンバーから削除"
                    >
                      <UserRemoveIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {activeTab === 'rw' ? '読み取り・書き込み' : '読み取り専用'}メンバーはいません
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Member Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="メンバー追加"
          size="md"
        >
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="label">
                ユーザー名 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="例: user123"
                value={newMemberUsername}
                onChange={(e) => setNewMemberUsername(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                既存のMinIOユーザー名を入力してください
              </p>
            </div>

            <div>
              <label className="label">権限レベル</label>
              <select
                className="input"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as 'rw' | 'ro')}
              >
                <option value="rw">読み取り・書き込み</option>
                <option value="ro">読み取り専用</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-outline"
                disabled={addLoading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={addLoading}
              >
                {addLoading ? (
                  <>
                    <span className="spinner mr-2"></span>
                    追加中...
                  </>
                ) : (
                  '追加'
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}