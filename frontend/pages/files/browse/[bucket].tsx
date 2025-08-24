import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import FileLayout from '../../../components/FileLayout';
import FileBrowser from '../../../components/FileBrowser';
import { fileApi } from '../../../lib/fileApi';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon as UploadIcon,
  ArrowPathIcon as RefreshIcon,
} from '@heroicons/react/24/outline';

export default function BucketBrowserPage() {
  const router = useRouter();
  const bucketName = router.query.bucket as string;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bucketName) {
      checkBucketAccess();
    }
  }, [bucketName]);

  const checkBucketAccess = async () => {
    if (!bucketName) return;

    try {
      setLoading(true);
      const result = await fileApi.validateBucketAccess(bucketName);
      setHasAccess(result.hasAccess);
      
      if (!result.hasAccess) {
        toast.error('このバケットにアクセスする権限がありません');
      }
    } catch (error) {
      console.error('Failed to check bucket access:', error);
      setHasAccess(false);
      toast.error('バケットアクセスの確認に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <FileLayout title={`バケット: ${bucketName}`}>
        <div className="flex items-center justify-center py-12">
          <div className="spinner mr-3"></div>
          <span>バケットアクセスを確認中...</span>
        </div>
      </FileLayout>
    );
  }

  if (!bucketName) {
    return (
      <FileLayout title="バケットブラウザ">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            バケットが指定されていません
          </h3>
          <button
            onClick={() => router.push('/files')}
            className="btn-primary"
          >
            ホームに戻る
          </button>
        </div>
      </FileLayout>
    );
  }

  if (hasAccess === false) {
    return (
      <FileLayout title={`バケット: ${bucketName}`}>
        <div className="text-center py-12">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 mb-4">
            <svg className="h-6 w-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            アクセス権限がありません
          </h3>
          <p className="text-gray-600 mb-6">
            このバケット（{bucketName}）にアクセスする権限がありません。<br />
            管理者に権限の付与を依頼してください。
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/files')}
              className="btn-primary"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              ホームに戻る
            </button>
            <button
              onClick={checkBucketAccess}
              className="btn-outline"
            >
              <RefreshIcon className="h-4 w-4 mr-2" />
              再確認
            </button>
          </div>
        </div>
      </FileLayout>
    );
  }

  return (
    <FileLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/files')}
              className="btn-outline"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              戻る
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{bucketName}</h1>
              <p className="text-sm text-gray-600">ファイルブラウザ</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/files/upload?bucket=${bucketName}`)}
              className="btn-primary"
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              アップロード
            </button>
          </div>
        </div>

        {/* File Browser */}
        <FileBrowser bucket={bucketName} />
      </div>
    </FileLayout>
  );
}