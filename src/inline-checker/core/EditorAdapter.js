/**
 * Editor adapters for different text input types
 * Provides unified interface for text extraction and positioning
 */

/**
 * Base adapter class for all editor types
 */
class BaseEditorAdapter {
  constructor(element) {
    this.element = element;
    this.type = 'base';
  }

  /**
   * Get text content from the editor
   * @returns {string} Text content
   */
  getText() {
    return this.element.textContent || this.element.innerText || '';
  }

  /**
   * Set text content in the editor
   * @param {string} text - Text to set
   */
  setText(text) {
    this.element.textContent = text;
    this.triggerEvents();
  }

  /**
   * Get cursor position in the editor
   * @returns {number} Cursor position
   */
  getCursorPosition() {
    return 0;
  }

  /**
   * Set cursor position in the editor
   * @param {number} position - Position to set cursor
   */
  setCursorPosition(position) {
    // Base implementation - override in subclasses
  }

  /**
   * Get text selection range
   * @returns {Object} Selection range {start, end}
   */
  getSelection() {
    return { start: 0, end: 0 };
  }

  /**
   * Set text selection range
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  setSelection(start, end) {
    // Base implementation - override in subclasses
  }

  /**
   * Replace text in a specific range
   * @param {number} start - Start position
   * @param {number} end - End position
   * @param {string} replacement - Replacement text
   */
  replaceText(start, end, replacement) {
    const text = this.getText();
    const newText = text.substring(0, start) + replacement + text.substring(end);
    this.setText(newText);
    this.setCursorPosition(start + replacement.length);
  }

  /**
   * Get character position from DOM coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Character position
   */
  getPositionFromCoordinates(x, y) {
    return 0;
  }

  /**
   * Get DOM coordinates from character position
   * @param {number} position - Character position
   * @returns {Object} Coordinates {x, y}
   */
  getCoordinatesFromPosition(position) {
    return { x: 0, y: 0 };
  }

  /**
   * Check if the editor supports rich text formatting
   * @returns {boolean} Whether rich text is supported
   */
  supportsRichText() {
    return false;
  }

  /**
   * Trigger input events for framework compatibility
   */
  triggerEvents() {
    const events = ['input', 'change', 'keyup'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      this.element.dispatchEvent(event);
    });
  }

  /**
   * Get bounding rectangle for text range
   * @param {number} start - Start position
   * @param {number} end - End position
   * @returns {DOMRect} Bounding rectangle
   */
  getRangeRect(start, end) {
    return this.element.getBoundingClientRect();
  }
}

/**
 * Adapter for textarea elements
 */
class TextareaAdapter extends BaseEditorAdapter {
  constructor(element) {
    super(element);
    this.type = 'textarea';
  }

  getText() {
    return this.element.value || '';
  }

  setText(text) {
    this.element.value = text;
    this.triggerEvents();
  }

  getCursorPosition() {
    return this.element.selectionStart || 0;
  }

  setCursorPosition(position) {
    if (this.element.setSelectionRange) {
      this.element.setSelectionRange(position, position);
    }
  }

  getSelection() {
    return {
      start: this.element.selectionStart || 0,
      end: this.element.selectionEnd || 0
    };
  }

  setSelection(start, end) {
    if (this.element.setSelectionRange) {
      this.element.setSelectionRange(start, end);
    }
  }

