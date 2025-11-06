/**
 * Configuration file for API endpoints
 * This centralizes all API URLs to prevent issues with incorrect endpoints
 */

// Use environment variable or default to localhost
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API endpoints
export const API_ENDPOINTS = {
  // Analysis endpoints
  analyzeDeep: `${API_BASE_URL}/api/analyze/deep`,
  getAnalysis: (id: string) => `${API_BASE_URL}/api/analysis/${id}`,
  getDependencies: (id: string) => `${API_BASE_URL}/api/analysis/${id}/dependencies`,
  getMetrics: (id: string) => `${API_BASE_URL}/api/analysis/${id}/metrics`,
  getArchitecture: (id: string) => `${API_BASE_URL}/api/analysis/${id}/architecture`,

  // Upload endpoints
  upload: `${API_BASE_URL}/api/upload`,
  analyzeGithub: `${API_BASE_URL}/api/analyze-github`,

  // Health check
  health: `${API_BASE_URL}/health`
};

// Helper function to check if backend is available
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(API_ENDPOINTS.health);
    return response.ok;
  } catch {
    return false;
  }
}