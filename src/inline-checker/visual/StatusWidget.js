/**
 * StatusWidget - Floating status widget with Feelly branding
 * Displays real-time grammar checking status and error counts
 */
class StatusWidget {
  constructor() {
    this.widget = null;
    this.isExpanded = false;
    this.isVisible = false;
    this.position = 'bottom-right';
    this.currentStatus = {
      isActive: false,
      isAnalyzing: false,
      errorCount: 0,
      warningCount: 0,
      suggestionCount: 0,
      breakdown: {}
    };
    
    this.createWidget();
    this.attachEventListeners();
  }

  /**
   * Create the main widget DOM structure
   */
  createWidget() {
    // Create main widget container
    this.widget = document.createElement('div');
    this.widget.className = 'feelly-status-widget';
    this.widget.innerHTML = this.getWidgetHTML();
    
    // Apply initial styles
    this.applyStyles();
    
    // Position the widget
    this.updatePosition();
    
    // Don't append to DOM yet - will be done in show()
  }

  /**
   * Generate the widget HTML structure
   */
  getWidgetHTML() {
    return `
      <div class="feelly-widget-header" data-action="toggle">
        <div class="feelly-widget-icon">
          <svg class="feelly-icon-main" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
          <div class="feelly-loading-spinner" style="display: none;">
            <div class="feelly-spinner-ring"></div>
          </div>
        </div>
        <div class="feelly-widget-status">
          <span class="feelly-status-text">Feelly</span>
          <span class="feelly-error-count">0</span>
        </div>
        <div class="feelly-expand-arrow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M7 10L12 15L17 10H7Z" fill="currentColor"/>
          </svg>
        </div>
      </div>
      <div class="feelly-widget-content" style="display: none;">
        <div class="feelly-status-breakdown">
          <div class="feelly-breakdown-item" data-type="error">
            <span class="feelly-breakdown-icon">⚠️</span>
            <span class="feelly-breakdown-label">Errors</span>
            <span class="feelly-breakdown-count">0</span>
          </div>
          <div class="feelly-breakdown-item" data-type="warning">
            <span class="feelly-breakdown-icon">⚡</span>
            <span class="feelly-breakdown-label">Warnings</span>
            <span class="feelly-breakdown-count">0</span>
          </div>
          <div class="feelly-breakdown-item" data-type="suggestion">
            <span class="feelly-breakdown-icon">💡</span>
            <span class="feelly-breakdown-label">Suggestions</span>
            <span class="feelly-breakdown-count">0</span>
          </div>
        </div>
        <div class="feelly-widget-actions">
          <button class="feelly-action-btn" data-action="analyze-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 4V2L8 6L12 10V8C15.31 8 18 10.69 18 14C18 15.01 17.75 15.97 17.3 16.8L18.76 18.26C19.54 17.03 20 15.57 20 14C20 9.58 16.42 6 12 6Z" fill="currentColor"/>
            </svg>
            Re-analyze
          </button>
          <button class="feelly-action-btn" data-action="settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM21.94 11C21.5 7.58 18.42 4.5 15 4.06V2H9V4.06C5.58 4.5 2.5 7.58 2.06 11H0V13H2.06C2.5 16.42 5.58 19.5 9 19.94V22H15V19.94C18.42 19.5 21.5 16.42 21.94 13H24V11H21.94Z" fill="currentColor"/>
            </svg>
            Settings
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Apply CSS styles to the widget
   */
  applyStyles() {
    // Check if styles already exist
    if (document.getElementById('feelly-status-widget-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'feelly-status-widget-styles';
    styles.textContent = `
      .feelly-status-widget {
        position: fixed;
        z-index: 2147483647;
        background: linear-gradient(135deg, rgb(242, 227, 7) 0%, rgb(248, 240, 102) 100%);
        border: 2px solid rgb(194, 182, 6);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        color: rgb(55, 65, 81);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        min-width: 160px;
        max-width: 280px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        user-select: none;
        backdrop-filter: blur(8px);
      }

      .feelly-status-widget:hover {
        background: linear-gradient(135deg, rgb(248, 240, 102) 0%, rgb(242, 227, 7) 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .feelly-status-widget.expanded {
        background: linear-gradient(135deg, rgb(248, 240, 102) 0%, rgb(242, 227, 7) 100%);
      }

      .feelly-widget-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        gap: 8px;
        position: relative;
      }

      .feelly-widget-icon {
        position: relative;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .feelly-icon-main {
        transition: opacity 0.2s ease;
      }

      .feelly-loading-spinner {
        position: absolute;
        top: 0;
        left: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .feelly-spinner-ring {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(55, 65, 81, 0.2);
        border-top: 2px solid rgb(55, 65, 81);
        border-radius: 50%;
        animation: feelly-spin 1s linear infinite;
      }

      @keyframes feelly-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .feelly-widget-status {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .feelly-status-text {
        font-weight: 700;
        font-size: 16px;
      }

      .feelly-error-count {
        background: rgba(55, 65, 81, 0.1);
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 700;
        min-width: 20px;
        text-align: center;
      }

      .feelly-error-count.has-errors {
        background: rgb(220, 38, 38);
        color: white;
        animation: feelly-pulse 2s infinite;
      }

      @keyframes feelly-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .feelly-expand-arrow {
        transition: transform 0.2s ease;
        opacity: 0.7;
      }

      .feelly-status-widget.expanded .feelly-expand-arrow {
        transform: rotate(180deg);
      }

      .feelly-widget-content {
        border-top: 1px solid rgba(55, 65, 81, 0.1);
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 0 0 10px 10px;
        backdrop-filter: blur(4px);
      }

      .feelly-status-breakdown {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }

      .feelly-breakdown-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
      }

      .feelly-breakdown-icon {
        font-size: 14px;
        width: 16px;
        text-align: center;
      }

      .feelly-breakdown-label {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
      }

      .feelly-breakdown-count {
        font-size: 13px;
        font-weight: 700;
        background: rgba(55, 65, 81, 0.1);
        border-radius: 8px;
        padding: 2px 6px;
        min-width: 18px;
        text-align: center;
      }

      .feelly-widget-actions {
        display: flex;
        gap: 8px;
        justify-content: space-between;
      }

      .feelly-action-btn {
        flex: 1;
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid rgba(55, 65, 81, 0.2);
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 12px;
        font-weight: 500;
        color: rgb(55, 65, 81);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .feelly-action-btn:hover {
        background: rgba(255, 255, 255, 0.8);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .feelly-action-btn:active {
        transform: translateY(0);
      }

      /* Position classes */
      .feelly-status-widget.position-top-right {
        top: 20px;
        right: 20px;
      }

      .feelly-status-widget.position-top-left {
        top: 20px;
        left: 20px;
      }

      .feelly-status-widget.position-bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .feelly-status-widget.position-bottom-left {
        bottom: 20px;
        left: 20px;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .feelly-status-widget {
          min-width: 140px;
          max-width: 200px;
        }

        .feelly-status-widget.position-top-right,
        .feelly-status-widget.position-bottom-right {
          right: 10px;
        }

        .feelly-status-widget.position-top-left,
        .feelly-status-widget.position-bottom-left {
          left: 10px;
        }

        .feelly-status-widget.position-top-right,
        .feelly-status-widget.position-top-left {
          top: 10px;
        }

        .feelly-status-widget.position-bottom-right,
        .feelly-status-widget.position-bottom-left {
          bottom: 10px;
        }

        .feelly-widget-header {
          padding: 10px 12px;
        }

        .feelly-widget-content {
          padding: 10px 12px;
        }

        .feelly-status-text {
          font-size: 14px;
        }
      }

      /* Animation for show/hide */
      .feelly-status-widget.entering {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
      }

      .feelly-status-widget.entered {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .feelly-status-widget.exiting {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Attach event listeners to widget elements
   */
  attachEventListeners() {
    // Handle window resize for responsive positioning
    window.addEventListener('resize', () => {
      this.updatePosition();
    });

    // Handle scroll for position updates
    window.addEventListener('scroll', () => {
      this.updatePosition();
    });
  }

  /**
   * Show the status widget
   */
  show() {
    if (this.isVisible) return;

    // Add to DOM
    document.body.appendChild(this.widget);
    
    // Trigger entrance animation
    this.widget.classList.add('entering');
    
    // Force reflow and add entered class
    requestAnimationFrame(() => {
      this.widget.classList.remove('entering');
      this.widget.classList.add('entered');
    });

    this.isVisible = true;
    this.attachWidgetEventListeners();
  }

  /**
   * Hide the status widget
   */
  hide() {
    if (!this.isVisible) return;

    // Trigger exit animation
    this.widget.classList.add('exiting');
    
    setTimeout(() => {
      if (this.widget && this.widget.parentNode) {
        this.widget.parentNode.removeChild(this.widget);
      }
      this.widget.classList.remove('exiting', 'entered');
      this.isVisible = false;
    }, 300);
  }

  /**
   * Attach event listeners specific to widget interactions
   */
  attachWidgetEventListeners() {
    if (!this.widget) return;

    // Toggle expansion on header click
    const header = this.widget.querySelector('.feelly-widget-header');
    if (header) {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }

    // Handle action button clicks
    const actionButtons = this.widget.querySelectorAll('.feelly-action-btn');
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = button.getAttribute('data-action');
        this.handleAction(action);
      });
    });

    // Prevent clicks inside widget from bubbling
    this.widget.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Toggle widget expansion
   */
  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  /**
   * Expand the widget to show detailed breakdown
   */
  expand() {
    if (this.isExpanded) return;

    const content = this.widget.querySelector('.feelly-widget-content');
    if (content) {
      content.style.display = 'block';
      this.widget.classList.add('expanded');
      this.isExpanded = true;

      // Animate content appearance
      requestAnimationFrame(() => {
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';
        content.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        
        requestAnimationFrame(() => {
          content.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        });
      });
    }
  }

  /**
   * Collapse the widget to show only header
   */
  collapse() {
    if (!this.isExpanded) return;

    const content = this.widget.querySelector('.feelly-widget-content');
    if (content) {
      content.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      content.style.opacity = '0';
      content.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        content.style.display = 'none';
        this.widget.classList.remove('expanded');
        this.isExpanded = false;
      }, 200);
    }
  }

  /**
   * Update widget status with new data
   */
  updateStatus(status) {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.renderStatus();
  }

  /**
   * Render the current status in the widget
   */
  renderStatus() {
    if (!this.widget) return;

    const { isActive, isAnalyzing, errorCount, warningCount, suggestionCount, breakdown } = this.currentStatus;
    
    // Update main icon and loading state
    const mainIcon = this.widget.querySelector('.feelly-icon-main');
    const spinner = this.widget.querySelector('.feelly-loading-spinner');
    
    if (isAnalyzing) {
      mainIcon.style.opacity = '0';
      spinner.style.display = 'flex';
    } else {
      mainIcon.style.opacity = '1';
      spinner.style.display = 'none';
    }

    // Update total error count
    const errorCountEl = this.widget.querySelector('.feelly-error-count');
    const totalIssues = errorCount + warningCount + suggestionCount;
    
    if (errorCountEl) {
      errorCountEl.textContent = totalIssues.toString();
      
      if (totalIssues > 0) {
        errorCountEl.classList.add('has-errors');
      } else {
        errorCountEl.classList.remove('has-errors');
      }
    }

    // Update status text
    const statusText = this.widget.querySelector('.feelly-status-text');
    if (statusText) {
      if (isAnalyzing) {
        statusText.textContent = 'Analyzing...';
      } else if (!isActive) {
        statusText.textContent = 'Inactive';
      } else if (totalIssues === 0) {
        statusText.textContent = 'All good!';
      } else {
        statusText.textContent = 'Feelly';
      }
    }

    // Update breakdown counts
    this.updateBreakdownCount('error', errorCount);
    this.updateBreakdownCount('warning', warningCount);
    this.updateBreakdownCount('suggestion', suggestionCount);
  }

  /**
   * Update individual breakdown count
   */
  updateBreakdownCount(type, count) {
    const item = this.widget.querySelector(`[data-type="${type}"] .feelly-breakdown-count`);
    if (item) {
      item.textContent = count.toString();
    }
  }

  /**
   * Set widget position
   */
  setPosition(position) {
    if (!['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(position)) {
      position = 'bottom-right';
    }
    
    this.position = position;
    this.updatePosition();
  }

  /**
   * Update widget position based on current setting
   */
  updatePosition() {
    if (!this.widget) return;

    // Remove all position classes
    this.widget.classList.remove('position-top-right', 'position-top-left', 'position-bottom-right', 'position-bottom-left');
    
    // Add current position class
    this.widget.classList.add(`position-${this.position}`);
    
    // Handle responsive adjustments
    this.handleResponsivePositioning();
  }

  /**
   * Handle responsive positioning adjustments
   */
  handleResponsivePositioning() {
    if (!this.widget) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const widgetRect = this.widget.getBoundingClientRect();

    // Adjust position if widget goes off-screen
    if (this.position.includes('right') && widgetRect.right > viewportWidth) {
      this.widget.style.right = '10px';
    }
    
    if (this.position.includes('left') && widgetRect.left < 0) {
      this.widget.style.left = '10px';
    }
    
    if (this.position.includes('top') && widgetRect.top < 0) {
      this.widget.style.top = '10px';
    }
    
    if (this.position.includes('bottom') && widgetRect.bottom > viewportHeight) {
      this.widget.style.bottom = '10px';
    }
  }

  /**
   * Handle action button clicks
   */
  handleAction(action) {
    switch (action) {
      case 'analyze-all':
        this.onReanalyze?.();
        break;
      case 'settings':
        this.onSettings?.();
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  /**
   * Set callback for re-analyze action
   */
  onReanalyze(callback) {
    this.onReanalyze = callback;
  }

  /**
   * Set callback for settings action
   */
  onSettings(callback) {
    this.onSettings = callback;
  }

  /**
   * Destroy the widget and clean up
   */
  destroy() {
    this.hide();
    
    // Remove event listeners
    window.removeEventListener('resize', this.updatePosition);
    window.removeEventListener('scroll', this.updatePosition);
    
    // Remove styles
    const styles = document.getElementById('feelly-status-widget-styles');
    if (styles) {
      styles.remove();
    }
    
    this.widget = null;
  }
}

export default StatusWidget;