  getPositionFromCoordinates(x, y) {
    // For textarea, we need to estimate position based on font metrics
    const rect = this.element.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    const style = window.getComputedStyle(this.element);
    const fontSize = parseInt(style.fontSize);
    const lineHeight = parseInt(style.lineHeight) || fontSize * 1.2;
    
    const lines = this.getText().split('\n');
    const lineIndex = Math.floor(relativeY / lineHeight);
    
    if (lineIndex >= lines.length) {
      return this.getText().length;
    }
    
    const line = lines[lineIndex] || '';
    const charWidth = fontSize * 0.6; // Approximate character width
    const charIndex = Math.round(relativeX / charWidth);
    
    let position = 0;
    for (let i = 0; i < lineIndex; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    position += Math.min(charIndex, line.length);
    
    return Math.min(position, this.getText().length);
  }

  getCoordinatesFromPosition(position) {
    const text = this.getText();
    const lines = text.substring(0, position).split('\n');
    const lineIndex = lines.length - 1;
    const charIndex = lines[lineIndex].length;
    
    const style = window.getComputedStyle(this.element);
    const fontSize = parseInt(style.fontSize);
    const lineHeight = parseInt(style.lineHeight) || fontSize * 1.2;
    const charWidth = fontSize * 0.6;
    
    const rect = this.element.getBoundingClientRect();
    
    return {
      x: rect.left + charIndex * charWidth,
      y: rect.top + lineIndex * lineHeight
    };
  }

  getRangeRect(start, end) {
    const startCoords = this.getCoordinatesFromPosition(start);
    const endCoords = this.getCoordinatesFromPosition(end);
    
    return new DOMRect(
      startCoords.x,
      startCoords.y,
      endCoords.x - startCoords.x,
      endCoords.y - startCoords.y + parseInt(window.getComputedStyle(this.element).fontSize)
    );
  }
}

/**
 * Adapter for input elements
 */
class InputAdapter extends BaseEditorAdapter {
  constructor(element) {
    super(element);
    this.type = 'input';
  }

  getText() {
    return this.element.value || '';
  }

  setText(text) {
    this.element.value = text;
    this.triggerEvents();
  }

  getCursorPosition() {
    return this.element.selectionStart || 0;
  }

  setCursorPosition(position) {
    if (this.element.setSelectionRange) {
      this.element.setSelectionRange(position, position);
    }
  }

  getSelection() {
    return {
      start: this.element.selectionStart || 0,
      end: this.element.selectionEnd || 0
    };
  }

  setSelection(start, end) {
    if (this.element.setSelectionRange) {
      this.element.setSelectionRange(start, end);
    }
  }

  getPositionFromCoordinates(x, y) {
    const rect = this.element.getBoundingClientRect();
    const relativeX = x - rect.left;
    
    const style = window.getComputedStyle(this.element);
    const fontSize = parseInt(style.fontSize);
    const charWidth = fontSize * 0.6;
    
    const charIndex = Math.round(relativeX / charWidth);
    return Math.min(Math.max(0, charIndex), this.getText().length);
  }

  getCoordinatesFromPosition(position) {
    const style = window.getComputedStyle(this.element);
    const fontSize = parseInt(style.fontSize);
    const charWidth = fontSize * 0.6;
    
    const rect = this.element.getBoundingClientRect();
    
    return {
      x: rect.left + position * charWidth,
      y: rect.top + rect.height / 2
    };
  }

  getRangeRect(start, end) {
    const startCoords = this.getCoordinatesFromPosition(start);
    const endCoords = this.getCoordinatesFromPosition(end);
    
    return new DOMRect(
      startCoords.x,
      startCoords.y - parseInt(window.getComputedStyle(this.element).fontSize) / 2,
      endCoords.x - startCoords.x,
      parseInt(window.getComputedStyle(this.element).fontSize)
    );
  }
}

/**
 * Adapter for contenteditable elements
 */
class ContentEditableAdapter extends BaseEditorAdapter {
  constructor(element) {
    super(element);
    this.type = 'contenteditable';
  }

  getText() {
    return this.element.textContent || this.element.innerText || '';
  }

  setText(text) {
    this.element.textContent = text;
    this.triggerEvents();
  }

  supportsRichText() {
    return true;
  }

  getCursorPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return preCaretRange.toString().length;
  }

  setCursorPosition(position) {
    const textNode = this.getTextNodeAtPosition(position);
    if (!textNode) return;
    
    const range = document.createRange();
    const selection = window.getSelection();
    
    range.setStart(textNode.node, textNode.offset);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }

  getSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return { start: 0, end: 0 };
    
    const range = selection.getRangeAt(0);
    
    const startRange = range.cloneRange();
    startRange.selectNodeContents(this.element);
    startRange.setEnd(range.startContainer, range.startOffset);
    
    const endRange = range.cloneRange();
    endRange.selectNodeContents(this.element);
    endRange.setEnd(range.endContainer, range.endOffset);
    
    return {
      start: startRange.toString().length,
      end: endRange.toString().length
    };
  }

  setSelection(start, end) {
    const startNode = this.getTextNodeAtPosition(start);
    const endNode = this.getTextNodeAtPosition(end);
    
    if (!startNode || !endNode) return;
    
    const range = document.createRange();
    const selection = window.getSelection();
    
    range.setStart(startNode.node, startNode.offset);
    range.setEnd(endNode.node, endNode.offset);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }

  getPositionFromCoordinates(x, y) {
    if (document.caretPositionFromPoint) {
      const caretPosition = document.caretPositionFromPoint(x, y);
      if (caretPosition && this.element.contains(caretPosition.offsetNode)) {
        return this.getPositionFromNode(caretPosition.offsetNode, caretPosition.offset);
      }
    } else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (range && this.element.contains(range.startContainer)) {
        return this.getPositionFromNode(range.startContainer, range.startOffset);
      }
    }
    
    return 0;
  }

  getCoordinatesFromPosition(position) {
    const textNode = this.getTextNodeAtPosition(position);
    if (!textNode) {
      const rect = this.element.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    
    const range = document.createRange();
    range.setStart(textNode.node, textNode.offset);
    range.setEnd(textNode.node, textNode.offset);
    
    const rect = range.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  getRangeRect(start, end) {
    const startNode = this.getTextNodeAtPosition(start);
    const endNode = this.getTextNodeAtPosition(end);
    
    if (!startNode || !endNode) {
      return this.element.getBoundingClientRect();
    }
    
    const range = document.createRange();
    range.setStart(startNode.node, startNode.offset);
    range.setEnd(endNode.node, endNode.offset);
    
    return range.getBoundingClientRect();
  }

  /**
   * Get text node and offset for a given position
   * @param {number} position - Character position
   * @returns {Object} {node, offset}
   */
  getTextNodeAtPosition(position) {
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let currentPosition = 0;
    let node;
    
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent.length;
      if (currentPosition + nodeLength >= position) {
        return {
          node: node,
          offset: position - currentPosition
        };
      }
      currentPosition += nodeLength;
    }
    
    // If position is beyond text, return last text node
    if (node) {
      return {
        node: node,
        offset: node.textContent.length
      };
    }
    
    return null;
  }

  /**
   * Get character position from DOM node and offset
   * @param {Node} node - DOM node
   * @param {number} offset - Offset within node
   * @returns {number} Character position
   */
  getPositionFromNode(node, offset) {
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let position = 0;
    let currentNode;
    
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return position + offset;
      }
      position += currentNode.textContent.length;
    }
    
    return position;
  }
}

/**
 * Adapter for Quill editor
 */
class QuillAdapter extends BaseEditorAdapter {
  constructor(element) {
    super(element);
    this.type = 'quill';
    this.quillInstance = element.quill || this.findQuillInstance(element);
  }

  findQuillInstance(element) {
    // Try to find Quill instance from various possible locations
    if (element.__quill) return element.__quill;
    if (element.quill) return element.quill;
    
    // Check parent elements
    let parent = element.parentElement;
    while (parent) {
      if (parent.__quill) return parent.__quill;
      if (parent.quill) return parent.quill;
      parent = parent.parentElement;
    }
    
    return null;
  }

  getText() {
    if (this.quillInstance && typeof this.quillInstance.getText === 'function') {
      return this.quillInstance.getText();
    }
    return super.getText();
  }

