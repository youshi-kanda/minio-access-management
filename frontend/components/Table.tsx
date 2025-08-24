import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/solid';
import type { TableColumn, SortOptions } from '../types';

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  sortable?: boolean;
  sortOptions?: SortOptions<T>;
  onSort?: (field: keyof T) => void;
  emptyMessage?: string;
  className?: string;
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  sortable = false,
  sortOptions,
  onSort,
  emptyMessage = 'データがありません',
  className = '',
}: TableProps<T>) {
  const handleSort = (field: keyof T) => {
    if (sortable && onSort) {
      onSort(field);
    }
  };

  const renderSortIcon = (column: TableColumn<T>) => {
    if (!sortable || !column.sortable || !sortOptions) return null;

    const field = column.key as keyof T;
    const isActive = sortOptions.field === field;

    if (!isActive) {
      return (
        <span className="ml-2 text-gray-400">
          <ChevronUpIcon className="h-3 w-3" />
        </span>
      );
    }

    return (
      <span className="ml-2 text-primary-600">
        {sortOptions.direction === 'asc' ? (
          <ChevronUpIcon className="h-3 w-3" />
        ) : (
          <ChevronDownIcon className="h-3 w-3" />
        )}
      </span>
    );
  };

  const getCellValue = (item: T, column: TableColumn<T>): React.ReactNode => {
    if (column.render) {
      return column.render(item);
    }
    
    const keys = String(column.key).split('.');
    let value = item;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined || value === null) break;
    }
    
    // Ensure we return a ReactNode-compatible value
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="p-8 text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={String(column.key) + index}
                  className={`
                    ${column.width ? `w-${column.width}` : ''}
                    ${
                      sortable && column.sortable
                        ? 'cursor-pointer hover:bg-gray-100 select-none'
                        : ''
                    }
                  `}
                  onClick={() => column.sortable && handleSort(column.key as keyof T)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={String(column.key) + colIndex}
                      className={column.width ? `w-${column.width}` : ''}
                    >
                      {getCellValue(item, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}