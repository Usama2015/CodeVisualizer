import '@testing-library/jest-dom';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Add SVG element support for jsdom
if (typeof SVGElement !== 'undefined') {
  // Mock SVG getBBox method for D3
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    value: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    writable: true,
  });
}

// Mock SVG methods for D3 compatibility
if (typeof window !== 'undefined') {
  // Mock SVG text element methods
  const mockGetComputedTextLength = () => 100;
  const mockCreateSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) });
  const mockGetScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) });

  // Add methods to existing prototypes if they exist
  if (window.SVGTextElement) {
    Object.defineProperty(window.SVGTextElement.prototype, 'getComputedTextLength', {
      value: mockGetComputedTextLength,
      writable: true,
    });
  }

  if (window.SVGSVGElement) {
    Object.defineProperty(window.SVGSVGElement.prototype, 'createSVGPoint', {
      value: mockCreateSVGPoint,
      writable: true,
    });

    Object.defineProperty(window.SVGSVGElement.prototype, 'getScreenCTM', {
      value: mockGetScreenCTM,
      writable: true,
    });
  }

  // Add global mocks for cases where prototypes don't exist
  (global as any).mockGetComputedTextLength = mockGetComputedTextLength;
  (global as any).mockCreateSVGPoint = mockCreateSVGPoint;
  (global as any).mockGetScreenCTM = mockGetScreenCTM;
}