  setText(text) {
    if (this.quillInstance && typeof this.quillInstance.setText === 'function') {
      this.quillInstance.setText(text);
    } else {
      super.setText(text);
    }
    this.triggerEvents();
  }

  supportsRichText() {
    return true;
  }

  getCursorPosition() {
    if (this.quillInstance && typeof this.quillInstance.getSelection === 'function') {
      const selection = this.quillInstance.getSelection();
      return selection ? selection.index : 0;
    }
    return super.getCursorPosition();
  }

  setCursorPosition(position) {
    if (this.quillInstance && typeof this.quillInstance.setSelection === 'function') {
      this.quillInstance.setSelection(position, 0);
    } else {
      super.setCursorPosition(position);
    }
  }

  getSelection() {
    if (this.quillInstance && typeof this.quillInstance.getSelection === 'function') {
      const selection = this.quillInstance.getSelection();
      return selection ? {
        start: selection.index,
        end: selection.index + selection.length
      } : { start: 0, end: 0 };
    }
    return super.getSelection();
  }

  setSelection(start, end) {
    if (this.quillInstance && typeof this.quillInstance.setSelection === 'function') {
      this.quillInstance.setSelection(start, end - start);
    } else {
      super.setSelection(start, end);
    }
  }

  replaceText(start, end, replacement) {
    if (this.quillInstance && typeof this.quillInstance.deleteText === 'function' && 
        typeof this.quillInstance.insertText === 'function') {
      this.quillInstance.deleteText(start, end - start);
      this.quillInstance.insertText(start, replacement);
    } else {
      super.replaceText(start, end, replacement);
    }
  }
}

/**
 * Adapter for TinyMCE editor
 */
class TinyMCEAdapter extends BaseEditorAdapter {
  constructor(element) {
    super(element);
    this.type = 'tinymce';
    this.editorInstance = this.findTinyMCEInstance(element);
  }

  findTinyMCEInstance(element) {
    // TinyMCE usually runs in an iframe
    if (element.tagName === 'IFRAME') {
      const editorId = element.id;
      if (window.tinymce && window.tinymce.get) {
        return window.tinymce.get(editorId);
      }
    }
    
    // Check for editor instance in various ways
    if (element.tinymce) return element.tinymce;
    
    return null;
  }

  getText() {
    if (this.editorInstance && typeof this.editorInstance.getContent === 'function') {
      return this.editorInstance.getContent({ format: 'text' });
    }
    
    // Fallback for iframe content
    if (this.element.contentDocument) {
      return this.element.contentDocument.body.textContent || '';
    }
    
    return super.getText();
  }

  setText(text) {
    if (this.editorInstance && typeof this.editorInstance.setContent === 'function') {
      this.editorInstance.setContent(text);
    } else if (this.element.contentDocument) {
      this.element.contentDocument.body.textContent = text;
    } else {
      super.setText(text);
    }
    this.triggerEvents();
  }

  supportsRichText() {
    return true;
  }

  getCursorPosition() {
    if (this.editorInstance && typeof this.editorInstance.selection === 'object') {
      const selection = this.editorInstance.selection;
      const range = selection.getRng();
      
      // Convert DOM range to text position
      const content = this.getText();
      return this.getTextPositionFromRange(range, content);
    }
    
    return super.getCursorPosition();
  }

  getTextPositionFromRange(range, content) {
    // This is a simplified implementation
    // In practice, you'd need more sophisticated range-to-text conversion
    return 0;
  }
}

/**
 * Adapter for CKEditor
 */
class CKEditorAdapter extends BaseEditorAdapter {
  constructor(element) {
    super(element);
    this.type = 'ckeditor';
    this.editorInstance = this.findCKEditorInstance(element);
  }

