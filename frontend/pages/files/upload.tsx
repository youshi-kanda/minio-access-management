import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import FileLayout from '../../components/FileLayout';
import { fileApi, formatFileSize } from '../../lib/fileApi';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon as UploadIcon,
  XMarkIcon as XIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function FileUploadPage() {
  const router = useRouter();
  const selectedBucket = router.query.bucket as string;
  
  const [buckets, setBuckets] = useState<string[]>([]);
  const [currentBucket, setCurrentBucket] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingBuckets, setLoadingBuckets] = useState(true);

  useEffect(() => {
    loadAccessibleBuckets();
  }, []);

  useEffect(() => {
    if (selectedBucket && buckets.includes(selectedBucket)) {
      setCurrentBucket(selectedBucket);
    }
  }, [selectedBucket, buckets]);

  const loadAccessibleBuckets = async () => {
    try {
      setLoadingBuckets(true);
      // In a real implementation, get user's accessible buckets
      const exampleBuckets = ['noce-creative', 'documents', 'images', 'backups'];
      
      const bucketPromises = exampleBuckets.map(async (bucketName) => {
        try {
          const accessCheck = await fileApi.validateBucketAccess(bucketName);
          return accessCheck.hasAccess ? bucketName : null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(bucketPromises);
      const accessibleBuckets = results.filter(Boolean) as string[];
      
      setBuckets(accessibleBuckets);
      
      if (accessibleBuckets.length > 0 && !currentBucket) {
        setCurrentBucket(accessibleBuckets[0]);
      }
    } catch (error) {
      console.error('Failed to load buckets:', error);
      toast.error('バケット一覧の読み込みに失敗しました');
    } finally {
      setLoadingBuckets(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending',
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadSingleFile = async (file: UploadFile): Promise<void> => {
    return new Promise((resolve, reject) => {
      setUploadFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading' } : f
      ));

      fileApi.uploadFile(
        currentBucket,
        file.file,
        currentPath,
        { uploadedAt: new Date().toISOString() },
        (progress) => {
          setUploadFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress } : f
          ));
        }
      )
      .then(() => {
        setUploadFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f
        ));
        resolve();
      })
      .catch((error) => {
        console.error('Upload failed:', error);
        setUploadFiles(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'error', 
            error: error.message || 'アップロードに失敗しました' 
          } : f
        ));
        reject(error);
      });
    });
  };

  const handleUpload = async () => {
    if (!currentBucket) {
      toast.error('バケットを選択してください');
      return;
    }

    if (uploadFiles.length === 0) {
      toast.error('アップロードするファイルを選択してください');
      return;
    }

    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast.error('アップロード待ちのファイルがありません');
      return;
    }

    setUploading(true);
    
    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of pendingFiles) {
        await uploadSingleFile(file);
      }
      
      const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
      toast.success(`${completedCount} 件のファイルをアップロードしました`);
    } catch (error) {
      console.error('Batch upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const clearAll = () => {
    if (uploading) return;
    setUploadFiles([]);
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-danger-500" />;
      case 'uploading':
        return <div className="spinner h-5 w-5"></div>;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>;
    }
  };

  const getStatusText = (file: UploadFile) => {
    switch (file.status) {
      case 'pending':
        return 'アップロード待ち';
      case 'uploading':
        return `アップロード中... ${file.progress}%`;
      case 'completed':
        return 'アップロード完了';
      case 'error':
        return file.error || 'エラー';
      default:
        return '';
    }
  };

  if (loadingBuckets) {
    return (
      <FileLayout title="ファイルアップロード">
        <div className="flex items-center justify-center py-12">
          <div className="spinner mr-3"></div>
          <span>バケット一覧を読み込み中...</span>
        </div>
      </FileLayout>
    );
  }

  if (buckets.length === 0) {
    return (
      <FileLayout title="ファイルアップロード">
        <div className="text-center py-12">
          <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            アップロード可能なバケットがありません
          </h3>
          <p className="text-gray-600 mb-6">
            バケットへの書き込み権限がない可能性があります。<br />
            管理者にお問い合わせください。
          </p>
          <button
            onClick={() => router.push('/files')}
            className="btn-primary"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            ホームに戻る
          </button>
        </div>
      </FileLayout>
    );
  }

  return (
    <FileLayout title="ファイルアップロード">
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
              <h1 className="text-2xl font-semibold text-gray-900">ファイルアップロード</h1>
              <p className="text-sm text-gray-600">ファイルをMinIOにアップロードします</p>
            </div>
          </div>
        </div>

        {/* Upload Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">アップロード設定</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  アップロード先バケット <span className="text-danger-500">*</span>
                </label>
                <select
                  className="input"
                  value={currentBucket}
                  onChange={(e) => setCurrentBucket(e.target.value)}
                  required
                >
                  <option value="">バケットを選択</option>
                  {buckets.map((bucket) => (
                    <option key={bucket} value={bucket}>
                      {bucket}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">アップロードパス（任意）</label>
                <input
                  type="text"
                  className="input"
                  placeholder="例: documents/2024/"
                  value={currentPath}
                  onChange={(e) => setCurrentPath(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  フォルダ階層を指定できます（末尾は自動で/が追加されます）
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* File Drop Zone */}
        <div className="card">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg text-primary-600">
                ファイルをドロップしてアップロード
              </p>
            ) : (
              <div>
                <p className="text-lg text-gray-600 mb-2">
                  ファイルをドラッグ&ドロップするか、クリックして選択
                </p>
                <p className="text-sm text-gray-500">
                  最大100MB、複数ファイル対応
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Queue */}
        {uploadFiles.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  アップロードキュー ({uploadFiles.length} ファイル)
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={clearCompleted}
                    className="btn-outline text-sm"
                    disabled={uploading || !uploadFiles.some(f => f.status === 'completed')}
                  >
                    完了済みを削除
                  </button>
                  <button
                    onClick={clearAll}
                    className="btn-outline text-sm"
                    disabled={uploading}
                  >
                    すべて削除
                  </button>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {uploadFiles.map((file) => (
                <div key={file.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(file.status)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.file.size)} • {getStatusText(file)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading'}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {file.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  {file.status === 'error' && file.error && (
                    <div className="mt-2 text-sm text-danger-600 bg-danger-50 rounded p-2">
                      {file.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Actions */}
        {uploadFiles.length > 0 && (
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => router.push(`/files/browse/${currentBucket}`)}
              className="btn-outline"
              disabled={!currentBucket}
            >
              バケットを表示
            </button>
            <button
              onClick={handleUpload}
              disabled={!currentBucket || uploadFiles.length === 0 || uploading || 
                      !uploadFiles.some(f => f.status === 'pending')}
              className="btn-primary"
            >
              {uploading ? (
                <>
                  <div className="spinner mr-2"></div>
                  アップロード中...
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  アップロード開始
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </FileLayout>
  );
}