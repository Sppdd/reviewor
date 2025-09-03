/**
 * Field detection utilities for identifying supported text input elements
 * Handles textarea, input[type="text"], contenteditable, and rich text editors
 */

class FieldDetector {
  constructor() {
    this.supportedSelectors = [
      'textarea',
      'input[type="text"]',
      'input[type="email"]',
      'input[type="search"]',
      'input[type="url"]',
      '[contenteditable="true"]',
      '[contenteditable=""]',
      '.ql-editor', // Quill editor
      '.tox-edit-area iframe', // TinyMCE
      '.cke_editable', // CKEditor
      '.DraftEditor-root', // Draft.js
      '.notranslate' // Google Docs
    ];

    this.richEditorSelectors = {
      tinymce: '.tox-edit-area iframe',
      ckeditor: '.cke_editable',
      quill: '.ql-editor',
      draftjs: '.DraftEditor-root',
      googledocs: '.notranslate'
    };

    this.excludedSelectors = [
      'input[type="password"]',
      'input[type="hidden"]',
      'input[type="file"]',
      'input[type="submit"]',
      'input[type="button"]',
      'input[type="reset"]',
      '[readonly]',
      '[disabled]'
    ];
  }

  /**
   * Detect all supported text fields on the page
   * @param {Document} doc - Document to search (default: document)
   * @returns {HTMLElement[]} Array of supported field elements
   */
  detectSupportedFields(doc = document) {
    const fields = [];
    
    // Find all potential text input elements
    for (const selector of this.supportedSelectors) {
      try {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(element => {
          if (this.isFieldSupported(element)) {
            fields.push(element);
          }
        });
      } catch (error) {
        console.warn(`[FieldDetector] Error with selector "${selector}":`, error);
      }
    }

    // Handle shadow DOM elements
    this.detectShadowDOMFields(doc, fields);

    // Handle iframe elements (for rich text editors)
    this.detectIframeFields(doc, fields);

    return this.deduplicateFields(fields);
  }

  /**
   * Check if a specific element is supported for inline checking
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether the element is supported
   */
  isFieldSupported(element) {
    if (!element || !element.tagName) {
      return false;
    }

    // Check if element is excluded
    for (const excludeSelector of this.excludedSelectors) {
      if (element.matches(excludeSelector)) {
        return false;
      }
    }

    // Check if element is hidden or has zero dimensions
    if (this.isElementHidden(element)) {
      return false;
    }

    // Check specific element types
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'textarea') {
      return true;
    }
    
    if (tagName === 'input') {
      const type = element.type.toLowerCase();
      return ['text', 'email', 'search', 'url'].includes(type);
    }
    
    if (element.hasAttribute('contenteditable')) {
      const contenteditable = element.getAttribute('contenteditable');
      return contenteditable === 'true' || contenteditable === '';
    }

