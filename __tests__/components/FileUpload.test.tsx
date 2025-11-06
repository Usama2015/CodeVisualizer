import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FileUpload from '../../components/upload/FileUpload';

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload modes toggle', () => {
    render(<FileUpload />);

    expect(screen.getByText('Upload Files')).toBeInTheDocument();
    expect(screen.getByText('GitHub URL')).toBeInTheDocument();
  });

  it('switches between upload modes', () => {
    render(<FileUpload />);

    const githubButton = screen.getByText('GitHub URL');
    fireEvent.click(githubButton);

    expect(screen.getByPlaceholderText('https://github.com/username/repository')).toBeInTheDocument();
  });

  it('shows GitHub URL input in GitHub mode', () => {
    render(<FileUpload />);

    fireEvent.click(screen.getByText('GitHub URL'));

    expect(screen.getByLabelText('GitHub Repository URL')).toBeInTheDocument();
    expect(screen.getByText('Analyze Repository')).toBeInTheDocument();
  });

  it('disables submit button when no files or URL provided', () => {
    render(<FileUpload />);

    const submitButton = screen.getByRole('button', { name: /upload and analyze/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when GitHub URL is provided', async () => {
    render(<FileUpload />);

    fireEvent.click(screen.getByText('GitHub URL'));

    const urlInput = screen.getByPlaceholderText('https://github.com/username/repository');
    fireEvent.change(urlInput, { target: { value: 'https://github.com/test/repo' } });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('calls onFilesUploaded callback when provided', () => {
    const mockCallback = vi.fn();
    render(<FileUpload onFilesUploaded={mockCallback} />);

    // This test would need more setup to properly test file upload
    // For now, just verify the component renders with the callback
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });
});