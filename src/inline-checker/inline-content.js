// Inline Checker Content Script
// This script is loaded via manifest content_scripts and handles inline checker functionality

// Use existing browserAPI if available, otherwise create it
const inlineBrowserAPI = window.browserAPI || (typeof browser !== 'undefined' ? browser : chrome);

class InlineCheckerManager {
  constructor() {
    this.enabled = true;
    this.components = {};
    this.initialized = false;
    this.statusWidget = null;
    this.monitoredFields = new Set();
    this.analysisTimeout = null;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Get configuration
      const config = await this.getConfig();
      this.enabled = config.inlineCheckerEnabled;

      if (this.enabled) {
        console.log('[FEELLY] Initializing inline checker...');
        
        // Create status widget
        this.createStatusWidget();
        
        // Start monitoring text fields
        this.startFieldMonitoring();
      }

      this.initialized = true;
    } catch (error) {
      console.error('[FEELLY] Error initializing inline checker:', error);
    }
  }

  async getConfig() {
    return new Promise((resolve) => {
      inlineBrowserAPI.storage.sync.get({
        inlineCheckerEnabled: true,
        analysisDelay: 500,
        enabledIssueTypes: ['grammar', 'spelling', 'style', 'clarity']
      }, resolve);
    });
  }

  createStatusWidget() {
    if (this.statusWidget) return;

    this.statusWidget = document.createElement('div');
    this.statusWidget.id = 'feelly-status-widget';
    this.statusWidget.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f2e307, #f8f066);
        color: #374151;
        padding: 8px 12px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid rgba(55, 65, 81, 0.1);
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        <span id="feelly-status-text">🔍 Feelly Ready</span>
      </div>
    `;

    document.body.appendChild(this.statusWidget);

    // Add click handler to toggle
    this.statusWidget.addEventListener('click', () => {
      this.enabled = !this.enabled;
      this.updateStatusWidget();
      
      // Save state
      inlineBrowserAPI.storage.sync.set({ inlineCheckerEnabled: this.enabled });
    });

    this.updateStatusWidget();
  }

  updateStatusWidget() {
    if (!this.statusWidget) return;

    const statusText = this.statusWidget.querySelector('#feelly-status-text');
    const widget = this.statusWidget.querySelector('div');
    
    if (this.enabled) {
      statusText.textContent = '🔍 Feelly Active';
      widget.style.background = 'linear-gradient(135deg, #f2e307, #f8f066)';
      widget.style.opacity = '1';
    } else {
      statusText.textContent = '⏸️ Feelly Paused';
      widget.style.background = 'linear-gradient(135deg, #9ca3af, #d1d5db)';
      widget.style.opacity = '0.7';
    }
  }

  startFieldMonitoring() {
    // Monitor text inputs, textareas, and contenteditable elements
    const selector = 'input[type="text"], input[type="email"], textarea, [contenteditable="true"]';
    
    // Monitor existing fields
    document.querySelectorAll(selector).forEach(field => {
      this.monitorField(field);
    });

    // Monitor dynamically added fields
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && node.matches(selector)) {
              this.monitorField(node);
            }
            // Check children
            node.querySelectorAll && node.querySelectorAll(selector).forEach(field => {
              this.monitorField(field);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  monitorField(field) {
    if (this.monitoredFields.has(field)) return;
    this.monitoredFields.add(field);

    // Add visual indicator that field is being monitored
    
    const showMonitoring = () => {
      if (this.enabled) {
        field.style.boxShadow = '0 0 0 1px rgba(242, 227, 7, 0.3)';
      }
    };

    const hideMonitoring = () => {
      field.style.boxShadow = '';
    };

    field.addEventListener('focus', showMonitoring);
    field.addEventListener('blur', hideMonitoring);

    // Monitor text changes
    let lastText = field.value || field.textContent || '';
    
    const handleTextChange = () => {
      if (!this.enabled) return;

      const currentText = field.value || field.textContent || '';
      if (currentText !== lastText && currentText.trim().length > 10) {
        lastText = currentText;
        this.scheduleAnalysis(currentText, field);
      }
    };

    field.addEventListener('input', handleTextChange);
    field.addEventListener('paste', () => setTimeout(handleTextChange, 100));
  }

  scheduleAnalysis(text, field) {
    // Clear previous timeout
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }

    // Update status to show analysis is pending
    const statusText = this.statusWidget?.querySelector('#feelly-status-text');
    if (statusText) {
      statusText.textContent = '⏳ Analyzing...';
    }

    // Schedule analysis
    this.analysisTimeout = setTimeout(async () => {
      try {
        await this.analyzeText(text, field);
      } catch (error) {
        console.error('[FEELLY] Analysis error:', error);
        if (statusText) {
          statusText.textContent = '❌ Analysis Error';
          setTimeout(() => {
            if (this.enabled) {
              statusText.textContent = '🔍 Feelly Active';
            }
          }, 2000);
        }
      }
    }, 500);
  }

  async analyzeText(text, field) {
    try {
      const response = await inlineBrowserAPI.runtime.sendMessage({
        action: 'analyzeText',
        text: text,
        options: {}
      });

      const statusText = this.statusWidget?.querySelector('#feelly-status-text');
      
      if (response.success && response.result && response.result.issues) {
        const issues = response.result.issues;
        const issueCount = issues.length;
        
        if (issueCount > 0) {
          if (statusText) {
            statusText.textContent = `📝 ${issueCount} issue${issueCount > 1 ? 's' : ''} found`;
          }
          
          // Add simple visual feedback to the field
          field.style.borderLeft = '3px solid #f59e0b';
          
          // Reset after a few seconds
          setTimeout(() => {
            field.style.borderLeft = '';
            if (statusText && this.enabled) {
              statusText.textContent = '🔍 Feelly Active';
            }
          }, 3000);
        } else {
          if (statusText) {
            statusText.textContent = '✅ Text looks good';
            setTimeout(() => {
              if (this.enabled) {
                statusText.textContent = '🔍 Feelly Active';
              }
            }, 2000);
          }
        }
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('[FEELLY] Error analyzing text:', error);
      throw error;
    }
  }

  enable() {
    console.log('[FEELLY] Enabling inline checker');
    this.enabled = true;
    this.updateStatusWidget();
  }

  disable() {
    console.log('[FEELLY] Disabling inline checker');
    this.enabled = false;
    this.updateStatusWidget();
    
    // Clear any pending analysis
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }
  }

  destroy() {
    if (this.statusWidget) {
      this.statusWidget.remove();
      this.statusWidget = null;
    }
    
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }
    
    this.monitoredFields.clear();
  }
}

// Initialize inline checker manager
const inlineChecker = new InlineCheckerManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => inlineChecker.initialize());
} else {
  inlineChecker.initialize();
}

// Handle messages from popup/background
inlineBrowserAPI.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'toggleInlineChecker') {
    inlineChecker.enabled = request.enabled;
    if (request.enabled) {
      inlineChecker.enable();
    } else {
      inlineChecker.disable();
    }
    sendResponse({ success: true });
    return;
  }
});

// Listen for storage changes
inlineBrowserAPI.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.inlineCheckerEnabled) {
    inlineChecker.enabled = changes.inlineCheckerEnabled.newValue;
    if (changes.inlineCheckerEnabled.newValue) {
      inlineChecker.enable();
    } else {
      inlineChecker.disable();
    }
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  inlineChecker.destroy();
});