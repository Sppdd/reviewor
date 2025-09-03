/**
 * UnderlineRenderer - Handles rendering underlines for grammar and writing issues
 * 
 * This class creates and manages visual underlines beneath problematic text segments,
 * supporting different issue types with Feelly's yellow-themed color scheme.
 */

class UnderlineRenderer {
    constructor() {
        this.activeUnderlines = new Map(); // Maps element -> Set of underline elements
        this.issueMap = new Map(); // Maps underline element -> issue data
        this.styleInjected = false;
        
        this.injectStyles();
    }

    /**
     * Inject CSS styles for underlines with Feelly branding
     */
    injectStyles() {
        if (this.styleInjected) return;
        
        const styleId = 'feelly-underline-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Feelly Underline Styles */
            .feelly-underline {
                position: relative;
                display: inline;
                pointer-events: none;
            }
            
            .feelly-underline-error {
                border-bottom: 2px wavy rgb(220, 38, 38) !important;
                background: linear-gradient(to bottom, transparent 90%, rgba(220, 38, 38, 0.1) 100%) !important;
            }
            
            .feelly-underline-warning {
                border-bottom: 2px wavy rgb(245, 158, 11) !important;
                background: linear-gradient(to bottom, transparent 90%, rgba(245, 158, 11, 0.1) 100%) !important;
            }
            
            .feelly-underline-suggestion {
                border-bottom: 2px dotted rgb(59, 130, 246) !important;
                background: linear-gradient(to bottom, transparent 90%, rgba(59, 130, 246, 0.1) 100%) !important;
            }
            
            .feelly-underline-style {
                border-bottom: 2px dotted rgb(242, 227, 7) !important;
                background: linear-gradient(to bottom, transparent 90%, rgba(242, 227, 7, 0.1) 100%) !important;
            }
            
            /* Hover effects */
            .feelly-underline:hover {
                cursor: pointer;
                pointer-events: auto;
            }
            
            .feelly-underline-error:hover {
                background: linear-gradient(to bottom, transparent 85%, rgba(220, 38, 38, 0.15) 100%) !important;
            }
            
            .feelly-underline-warning:hover {
                background: linear-gradient(to bottom, transparent 85%, rgba(245, 158, 11, 0.15) 100%) !important;
            }
            
            .feelly-underline-suggestion:hover {
                background: linear-gradient(to bottom, transparent 85%, rgba(59, 130, 246, 0.15) 100%) !important;
            }
            
            .feelly-underline-style:hover {
                background: linear-gradient(to bottom, transparent 85%, rgba(242, 227, 7, 0.15) 100%) !important;
            }
            
            /* Multi-line support */
            .feelly-underline-multiline {
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
            }
        `;
        
        document.head.appendChild(style);
        this.styleInjected = true;
    }

    /**
     * Render underlines for issues in a target element
     * @param {Array} issues - Array of issue objects
     * @param {HTMLElement} targetElement - The element containing the text
     */
    renderUnderlines(issues, targetElement) {
        if (!issues || !targetElement) return;
        
        // Clear existing underlines for this element
        this.clearUnderlines(targetElement);
        
        // Group issues by their text ranges to handle overlapping
        const sortedIssues = issues.sort((a, b) => a.startIndex - b.startIndex);
        
        // Process each issue
        for (const issue of sortedIssues) {
            this.renderSingleUnderline(issue, targetElement);
        }
    }

    /**
     * Render a single underline for an issue
     * @param {Object} issue - Issue object with startIndex, endIndex, type, etc.
     * @param {HTMLElement} targetElement - The element containing the text
     */
    renderSingleUnderline(issue, targetElement) {
        try {
            const textNodes = this.getTextNodes(targetElement);
            const range = this.createRangeFromIndices(textNodes, issue.startIndex, issue.endIndex);
            
            if (!range) return;
            
            // Handle multi-line spans
            const rects = range.getClientRects();
            if (rects.length > 1) {
                this.renderMultiLineUnderline(issue, range, targetElement);
            } else {
                this.renderSingleLineUnderline(issue, range, targetElement);
            }
        } catch (error) {
            console.warn('Failed to render underline for issue:', issue, error);
        }
    }

    /**
     * Render underline for single-line text
     * @param {Object} issue - Issue object
     * @param {Range} range - DOM Range object
     * @param {HTMLElement} targetElement - Target element
     */
    renderSingleLineUnderline(issue, range, targetElement) {
        const span = document.createElement('span');
        span.className = `feelly-underline feelly-underline-${issue.type}`;
        span.setAttribute('data-feelly-issue-id', issue.id);
        span.setAttribute('data-feelly-issue-type', issue.type);
        span.setAttribute('data-feelly-severity', issue.severity);
        
        try {
            range.surroundContents(span);
            this.trackUnderline(targetElement, span, issue);
        } catch (error) {
            // Fallback for complex ranges
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
            this.trackUnderline(targetElement, span, issue);
        }
    }

    /**
     * Render underline for multi-line text spans
     * @param {Object} issue - Issue object
     * @param {Range} range - DOM Range object
     * @param {HTMLElement} targetElement - Target element
     */
    renderMultiLineUnderline(issue, range, targetElement) {
        const span = document.createElement('span');
        span.className = `feelly-underline feelly-underline-${issue.type} feelly-underline-multiline`;
        span.setAttribute('data-feelly-issue-id', issue.id);
        span.setAttribute('data-feelly-issue-type', issue.type);
        span.setAttribute('data-feelly-severity', issue.severity);
        
        try {
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
            this.trackUnderline(targetElement, span, issue);
        } catch (error) {
            console.warn('Failed to render multi-line underline:', error);
        }
    }

    /**
     * Create a DOM Range from text indices
     * @param {Array} textNodes - Array of text nodes
     * @param {number} startIndex - Start character index
     * @param {number} endIndex - End character index
     * @returns {Range|null} DOM Range or null if invalid
     */
    createRangeFromIndices(textNodes, startIndex, endIndex) {
        let currentIndex = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;
        
        for (const node of textNodes) {
            const nodeLength = node.textContent.length;
            const nodeEnd = currentIndex + nodeLength;
            
            // Find start position
            if (startNode === null && startIndex >= currentIndex && startIndex <= nodeEnd) {
                startNode = node;
                startOffset = startIndex - currentIndex;
            }
            
            // Find end position
            if (endIndex >= currentIndex && endIndex <= nodeEnd) {
                endNode = node;
                endOffset = endIndex - currentIndex;
                break;
            }
            
            currentIndex = nodeEnd;
        }
        
        if (!startNode || !endNode) return null;
        
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        
        return range;
    }

    /**
     * Get all text nodes within an element
     * @param {HTMLElement} element - Element to search
     * @returns {Array} Array of text nodes
     */
    getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip nodes inside existing underlines
                    if (node.parentElement?.classList?.contains('feelly-underline')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Skip empty or whitespace-only nodes
                    if (!node.textContent.trim()) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        return textNodes;
    }

    /**
     * Track an underline element
     * @param {HTMLElement} targetElement - Target element
     * @param {HTMLElement} underlineElement - Underline span element
     * @param {Object} issue - Issue data
     */
    trackUnderline(targetElement, underlineElement, issue) {
        if (!this.activeUnderlines.has(targetElement)) {
            this.activeUnderlines.set(targetElement, new Set());
        }
        
        this.activeUnderlines.get(targetElement).add(underlineElement);
        this.issueMap.set(underlineElement, issue);
        
        // Add hover event listeners
        underlineElement.addEventListener('mouseenter', (e) => this.handleUnderlineHover(e, issue));
        underlineElement.addEventListener('mouseleave', (e) => this.handleUnderlineLeave(e, issue));
        underlineElement.addEventListener('click', (e) => this.handleUnderlineClick(e, issue));
    }

    /**
     * Clear all underlines for a target element
     * @param {HTMLElement} targetElement - Target element
     */
    clearUnderlines(targetElement) {
        const underlines = this.activeUnderlines.get(targetElement);
        if (!underlines) return;
        
        for (const underline of underlines) {
            this.removeUnderline(underline);
        }
        
        this.activeUnderlines.delete(targetElement);
    }

    /**
     * Remove a specific underline element
     * @param {HTMLElement} underlineElement - Underline element to remove
     */
    removeUnderline(underlineElement) {
        try {
            // Move children back to parent and remove the underline span
            const parent = underlineElement.parentNode;
            if (parent) {
                while (underlineElement.firstChild) {
                    parent.insertBefore(underlineElement.firstChild, underlineElement);
                }
                parent.removeChild(underlineElement);
                
                // Normalize text nodes
                parent.normalize();
            }
            
            this.issueMap.delete(underlineElement);
        } catch (error) {
            console.warn('Failed to remove underline:', error);
        }
    }

    /**
     * Update underline positions (called on scroll/resize)
     * @param {HTMLElement} targetElement - Target element
     */
    updateUnderlinePositions(targetElement) {
        // For CSS-based underlines, positions update automatically
        // This method is available for future enhancements
        const underlines = this.activeUnderlines.get(targetElement);
        if (!underlines) return;
        
        // Could implement position recalculation here if needed
        // for more complex positioning scenarios
    }

    /**
     * Handle underline hover events
     * @param {MouseEvent} event - Mouse event
     * @param {Object} issue - Issue data
     */
    handleUnderlineHover(event, issue) {
        // Dispatch custom event for tooltip manager
        const customEvent = new CustomEvent('feelly-underline-hover', {
            detail: {
                issue,
                element: event.target,
                mouseEvent: event
            }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Handle underline leave events
     * @param {MouseEvent} event - Mouse event
     * @param {Object} issue - Issue data
     */
    handleUnderlineLeave(event, issue) {
        // Dispatch custom event for tooltip manager
        const customEvent = new CustomEvent('feelly-underline-leave', {
            detail: {
                issue,
                element: event.target,
                mouseEvent: event
            }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Handle underline click events
     * @param {MouseEvent} event - Mouse event
     * @param {Object} issue - Issue data
     */
    handleUnderlineClick(event, issue) {
        event.preventDefault();
        event.stopPropagation();
        
        // Dispatch custom event for suggestion handling
        const customEvent = new CustomEvent('feelly-underline-click', {
            detail: {
                issue,
                element: event.target,
                mouseEvent: event
            }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Get issue data for an underline element
     * @param {HTMLElement} underlineElement - Underline element
     * @returns {Object|null} Issue data or null
     */
    getIssueForElement(underlineElement) {
        return this.issueMap.get(underlineElement) || null;
    }

    /**
     * Get all active underlines for an element
     * @param {HTMLElement} targetElement - Target element
     * @returns {Set} Set of underline elements
     */
    getUnderlines(targetElement) {
        return this.activeUnderlines.get(targetElement) || new Set();
    }

    /**
     * Check if an element has any underlines
     * @param {HTMLElement} targetElement - Target element
     * @returns {boolean} True if element has underlines
     */
    hasUnderlines(targetElement) {
        const underlines = this.activeUnderlines.get(targetElement);
        return underlines && underlines.size > 0;
    }

    /**
     * Cleanup all underlines and event listeners
     */
    cleanup() {
        for (const [targetElement] of this.activeUnderlines) {
            this.clearUnderlines(targetElement);
        }
        
        this.activeUnderlines.clear();
        this.issueMap.clear();
        
        // Remove injected styles
        const styleElement = document.getElementById('feelly-underline-styles');
        if (styleElement) {
            styleElement.remove();
            this.styleInjected = false;
        }
    }
}

export default UnderlineRenderer;