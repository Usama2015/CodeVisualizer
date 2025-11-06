'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  message,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} animate-spin`}>
          <div className="h-full w-full rounded-full border-4 border-gray-200 dark:border-gray-700">
            <div className="h-full w-full rounded-full border-4 border-blue-600 border-t-transparent animate-pulse"></div>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${
            size === 'small' ? 'w-2 h-2' : size === 'medium' ? 'w-4 h-4' : 'w-6 h-6'
          } bg-blue-600 rounded-full animate-ping`}></div>
        </div>
      </div>
      {message && (
        <p className={`mt-4 text-gray-600 dark:text-gray-400 ${
          size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base'
        }`}>
          {message}
        </p>
      )}
    </div>
  );
}