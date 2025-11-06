'use client';

import React from 'react';
import { AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorDisplay({
  message,
  type = 'error',
  onRetry,
  onDismiss,
  className = ''
}: ErrorDisplayProps) {
  const typeConfig = {
    error: {
      icon: <XCircle className="w-6 h-6" />,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6" />,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-800 dark:text-amber-200',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    info: {
      icon: <Info className="w-6 h-6" />,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-200',
      iconColor: 'text-blue-600 dark:text-blue-400'
    }
  };

  const config = typeConfig[type];

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className={`${config.iconColor} mr-3 flex-shrink-0`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <p className={`${config.textColor} font-medium`}>
            {type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Information'}
          </p>
          <p className={`${config.textColor} mt-1 text-sm`}>
            {message}
          </p>
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`px-3 py-1 text-sm font-medium ${config.textColor} ${config.bgColor} border ${config.borderColor} rounded hover:opacity-80 transition-opacity`}
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}