'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { API_ENDPOINTS } from '@/lib/config';

interface FileUploadProps {
  onFilesUploaded?: (files: File[]) => void;
  onAnalysisComplete?: (analysisId: string) => void;
}

export default function FileUpload({ onFilesUploaded, onAnalysisComplete }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'files' | 'github'>('files');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(`Processing ${acceptedFiles.length} files from folder upload...`);

    // Filter for supported code files only (exclude JSON and other config files)
    const codeFiles = acceptedFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const supportedExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'kt'];

      // Get the full path for directory checking
      const fullPath = (file as any).webkitRelativePath || file.name;

      // Exclude files from unwanted directories
      const excludedDirs = ['node_modules', '.git', 'dist', '.next', 'build', '.cache', 'coverage', '.turbo'];
      const isInExcludedDir = excludedDirs.some(dir => fullPath.includes(`${dir}/`) || fullPath.includes(`/${dir}/`));

      // Explicitly exclude package.json, tsconfig.json, and other JSON config files
      const isConfigFile = file.name.includes('package.json') ||
                          file.name.includes('tsconfig.json') ||
                          file.name.includes('package-lock.json') ||
                          file.name.includes('components.json');

      return supportedExtensions.includes(ext || '') && !isConfigFile && !isInExcludedDir;
    });

    console.log(`Found ${codeFiles.length} supported code files in directory tree`);

    // Log directory structure for debugging
    const directories = new Set();
    codeFiles.forEach(file => {
      const path = (file as any).webkitRelativePath || file.name;
      const dir = path.split('/').slice(0, -1).join('/');
      if (dir) directories.add(dir);
    });

    console.log(`Files span ${directories.size} directories:`, Array.from(directories).slice(0, 10));

    setUploadedFiles(prev => [...prev, ...codeFiles]);
    onFilesUploaded?.(codeFiles);
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.kt'],
      'application/xml': ['.xml'],
    },
    multiple: true,
    noClick: true, // Disable dropzone click to avoid double popups
    noKeyboard: false,
  });

  const handleUpload = async () => {
    if (uploadMode === 'files' && uploadedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    if (uploadMode === 'github' && !githubUrl.trim()) {
      alert('Please enter a GitHub URL');
      return;
    }

    setIsUploading(true);

    try {
      if (uploadMode === 'files') {
        // For large file uploads (>50 files), use streaming approach to avoid browser timeouts
        if (uploadedFiles.length > 50) {
          console.log(`Processing ${uploadedFiles.length} files with streaming approach...`);

          // Process files in smaller chunks to avoid memory issues
          const CHUNK_SIZE = 20;
          const chunks = [];
          for (let i = 0; i < uploadedFiles.length; i += CHUNK_SIZE) {
            chunks.push(uploadedFiles.slice(i, i + CHUNK_SIZE));
          }

          console.log(`Split ${uploadedFiles.length} files into ${chunks.length} chunks of ${CHUNK_SIZE} files each`);

          // Process first chunk to get analysis ID
          const firstChunkData = await Promise.all(
            chunks[0].map(async (file, index) => {
              const content = await file.text();
              const fullPath = (file as any).webkitRelativePath || file.name;
              return {
                id: `file-${Date.now()}-${index}`,
                name: file.name,
                path: fullPath,
                content,
                language: getFileLanguage(file.name)
              };
            })
          );

          console.log('Sending first chunk to initialize analysis...');
          const initResponse = await fetch(API_ENDPOINTS.analyzeDeep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: firstChunkData, isChunked: true, totalFiles: uploadedFiles.length }),
            signal: AbortSignal.timeout(120000),
          });

          if (!initResponse.ok) {
            const errorText = await initResponse.text();
            console.error('Initial chunk failed:', errorText);
            throw new Error(`Analysis failed: ${initResponse.status} - ${errorText}`);
          }

          const initResult = await initResponse.json();
          console.log('Initial analysis started with ID:', initResult.id);

          // For now, we'll still use the single request approach but with better error handling
          // TODO: Implement proper chunked upload with the analysis ID
          alert(`Large upload detected (${uploadedFiles.length} files). The analysis may take several minutes. The improved error handling will provide better feedback.`);

          // Fall back to standard approach for now
        }

        // Prepare files for analysis with full path structure
        const filesData = await Promise.all(
          uploadedFiles.map(async (file, index) => {
            const content = await file.text();
            // Use webkitRelativePath if available (folder upload), otherwise just file name
            const fullPath = (file as any).webkitRelativePath || file.name;

            return {
              id: `file-${Date.now()}-${index}`,
              name: file.name,
              path: fullPath, // Include full relative path from folder root
              content,
              language: getFileLanguage(file.name)
            };
          })
        );

        // Call the deep analysis API
        console.log('Sending files to analysis:', filesData.length, 'files');
        console.log('API endpoint:', API_ENDPOINTS.analyzeDeep);

        const response = await fetch(API_ENDPOINTS.analyzeDeep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: filesData }),
          signal: AbortSignal.timeout(filesData.length > 50 ? 300000 : 120000), // 5 minutes for large uploads, 2 minutes for small
        });

        console.log('Response status:', response.status, response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Analysis failed:', errorText);
          throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Analysis successful:', result);
        console.log('Analysis ID:', result.id);

        // Trigger the callback with analysis ID
        if (onAnalysisComplete && result.id) {
          console.log('Calling onAnalysisComplete with ID:', result.id);
          onAnalysisComplete(result.id);
        } else {
          alert('Analysis completed successfully!');
        }
      } else {
        const response = await fetch(API_ENDPOINTS.analyzeGithub, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: githubUrl }),
        });

        if (!response.ok) {
          throw new Error('GitHub analysis failed');
        }

        const result = await response.json();
        console.log('GitHub analysis successful:', result);
        alert('GitHub repository analyzed successfully!');
      }
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          if (uploadedFiles.length > 50) {
            alert(`Analysis timed out for ${uploadedFiles.length} files. Large codebases require more processing time. The analysis may still be running in the background. Please try with fewer files or wait a few minutes and check the results.`);
          } else {
            alert('Analysis is taking longer than expected. This often happens with large codebases. Please try with fewer files or check back later.');
          }
        } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          alert('Unable to connect to the analysis server. Please check if the backend is running and try again.');
        } else if (error.message.includes('socket hang up') || error.message.includes('ECONNRESET')) {
          alert('Connection was reset during analysis. This can happen with very large uploads. Please try uploading fewer files at once.');
        } else {
          alert(`Upload/analysis failed: ${error.message}. Please try again.`);
        }
      } else {
        alert('Upload/analysis failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'json': 'json',
      'xml': 'xml'
    };
    return langMap[ext || ''] || 'text';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setUploadMode('files')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              uploadMode === 'files'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Upload Files
          </button>
          <button
            onClick={() => setUploadMode('github')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              uploadMode === 'github'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            GitHub URL
          </button>
        </div>

        {uploadMode === 'files' ? (
          <div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <input {...getInputProps()} />
              <input
                type="file"
                id="folderInput"
                style={{ display: 'none' }}
                webkitdirectory=""
                directory=""
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  onDrop(files);
                }}
              />
              <div className="flex flex-col items-center">
                <svg
                  className="w-12 h-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {isDragActive ? (
                  <p className="text-blue-600 dark:text-blue-400">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Drag and drop your code files here, or use the buttons below
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Supports: .js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .cs, .php, .rb, .go, .rs, .kt, .json, .xml
                    </p>
                    <div className="mt-4 flex justify-center space-x-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const input = document.querySelector('input[type="file"]:not(#folderInput)') as HTMLInputElement;
                          input?.click();
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                      >
                        Select Files
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          document.getElementById('folderInput')?.click();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Select Entire Folder
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                      💡 Tip: "Select Entire Folder" recursively analyzes ALL subdirectories
                    </p>
                  </div>
                )}
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Uploaded Files ({uploadedFiles.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <svg
                          className="w-5 h-5 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="github-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              GitHub Repository URL
            </label>
            <input
              type="url"
              id="github-url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Enter a public GitHub repository URL to analyze its structure
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={isUploading || (uploadMode === 'files' && uploadedFiles.length === 0) || (uploadMode === 'github' && !githubUrl.trim())}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
{isUploading
          ? uploadedFiles.length > 50
            ? `Analyzing ${uploadedFiles.length} files... (Large codebase detected - this may take 3-5 minutes)`
            : `Analyzing ${uploadedFiles.length} files... (this may take a few minutes for large codebases)`
          : uploadMode === 'files'
            ? `Upload and Analyze${uploadedFiles.length > 0 ? ` (${uploadedFiles.length} files)` : ''}`
            : 'Analyze Repository'
        }
      </button>
    </div>
  );
}