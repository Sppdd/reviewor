/**
 * Field monitoring utilities for tracking text changes and focus events
 * Implements debounced change detection and event delegation
 */

class FieldMonitor {
  constructor(fieldDetector) {
    this.fieldDetector = fieldDetector;
    this.monitoredFields = new Map();
    this.activeField = null;
    this.debounceDelay = 500; // Default 500ms debounce
    this.eventListeners = new Map();
    this.changeCallbacks = new Set();
    this.focusCallbacks = new Set();
    this.blurCallbacks = new Set();
    
    // Bind methods to preserve context
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleKeyup = this.handleKeyup.bind(this);
    this.handlePaste = this.handlePaste.bind(this);
    
    this.setupGlobalListeners();
  }

  /**
   * Set up global event listeners using event delegation
   */
  setupGlobalListeners() {
    // Use event delegation for better performance with dynamic content
    document.addEventListener('focusin', this.handleFocus, true);
    document.addEventListener('focusout', this.handleBlur, true);
    document.addEventListener('input', this.handleInput, true);
    document.addEventListener('keyup', this.handleKeyup, true);
    document.addEventListener('paste', this.handlePaste, true);
    
    // Monitor for dynamically added fields
    this.setupMutationObserver();
  }

  /**
   * Set up mutation observer to detect dynamically added fields
   */
  setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if added node or its children contain text fields
              if (this.fieldDetector.isFieldSupported(node) || 
                  node.querySelector && this.hasTextFields(node)) {
                shouldRescan = true;
              }
            }
          });
        }
      });
      
      if (shouldRescan) {
        this.rescanFields();
      }
    });
    
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check if element contains text fields
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element contains text fields
   */
  hasTextFields(element) {
    const fields = this.fieldDetector.detectSupportedFields(element);
    return fields.length > 0;
  }

  /**
   * Rescan for new fields and start monitoring them
   */
  rescanFields() {
    const allFields = this.fieldDetector.detectSupportedFields();
    
    allFields.forEach(field => {
      if (!this.monitoredFields.has(field)) {
        this.startMonitoring(field);
      }
    });
  }

  /**
   * Start monitoring a specific field
   * @param {HTMLElement} field - Field element to monitor
   */
  startMonitoring(field) {
    if (!field || this.monitoredFields.has(field)) {
      return;
    }

    const fieldData = {
      element: field,
      lastText: this.fieldDetector.getFieldText(field),
      debounceTimer: null,
      fieldType: this.fieldDetector.getFieldType(field)
    };

    this.monitoredFields.set(field, fieldData);
    
    // Add visual indicator that field is being monitored
    field.classList.add('feelly-monitored-field');
    
    console.log(`[FieldMonitor] Started monitoring ${fieldData.fieldType} field`);
  }

  /**
   * Stop monitoring a specific field
   * @param {HTMLElement} field - Field element to stop monitoring
   */
  stopMonitoring(field) {
    if (!field || !this.monitoredFields.has(field)) {
      return;
    }

    const fieldData = this.monitoredFields.get(field);
    
    // Clear any pending debounce timer
    if (fieldData.debounceTimer) {
      clearTimeout(fieldData.debounceTimer);
    }
    
    // Remove visual indicator
    field.classList.remove('feelly-monitored-field', 'feelly-active-field');
    
    this.monitoredFields.delete(field);
    
    console.log(`[FieldMonitor] Stopped monitoring field`);
  }

  /**
   * Handle focus events
   * @param {FocusEvent} event - Focus event
   */
  handleFocus(event) {
    const field = event.target;
    
    if (!this.fieldDetector.isFieldSupported(field)) {
      return;
    }

    // Start monitoring if not already monitored
    if (!this.monitoredFields.has(field)) {
      this.startMonitoring(field);
    }

    // Set as active field
    if (this.activeField !== field) {
      // Remove active class from previous field
      if (this.activeField) {
        this.activeField.classList.remove('feelly-active-field');
      }
      
      this.activeField = field;
      field.classList.add('feelly-active-field');
      
      // Notify focus callbacks
      this.focusCallbacks.forEach(callback => {
        try {
          callback(field, this.fieldDetector.getFieldType(field));
        } catch (error) {
          console.error('[FieldMonitor] Error in focus callback:', error);
        }
      });
    }
  }

  /**
   * Handle blur events
   * @param {FocusEvent} event - Blur event
   */
  handleBlur(event) {
    const field = event.target;
    
    if (field === this.activeField) {
      field.classList.remove('feelly-active-field');
      
      // Notify blur callbacks
      this.blurCallbacks.forEach(callback => {
        try {
          callback(field, this.fieldDetector.getFieldType(field));
        } catch (error) {
          console.error('[FieldMonitor] Error in blur callback:', error);
        }
      });
      
      this.activeField = null;
    }
  }

  /**
   * Handle input events with debouncing
   * @param {InputEvent} event - Input event
   */
  handleInput(event) {
    this.processTextChange(event.target);
  }

  /**
   * Handle keyup events (for additional change detection)
   * @param {KeyboardEvent} event - Keyup event
   */
  handleKeyup(event) {
    // Only process for certain keys that might not trigger input events
    const importantKeys = ['Backspace', 'Delete', 'Enter', 'Space'];
    if (importantKeys.includes(event.key)) {
      this.processTextChange(event.target);
    }
  }

  /**
   * Handle paste events
   * @param {ClipboardEvent} event - Paste event
   */
  handlePaste(event) {
    // Process paste with slight delay to allow content to be inserted
    setTimeout(() => {
      this.processTextChange(event.target);
    }, 10);
  }

  /**
   * Process text change with debouncing
   * @param {HTMLElement} field - Field that changed
   */
  processTextChange(field) {
    if (!field || !this.monitoredFields.has(field)) {
      return;
    }

    const fieldData = this.monitoredFields.get(field);
    const currentText = this.fieldDetector.getFieldText(field);
    
    // Check if text actually changed
    if (currentText === fieldData.lastText) {
      return;
    }

    // Clear existing debounce timer
    if (fieldData.debounceTimer) {
      clearTimeout(fieldData.debounceTimer);
    }

    // Set new debounce timer
    fieldData.debounceTimer = setTimeout(() => {
      this.notifyTextChange(field, fieldData.lastText, currentText);
      fieldData.lastText = currentText;
      fieldData.debounceTimer = null;
    }, this.debounceDelay);
  }

  /**
   * Notify registered callbacks about text changes
   * @param {HTMLElement} field - Field that changed
   * @param {string} oldText - Previous text content
   * @param {string} newText - New text content
   */
  notifyTextChange(field, oldText, newText) {
    const fieldType = this.fieldDetector.getFieldType(field);
    
    this.changeCallbacks.forEach(callback => {
      try {
        callback({
          field: field,
          fieldType: fieldType,
          oldText: oldText,
          newText: newText,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[FieldMonitor] Error in change callback:', error);
      }
    });
  }

  /**
   * Register callback for text change events
   * @param {Function} callback - Callback function
   */
  onTextChange(callback) {
    if (typeof callback === 'function') {
      this.changeCallbacks.add(callback);
    }
  }

  /**
   * Register callback for field focus events
   * @param {Function} callback - Callback function
   */
  onFieldFocus(callback) {
    if (typeof callback === 'function') {
      this.focusCallbacks.add(callback);
    }
  }

  /**
   * Register callback for field blur events
   * @param {Function} callback - Callback function
   */
  onFieldBlur(callback) {
    if (typeof callback === 'function') {
      this.blurCallbacks.add(callback);
    }
  }

  /**
   * Remove callback
   * @param {Function} callback - Callback function to remove
   */
  removeCallback(callback) {
    this.changeCallbacks.delete(callback);
    this.focusCallbacks.delete(callback);
    this.blurCallbacks.delete(callback);
  }

  /**
   * Set debounce delay for text change detection
   * @param {number} delay - Delay in milliseconds
   */
  setDebounceDelay(delay) {
    if (typeof delay === 'number' && delay >= 0) {
      this.debounceDelay = delay;
    }
  }

  /**
   * Get currently active field
   * @returns {HTMLElement|null} Active field element
   */
  getActiveField() {
    return this.activeField;
  }

  /**
   * Get all monitored fields
   * @returns {HTMLElement[]} Array of monitored field elements
   */
  getMonitoredFields() {
    return Array.from(this.monitoredFields.keys());
  }

  /**
   * Force immediate text change check for a field
   * @param {HTMLElement} field - Field to check
   */
  forceTextChangeCheck(field) {
    if (!field || !this.monitoredFields.has(field)) {
      return;
    }

    const fieldData = this.monitoredFields.get(field);
    const currentText = this.fieldDetector.getFieldText(field);
    
    if (currentText !== fieldData.lastText) {
      this.notifyTextChange(field, fieldData.lastText, currentText);
      fieldData.lastText = currentText;
    }
  }

  /**
   * Get monitoring statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      monitoredFields: this.monitoredFields.size,
      activeField: this.activeField ? this.fieldDetector.getFieldType(this.activeField) : null,
      registeredCallbacks: {
        change: this.changeCallbacks.size,
        focus: this.focusCallbacks.size,
        blur: this.blurCallbacks.size
      },
      debounceDelay: this.debounceDelay
    };
  }

  /**
   * Clean up all event listeners and timers
   */
  destroy() {
    // Clear all debounce timers
    this.monitoredFields.forEach(fieldData => {
      if (fieldData.debounceTimer) {
        clearTimeout(fieldData.debounceTimer);
      }
    });

    // Remove global event listeners
    document.removeEventListener('focusin', this.handleFocus, true);
    document.removeEventListener('focusout', this.handleBlur, true);
    document.removeEventListener('input', this.handleInput, true);
    document.removeEventListener('keyup', this.handleKeyup, true);
    document.removeEventListener('paste', this.handlePaste, true);

    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Clear all data
    this.monitoredFields.clear();
    this.changeCallbacks.clear();
    this.focusCallbacks.clear();
    this.blurCallbacks.clear();
    this.activeField = null;
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.FieldMonitor = FieldMonitor;
}