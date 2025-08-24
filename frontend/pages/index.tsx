import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useRequireAuth } from '../hooks/useAuth';
import { buckets, users } from '../lib/api';
import {
  FolderIcon,
  UsersIcon,
  DatabaseIcon,
  ClockIcon,
} from '@heroicons/react/outline';
import type { Bucket, MinIOUser } from '../types';

interface DashboardStats {
  totalBuckets: number;
  totalUsers: number;
  totalObjects: number;
  recentActivity: string[];
}

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBuckets: 0,
    totalUsers: 0,
    totalObjects: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [recentBuckets, setRecentBuckets] = useState<Bucket[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load buckets and users in parallel
      const [bucketsData, usersData] = await Promise.all([
        buckets.list(),
        users.list(),
      ]);

      const totalObjects = bucketsData.buckets.reduce((sum, bucket) => sum + (bucket.size || 0), 0);

      setStats({
        totalBuckets: bucketsData.buckets.length,
        totalUsers: usersData.users.length,
        totalObjects,
        recentActivity: [
          '新しいバケット "project-demo" が作成されました',
          'ユーザー "user123" が招待されました',
          'バケット "documents" に 5 個のファイルがアップロードされました',
        ],
      });

      // Show recent buckets (last 5)
      setRecentBuckets(
        bucketsData.buckets
          .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
          .slice(0, 5)
      );

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const statCards = [
    {
      title: 'バケット数',
      value: stats.totalBuckets,
      icon: FolderIcon,
      color: 'primary',
      description: '作成されたバケットの総数',
    },
    {
      title: 'ユーザー数',
      value: stats.totalUsers,
      icon: UsersIcon,
      color: 'success',
      description: '登録されたユーザーの総数',
    },
    {
      title: 'オブジェクト数',
      value: stats.totalObjects,
      icon: DatabaseIcon,
      color: 'warning',
      description: '保存されたファイルの総数',
    },
  ];

  return (
    <Layout title="ダッシュボード">
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card, index) => (
            <div key={index} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-3 rounded-md bg-${card.color}-100`}>
                    <card.icon className={`h-6 w-6 text-${card.color}-600`} />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {card.title}
                    </h3>
                    <div className="flex items-baseline">
                      <p className="text-3xl font-semibold text-gray-900">
                        {loading ? (
                          <span className="spinner"></span>
                        ) : (
                          card.value.toLocaleString()
                        )}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Buckets */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                最近のバケット
              </h3>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="spinner"></div>
                </div>
              ) : recentBuckets.length > 0 ? (
                <div className="space-y-3">
                  {recentBuckets.map((bucket, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center space-x-3">
                        <FolderIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {bucket.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            作成日: {new Date(bucket.created).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {bucket.versioning && (
                          <span className="badge badge-info">バージョニング</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  バケットがありません
                </p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                最近のアクティビティ
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 py-2"
                  >
                    <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-900">{activity}</p>
                      <p className="text-xs text-gray-500">
                        {new Date().toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              クイックアクション
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href="/buckets?action=create"
                className="btn-primary text-center"
              >
                新しいバケット
              </a>
              <a
                href="/users?action=create"
                className="btn-secondary text-center"
              >
                新しいユーザー
              </a>
              <a
                href="/invitations?action=send"
                className="btn-success text-center"
              >
                招待を送信
              </a>
              <a
                href="/files"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-center"
              >
                ファイル管理
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}