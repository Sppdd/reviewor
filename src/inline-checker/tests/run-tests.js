/**
 * Simple test runner for inline checker components
 * Runs basic validation tests without external dependencies
 */

const fs = require('fs');
const path = require('path');

// Simple test framework
class SimpleTest {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }

  test(name, fn) {
    try {
      fn();
      console.log(`  ✅ ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`  ❌ ${name}`);
      console.log(`     Error: ${error.message}`);
      this.failed++;
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toHaveLength: (length) => {
        if (!actual || actual.length !== length) {
          throw new Error(`Expected length ${length}, got ${actual ? actual.length : 'undefined'}`);
        }
      },
      toContain: (item) => {
        if (!actual || !actual.includes(item)) {
          throw new Error(`Expected array to contain ${item}`);
        }
      },
      toBeInstanceOf: (constructor) => {
        if (!(actual instanceof constructor)) {
          throw new Error(`Expected instance of ${constructor.name}`);
        }
      },
      toHaveProperty: (prop) => {
        if (!actual || !actual.hasOwnProperty(prop)) {
          throw new Error(`Expected object to have property ${prop}`);
        }
      }
    };
  }

  summary() {
    console.log(`\n📊 Test Summary:`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Total:  ${this.passed + this.failed}`);
    
    if (this.failed === 0) {
      console.log(`\n🎉 All tests passed!`);
    } else {
      console.log(`\n💥 ${this.failed} test(s) failed`);
    }
    
    return this.failed === 0;
  }
}

// Mock DOM environment
function createMockDOM() {
  const mockElement = {
    tagName: 'DIV',
    textContent: '',
    value: '',
    classList: {
      contains: () => false,
      add: () => {},
      remove: () => {}
    },
    hasAttribute: () => false,
    getAttribute: () => null,
    matches: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 20 }),
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  global.document = {
    createElement: (tag) => ({
      ...mockElement,
      tagName: tag.toUpperCase()
    }),
    querySelectorAll: () => [],
    getElementById: () => mockElement,
    createTreeWalker: () => ({ nextNode: () => null }),
    createRange: () => ({
      setStart: () => {},
      setEnd: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 20 })
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  global.window = {
    getComputedStyle: () => ({ fontSize: '16px', lineHeight: '20px' }),
    getSelection: () => ({ rangeCount: 0 }),
    Event: function(type) { this.type = type; },
    KeyboardEvent: function(type) { this.type = type; },
    FocusEvent: function(type) { this.type = type; },
    DOMRect: function(x, y, w, h) {
      this.left = x; this.top = y; this.width = w; this.height = h;
    },
    MutationObserver: function(callback) {
      this.observe = () => {};
      this.disconnect = () => {};
    }
  };

  global.KeyboardEvent = global.window.KeyboardEvent;
  global.MutationObserver = global.window.MutationObserver;

  global.HTMLElement = function() {};
  global.Node = { ELEMENT_NODE: 1 };
  global.NodeFilter = { SHOW_TEXT: 4 };
}

// Load and test FieldDetector
function testFieldDetector(test) {
  const fieldDetectorPath = path.join(__dirname, '../core/FieldDetector.js');
  const fieldDetectorCode = fs.readFileSync(fieldDetectorPath, 'utf8');
  
  // Execute the code
  eval(fieldDetectorCode);
  const FieldDetector = global.FieldDetector || window.FieldDetector;

  test.describe('FieldDetector', () => {
    test.test('should initialize correctly', () => {
      const detector = new FieldDetector();
      test.expect(detector.supportedSelectors.length).toBe(12); // Updated count
      test.expect(detector.excludedSelectors.length).toBe(8); // Updated count
    });

    test.test('should detect supported field types', () => {
      const detector = new FieldDetector();
      
      // Mock textarea
      const textarea = { tagName: 'TEXTAREA', matches: () => false };
      test.expect(detector.isFieldSupported(textarea)).toBe(true);
      test.expect(detector.getFieldType(textarea)).toBe('textarea');
      
      // Mock input
      const input = { tagName: 'INPUT', type: 'text', matches: () => false };
      test.expect(detector.isFieldSupported(input)).toBe(true);
      test.expect(detector.getFieldType(input)).toBe('input');
    });

    test.test('should handle text operations', () => {
      const detector = new FieldDetector();
      
      // Mock textarea with value
      const textarea = { 
        tagName: 'TEXTAREA', 
        value: 'test content',
        matches: () => false,
        dispatchEvent: () => {}
      };
      
      test.expect(detector.getFieldText(textarea)).toBe('test content');
      
      detector.setFieldText(textarea, 'new content');
      test.expect(textarea.value).toBe('new content');
    });
  });
}

