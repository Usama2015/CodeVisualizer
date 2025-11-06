// Mock for uuid package to handle ES module compatibility in Jest
module.exports = {
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v1: jest.fn(() => 'mocked-uuid-v1'),
  v3: jest.fn(() => 'mocked-uuid-v3'),
  v5: jest.fn(() => 'mocked-uuid-v5'),
  // Add any other uuid functions your code might use
};

// Also provide named exports for ES module compatibility
module.exports.v4 = module.exports.v4;
module.exports.v1 = module.exports.v1;
module.exports.v3 = module.exports.v3;
module.exports.v5 = module.exports.v5;