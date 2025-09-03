/**
 * Unit tests for TextFieldDetector (FieldDetector class)
 * Tests field detection accuracy for various input types
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');

describe('TextFieldDetector', () => {
  let dom;
  let document;
  let window;
  let FieldDetector;

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
    
    // Load the FieldDetector class
    const fs = require('fs');
    const path = require('path');
    const fieldDetectorCode = fs.readFileSync(
      path.join(__dirname, '../core/FieldDetector.js'), 
      'utf8'
    );
    
    // Execute the code in the test environment
    eval(fieldDetectorCode);
    FieldDetector = window.FieldDetector;
  });

  afterEach(() => {
    // Clean up globals
    delete global.document;
    delete global.window;
    delete global.HTMLElement;
    delete global.Node;
    delete global.Event;
    delete global.KeyboardEvent;
  });

  describe('detectSupportedFields', () => {
    test('should detect textarea elements', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = `
        <textarea id="test-textarea">Test content</textarea>
        <textarea disabled>Disabled textarea</textarea>
        <textarea readonly>Readonly textarea</textarea>
      `;

      const detector = new FieldDetector();
      const fields = detector.detectSupportedFields();
      
      expect(fields).toHaveLength(1);
      expect(fields[0].id).toBe('test-textarea');
    });

    test('should detect input[type="text"] elements', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = `
        <input type="text" id="text-input" />
        <input type="email" id="email-input" />
        <input type="search" id="search-input" />
        <input type="url" id="url-input" />
        <input type="password" id="password-input" />
        <input type="hidden" id="hidden-input" />
      `;

      const detector = new FieldDetector();
      const fields = detector.detectSupportedFields();
      
      expect(fields).toHaveLength(4); // text, email, search, url
      const fieldIds = fields.map(f => f.id);
      expect(fieldIds).toContain('text-input');
      expect(fieldIds).toContain('email-input');
      expect(fieldIds).toContain('search-input');
      expect(fieldIds).toContain('url-input');
      expect(fieldIds).not.toContain('password-input');
      expect(fieldIds).not.toContain('hidden-input');
    });

    test('should detect contenteditable elements', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = `
        <div contenteditable="true" id="editable-true">Editable content</div>
        <div contenteditable="" id="editable-empty">Editable content</div>
        <div contenteditable="false" id="editable-false">Non-editable content</div>
        <div id="non-editable">Regular div</div>
      `;

      const detector = new FieldDetector();
      const fields = detector.detectSupportedFields();
      
      expect(fields).toHaveLength(2);
      const fieldIds = fields.map(f => f.id);
      expect(fieldIds).toContain('editable-true');
      expect(fieldIds).toContain('editable-empty');
      expect(fieldIds).not.toContain('editable-false');
      expect(fieldIds).not.toContain('non-editable');
    });

    test('should detect rich text editor elements', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = `
        <div class="ql-editor" id="quill-editor">Quill content</div>
        <div class="cke_editable" id="ckeditor">CKEditor content</div>
        <div class="DraftEditor-root" id="draft-editor">Draft.js content</div>
        <div class="notranslate" id="google-docs">Google Docs content</div>
      `;

      const detector = new FieldDetector();
      const fields = detector.detectSupportedFields();
      
      expect(fields).toHaveLength(4);
      const fieldIds = fields.map(f => f.id);
      expect(fieldIds).toContain('quill-editor');
      expect(fieldIds).toContain('ckeditor');
      expect(fieldIds).toContain('draft-editor');
      expect(fieldIds).toContain('google-docs');
    });

    test('should exclude hidden elements', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = `
        <textarea id="visible-textarea">Visible</textarea>
        <textarea id="hidden-textarea" style="display: none;">Hidden</textarea>
        <textarea id="invisible-textarea" style="visibility: hidden;">Invisible</textarea>
        <textarea id="zero-opacity-textarea" style="opacity: 0;">Zero opacity</textarea>
      `;

      const detector = new FieldDetector();
      const fields = detector.detectSupportedFields();
      
      expect(fields).toHaveLength(1);
      expect(fields[0].id).toBe('visible-textarea');
    });
  });

  describe('isFieldSupported', () => {
    test('should return true for supported elements', () => {
      const detector = new FieldDetector();
      
      const textarea = document.createElement('textarea');
      expect(detector.isFieldSupported(textarea)).toBe(true);
      
      const textInput = document.createElement('input');
      textInput.type = 'text';
      expect(detector.isFieldSupported(textInput)).toBe(true);
      
      const editableDiv = document.createElement('div');
      editableDiv.contentEditable = 'true';
      expect(detector.isFieldSupported(editableDiv)).toBe(true);
    });

    test('should return false for unsupported elements', () => {
      const detector = new FieldDetector();
      
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      expect(detector.isFieldSupported(passwordInput)).toBe(false);
      
      const regularDiv = document.createElement('div');
      expect(detector.isFieldSupported(regularDiv)).toBe(false);
      
      const disabledTextarea = document.createElement('textarea');
      disabledTextarea.disabled = true;
      expect(detector.isFieldSupported(disabledTextarea)).toBe(false);
    });

    test('should handle null and undefined inputs', () => {
      const detector = new FieldDetector();
      
      expect(detector.isFieldSupported(null)).toBe(false);
      expect(detector.isFieldSupported(undefined)).toBe(false);
    });
  });

  describe('getFieldType', () => {
    test('should correctly identify field types', () => {
      const detector = new FieldDetector();
      
      const textarea = document.createElement('textarea');
      expect(detector.getFieldType(textarea)).toBe('textarea');
      
      const textInput = document.createElement('input');
      textInput.type = 'text';
      expect(detector.getFieldType(textInput)).toBe('input');
      
      const editableDiv = document.createElement('div');
      editableDiv.contentEditable = 'true';
      expect(detector.getFieldType(editableDiv)).toBe('contenteditable');
      
      const quillEditor = document.createElement('div');
      quillEditor.className = 'ql-editor';
      expect(detector.getFieldType(quillEditor)).toBe('rich-editor-quill');
    });
  });

  describe('getFieldText and setFieldText', () => {
    test('should get and set text for textarea elements', () => {
      const detector = new FieldDetector();
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial text';
      
      expect(detector.getFieldText(textarea)).toBe('Initial text');
      
      detector.setFieldText(textarea, 'New text');
      expect(textarea.value).toBe('New text');
    });

    test('should get and set text for input elements', () => {
      const detector = new FieldDetector();
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Initial text';
      
      expect(detector.getFieldText(input)).toBe('Initial text');
      
      detector.setFieldText(input, 'New text');
      expect(input.value).toBe('New text');
    });

    test('should get and set text for contenteditable elements', () => {
      const detector = new FieldDetector();
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'Initial text';
      
      expect(detector.getFieldText(div)).toBe('Initial text');
      
      detector.setFieldText(div, 'New text');
      expect(div.textContent).toBe('New text');
    });
  });

  describe('shadow DOM detection', () => {
    test('should detect fields in shadow DOM when accessible', () => {
      // Skip this test if shadow DOM is not supported
      if (!document.createElement('div').attachShadow) {
        return;
      }

      const container = document.getElementById('test-container');
      const hostElement = document.createElement('div');
      container.appendChild(hostElement);
      
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = '<textarea id="shadow-textarea">Shadow content</textarea>';
      
      const detector = new FieldDetector();
      const fields = detector.detectSupportedFields();
      
      // Should find the textarea in shadow DOM
      expect(fields.length).toBeGreaterThan(0);
      const shadowField = fields.find(f => f.id === 'shadow-textarea');
      expect(shadowField).toBeDefined();
    });
  });

  describe('performance and edge cases', () => {
    test('should handle large numbers of fields efficiently', () => {
      const container = document.getElementById('test-container');
      const fieldCount = 100;
      
      // Create many fields
      for (let i = 0; i < fieldCount; i++) {
        const textarea = document.createElement('textarea');
        textarea.id = `field-${i}`;
        container.appendChild(textarea);
      }
      
      const detector = new FieldDetector();
      const startTime = Date.now();
      const fields = detector.detectSupportedFields();
      const endTime = Date.now();
      
      expect(fields).toHaveLength(fieldCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should deduplicate fields correctly', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = `
        <textarea id="duplicate-field" class="test-class">Content</textarea>
      `;
      
      const detector = new FieldDetector();
      
      // Manually create array with duplicates
      const textarea = container.querySelector('#duplicate-field');
      const fieldsWithDuplicates = [textarea, textarea, textarea];
      
      const deduplicated = detector.deduplicateFields(fieldsWithDuplicates);
      expect(deduplicated).toHaveLength(1);
    });

    test('should handle malformed selectors gracefully', () => {
      const detector = new FieldDetector();
      
      // Override selectors with invalid ones to test error handling
      detector.supportedSelectors = ['textarea', '[[invalid]]', 'input[type="text"]'];
      
      // Should not throw error and should still find valid fields
      const container = document.getElementById('test-container');
      container.innerHTML = '<textarea>Test</textarea>';
      
      expect(() => {
        const fields = detector.detectSupportedFields();
        expect(fields).toHaveLength(1);
      }).not.toThrow();
    });
  });

  describe('field statistics', () => {
    test('should provide accurate field statistics', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = `
        <textarea>Textarea</textarea>
        <input type="text" />
        <input type="email" />
        <div contenteditable="true">Editable</div>
        <div class="ql-editor">Quill</div>
        <textarea style="display: none;">Hidden</textarea>
      `;
      
      const detector = new FieldDetector();
      const stats = detector.getFieldStats();
      
      expect(stats.totalFields).toBe(5); // Excluding hidden field
      expect(stats.fieldTypes.textarea).toBe(1);
      expect(stats.fieldTypes.input).toBe(2);
      expect(stats.fieldTypes.contenteditable).toBe(1);
      expect(stats.fieldTypes['rich-editor-quill']).toBe(1);
      expect(stats.hiddenFields).toBe(1);
    });
  });
});