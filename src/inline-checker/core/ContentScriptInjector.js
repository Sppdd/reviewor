/**
 * Enhanced content script injection system using Chrome scripting API
 * Handles injection of inline grammar checker components into web pages
 */

const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);

class ContentScriptInjector {
  constructor() {
    this.injectedTabs = new Set();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  /**
   * Inject inline checker scripts into a specific tab
   * @param {number} tabId - The tab ID to inject into
   * @param {Object} options - Injection options
   * @returns {Promise<boolean>} Success status
   */
  async injectInlineChecker(tabId, options = {}) {
    try {
      // Check if already injected to avoid duplicate injection
      if (this.injectedTabs.has(tabId)) {
        console.log(`[InlineChecker] Already injected into tab ${tabId}`);
        return true;
      }

      // Test if content script is already present
      try {
        const response = await browserAPI.tabs.sendMessage(tabId, { 
          action: 'ping',
          source: 'inline-checker'
        });
        
        if (response && response.inlineCheckerActive) {
          this.injectedTabs.add(tabId);
          return true;
        }
      } catch (error) {
        // Content script not present, proceed with injection
      }

      // Inject CSS first for visual overlays
      await this.injectCSS(tabId);

      // Inject core inline checker scripts
      await this.injectScripts(tabId, options);

      // Mark as injected
      this.injectedTabs.add(tabId);
      this.retryAttempts.delete(tabId);

      console.log(`[InlineChecker] Successfully injected into tab ${tabId}`);
      return true;

    } catch (error) {
      console.error(`[InlineChecker] Failed to inject into tab ${tabId}:`, error);
      
      // Implement retry logic
      const attempts = this.retryAttempts.get(tabId) || 0;
      if (attempts < this.maxRetries) {
        this.retryAttempts.set(tabId, attempts + 1);
        console.log(`[InlineChecker] Retrying injection for tab ${tabId} (attempt ${attempts + 1})`);
        
        // Retry after delay
        setTimeout(() => {
          this.injectInlineChecker(tabId, options);
        }, 1000 * (attempts + 1));
      }
      
      return false;
    }
  }

  /**
   * Inject CSS styles for visual overlays
   * @param {number} tabId - The tab ID
   */
  async injectCSS(tabId) {
    const css = `
      /* Feelly Inline Grammar Checker Styles */
      .feelly-underline-error {
        border-bottom: 2px wavy rgb(220, 38, 38) !important;
        background: linear-gradient(to bottom, transparent 90%, rgba(220, 38, 38, 0.1) 100%) !important;
        position: relative !important;
      }

      .feelly-underline-warning {
        border-bottom: 2px wavy rgb(245, 158, 11) !important;
        background: linear-gradient(to bottom, transparent 90%, rgba(245, 158, 11, 0.1) 100%) !important;
        position: relative !important;
      }

      .feelly-underline-suggestion {
        border-bottom: 2px dotted rgb(59, 130, 246) !important;
        background: linear-gradient(to bottom, transparent 90%, rgba(59, 130, 246, 0.1) 100%) !important;
        position: relative !important;
      }

      .feelly-status-widget {
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: linear-gradient(135deg, rgb(242, 227, 7) 0%, rgb(248, 240, 102) 100%) !important;
        border: 2px solid rgb(194, 182, 6) !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        color: rgb(55, 65, 81) !important;
        font-weight: 600 !important;
        padding: 8px 12px !important;
        z-index: 999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        user-select: none !important;
      }

      .feelly-status-widget:hover {
        background: linear-gradient(135deg, rgb(248, 240, 102) 0%, rgb(242, 227, 7) 100%) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
      }

      .feelly-tooltip {
        position: absolute !important;
        background: white !important;
        border: 2px solid rgb(242, 227, 7) !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
        z-index: 999998 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        max-width: 300px !important;
        opacity: 0 !important;
        transform: translateY(10px) !important;
        transition: all 0.2s ease !important;
        pointer-events: none !important;
      }

      .feelly-tooltip.show {
        opacity: 1 !important;
        transform: translateY(0) !important;
        pointer-events: auto !important;
      }

      .feelly-tooltip-header {
        background: linear-gradient(90deg, rgb(242, 227, 7) 0%, rgb(248, 240, 102) 100%) !important;
        color: rgb(55, 65, 81) !important;
        font-weight: 600 !important;
        padding: 8px 12px !important;
        border-radius: 6px 6px 0 0 !important;
        margin: 0 !important;
      }

      .feelly-tooltip-content {
        padding: 12px !important;
      }

      .feelly-suggestion-button {
        background: rgb(242, 227, 7) !important;
        border: 1px solid rgb(194, 182, 6) !important;
        border-radius: 6px !important;
        color: rgb(55, 65, 81) !important;
        font-weight: 500 !important;
        padding: 6px 12px !important;
        margin: 4px 4px 4px 0 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        display: inline-block !important;
        font-size: 13px !important;
      }

      .feelly-suggestion-button:hover {
        background: rgb(248, 240, 102) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 8px rgba(242, 227, 7, 0.3) !important;
      }

      .feelly-ignore-button {
        background: rgb(107, 114, 128) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        color: white !important;
      }

      .feelly-ignore-button:hover {
        background: rgb(75, 85, 99) !important;
      }

      /* Hide system spell check underlines when Feelly is active */
      .feelly-active-field {
        -webkit-text-decoration-skip: none !important;
        text-decoration-skip: none !important;
      }

      /* Animation keyframes */
      @keyframes feelly-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .feelly-analyzing {
        animation: feelly-pulse 1.5s ease-in-out infinite !important;
      }
    `;

    if (browserAPI === chrome) {
      await chrome.scripting.insertCSS({
        target: { tabId },
        css: css
      });
    } else {
      // Firefox fallback
      await browser.tabs.insertCSS(tabId, { code: css });
    }
  }

  /**
   * Inject JavaScript files for inline checker functionality
   * @param {number} tabId - The tab ID
   * @param {Object} options - Injection options
   */
  async injectScripts(tabId, options = {}) {
    const scripts = [
      'inline-checker/core/FieldDetector.js',
      'inline-checker/core/FieldMonitor.js',
      'inline-checker/inline-content.js'
    ];

    if (browserAPI === chrome) {
      // Inject scripts sequentially to maintain dependency order
      for (const script of scripts) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [script]
        });
      }
    } else {
      // Firefox fallback
      for (const script of scripts) {
        await browser.tabs.executeScript(tabId, { file: script });
      }
    }
  }

  /**
   * Remove injection tracking for a tab (called when tab is closed)
   * @param {number} tabId - The tab ID
   */
  removeTab(tabId) {
    this.injectedTabs.delete(tabId);
    this.retryAttempts.delete(tabId);
  }

  /**
   * Check if inline checker is injected in a tab
   * @param {number} tabId - The tab ID
   * @returns {boolean} Injection status
   */
  isInjected(tabId) {
    return this.injectedTabs.has(tabId);
  }

  /**
   * Get injection statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      injectedTabs: this.injectedTabs.size,
      pendingRetries: this.retryAttempts.size,
      totalRetryAttempts: Array.from(this.retryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0)
    };
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentScriptInjector;
} else if (typeof window !== 'undefined') {
  window.ContentScriptInjector = ContentScriptInjector;
}