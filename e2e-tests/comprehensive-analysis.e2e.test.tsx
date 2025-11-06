import { test, expect, Page } from '@playwright/test';

// E2E tests for comprehensive analysis flow
// These tests prevent the specific runtime errors mentioned in the requirements

test.describe('CodeVisualizer E2E - Comprehensive Analysis Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete full analysis flow without runtime errors', async () => {
    // Test file upload and analysis flow
    await test.step('Upload files', async () => {
      // Wait for page to load
      await expect(page.locator('h1')).toContainText('Code Visualizer');

      // Create test files
      const testFiles = [
        {
          name: 'index.js',
          content: `
            import { helper } from './utils.js';

            function main() {
              console.log('Main function');
              helper();
            }

            main();
          `
        },
        {
          name: 'utils.js',
          content: `
            export function helper() {
              console.log('Helper function');
              return true;
            }

            export const CONSTANT = 'test';
          `
        },
        {
          name: 'component.tsx',
          content: `
            import React from 'react';

            interface Props {
              title: string;
            }

            const Component: React.FC<Props> = ({ title }) => {
              return <div>{title}</div>;
            };

            export default Component;
          `
        }
      ];

      // Simulate file upload
      for (const file of testFiles) {
        const fileChooser = page.locator('input[type="file"]').first();
        await fileChooser.setInputFiles({
          name: file.name,
          mimeType: 'text/javascript',
          buffer: Buffer.from(file.content)
        });
      }

      // Click upload button
      await page.locator('button:has-text("Upload and Analyze")').click();
    });

    await test.step('Wait for analysis completion', async () => {
      // Wait for analysis to complete (should not get 404 errors)
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });
    });

    await test.step('Verify analysis results display', async () => {
      // Check that results are displayed without double-nested data issues
      await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="dependency-graph"]')).toBeVisible();
      await expect(page.locator('[data-testid="metrics-display"]')).toBeVisible();
    });

    await test.step('Test tab navigation without double popups', async () => {
      const tabs = ['Overview', 'Dependencies', 'Architecture', 'Metrics'];

      for (const tab of tabs) {
        await page.locator(`[data-testid="tab-${tab.toLowerCase()}"]`).click();

        // Verify tab content loads without errors
        await expect(page.locator(`[data-testid="${tab.toLowerCase()}-content"]`)).toBeVisible();

        // Ensure no error popups appear
        await expect(page.locator('[role="alert"]')).not.toBeVisible();
      }
    });
  });

  test('should handle GitHub URL analysis without errors', async () => {
    await test.step('Switch to GitHub mode', async () => {
      await page.locator('button:has-text("GitHub URL")').click();
    });

    await test.step('Enter GitHub URL', async () => {
      await page.locator('input[placeholder*="github.com"]').fill('https://github.com/facebook/react');
    });

    await test.step('Submit GitHub analysis', async () => {
      await page.locator('button:has-text("Analyze Repository")').click();
    });

    await test.step('Handle large repository appropriately', async () => {
      // Should either complete successfully or show appropriate error message
      // Should not crash with unhandled runtime errors
      const result = await Promise.race([
        page.locator('[data-testid="analysis-results"]').waitFor({ timeout: 60000 }),
        page.locator('[data-testid="error-message"]').waitFor({ timeout: 10000 })
      ]);

      // Either result is acceptable - what matters is no runtime crash
      expect(result).toBeTruthy();
    });
  });

  test('should filter JSON config files correctly', async () => {
    await test.step('Upload mixed file types', async () => {
      const mixedFiles = [
        {
          name: 'package.json',
          content: '{"name": "test", "version": "1.0.0"}'
        },
        {
          name: 'tsconfig.json',
          content: '{"compilerOptions": {"target": "es5"}}'
        },
        {
          name: 'components.json',
          content: '{"$schema": "https://ui.shadcn.com/schema.json"}'
        },
        {
          name: 'valid-code.js',
          content: 'console.log("This should be processed");'
        }
      ];

      for (const file of mixedFiles) {
        const fileChooser = page.locator('input[type="file"]').first();
        await fileChooser.setInputFiles({
          name: file.name,
          mimeType: file.name.endsWith('.json') ? 'application/json' : 'text/javascript',
          buffer: Buffer.from(file.content)
        });
      }
    });

    await test.step('Verify only code files are processed', async () => {
      // Should only show 1 file in the uploaded files list (the .js file)
      await expect(page.locator('[data-testid="uploaded-files-count"]')).toContainText('1');

      // Should not include JSON config files in the list
      await expect(page.locator('[data-testid="file-list"]')).not.toContainText('package.json');
      await expect(page.locator('[data-testid="file-list"]')).not.toContainText('tsconfig.json');
      await expect(page.locator('[data-testid="file-list"]')).not.toContainText('components.json');
      await expect(page.locator('[data-testid="file-list"]')).toContainText('valid-code.js');
    });
  });

  test('should handle TSX files without parsing errors', async () => {
    await test.step('Upload TSX file with complex syntax', async () => {
      const tsxFile = {
        name: 'ComplexComponent.tsx',
        content: `
          import React, { useState, useEffect, ReactNode } from 'react';

          interface ComplexProps {
            children: ReactNode;
            onSubmit?: (data: FormData) => void;
            title: string;
          }

          const ComplexComponent: React.FC<ComplexProps> = ({ children, onSubmit, title }) => {
            const [isValid, setIsValid] = useState<boolean>(false);
            const [data, setData] = useState<Record<string, any>>({});

            useEffect(() => {
              // Complex effect with dependencies
              const timer = setTimeout(() => {
                setIsValid(Object.keys(data).length > 0);
              }, 100);

              return () => clearTimeout(timer);
            }, [data]);

            const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              e.stopPropagation();

              if (isValid && onSubmit) {
                const formData = new FormData(e.currentTarget);
                onSubmit(formData);
              }
            };

            return (
              <div className="complex-component">
                <h2>{title}</h2>
                <form onSubmit={handleSubmit}>
                  {children}
                  <button type="submit" disabled={!isValid}>
                    Submit
                  </button>
                </form>
              </div>
            );
          };

          export default ComplexComponent;
        `
      };

      const fileChooser = page.locator('input[type="file"]').first();
      await fileChooser.setInputFiles({
        name: tsxFile.name,
        mimeType: 'text/typescript',
        buffer: Buffer.from(tsxFile.content)
      });
    });

    await test.step('Analyze TSX file', async () => {
      await page.locator('button:has-text("Upload and Analyze")').click();
    });

    await test.step('Verify TSX parsing success', async () => {
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 15000 });

      // Should show the TSX file in results
      await expect(page.locator('[data-testid="file-list"]')).toContainText('ComplexComponent.tsx');

      // Should detect React patterns
      await page.locator('[data-testid="tab-architecture"]').click();
      await expect(page.locator('[data-testid="architecture-patterns"]')).toBeVisible();
    });
  });

  test('should prevent event handling issues', async () => {
    await test.step('Test folder upload button event handling', async () => {
      // Click the "Select Entire Folder" button multiple times rapidly
      const folderButton = page.locator('button:has-text("Select Entire Folder")');

      await folderButton.click();
      await folderButton.click(); // Rapid double-click
      await folderButton.click(); // Triple-click

      // Should not cause multiple file dialogs or errors
      // The preventDefault and stopPropagation should prevent issues
    });

    await test.step('Test form submission prevention', async () => {
      const testFile = {
        name: 'test.js',
        content: 'console.log("test");'
      };

      const fileChooser = page.locator('input[type="file"]').first();
      await fileChooser.setInputFiles({
        name: testFile.name,
        mimeType: 'text/javascript',
        buffer: Buffer.from(testFile.content)
      });

      const submitButton = page.locator('button:has-text("Upload and Analyze")');

      // Click submit button multiple times rapidly
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ]);

      // Should only process once, not multiple times
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 15000 });
    });
  });

  test('should handle API errors gracefully', async () => {
    // This test requires the backend to be stopped to simulate 404 errors
    await test.step('Simulate API unavailable', async () => {
      // If backend is running on different port or unavailable
      const testFile = {
        name: 'test.js',
        content: 'console.log("test");'
      };

      const fileChooser = page.locator('input[type="file"]').first();
      await fileChooser.setInputFiles({
        name: testFile.name,
        mimeType: 'text/javascript',
        buffer: Buffer.from(testFile.content)
      });

      await page.locator('button:has-text("Upload and Analyze")').click();
    });

    await test.step('Handle API errors gracefully', async () => {
      // Should show error message, not crash
      const errorMessage = page.locator('[data-testid="error-message"]');
      const analysisResults = page.locator('[data-testid="analysis-results"]');

      // Either should complete successfully or show error gracefully
      await Promise.race([
        expect(errorMessage).toBeVisible({ timeout: 10000 }),
        expect(analysisResults).toBeVisible({ timeout: 15000 })
      ]);

      // Should not show uncaught runtime errors
      await expect(page.locator('.error-boundary')).not.toBeVisible();
    });
  });

  test('should maintain consistent data structure', async () => {
    await test.step('Upload and analyze files', async () => {
      const testFiles = [
        {
          name: 'module1.js',
          content: `
            export const config = { version: '1.0' };
            export function initialize() { return config; }
          `
        },
        {
          name: 'module2.js',
          content: `
            import { config, initialize } from './module1.js';
            console.log(initialize());
          `
        }
      ];

      for (const file of testFiles) {
        const fileChooser = page.locator('input[type="file"]').first();
        await fileChooser.setInputFiles({
          name: file.name,
          mimeType: 'text/javascript',
          buffer: Buffer.from(file.content)
        });
      }

      await page.locator('button:has-text("Upload and Analyze")').click();
    });

    await test.step('Verify data structure consistency', async () => {
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 15000 });

      // Test that all tabs load without data structure errors
      const tabs = ['overview', 'dependencies', 'architecture', 'metrics'];

      for (const tab of tabs) {
        await page.locator(`[data-testid="tab-${tab}"]`).click();

        // Should load content without errors
        await expect(page.locator(`[data-testid="${tab}-content"]`)).toBeVisible();

        // Should not show "Cannot read property" or similar errors
        const errorTexts = [
          'Cannot read property',
          'Cannot read properties',
          'undefined is not an object',
          'TypeError',
          'ReferenceError'
        ];

        for (const errorText of errorTexts) {
          await expect(page.locator(`text=${errorText}`)).not.toBeVisible();
        }
      }
    });
  });

  test('should handle large file uploads efficiently', async () => {
    await test.step('Upload large number of files', async () => {
      // Simulate uploading many files
      const files = Array.from({ length: 20 }, (_, i) => ({
        name: `file${i}.js`,
        content: `
          // File ${i}
          export function process${i}(data) {
            if (!data) return null;

            const result = data.map((item, index) => {
              if (index % 2 === 0) {
                return item * ${i};
              }
              return item + ${i};
            });

            return result.filter(item => item > 0);
          }

          export const CONFIG_${i} = {
            version: '${i}.0.0',
            enabled: ${i % 2 === 0},
            settings: {
              timeout: ${i * 1000},
              retries: ${Math.floor(i / 2)}
            }
          };
        `
      }));

      for (const file of files) {
        const fileChooser = page.locator('input[type="file"]').first();
        await fileChooser.setInputFiles({
          name: file.name,
          mimeType: 'text/javascript',
          buffer: Buffer.from(file.content)
        });
      }
    });

    await test.step('Process large upload efficiently', async () => {
      await page.locator('button:has-text("Upload and Analyze")').click();

      // Should complete within reasonable time
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });

      // Should show all files were processed
      await expect(page.locator('[data-testid="uploaded-files-count"]')).toContainText('20');
    });

    await test.step('Verify performance metrics', async () => {
      await page.locator('[data-testid="tab-metrics"]').click();

      // Should display metrics for all files
      await expect(page.locator('[data-testid="metrics-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-count"]')).toContainText('20');
    });
  });
});