import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  FolderIcon,
  DocumentIcon,
  EyeIcon,
  DownloadIcon,
  TrashIcon,
  ChevronRightIcon,
  HomeIcon,
  SearchIcon,
} from '@heroicons/react/outline';
import { fileApi, formatFileSize, getFileIcon } from '../lib/fileApi';
import Modal from './Modal';
import toast from 'react-hot-toast';
import type { MinIOObject, CommonPrefix } from '../types';

interface FileBrowserProps {
  bucket: string;
  initialPrefix?: string;
  onFileSelect?: (file: MinIOObject) => void;
  selectionMode?: boolean;
}

interface FolderItem {
  name: string;
  fullPath: string;
  type: 'folder';
}

interface FileItem {
  name: string;
  fullPath: string;
  size: number;
  lastModified: string;
  type: 'file';
  etag?: string;
}

export default function FileBrowser({ 
  bucket, 
  initialPrefix = '', 
  onFileSelect,
  selectionMode = false 
}: FileBrowserProps) {
  const router = useRouter();
  const [currentPrefix, setCurrentPrefix] = useState(initialPrefix);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    loadFolderContents();
  }, [bucket, currentPrefix]);

  const loadFolderContents = async () => {
    if (!bucket) return;

    try {
      setLoading(true);
      const data = await fileApi.getFolderStructure(bucket, currentPrefix);
      setFolders(data.folders);
      setFiles(data.files);
    } catch (error) {
      console.error('Failed to load folder contents:', error);
      toast.error('フォルダの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadFolderContents();
      return;
    }

    try {
      setSearching(true);
      const data = await fileApi.searchObjects(bucket, searchTerm, currentPrefix);
      
      // Convert search results to file items
      const searchFiles = data.objects.map(obj => ({
        name: obj.Key.split('/').pop() || obj.Key,
        fullPath: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        type: 'file' as const,
        etag: obj.ETag,
      }));
      
      setFiles(searchFiles);
      setFolders([]); // Hide folders during search
      toast.success(`${data.total} 件のファイルが見つかりました`);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('検索に失敗しました');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    loadFolderContents();
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentPrefix(folderPath);
    setSelectedFiles(new Set());
    clearSearch();
  };

  const navigateUp = () => {
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    setCurrentPrefix(newPrefix);
    setSelectedFiles(new Set());
    clearSearch();
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [
      { name: bucket, path: '' }
    ];
    
    const parts = currentPrefix.split('/').filter(Boolean);
    let path = '';
    
    parts.forEach((part) => {
      path += part + '/';
      breadcrumbs.push({ name: part, path });
    });
    
    return breadcrumbs;
  };

  const handleFileClick = (file: FileItem) => {
    if (selectionMode && onFileSelect) {
      onFileSelect(file as any);
      return;
    }
    
    // Toggle selection
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file.fullPath)) {
      newSelected.delete(file.fullPath);
    } else {
      newSelected.add(file.fullPath);
    }
    setSelectedFiles(newSelected);
  };

  const handlePreview = async (file: FileItem) => {
    try {
      const signedUrl = await fileApi.getSignedUrl(bucket, file.fullPath, 'inline');
      setPreviewFile(file);
      setPreviewUrl(signedUrl.url);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Failed to generate preview URL:', error);
      toast.error('プレビューURLの生成に失敗しました');
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const signedUrl = await fileApi.getSignedUrl(bucket, file.fullPath, 'download');
      window.open(signedUrl.url, '_blank');
    } catch (error) {
      console.error('Failed to generate download URL:', error);
      toast.error('ダウンロードURLの生成に失敗しました');
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`${file.name} を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      await fileApi.deleteObject(bucket, file.fullPath);
      toast.success('ファイルを削除しました');
      loadFolderContents();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('ファイルの削除に失敗しました');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    if (!confirm(`選択した ${selectedFiles.size} 件のファイルを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const keys = Array.from(selectedFiles);
      await fileApi.deleteMultipleObjects(bucket, keys);
      toast.success(`${selectedFiles.size} 件のファイルを削除しました`);
      setSelectedFiles(new Set());
      loadFolderContents();
    } catch (error) {
      console.error('Failed to delete files:', error);
      toast.error('ファイルの削除に失敗しました');
    }
  };

  const renderPreviewContent = () => {
    if (!previewFile || !previewUrl) return null;

    const fileName = previewFile.name.toLowerCase();
    
    if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
      return <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-96 mx-auto" />;
    }
    
    if (fileName.match(/\.(mp4|webm|ogg)$/)) {
      return (
        <video controls className="max-w-full max-h-96 mx-auto">
          <source src={previewUrl} />
          お使いのブラウザは動画再生に対応していません。
        </video>
      );
    }
    
    if (fileName.endsWith('.pdf')) {
      return (
        <iframe 
          src={previewUrl} 
          className="w-full h-96"
          title={previewFile.name}
        />
      );
    }
    
    return (
      <div className="text-center py-8">
        <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">プレビューできないファイル形式です</p>
        <button
          onClick={() => handleDownload(previewFile)}
          className="btn-primary mt-4"
        >
          ダウンロード
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="spinner mr-3"></div>
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="ファイルを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="input pl-10"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="btn-primary"
        >
          {searching ? <span className="spinner"></span> : '検索'}
        </button>
        {searchTerm && (
          <button onClick={clearSearch} className="btn-outline">
            クリア
          </button>
        )}
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm">
        {getBreadcrumbs().map((crumb, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />}
            <button
              onClick={() => navigateToFolder(crumb.path)}
              className={`hover:text-primary-600 ${
                index === getBreadcrumbs().length - 1 
                  ? 'text-gray-900 font-medium' 
                  : 'text-primary-600'
              }`}
            >
              {index === 0 ? <HomeIcon className="h-4 w-4" /> : crumb.name}
            </button>
          </div>
        ))}
      </nav>

      {/* Actions Bar */}
      {selectedFiles.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-700">
              {selectedFiles.size} 件のファイルが選択されています
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkDelete}
                className="btn-danger text-sm"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                削除
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="btn-outline text-sm"
              >
                選択解除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="card">
        <div className="divide-y divide-gray-200">
          {/* Up Navigation */}
          {currentPrefix && (
            <div
              onClick={navigateUp}
              className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
            >
              <FolderIcon className="h-5 w-5 text-blue-500 mr-3" />
              <span className="font-medium">.. (上位フォルダ)</span>
            </div>
          )}

          {/* Folders */}
          {folders.map((folder, index) => (
            <div
              key={index}
              onClick={() => navigateToFolder(folder.fullPath)}
              className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
            >
              <FolderIcon className="h-5 w-5 text-blue-500 mr-3" />
              <span className="font-medium">{folder.name}</span>
            </div>
          ))}

          {/* Files */}
          {files.map((file, index) => (
            <div
              key={index}
              className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer ${
                selectedFiles.has(file.fullPath) ? 'bg-primary-50' : ''
              }`}
              onClick={() => handleFileClick(file)}
            >
              <input
                type="checkbox"
                checked={selectedFiles.has(file.fullPath)}
                onChange={() => {}}
                className="mr-3 rounded border-gray-300"
              />
              <span className="text-lg mr-3">{getFileIcon(file.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{new Date(file.lastModified).toLocaleString('ja-JP')}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(file);
                  }}
                  className="text-primary-600 hover:text-primary-900"
                  title="プレビュー"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  className="text-green-600 hover:text-green-900"
                  title="ダウンロード"
                >
                  <DownloadIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file);
                  }}
                  className="text-danger-600 hover:text-danger-900"
                  title="削除"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {folders.length === 0 && files.length === 0 && (
            <div className="text-center py-8">
              <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? '検索結果がありません' : 'フォルダが空です'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={previewFile?.name || 'プレビュー'}
        size="lg"
      >
        {renderPreviewContent()}
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={() => previewFile && handleDownload(previewFile)}
            className="btn-primary"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            ダウンロード
          </button>
          <button
            onClick={() => setShowPreviewModal(false)}
            className="btn-outline"
          >
            閉じる
          </button>
        </div>
      </Modal>
    </div>
  );
}