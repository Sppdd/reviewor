/**
 * Unit tests for EditorAdapter classes
 * Tests text extraction and positioning utilities for different editor types
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');

describe('EditorAdapter', () => {
  let dom;
  let document;
  let window;
  let EditorAdapterClasses;

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
    global.NodeFilter = window.NodeFilter;
    global.Event = window.Event;
    global.DOMRect = window.DOMRect;
    
    // Mock getComputedStyle
    window.getComputedStyle = jest.fn(() => ({
      fontSize: '16px',
      lineHeight: '20px'
    }));
    
    // Mock getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      left: 10,
      top: 10,
      width: 200,
      height: 100,
      right: 210,
      bottom: 110
    }));
    
    // Load the EditorAdapter classes
    const fs = require('fs');
    const path = require('path');
    const editorAdapterCode = fs.readFileSync(
      path.join(__dirname, '../core/EditorAdapter.js'), 
      'utf8'
    );
    
    // Execute the code in the test environment
    eval(editorAdapterCode);
    
    EditorAdapterClasses = {
      BaseEditorAdapter: window.BaseEditorAdapter,
      TextareaAdapter: window.TextareaAdapter,
      InputAdapter: window.InputAdapter,
      ContentEditableAdapter: window.ContentEditableAdapter,
      QuillAdapter: window.QuillAdapter,
      TinyMCEAdapter: window.TinyMCEAdapter,
      CKEditorAdapter: window.CKEditorAdapter,
      EditorAdapterFactory: window.EditorAdapterFactory
    };
  });

  afterEach(() => {
    // Clean up globals
    delete global.document;
    delete global.window;
    delete global.HTMLElement;
    delete global.Node;
    delete global.NodeFilter;
    delete global.Event;
    delete global.DOMRect;
  });

  describe('BaseEditorAdapter', () => {
    test('should provide basic functionality', () => {
      const div = document.createElement('div');
      div.textContent = 'Test content';
      
      const adapter = new EditorAdapterClasses.BaseEditorAdapter(div);
      
      expect(adapter.element).toBe(div);
      expect(adapter.type).toBe('base');
      expect(adapter.getText()).toBe('Test content');
      expect(adapter.supportsRichText()).toBe(false);
    });

    test('should handle text setting and event triggering', () => {
      const div = document.createElement('div');
      const adapter = new EditorAdapterClasses.BaseEditorAdapter(div);
      
      const eventSpy = jest.spyOn(div, 'dispatchEvent');
      
      adapter.setText('New content');
      
      expect(div.textContent).toBe('New content');
      expect(eventSpy).toHaveBeenCalledTimes(3); // input, change, keyup events
    });

    test('should provide default cursor and selection methods', () => {
      const div = document.createElement('div');
      const adapter = new EditorAdapterClasses.BaseEditorAdapter(div);
      
      expect(adapter.getCursorPosition()).toBe(0);
      expect(adapter.getSelection()).toEqual({ start: 0, end: 0 });
      
      // These should not throw errors
      adapter.setCursorPosition(5);
      adapter.setSelection(0, 5);
    });

    test('should handle text replacement', () => {
      const div = document.createElement('div');
      div.textContent = 'Hello world';
      
      const adapter = new EditorAdapterClasses.BaseEditorAdapter(div);
      adapter.replaceText(6, 11, 'universe');
      
      expect(adapter.getText()).toBe('Hello universe');
    });
  });

  describe('TextareaAdapter', () => {
    test('should handle textarea-specific operations', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Initial text';
      
      // Mock selection properties
      Object.defineProperty(textarea, 'selectionStart', {
        value: 0,
        writable: true
      });
      Object.defineProperty(textarea, 'selectionEnd', {
        value: 0,
        writable: true
      });
      
      // Mock setSelectionRange
      textarea.setSelectionRange = jest.fn();
      
      const adapter = new EditorAdapterClasses.TextareaAdapter(textarea);
      
      expect(adapter.type).toBe('textarea');
      expect(adapter.getText()).toBe('Initial text');
      
      adapter.setText('New text');
      expect(textarea.value).toBe('New text');
      
      adapter.setCursorPosition(5);
      expect(textarea.setSelectionRange).toHaveBeenCalledWith(5, 5);
      
      adapter.setSelection(0, 3);
      expect(textarea.setSelectionRange).toHaveBeenCalledWith(0, 3);
    });

    test('should calculate position from coordinates', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Line 1\nLine 2\nLine 3';
      
      const adapter = new EditorAdapterClasses.TextareaAdapter(textarea);
      
      // Test coordinate to position conversion
      const position = adapter.getPositionFromCoordinates(50, 30);
      expect(typeof position).toBe('number');
      expect(position).toBeGreaterThanOrEqual(0);
    });

    test('should calculate coordinates from position', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Line 1\nLine 2';
      
      const adapter = new EditorAdapterClasses.TextareaAdapter(textarea);
      
      const coords = adapter.getCoordinatesFromPosition(8); // Start of second line
      expect(coords).toHaveProperty('x');
      expect(coords).toHaveProperty('y');
      expect(typeof coords.x).toBe('number');
      expect(typeof coords.y).toBe('number');
    });

    test('should get range rectangle', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello world';
      
      const adapter = new EditorAdapterClasses.TextareaAdapter(textarea);
      
      const rect = adapter.getRangeRect(0, 5);
      expect(rect).toBeInstanceOf(DOMRect);
    });
  });

  describe('InputAdapter', () => {
    test('should handle input-specific operations', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Input text';
      
      // Mock selection properties
      Object.defineProperty(input, 'selectionStart', {
        value: 0,
        writable: true
      });
      Object.defineProperty(input, 'selectionEnd', {
        value: 0,
        writable: true
      });
      
      input.setSelectionRange = jest.fn();
      
      const adapter = new EditorAdapterClasses.InputAdapter(input);
      
      expect(adapter.type).toBe('input');
      expect(adapter.getText()).toBe('Input text');
      
      adapter.setText('New input');
      expect(input.value).toBe('New input');
    });

    test('should handle single-line coordinate calculations', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Single line text';
      
      const adapter = new EditorAdapterClasses.InputAdapter(input);
      
      const position = adapter.getPositionFromCoordinates(50, 15);
      expect(typeof position).toBe('number');
      
      const coords = adapter.getCoordinatesFromPosition(5);
      expect(coords).toHaveProperty('x');
      expect(coords).toHaveProperty('y');
    });
  });

  describe('ContentEditableAdapter', () => {
    test('should handle contenteditable operations', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'Editable content';
      
      const adapter = new EditorAdapterClasses.ContentEditableAdapter(div);
      
      expect(adapter.type).toBe('contenteditable');
      expect(adapter.getText()).toBe('Editable content');
      expect(adapter.supportsRichText()).toBe(true);
      
      adapter.setText('New content');
      expect(div.textContent).toBe('New content');
    });

    test('should handle selection with mocked DOM methods', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'Test content';
      
      // Mock window.getSelection
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn(() => ({
          endContainer: div.firstChild,
          endOffset: 5,
          startContainer: div.firstChild,
          startOffset: 0,
          cloneRange: jest.fn(() => ({
            selectNodeContents: jest.fn(),
            setEnd: jest.fn(),
            toString: jest.fn(() => 'Test ')
          })),
          collapse: jest.fn(),
          getBoundingClientRect: jest.fn(() => new DOMRect(10, 10, 50, 20))
        })),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      };
      
      window.getSelection = jest.fn(() => mockSelection);
      
      // Mock document.createRange
      document.createRange = jest.fn(() => ({
        setStart: jest.fn(),
        setEnd: jest.fn(),
        collapse: jest.fn(),
        getBoundingClientRect: jest.fn(() => new DOMRect(10, 10, 50, 20))
      }));
      
      // Mock TreeWalker
      document.createTreeWalker = jest.fn(() => ({
        nextNode: jest.fn()
          .mockReturnValueOnce(div.firstChild)
          .mockReturnValue(null)
      }));
      
      const adapter = new EditorAdapterClasses.ContentEditableAdapter(div);
      
      const selection = adapter.getSelection();
      expect(selection).toHaveProperty('start');
      expect(selection).toHaveProperty('end');
    });

    test('should handle coordinate-based positioning', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'Test content';
      
      // Mock caretPositionFromPoint
      document.caretPositionFromPoint = jest.fn(() => ({
        offsetNode: div.firstChild,
        offset: 2
      }));
      
      const adapter = new EditorAdapterClasses.ContentEditableAdapter(div);
      
      const position = adapter.getPositionFromCoordinates(25, 15);
      expect(typeof position).toBe('number');
    });
  });

  describe('QuillAdapter', () => {
    test('should handle Quill editor operations', () => {
      const div = document.createElement('div');
      div.className = 'ql-editor';
      
      // Mock Quill instance
      const mockQuill = {
        getText: jest.fn(() => 'Quill content'),
        setText: jest.fn(),
        getSelection: jest.fn(() => ({ index: 0, length: 0 })),
        setSelection: jest.fn(),
        deleteText: jest.fn(),
        insertText: jest.fn()
      };
      
      div.quill = mockQuill;
      
      const adapter = new EditorAdapterClasses.QuillAdapter(div);
      
      expect(adapter.type).toBe('quill');
      expect(adapter.supportsRichText()).toBe(true);
      expect(adapter.getText()).toBe('Quill content');
      
      adapter.setText('New content');
      expect(mockQuill.setText).toHaveBeenCalledWith('New content');
      
      const selection = adapter.getSelection();
      expect(selection).toEqual({ start: 0, end: 0 });
      
      adapter.setSelection(0, 5);
      expect(mockQuill.setSelection).toHaveBeenCalledWith(0, 5);
      
      adapter.replaceText(0, 5, 'Replaced');
      expect(mockQuill.deleteText).toHaveBeenCalledWith(0, 5);
      expect(mockQuill.insertText).toHaveBeenCalledWith(0, 'Replaced');
    });

    test('should fallback when Quill instance not found', () => {
      const div = document.createElement('div');
      div.className = 'ql-editor';
      div.textContent = 'Fallback content';
      
      const adapter = new EditorAdapterClasses.QuillAdapter(div);
      
      expect(adapter.getText()).toBe('Fallback content');
    });
  });

  describe('TinyMCEAdapter', () => {
    test('should handle TinyMCE editor operations', () => {
      const iframe = document.createElement('iframe');
      iframe.id = 'tinymce-editor';
      
      // Mock TinyMCE instance
      const mockTinyMCE = {
        getContent: jest.fn(() => 'TinyMCE content'),
        setContent: jest.fn(),
        selection: {
          getRng: jest.fn(() => ({}))
        }
      };
      
      // Mock global tinymce
      window.tinymce = {
        get: jest.fn(() => mockTinyMCE)
      };
      
      const adapter = new EditorAdapterClasses.TinyMCEAdapter(iframe);
      
      expect(adapter.type).toBe('tinymce');
      expect(adapter.supportsRichText()).toBe(true);
      expect(adapter.getText()).toBe('TinyMCE content');
      
      adapter.setText('New content');
      expect(mockTinyMCE.setContent).toHaveBeenCalledWith('New content');
    });

    test('should fallback to iframe content when TinyMCE not available', () => {
      const iframe = document.createElement('iframe');
      
      // Mock iframe content
      const mockDocument = {
        body: {
          textContent: 'Iframe content'
        }
      };
      
      Object.defineProperty(iframe, 'contentDocument', {
        value: mockDocument
      });
      
      const adapter = new EditorAdapterClasses.TinyMCEAdapter(iframe);
      
      expect(adapter.getText()).toBe('Iframe content');
    });
  });

  describe('CKEditorAdapter', () => {
    test('should handle CKEditor 4 operations', () => {
      const div = document.createElement('div');
      div.className = 'cke_editable';
      
      // Mock CKEditor 4 instance
      const mockCKEditor = {
        getData: jest.fn(() => '<p>CKEditor content</p>'),
        setData: jest.fn(),
        element: { $: div }
      };
      
      // Mock global CKEDITOR
      window.CKEDITOR = {
        instances: {
          'editor1': mockCKEditor
        }
      };
      
      const adapter = new EditorAdapterClasses.CKEditorAdapter(div);
      
      expect(adapter.type).toBe('ckeditor');
      expect(adapter.supportsRichText()).toBe(true);
      expect(adapter.getText()).toBe('CKEditor content');
      
      adapter.setText('New content');
      expect(mockCKEditor.setData).toHaveBeenCalledWith('New content');
    });

    test('should handle CKEditor 5 operations', () => {
      const div = document.createElement('div');
      
      // Mock CKEditor 5 instance
      const mockCKEditor5 = {
        model: {
          document: {
            getRoot: jest.fn(() => ({
              getChild: jest.fn(() => ({ data: 'CKEditor 5 content' }))
            }))
          }
        },
        setData: jest.fn()
      };
      
      div.ckeditorInstance = mockCKEditor5;
      
      const adapter = new EditorAdapterClasses.CKEditorAdapter(div);
      
      expect(adapter.getText()).toBe('CKEditor 5 content');
      
      adapter.setText('New content');
      expect(mockCKEditor5.setData).toHaveBeenCalledWith('New content');
    });

    test('should strip HTML from content', () => {
      const div = document.createElement('div');
      
      const mockCKEditor = {
        getData: jest.fn(() => '<p><strong>Bold</strong> text</p>')
      };
      
      window.CKEDITOR = {
        instances: {
          'editor1': mockCKEditor
        }
      };
      
      const adapter = new EditorAdapterClasses.CKEditorAdapter(div);
      adapter.editorInstance = mockCKEditor;
      
      expect(adapter.getText()).toBe('Bold text');
    });
  });

  describe('EditorAdapterFactory', () => {
    test('should create appropriate adapters for different elements', () => {
      const { EditorAdapterFactory } = EditorAdapterClasses;
      
      // Textarea
      const textarea = document.createElement('textarea');
      const textareaAdapter = EditorAdapterFactory.createAdapter(textarea);
      expect(textareaAdapter.type).toBe('textarea');
      
      // Input
      const input = document.createElement('input');
      input.type = 'text';
      const inputAdapter = EditorAdapterFactory.createAdapter(input);
      expect(inputAdapter.type).toBe('input');
      
      // Contenteditable
      const div = document.createElement('div');
      div.contentEditable = 'true';
      const contentEditableAdapter = EditorAdapterFactory.createAdapter(div);
      expect(contentEditableAdapter.type).toBe('contenteditable');
      
      // Quill
      const quillDiv = document.createElement('div');
      quillDiv.className = 'ql-editor';
      const quillAdapter = EditorAdapterFactory.createAdapter(quillDiv);
      expect(quillAdapter.type).toBe('quill');
      
      // CKEditor
      const ckeDiv = document.createElement('div');
      ckeDiv.className = 'cke_editable';
      const ckeAdapter = EditorAdapterFactory.createAdapter(ckeDiv);
      expect(ckeAdapter.type).toBe('ckeditor');
      
      // TinyMCE
      const iframe = document.createElement('iframe');
      iframe.className = 'tox-edit-area';
      const tinyAdapter = EditorAdapterFactory.createAdapter(iframe);
      expect(tinyAdapter.type).toBe('tinymce');
    });

    test('should fallback to base adapter for unsupported elements', () => {
      const { EditorAdapterFactory } = EditorAdapterClasses;
      
      const span = document.createElement('span');
      const adapter = EditorAdapterFactory.createAdapter(span);
      expect(adapter.type).toBe('base');
    });

    test('should provide supported types list', () => {
      const { EditorAdapterFactory } = EditorAdapterClasses;
      
      const supportedTypes = EditorAdapterFactory.getSupportedTypes();
      expect(supportedTypes).toContain('textarea');
      expect(supportedTypes).toContain('input');
      expect(supportedTypes).toContain('contenteditable');
      expect(supportedTypes).toContain('quill');
      expect(supportedTypes).toContain('tinymce');
      expect(supportedTypes).toContain('ckeditor');
    });

    test('should check if element is supported', () => {
      const { EditorAdapterFactory } = EditorAdapterClasses;
      
      const textarea = document.createElement('textarea');
      expect(EditorAdapterFactory.isSupported(textarea)).toBe(true);
      
      const span = document.createElement('span');
      expect(EditorAdapterFactory.isSupported(span)).toBe(false);
    });

    test('should handle null element gracefully', () => {
      const { EditorAdapterFactory } = EditorAdapterClasses;
      
      expect(() => {
        EditorAdapterFactory.createAdapter(null);
      }).toThrow('Element is required to create adapter');
      
      expect(EditorAdapterFactory.isSupported(null)).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    test('should handle complex text operations across different adapters', () => {
      const { EditorAdapterFactory } = EditorAdapterClasses;
      
      // Test with textarea
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello world';
      textarea.setSelectionRange = jest.fn();
      
      const textareaAdapter = EditorAdapterFactory.createAdapter(textarea);
      textareaAdapter.replaceText(6, 11, 'universe');
      expect(textarea.value).toBe('Hello universe');
      
      // Test with contenteditable
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'Hello world';
      
      const contentAdapter = EditorAdapterFactory.createAdapter(div);
      contentAdapter.replaceText(6, 11, 'universe');
      expect(div.textContent).toBe('Hello universe');
    });

    test('should maintain consistent interface across all adapters', () => {
      const { EditorAdapterFactory } = EditorAdapterClasses;
      
      const elements = [
        document.createElement('textarea'),
        (() => { const input = document.createElement('input'); input.type = 'text'; return input; })(),
        (() => { const div = document.createElement('div'); div.contentEditable = 'true'; return div; })()
      ];
      
      elements.forEach(element => {
        const adapter = EditorAdapterFactory.createAdapter(element);
        
        // All adapters should have these methods
        expect(typeof adapter.getText).toBe('function');
        expect(typeof adapter.setText).toBe('function');
        expect(typeof adapter.getCursorPosition).toBe('function');
        expect(typeof adapter.setCursorPosition).toBe('function');
        expect(typeof adapter.getSelection).toBe('function');
        expect(typeof adapter.setSelection).toBe('function');
        expect(typeof adapter.replaceText).toBe('function');
        expect(typeof adapter.getPositionFromCoordinates).toBe('function');
        expect(typeof adapter.getCoordinatesFromPosition).toBe('function');
        expect(typeof adapter.supportsRichText).toBe('function');
        expect(typeof adapter.getRangeRect).toBe('function');
      });
    });
  });
});