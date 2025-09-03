/**
 * TooltipManager - Handles interactive suggestion tooltips
 * 
 * This class manages the display and interaction of tooltips that appear when users
 * hover over underlined text, providing suggestions and actions with Feelly branding.
 */

class TooltipManager {
    constructor() {
        this.activeTooltip = null;
        this.tooltipElement = null;
        this.currentIssue = null;
        this.hideTimeout = null;
        this.styleInjected = false;
        this.isVisible = false;
        
        this.injectStyles();
        this.setupEventListeners();
    }

    /**
     * Inject CSS styles for tooltips with Feelly branding
     */
    injectStyles() {
        if (this.styleInjected) return;
        
        const styleId = 'feelly-tooltip-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Feelly Tooltip Styles */
            .feelly-tooltip {
                position: absolute;
                z-index: 10000;
                background: white;
                border: 2px solid rgb(242, 227, 7);
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                max-width: 320px;
                min-width: 200px;
                opacity: 0;
                transform: translateY(4px);
                transition: opacity 0.2s ease-out, transform 0.2s ease-out;
                pointer-events: none;
                user-select: none;
            }
            
            .feelly-tooltip.visible {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }
            
            .feelly-tooltip-header {
                background: linear-gradient(90deg, rgb(242, 227, 7) 0%, rgb(248, 240, 102) 100%);
                color: rgb(55, 65, 81);
                font-weight: 600;
                padding: 8px 12px;
                border-radius: 6px 6px 0 0;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .feelly-tooltip-content {
                padding: 12px;
            }
            
            .feelly-tooltip-message {
                color: rgb(55, 65, 81);
                margin-bottom: 12px;
                font-weight: 500;
            }
            
            .feelly-tooltip-suggestions {
                margin-bottom: 8px;
            }
            
            .feelly-tooltip-suggestion-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                margin: 4px 0;
                background: rgb(249, 250, 251);
                border: 1px solid rgb(229, 231, 235);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            
            .feelly-tooltip-suggestion-item:hover {
                background: rgb(242, 227, 7);
                border-color: rgb(194, 182, 6);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(242, 227, 7, 0.3);
            }
            
            .feelly-tooltip-suggestion-text {
                color: rgb(55, 65, 81);
                font-weight: 500;
                flex: 1;
            }
            
            .feelly-tooltip-suggestion-confidence {
                color: rgb(107, 114, 128);
                font-size: 11px;
                margin-left: 8px;
            }
            
            .feelly-tooltip-actions {
                display: flex;
                gap: 8px;
                padding-top: 8px;
                border-top: 1px solid rgb(229, 231, 235);
            }
            
            .feelly-tooltip-button {
                flex: 1;
                padding: 6px 12px;
                border: 1px solid rgb(194, 182, 6);
                border-radius: 4px;
                background: rgb(242, 227, 7);
                color: rgb(55, 65, 81);
                font-weight: 500;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: center;
            }
            
            .feelly-tooltip-button:hover {
                background: rgb(248, 240, 102);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(242, 227, 7, 0.3);
            }
            
            .feelly-tooltip-button.secondary {
                background: white;
                color: rgb(107, 114, 128);
                border-color: rgb(209, 213, 219);
            }
            
            .feelly-tooltip-button.secondary:hover {
                background: rgb(249, 250, 251);
                color: rgb(55, 65, 81);
                border-color: rgb(156, 163, 175);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            /* Issue type specific headers */
            .feelly-tooltip.error .feelly-tooltip-header {
                background: linear-gradient(90deg, rgb(220, 38, 38) 0%, rgb(248, 113, 113) 100%);
                color: white;
            }
            
            .feelly-tooltip.warning .feelly-tooltip-header {
                background: linear-gradient(90deg, rgb(245, 158, 11) 0%, rgb(251, 191, 36) 100%);
                color: rgb(55, 65, 81);
            }
            
            .feelly-tooltip.suggestion .feelly-tooltip-header {
                background: linear-gradient(90deg, rgb(59, 130, 246) 0%, rgb(147, 197, 253) 100%);
                color: white;
            }
            
            /* Arrow */
            .feelly-tooltip-arrow {
                position: absolute;
                width: 0;
                height: 0;
                border-style: solid;
            }
            
            .feelly-tooltip-arrow.top {
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                border-width: 0 6px 6px 6px;
                border-color: transparent transparent rgb(242, 227, 7) transparent;
            }
            
            .feelly-tooltip-arrow.bottom {
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border-width: 6px 6px 0 6px;
                border-color: rgb(242, 227, 7) transparent transparent transparent;
            }
            
            .feelly-tooltip-arrow.left {
                right: 100%;
                top: 50%;
                transform: translateY(-50%);
                border-width: 6px 6px 6px 0;
                border-color: transparent rgb(242, 227, 7) transparent transparent;
            }
            
            .feelly-tooltip-arrow.right {
                left: 100%;
                top: 50%;
                transform: translateY(-50%);
                border-width: 6px 0 6px 6px;
                border-color: transparent transparent transparent rgb(242, 227, 7);
            }
            
            /* Responsive design */
            @media (max-width: 480px) {
                .feelly-tooltip {
                    max-width: 280px;
                    font-size: 13px;
                }
                
                .feelly-tooltip-content {
                    padding: 10px;
                }
                
                .feelly-tooltip-actions {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(style);
        this.styleInjected = true;
    }

    /**
     * Setup event listeners for tooltip interactions
     */
    setupEventListeners() {
        // Listen for underline hover events
        document.addEventListener('feelly-underline-hover', (e) => {
            this.showTooltip(e.detail.issue, e.detail.element, e.detail.mouseEvent);
        });
        
        // Listen for underline leave events
        document.addEventListener('feelly-underline-leave', (e) => {
            this.scheduleHide();
        });
        
        // Listen for underline click events
        document.addEventListener('feelly-underline-click', (e) => {
            this.showTooltip(e.detail.issue, e.detail.element, e.detail.mouseEvent, true);
        });
        
        // Hide tooltip when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.tooltipElement?.contains(e.target)) {
                this.hideTooltip();
            }
        });
        
        // Hide tooltip on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hideTooltip();
            }
        });
        
        // Handle scroll and resize
        window.addEventListener('scroll', () => this.updatePosition(), { passive: true });
        window.addEventListener('resize', () => this.updatePosition(), { passive: true });
    }

    /**
     * Show tooltip for an issue
     * @param {Object} issue - Issue object
     * @param {HTMLElement} targetElement - Element that triggered the tooltip
     * @param {MouseEvent} mouseEvent - Mouse event
     * @param {boolean} persistent - Whether tooltip should stay visible
     */
    showTooltip(issue, targetElement, mouseEvent, persistent = false) {
        // Clear any pending hide timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        // If same issue is already shown, don't recreate
        if (this.currentIssue?.id === issue.id && this.isVisible) {
            return;
        }
        
        this.currentIssue = issue;
        this.createTooltipElement(issue, persistent);
        this.positionTooltip(targetElement, mouseEvent);
        this.showTooltipElement();
    }

    /**
     * Create the tooltip DOM element
     * @param {Object} issue - Issue object
     * @param {boolean} persistent - Whether tooltip should stay visible
     */
    createTooltipElement(issue, persistent = false) {
        // Remove existing tooltip
        if (this.tooltipElement) {
            this.tooltipElement.remove();
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = `feelly-tooltip ${issue.type}`;
        tooltip.setAttribute('role', 'tooltip');
        tooltip.setAttribute('aria-live', 'polite');
        
        // Create header
        const header = document.createElement('div');
        header.className = 'feelly-tooltip-header';
        header.textContent = this.getIssueTypeLabel(issue.type, issue.severity);
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'feelly-tooltip-content';
        
        // Add issue message
        const message = document.createElement('div');
        message.className = 'feelly-tooltip-message';
        message.textContent = issue.message || 'Issue detected in this text.';
        
        content.appendChild(message);
        
        // Add suggestions if available
        if (issue.suggestions && issue.suggestions.length > 0) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'feelly-tooltip-suggestions';
            
            issue.suggestions.slice(0, 3).forEach((suggestion, index) => {
                const suggestionItem = this.createSuggestionItem(suggestion, index, issue);
                suggestionsContainer.appendChild(suggestionItem);
            });
            
            content.appendChild(suggestionsContainer);
        }
        
        // Add action buttons
        const actions = document.createElement('div');
        actions.className = 'feelly-tooltip-actions';
        
        const ignoreButton = document.createElement('button');
        ignoreButton.className = 'feelly-tooltip-button secondary';
        ignoreButton.textContent = 'Ignore';
        ignoreButton.addEventListener('click', () => this.handleIgnore(issue));
        
        actions.appendChild(ignoreButton);
        
        if (issue.suggestions && issue.suggestions.length > 3) {
            const moreButton = document.createElement('button');
            moreButton.className = 'feelly-tooltip-button';
            moreButton.textContent = `+${issue.suggestions.length - 3} more`;
            moreButton.addEventListener('click', () => this.showAllSuggestions(issue));
            actions.appendChild(moreButton);
        }
        
        content.appendChild(actions);
        
        // Add arrow
        const arrow = document.createElement('div');
        arrow.className = 'feelly-tooltip-arrow top';
        
        tooltip.appendChild(header);
        tooltip.appendChild(content);
        tooltip.appendChild(arrow);
        
        // Add hover listeners to keep tooltip visible
        if (!persistent) {
            tooltip.addEventListener('mouseenter', () => {
                if (this.hideTimeout) {
                    clearTimeout(this.hideTimeout);
                    this.hideTimeout = null;
                }
            });
            
            tooltip.addEventListener('mouseleave', () => {
                this.scheduleHide();
            });
        }
        
        this.tooltipElement = tooltip;
        document.body.appendChild(tooltip);
    }

    /**
     * Create a suggestion item element
     * @param {Object|string} suggestion - Suggestion object or string
     * @param {number} index - Suggestion index
     * @param {Object} issue - Parent issue object
     * @returns {HTMLElement} Suggestion item element
     */
    createSuggestionItem(suggestion, index, issue) {
        const item = document.createElement('div');
        item.className = 'feelly-tooltip-suggestion-item';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        
        const text = document.createElement('span');
        text.className = 'feelly-tooltip-suggestion-text';
        
        if (typeof suggestion === 'string') {
            text.textContent = suggestion;
        } else {
            text.textContent = suggestion.text || suggestion.description || 'Apply suggestion';
            
            if (suggestion.confidence) {
                const confidence = document.createElement('span');
                confidence.className = 'feelly-tooltip-suggestion-confidence';
                confidence.textContent = `${Math.round(suggestion.confidence * 100)}%`;
                item.appendChild(confidence);
            }
        }
        
        item.appendChild(text);
        
        // Add click handler
        item.addEventListener('click', () => this.handleSuggestionClick(suggestion, issue, index));
        
        // Add keyboard support
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleSuggestionClick(suggestion, issue, index);
            }
        });
        
        return item;
    }

    /**
     * Position the tooltip relative to the target element
     * @param {HTMLElement} targetElement - Element to position relative to
     * @param {MouseEvent} mouseEvent - Mouse event for positioning
     */
    positionTooltip(targetElement, mouseEvent) {
        if (!this.tooltipElement) return;
        
        const tooltip = this.tooltipElement;
        const arrow = tooltip.querySelector('.feelly-tooltip-arrow');
        
        // Get target element bounds
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x, y;
        let placement = 'top';
        
        // Calculate preferred position (above the element)
        x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        y = targetRect.top - tooltipRect.height - 8;
        
        // Check if tooltip fits above
        if (y < 10) {
            // Position below instead
            y = targetRect.bottom + 8;
            placement = 'bottom';
            arrow.className = 'feelly-tooltip-arrow bottom';
        }
        
        // Check horizontal bounds
        if (x < 10) {
            x = 10;
        } else if (x + tooltipRect.width > viewportWidth - 10) {
            x = viewportWidth - tooltipRect.width - 10;
        }
        
        // Check if tooltip fits below (if we switched to bottom)
        if (placement === 'bottom' && y + tooltipRect.height > viewportHeight - 10) {
            // Try positioning to the side
            if (targetRect.right + tooltipRect.width + 8 < viewportWidth - 10) {
                x = targetRect.right + 8;
                y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                placement = 'right';
                arrow.className = 'feelly-tooltip-arrow left';
            } else if (targetRect.left - tooltipRect.width - 8 > 10) {
                x = targetRect.left - tooltipRect.width - 8;
                y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                placement = 'left';
                arrow.className = 'feelly-tooltip-arrow right';
            }
        }
        
        // Apply position
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        
        // Adjust arrow position for horizontal centering
        if (placement === 'top' || placement === 'bottom') {
            const arrowOffset = (targetRect.left + targetRect.width / 2) - x;
            const maxOffset = tooltipRect.width - 20;
            const minOffset = 20;
            const clampedOffset = Math.max(minOffset, Math.min(maxOffset, arrowOffset));
            arrow.style.left = `${clampedOffset}px`;
            arrow.style.transform = 'translateX(-50%)';
        }
    }

    /**
     * Update tooltip position (called on scroll/resize)
     */
    updatePosition() {
        if (!this.isVisible || !this.tooltipElement) return;
        
        // Find the original target element
        const targetElement = document.querySelector(`[data-feelly-issue-id="${this.currentIssue?.id}"]`);
        if (targetElement) {
            this.positionTooltip(targetElement, null);
        } else {
            // Target element no longer exists, hide tooltip
            this.hideTooltip();
        }
    }

    /**
     * Show the tooltip element with animation
     */
    showTooltipElement() {
        if (!this.tooltipElement) return;
        
        // Force reflow to ensure initial styles are applied
        this.tooltipElement.offsetHeight;
        
        // Add visible class for animation
        this.tooltipElement.classList.add('visible');
        this.isVisible = true;
    }

    /**
     * Schedule tooltip hide with delay
     * @param {number} delay - Delay in milliseconds (default: 200)
     */
    scheduleHide(delay = 200) {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        
        this.hideTimeout = setTimeout(() => {
            this.hideTooltip();
        }, delay);
    }

    /**
     * Hide the tooltip immediately
     */
    hideTooltip() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        if (this.tooltipElement) {
            this.tooltipElement.classList.remove('visible');
            
            // Remove element after animation
            setTimeout(() => {
                if (this.tooltipElement) {
                    this.tooltipElement.remove();
                    this.tooltipElement = null;
                }
            }, 200);
        }
        
        this.isVisible = false;
        this.currentIssue = null;
    }

    /**
     * Handle suggestion click
     * @param {Object|string} suggestion - Suggestion object or string
     * @param {Object} issue - Issue object
     * @param {number} index - Suggestion index
     */
    handleSuggestionClick(suggestion, issue, index) {
        // Dispatch custom event for suggestion application
        const customEvent = new CustomEvent('feelly-suggestion-apply', {
            detail: {
                suggestion,
                issue,
                index
            }
        });
        document.dispatchEvent(customEvent);
        
        this.hideTooltip();
    }

    /**
     * Handle ignore button click
     * @param {Object} issue - Issue object
     */
    handleIgnore(issue) {
        // Dispatch custom event for issue ignore
        const customEvent = new CustomEvent('feelly-issue-ignore', {
            detail: {
                issue
            }
        });
        document.dispatchEvent(customEvent);
        
        this.hideTooltip();
    }

    /**
     * Show all suggestions in expanded view
     * @param {Object} issue - Issue object
     */
    showAllSuggestions(issue) {
        // Recreate tooltip with all suggestions
        this.createTooltipElement({
            ...issue,
            suggestions: issue.suggestions // Show all suggestions
        }, true);
        
        // Reposition
        const targetElement = document.querySelector(`[data-feelly-issue-id="${issue.id}"]`);
        if (targetElement) {
            this.positionTooltip(targetElement, null);
        }
        
        this.showTooltipElement();
    }

    /**
     * Get display label for issue type
     * @param {string} type - Issue type
     * @param {string} severity - Issue severity
     * @returns {string} Display label
     */
    getIssueTypeLabel(type, severity) {
        const labels = {
            grammar: 'Grammar Error',
            spelling: 'Spelling Error',
            style: 'Style Suggestion',
            clarity: 'Clarity Improvement',
            tone: 'Tone Adjustment'
        };
        
        const severityLabels = {
            error: 'Error',
            warning: 'Warning',
            suggestion: 'Suggestion'
        };
        
        return labels[type] || severityLabels[severity] || 'Writing Issue';
    }

    /**
     * Check if tooltip is currently visible
     * @returns {boolean} True if tooltip is visible
     */
    isTooltipVisible() {
        return this.isVisible;
    }

    /**
     * Get current issue being displayed
     * @returns {Object|null} Current issue or null
     */
    getCurrentIssue() {
        return this.currentIssue;
    }

    /**
     * Cleanup tooltip and event listeners
     */
    cleanup() {
        this.hideTooltip();
        
        // Remove event listeners would require storing references
        // For now, events will be cleaned up when document is unloaded
        
        // Remove injected styles
        const styleElement = document.getElementById('feelly-tooltip-styles');
        if (styleElement) {
            styleElement.remove();
            this.styleInjected = false;
        }
    }
}

export default TooltipManager;