// Load and test FieldMonitor
function testFieldMonitor(test) {
  const fieldMonitorPath = path.join(__dirname, '../core/FieldMonitor.js');
  const fieldMonitorCode = fs.readFileSync(fieldMonitorPath, 'utf8');
  
  // Execute the code
  eval(fieldMonitorCode);
  const FieldMonitor = global.FieldMonitor || window.FieldMonitor;

  test.describe('FieldMonitor', () => {
    test.test('should initialize with field detector', () => {
      const mockDetector = { isFieldSupported: () => true };
      const monitor = new FieldMonitor(mockDetector);
      
      test.expect(monitor.fieldDetector).toBe(mockDetector);
      test.expect(monitor.debounceDelay).toBe(500);
      test.expect(monitor.activeField).toBe(null);
    });

    test.test('should manage monitored fields', () => {
      const mockDetector = { 
        isFieldSupported: () => true,
        getFieldText: () => 'test',
        getFieldType: () => 'textarea'
      };
      const monitor = new FieldMonitor(mockDetector);
      
      const mockField = {
        classList: { add: () => {}, remove: () => {} }
      };
      
      monitor.startMonitoring(mockField);
      test.expect(monitor.monitoredFields.has(mockField)).toBe(true);
      
      monitor.stopMonitoring(mockField);
      test.expect(monitor.monitoredFields.has(mockField)).toBe(false);
    });

    test.test('should handle configuration', () => {
      const mockDetector = {};
      const monitor = new FieldMonitor(mockDetector);
      
      monitor.setDebounceDelay(1000);
      test.expect(monitor.debounceDelay).toBe(1000);
      
      // Should ignore invalid values
      monitor.setDebounceDelay('invalid');
      test.expect(monitor.debounceDelay).toBe(1000);
    });
  });
}

// Load and test EditorAdapter
function testEditorAdapter(test) {
  const editorAdapterPath = path.join(__dirname, '../core/EditorAdapter.js');
  const editorAdapterCode = fs.readFileSync(editorAdapterPath, 'utf8');
  
  // Execute the code
  eval(editorAdapterCode);
  const EditorAdapterFactory = global.EditorAdapterFactory || window.EditorAdapterFactory;
  const BaseEditorAdapter = global.BaseEditorAdapter || window.BaseEditorAdapter;

  test.describe('EditorAdapter', () => {
    test.test('should create appropriate adapters', () => {
      const textarea = { tagName: 'TEXTAREA' };
      const adapter = EditorAdapterFactory.createAdapter(textarea);
      test.expect(adapter.type).toBe('textarea');
      
      const input = { tagName: 'INPUT', type: 'text' };
      const inputAdapter = EditorAdapterFactory.createAdapter(input);
      test.expect(inputAdapter.type).toBe('input');
    });

    test.test('should provide base functionality', () => {
      const mockElement = { textContent: 'test content', dispatchEvent: () => {} };
      const adapter = new BaseEditorAdapter(mockElement);
      
      test.expect(adapter.getText()).toBe('test content');
      test.expect(adapter.supportsRichText()).toBe(false);
      test.expect(adapter.type).toBe('base');
    });

    test.test('should list supported types', () => {
      const supportedTypes = EditorAdapterFactory.getSupportedTypes();
      test.expect(supportedTypes).toContain('textarea');
      test.expect(supportedTypes).toContain('input');
      test.expect(supportedTypes).toContain('contenteditable');
    });

    test.test('should check element support', () => {
      const textarea = { tagName: 'TEXTAREA' };
      test.expect(EditorAdapterFactory.isSupported(textarea)).toBe(true);
      
      const span = { tagName: 'SPAN' };
      test.expect(EditorAdapterFactory.isSupported(span)).toBe(false);
    });
  });
}

// Run all tests
function runTests() {
  console.log('🧪 Running Inline Checker Tests\n');
  
  // Set up mock environment
  createMockDOM();
  
  const test = new SimpleTest();
  
  try {
    testFieldDetector(test);
    testFieldMonitor(test);
    testEditorAdapter(test);
  } catch (error) {
    console.error('Test execution error:', error);
  }
  
  return test.summary();
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };