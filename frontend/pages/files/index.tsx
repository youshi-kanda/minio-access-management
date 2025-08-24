import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import FileLayout from '../../components/FileLayout';
import { fileApi } from '../../lib/fileApi';
import toast from 'react-hot-toast';
import {
  FolderIcon,
  DatabaseIcon,
  ClockIcon,
} from '@heroicons/react/outline';

interface BucketInfo {
  name: string;
  hasAccess: boolean;
  objectCount?: number;
  lastActivity?: string;
}

export default function FilesHomePage() {
  const router = useRouter();
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserBuckets();
  }, []);

  const loadUserBuckets = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would come from the user's accessible buckets
      // For now, we'll use some example buckets and check access
      const exampleBuckets = ['noce-creative', 'documents', 'images', 'backups'];
      
      const bucketPromises = exampleBuckets.map(async (bucketName) => {
        try {
          const accessCheck = await fileApi.validateBucketAccess(bucketName);
          return {
            name: bucketName,
            hasAccess: accessCheck.hasAccess,
            objectCount: Math.floor(Math.random() * 100), // Mock data
            lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
        } catch (error) {
          return {
            name: bucketName,
            hasAccess: false,
            objectCount: 0,
          };
        }
      });

      const bucketResults = await Promise.all(bucketPromises);
      setBuckets(bucketResults.filter(bucket => bucket.hasAccess));
    } catch (error) {
      console.error('Failed to load buckets:', error);
      toast.error('バケット一覧の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBucketClick = (bucketName: string) => {
    router.push(`/files/browse/${bucketName}`);
  };

  if (loading) {
    return (
      <FileLayout title="ファイル管理">
        <div className="flex items-center justify-center py-12">
          <div className="spinner mr-3"></div>
          <span>バケット一覧を読み込み中...</span>
        </div>
      </FileLayout>
    );
  }

  return (
    <FileLayout title="ファイル管理">
      <div className="space-y-8">
        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            MinIO ファイル管理へようこそ
          </h2>
          <p className="text-gray-600">
            アクセス可能なバケットからファイルを管理できます。
            ファイルのアップロード、ダウンロード、削除、プレビューが可能です。
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-md bg-primary-100">
                <FolderIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  アクセス可能バケット
                </h3>
                <p className="text-3xl font-semibold text-gray-900">
                  {buckets.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-md bg-success-100">
                <DatabaseIcon className="h-6 w-6 text-success-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  総ファイル数
                </h3>
                <p className="text-3xl font-semibold text-gray-900">
                  {buckets.reduce((sum, bucket) => sum + (bucket.objectCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-md bg-warning-100">
                <ClockIcon className="h-6 w-6 text-warning-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  最終アクセス
                </h3>
                <p className="text-sm text-gray-900">
                  {buckets.length > 0 ? '今日' : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buckets List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">アクセス可能なバケット</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {buckets.length > 0 ? (
              buckets.map((bucket, index) => (
                <div
                  key={index}
                  onClick={() => handleBucketClick(bucket.name)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary-100 rounded-md">
                        <FolderIcon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {bucket.name}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{bucket.objectCount || 0} オブジェクト</span>
                          {bucket.lastActivity && (
                            <span>
                              最終更新: {new Date(bucket.lastActivity).toLocaleDateString('ja-JP')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-primary-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  アクセス可能なバケットがありません
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  バケットへのアクセス権限がない可能性があります。
                  管理者にお問い合わせください。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/files/upload')}
              className="btn-primary justify-center"
              disabled={buckets.length === 0}
            >
              ファイルアップロード
            </button>
            <button
              onClick={() => window.open('/admin', '_blank')}
              className="btn-outline justify-center"
            >
              管理画面を開く
            </button>
            <button
              onClick={() => loadUserBuckets()}
              className="btn-outline justify-center"
            >
              バケット一覧を更新
            </button>
          </div>
        </div>
      </div>
    </FileLayout>
  );
}