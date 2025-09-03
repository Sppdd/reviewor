// Test setup file for inline checker tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock chrome/browser APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

global.browser = global.chrome;