    // Check for rich text editor classes
    for (const [editorType, selector] of Object.entries(this.richEditorSelectors)) {
      if (element.matches(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine the type of text field
   * @param {HTMLElement} element - Element to analyze
   * @returns {string} Field type identifier
   */
  getFieldType(element) {
    if (!element) return 'unknown';

    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'textarea') {
      return 'textarea';
    }
    
    if (tagName === 'input') {
      return 'input';
    }
    
    if (element.hasAttribute('contenteditable')) {
      return 'contenteditable';
    }

    // Check for specific rich text editors
    for (const [editorType, selector] of Object.entries(this.richEditorSelectors)) {
      if (element.matches(selector)) {
        return `rich-editor-${editorType}`;
      }
    }

    return 'unknown';
  }

  /**
   * Get text content from various field types
   * @param {HTMLElement} element - Field element
   * @returns {string} Text content
   */
  getFieldText(element) {
    if (!element) return '';

    const fieldType = this.getFieldType(element);
    
    switch (fieldType) {
      case 'textarea':
      case 'input':
        return element.value || '';
      
      case 'contenteditable':
        return element.textContent || element.innerText || '';
      
      default:
        if (fieldType.startsWith('rich-editor-')) {
          return this.getRichEditorText(element, fieldType);
        }
        return element.textContent || element.innerText || '';
    }
  }

  /**
   * Set text content for various field types
   * @param {HTMLElement} element - Field element
   * @param {string} text - Text to set
   */
  setFieldText(element, text) {
    if (!element) return;

    const fieldType = this.getFieldType(element);
    
    switch (fieldType) {
      case 'textarea':
      case 'input':
        element.value = text;
        // Trigger events for framework compatibility
        this.triggerInputEvents(element);
        break;
      
      case 'contenteditable':
        element.textContent = text;
        this.triggerInputEvents(element);
        break;
      
      default:
        if (fieldType.startsWith('rich-editor-')) {
          this.setRichEditorText(element, text, fieldType);
        } else {
          element.textContent = text;
          this.triggerInputEvents(element);
        }
        break;
    }
  }

  /**
   * Check if element is hidden or not visible
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is hidden
   */
  isElementHidden(element) {
    if (!element) return true;

    const style = window.getComputedStyle(element);
    
    return (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      element.offsetWidth === 0 ||
      element.offsetHeight === 0 ||
      element.hidden
    );
  }

  /**
   * Detect fields within shadow DOM
   * @param {Document} doc - Document to search
   * @param {HTMLElement[]} fields - Array to add found fields to
   */
  detectShadowDOMFields(doc, fields) {
    const elementsWithShadow = doc.querySelectorAll('*');
    
    elementsWithShadow.forEach(element => {
      if (element.shadowRoot) {
        try {
          const shadowFields = this.detectSupportedFields(element.shadowRoot);
          fields.push(...shadowFields);
        } catch (error) {
          console.warn('[FieldDetector] Error accessing shadow DOM:', error);
        }
      }
    });
  }

  /**
   * Detect fields within iframes (for rich text editors)
   * @param {Document} doc - Document to search
   * @param {HTMLElement[]} fields - Array to add found fields to
   */
  detectIframeFields(doc, fields) {
    const iframes = doc.querySelectorAll('iframe');
    
    iframes.forEach(iframe => {
      try {
        // Check if iframe is accessible (same-origin)
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          const iframeFields = this.detectSupportedFields(iframeDoc);
          // Mark iframe fields with reference to parent iframe
          iframeFields.forEach(field => {
            field._feellyParentIframe = iframe;
          });
          fields.push(...iframeFields);
        }
      } catch (error) {
        // Cross-origin iframe, cannot access
        console.debug('[FieldDetector] Cannot access iframe content (likely cross-origin)');
      }
    });
  }

  /**
   * Remove duplicate fields from array
   * @param {HTMLElement[]} fields - Array of field elements
   * @returns {HTMLElement[]} Deduplicated array
   */
  deduplicateFields(fields) {
    const seen = new Set();
    return fields.filter(field => {
      const key = field.tagName + (field.id || '') + (field.className || '');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get text from rich text editors
   * @param {HTMLElement} element - Editor element
   * @param {string} fieldType - Type of rich editor
   * @returns {string} Text content
   */
  getRichEditorText(element, fieldType) {
    switch (fieldType) {
      case 'rich-editor-quill':
        // Quill stores text in data-* attributes or has getText() method
        if (element.quill && typeof element.quill.getText === 'function') {
          return element.quill.getText();
        }
        return element.textContent || '';
      
      case 'rich-editor-tinymce':
        // TinyMCE iframe content
        if (element.contentDocument) {
          return element.contentDocument.body.textContent || '';
        }
        return '';
      
      case 'rich-editor-ckeditor':
        // CKEditor content
        return element.textContent || '';
      
      case 'rich-editor-draftjs':
        // Draft.js content
        return element.textContent || '';
      
      default:
        return element.textContent || '';
    }
  }

  /**
   * Set text in rich text editors
   * @param {HTMLElement} element - Editor element
   * @param {string} text - Text to set
   * @param {string} fieldType - Type of rich editor
   */
  setRichEditorText(element, text, fieldType) {
    switch (fieldType) {
      case 'rich-editor-quill':
        if (element.quill && typeof element.quill.setText === 'function') {
          element.quill.setText(text);
        } else {
          element.textContent = text;
        }
        break;
      
      case 'rich-editor-tinymce':
        if (element.contentDocument) {
          element.contentDocument.body.textContent = text;
        }
        break;
      
      default:
        element.textContent = text;
        break;
    }
    
    this.triggerInputEvents(element);
  }

  /**
   * Trigger input events for framework compatibility
   * @param {HTMLElement} element - Element to trigger events on
   */
  triggerInputEvents(element) {
    // Trigger input event
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    element.dispatchEvent(inputEvent);
    
    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    element.dispatchEvent(changeEvent);
    
    // Trigger keyup event for some frameworks
    const keyupEvent = new KeyboardEvent('keyup', { bubbles: true, cancelable: true });
    element.dispatchEvent(keyupEvent);
  }

  /**
   * Get field statistics for debugging
   * @param {Document} doc - Document to analyze
   * @returns {Object} Statistics object
   */
  getFieldStats(doc = document) {
    const allFields = this.detectSupportedFields(doc);
    const fieldTypes = {};
    
    allFields.forEach(field => {
      const type = this.getFieldType(field);
      fieldTypes[type] = (fieldTypes[type] || 0) + 1;
    });
    
    return {
      totalFields: allFields.length,
      fieldTypes: fieldTypes,
      hiddenFields: allFields.filter(field => this.isElementHidden(field)).length
    };
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.FieldDetector = FieldDetector;
}