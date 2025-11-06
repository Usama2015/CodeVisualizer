'use client';

import { useState } from 'react';
import FileUpload from '@/components/upload/FileUpload';
import VisualizationDashboard from '@/components/visualizations/VisualizationDashboard';

export default function Home() {
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const handleAnalysisComplete = (id: string) => {
    setAnalysisId(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                CodeVisualizer
              </h1>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Analyze and visualize your codebase
              </span>
            </div>
            {analysisId && (
              <button
                onClick={() => setAnalysisId(null)}
                className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!analysisId ? (
          <>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Upload Your Codebase
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Upload your code files or provide a GitHub URL to generate interactive
                visualizations of your project architecture, dependencies, and relationships.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <FileUpload onAnalysisComplete={handleAnalysisComplete} />
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Architecture Analysis
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Automatically parse your codebase to understand its structure, dependencies, and relationships.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Interactive Visualizations
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Generate dynamic diagrams showing dependency graphs, call hierarchies, and component relationships.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Code Insights
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Get detailed metrics about complexity, maintainability, and potential refactoring opportunities.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[calc(100vh-100px)]">
            <VisualizationDashboard analysisId={analysisId} />
          </div>
        )}
      </main>

      {!analysisId && (
        <footer className="bg-white dark:bg-gray-800 border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>&copy; 2024 CodeVisualizer. Built with Next.js and TypeScript.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}