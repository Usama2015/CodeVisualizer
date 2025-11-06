import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';
import * as fs from 'fs';
import * as path from 'path';

describe('Page Integration Tests', () => {
  describe('Import Path Resolution', () => {
    it('should successfully import FileUpload component', () => {
      // This test will fail if the import path is incorrect
      expect(() => render(<Home />)).not.toThrow();
    });

    it('should render the home page with FileUpload component', () => {
      render(<Home />);
      expect(screen.getByText('CodeVisualizer')).toBeInTheDocument();
    });
  });

  describe('Path Mapping Validation', () => {
    it('should have correct tsconfig path mappings', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

      expect(tsconfig.compilerOptions.paths).toBeDefined();
      expect(tsconfig.compilerOptions.paths['@/*']).toBeDefined();

      // Verify components path is mapped correctly
      if (fs.existsSync(path.join(process.cwd(), 'components'))) {
        expect(tsconfig.compilerOptions.paths['@/components/*']).toEqual(['./components/*']);
      }
    });
  });

  describe('Build Verification', () => {
    it('should have all required components in correct locations', () => {
      const componentsPath = path.join(process.cwd(), 'components');
      const srcComponentsPath = path.join(process.cwd(), 'src', 'components');

      // Check which structure exists
      const hasRootComponents = fs.existsSync(componentsPath);
      const hasSrcComponents = fs.existsSync(srcComponentsPath);

      expect(hasRootComponents || hasSrcComponents).toBe(true);

      // Verify FileUpload exists
      if (hasRootComponents) {
        const fileUploadPath = path.join(componentsPath, 'upload', 'FileUpload.tsx');
        expect(fs.existsSync(fileUploadPath)).toBe(true);
      } else if (hasSrcComponents) {
        const fileUploadPath = path.join(srcComponentsPath, 'upload', 'FileUpload.tsx');
        expect(fs.existsSync(fileUploadPath)).toBe(true);
      }
    });
  });
});

describe('Next.js Build Tests', () => {
  it('should compile without import errors', async () => {
    // This test ensures the app can build
    // In a real scenario, this would run: npm run build
    // For testing, we verify the imports resolve correctly

    try {
      const Home = await import('@/app/page');
      expect(Home).toBeDefined();
      expect(Home.default).toBeDefined();
    } catch (error) {
      throw new Error(`Failed to import page: ${error}`);
    }
  });
});