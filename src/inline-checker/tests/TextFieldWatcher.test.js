/**
 * Unit tests for TextFieldWatcher (FieldMonitor class)
 * Tests debounced change detection and event handling
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');

describe('TextFieldWatcher', () => {
  let dom;
  let document;
  let window;
  let FieldDetector;
  let FieldMonitor;

  beforeEach(() => {
    // Create a new DOM environment for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <div id="test-container"></div>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    window = dom.window;
    
    // Make DOM globals available
    global.document = document;
    global.window = window;
    global.HTMLElement = window.HTMLElement;
    global.Node = window.Node;
    global.Event = window.Event;
    global.KeyboardEvent = window.KeyboardEvent;
    global.MutationObserver = window.MutationObserver;
    
    // Mock setTimeout and clearTimeout for testing debouncing
    jest.useFakeTimers();
    
    // Load the classes
    const fs = require('fs');
    const path = require('path');
    
    const fieldDetectorCode = fs.readFileSync(
      path.join(__dirname, '../core/FieldDetector.js'), 
      'utf8'
    );
    const fieldMonitorCode = fs.readFileSync(
      path.join(__dirname, '../core/FieldMonitor.js'), 
      'utf8'
    );
    
    // Execute the code in the test environment
    eval(fieldDetectorCode);
    eval(fieldMonitorCode);
    
    FieldDetector = window.FieldDetector;
    FieldMonitor = window.FieldMonitor;
  });

  afterEach(() => {
    jest.useRealTimers();
    
    // Clean up globals
    delete global.document;
    delete global.window;
    delete global.HTMLElement;
    delete global.Node;
    delete global.Event;
    delete global.KeyboardEvent;
    delete global.MutationObserver;
  });

  describe('initialization', () => {
    test('should initialize with field detector', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      expect(fieldMonitor.fieldDetector).toBe(fieldDetector);
      expect(fieldMonitor.debounceDelay).toBe(500);
      expect(fieldMonitor.activeField).toBeNull();
    });

    test('should set up global event listeners', () => {
      const fieldDetector = new FieldDetector();
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      new FieldMonitor(fieldDetector);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('focusin', expect.any(Function), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('focusout', expect.any(Function), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function), true);
    });
  });

  describe('field monitoring', () => {
    test('should start monitoring a field', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial text';
      
      fieldMonitor.startMonitoring(textarea);
      
      expect(fieldMonitor.monitoredFields.has(textarea)).toBe(true);
      expect(textarea.classList.contains('feelly-monitored-field')).toBe(true);
      
      const fieldData = fieldMonitor.monitoredFields.get(textarea);
      expect(fieldData.lastText).toBe('Initial text');
      expect(fieldData.fieldType).toBe('textarea');
    });

    test('should stop monitoring a field', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      fieldMonitor.startMonitoring(textarea);
      
      expect(fieldMonitor.monitoredFields.has(textarea)).toBe(true);
      
      fieldMonitor.stopMonitoring(textarea);
      
      expect(fieldMonitor.monitoredFields.has(textarea)).toBe(false);
      expect(textarea.classList.contains('feelly-monitored-field')).toBe(false);
    });

    test('should not start monitoring the same field twice', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      
      fieldMonitor.startMonitoring(textarea);
      const initialSize = fieldMonitor.monitoredFields.size;
      
      fieldMonitor.startMonitoring(textarea); // Try to monitor again
      
      expect(fieldMonitor.monitoredFields.size).toBe(initialSize);
    });
  });

  describe('focus and blur handling', () => {
    test('should handle focus events', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      
      const focusCallback = jest.fn();
      fieldMonitor.onFieldFocus(focusCallback);
      
      // Simulate focus event
      const focusEvent = new window.FocusEvent('focusin', { target: textarea });
      Object.defineProperty(focusEvent, 'target', { value: textarea });
      
      fieldMonitor.handleFocus(focusEvent);
      
      expect(fieldMonitor.activeField).toBe(textarea);
      expect(textarea.classList.contains('feelly-active-field')).toBe(true);
      expect(focusCallback).toHaveBeenCalledWith(textarea, 'textarea');
    });

    test('should handle blur events', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      
      // Set as active field first
      fieldMonitor.activeField = textarea;
      textarea.classList.add('feelly-active-field');
      
      const blurCallback = jest.fn();
      fieldMonitor.onFieldBlur(blurCallback);
      
      // Simulate blur event
      const blurEvent = new window.FocusEvent('focusout', { target: textarea });
      Object.defineProperty(blurEvent, 'target', { value: textarea });
      
      fieldMonitor.handleBlur(blurEvent);
      
      expect(fieldMonitor.activeField).toBeNull();
      expect(textarea.classList.contains('feelly-active-field')).toBe(false);
      expect(blurCallback).toHaveBeenCalledWith(textarea, 'textarea');
    });

    test('should switch active field on focus change', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea1 = document.createElement('textarea');
      const textarea2 = document.createElement('textarea');
      document.body.appendChild(textarea1);
      document.body.appendChild(textarea2);
      
      // Focus first field
      fieldMonitor.activeField = textarea1;
      textarea1.classList.add('feelly-active-field');
      
      // Focus second field
      const focusEvent = new window.FocusEvent('focusin', { target: textarea2 });
      Object.defineProperty(focusEvent, 'target', { value: textarea2 });
      
      fieldMonitor.handleFocus(focusEvent);
      
      expect(fieldMonitor.activeField).toBe(textarea2);
      expect(textarea1.classList.contains('feelly-active-field')).toBe(false);
      expect(textarea2.classList.contains('feelly-active-field')).toBe(true);
    });
  });

  describe('text change detection with debouncing', () => {
    test('should detect text changes with debouncing', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial text';
      
      fieldMonitor.startMonitoring(textarea);
      
      const changeCallback = jest.fn();
      fieldMonitor.onTextChange(changeCallback);
      
      // Change text
      textarea.value = 'New text';
      
      // Simulate input event
      const inputEvent = new window.Event('input');
      Object.defineProperty(inputEvent, 'target', { value: textarea });
      
      fieldMonitor.handleInput(inputEvent);
      
      // Callback should not be called immediately (debounced)
      expect(changeCallback).not.toHaveBeenCalled();
      
      // Fast-forward time to trigger debounce
      jest.advanceTimersByTime(500);
      
      expect(changeCallback).toHaveBeenCalledWith({
        field: textarea,
        fieldType: 'textarea',
        oldText: 'Initial text',
        newText: 'New text',
        timestamp: expect.any(Number)
      });
    });

    test('should reset debounce timer on multiple rapid changes', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial';
      
      fieldMonitor.startMonitoring(textarea);
      
      const changeCallback = jest.fn();
      fieldMonitor.onTextChange(changeCallback);
      
      // First change
      textarea.value = 'Initial t';
      fieldMonitor.processTextChange(textarea);
      
      // Second change before debounce completes
      jest.advanceTimersByTime(200);
      textarea.value = 'Initial te';
      fieldMonitor.processTextChange(textarea);
      
      // Third change before debounce completes
      jest.advanceTimersByTime(200);
      textarea.value = 'Initial text';
      fieldMonitor.processTextChange(textarea);
      
      // Only the final change should be processed after full debounce
      jest.advanceTimersByTime(500);
      
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          oldText: 'Initial',
          newText: 'Initial text'
        })
      );
    });

    test('should not trigger change callback if text is unchanged', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      textarea.value = 'Same text';
      
      fieldMonitor.startMonitoring(textarea);
      
      const changeCallback = jest.fn();
      fieldMonitor.onTextChange(changeCallback);
      
      // Process change with same text
      fieldMonitor.processTextChange(textarea);
      
      jest.advanceTimersByTime(500);
      
      expect(changeCallback).not.toHaveBeenCalled();
    });

    test('should handle keyup events for important keys', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial text';
      
      fieldMonitor.startMonitoring(textarea);
      
      const changeCallback = jest.fn();
      fieldMonitor.onTextChange(changeCallback);
      
      // Change text and simulate backspace keyup
      textarea.value = 'Initial tex';
      
      const keyupEvent = new window.KeyboardEvent('keyup', { key: 'Backspace' });
      Object.defineProperty(keyupEvent, 'target', { value: textarea });
      
      fieldMonitor.handleKeyup(keyupEvent);
      
      jest.advanceTimersByTime(500);
      
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          oldText: 'Initial text',
          newText: 'Initial tex'
        })
      );
    });

    test('should handle paste events with delay', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial';
      
      fieldMonitor.startMonitoring(textarea);
      
      const changeCallback = jest.fn();
      fieldMonitor.onTextChange(changeCallback);
      
      // Simulate paste event
      const pasteEvent = new window.ClipboardEvent('paste');
      Object.defineProperty(pasteEvent, 'target', { value: textarea });
      
      fieldMonitor.handlePaste(pasteEvent);
      
      // Change text to simulate paste result
      setTimeout(() => {
        textarea.value = 'Initial pasted text';
      }, 10);
      
      // Advance timers for paste delay + debounce
      jest.advanceTimersByTime(10);
      textarea.value = 'Initial pasted text';
      jest.advanceTimersByTime(500);
      
      expect(changeCallback).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    test('should allow setting debounce delay', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      expect(fieldMonitor.debounceDelay).toBe(500);
      
      fieldMonitor.setDebounceDelay(1000);
      expect(fieldMonitor.debounceDelay).toBe(1000);
      
      // Should ignore invalid values
      fieldMonitor.setDebounceDelay('invalid');
      expect(fieldMonitor.debounceDelay).toBe(1000);
      
      fieldMonitor.setDebounceDelay(-100);
      expect(fieldMonitor.debounceDelay).toBe(1000);
    });
  });

  describe('callback management', () => {
    test('should register and remove callbacks', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const changeCallback = jest.fn();
      const focusCallback = jest.fn();
      const blurCallback = jest.fn();
      
      fieldMonitor.onTextChange(changeCallback);
      fieldMonitor.onFieldFocus(focusCallback);
      fieldMonitor.onFieldBlur(blurCallback);
      
      expect(fieldMonitor.changeCallbacks.has(changeCallback)).toBe(true);
      expect(fieldMonitor.focusCallbacks.has(focusCallback)).toBe(true);
      expect(fieldMonitor.blurCallbacks.has(blurCallback)).toBe(true);
      
      fieldMonitor.removeCallback(changeCallback);
      fieldMonitor.removeCallback(focusCallback);
      fieldMonitor.removeCallback(blurCallback);
      
      expect(fieldMonitor.changeCallbacks.has(changeCallback)).toBe(false);
      expect(fieldMonitor.focusCallbacks.has(focusCallback)).toBe(false);
      expect(fieldMonitor.blurCallbacks.has(blurCallback)).toBe(false);
    });

    test('should handle callback errors gracefully', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();
      
      fieldMonitor.onTextChange(errorCallback);
      fieldMonitor.onTextChange(goodCallback);
      
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial';
      fieldMonitor.startMonitoring(textarea);
      
      // Spy on console.error to verify error handling
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      textarea.value = 'Changed';
      fieldMonitor.processTextChange(textarea);
      jest.advanceTimersByTime(500);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled(); // Should still call other callbacks
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('utility methods', () => {
    test('should provide accurate statistics', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      fieldMonitor.startMonitoring(textarea);
      fieldMonitor.activeField = textarea;
      
      const changeCallback = jest.fn();
      const focusCallback = jest.fn();
      
      fieldMonitor.onTextChange(changeCallback);
      fieldMonitor.onFieldFocus(focusCallback);
      
      const stats = fieldMonitor.getStats();
      
      expect(stats.monitoredFields).toBe(1);
      expect(stats.activeField).toBe('textarea');
      expect(stats.registeredCallbacks.change).toBe(1);
      expect(stats.registeredCallbacks.focus).toBe(1);
      expect(stats.registeredCallbacks.blur).toBe(0);
      expect(stats.debounceDelay).toBe(500);
    });

    test('should force immediate text change check', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial';
      fieldMonitor.startMonitoring(textarea);
      
      const changeCallback = jest.fn();
      fieldMonitor.onTextChange(changeCallback);
      
      // Change text without triggering events
      textarea.value = 'Changed';
      
      fieldMonitor.forceTextChangeCheck(textarea);
      
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          oldText: 'Initial',
          newText: 'Changed'
        })
      );
    });

    test('should get monitored fields list', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea1 = document.createElement('textarea');
      const textarea2 = document.createElement('textarea');
      
      fieldMonitor.startMonitoring(textarea1);
      fieldMonitor.startMonitoring(textarea2);
      
      const monitoredFields = fieldMonitor.getMonitoredFields();
      
      expect(monitoredFields).toHaveLength(2);
      expect(monitoredFields).toContain(textarea1);
      expect(monitoredFields).toContain(textarea2);
    });
  });

  describe('cleanup', () => {
    test('should clean up resources on destroy', () => {
      const fieldDetector = new FieldDetector();
      const fieldMonitor = new FieldMonitor(fieldDetector);
      
      const textarea = document.createElement('textarea');
      fieldMonitor.startMonitoring(textarea);
      
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      fieldMonitor.destroy();
      
      expect(fieldMonitor.monitoredFields.size).toBe(0);
      expect(fieldMonitor.changeCallbacks.size).toBe(0);
      expect(fieldMonitor.activeField).toBeNull();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('focusin', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('focusout', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function), true);
    });
  });
});