  findCKEditorInstance(element) {
    // CKEditor 4
    if (window.CKEDITOR && window.CKEDITOR.instances) {
      for (const instanceName in window.CKEDITOR.instances) {
        const instance = window.CKEDITOR.instances[instanceName];
        if (instance.element && instance.element.$ === element) {
          return instance;
        }
      }
    }
    
    // CKEditor 5 - check for editor instance on element
    if (element.ckeditorInstance) {
      return element.ckeditorInstance;
    }
    
    return null;
  }

  getText() {
    if (this.editorInstance) {
      if (typeof this.editorInstance.getData === 'function') {
        // CKEditor 4
        const data = this.editorInstance.getData();
        return this.stripHTML(data);
      } else if (this.editorInstance.model && this.editorInstance.model.document) {
        // CKEditor 5
        const root = this.editorInstance.model.document.getRoot();
        return root.getChild(0).data || '';
      }
    }
    
    return super.getText();
  }

  setText(text) {
    if (this.editorInstance) {
      if (typeof this.editorInstance.setData === 'function') {
        // CKEditor 4
        this.editorInstance.setData(text);
      } else if (this.editorInstance.setData) {
        // CKEditor 5
        this.editorInstance.setData(text);
      }
    } else {
      super.setText(text);
    }
    this.triggerEvents();
  }

  supportsRichText() {
    return true;
  }

  stripHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
}

/**
 * Factory class for creating appropriate editor adapters
 */
class EditorAdapterFactory {
  /**
   * Create appropriate adapter for an element
   * @param {HTMLElement} element - Element to create adapter for
   * @returns {BaseEditorAdapter} Appropriate adapter instance
   */
  static createAdapter(element) {
    if (!element) {
      throw new Error('Element is required to create adapter');
    }

    const tagName = element.tagName.toLowerCase();
    
    // Standard HTML elements
    if (tagName === 'textarea') {
      return new TextareaAdapter(element);
    }
    
    if (tagName === 'input') {
      return new InputAdapter(element);
    }
    
    // Contenteditable elements
    if (element.hasAttribute('contenteditable')) {
      const contenteditable = element.getAttribute('contenteditable');
      if (contenteditable === 'true' || contenteditable === '') {
        return new ContentEditableAdapter(element);
      }
    }
    
    // Rich text editors
    if (element.classList.contains('ql-editor') || element.quill) {
      return new QuillAdapter(element);
    }
    
    if (element.classList.contains('cke_editable') || element.ckeditorInstance) {
      return new CKEditorAdapter(element);
    }
    
    if (tagName === 'iframe' && element.classList.contains('tox-edit-area')) {
      return new TinyMCEAdapter(element);
    }
    
    // Fallback to base adapter
    return new BaseEditorAdapter(element);
  }

  /**
   * Get list of supported editor types
   * @returns {string[]} Array of supported editor type names
   */
  static getSupportedTypes() {
    return ['textarea', 'input', 'contenteditable', 'quill', 'tinymce', 'ckeditor'];
  }

  /**
   * Check if an element is supported
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is supported
   */
  static isSupported(element) {
    try {
      const adapter = EditorAdapterFactory.createAdapter(element);
      return adapter.type !== 'base';
    } catch (error) {
      return false;
    }
  }
}

// Export classes
if (typeof window !== 'undefined') {
  window.BaseEditorAdapter = BaseEditorAdapter;
  window.TextareaAdapter = TextareaAdapter;
  window.InputAdapter = InputAdapter;
  window.ContentEditableAdapter = ContentEditableAdapter;
  window.QuillAdapter = QuillAdapter;
  window.TinyMCEAdapter = TinyMCEAdapter;
  window.CKEditorAdapter = CKEditorAdapter;
  window.EditorAdapterFactory = EditorAdapterFactory;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BaseEditorAdapter,
    TextareaAdapter,
    InputAdapter,
    ContentEditableAdapter,
    QuillAdapter,
    TinyMCEAdapter,
    CKEditorAdapter,
    EditorAdapterFactory
  };
}