// /**
//  * OverlayPositioner - Advanced positioning system for floating elements
//  * 
//  * This class provides sophisticated positioning calculations for tooltips and overlays,
//  * handling viewport constraints, collision detection, and responsive positioning.
//  * Inspired by Floating UI principles but tailored for Feelly's needs.
//  */

// class OverlayPositioner {
//     constructor() {
//         this.activeElements = new Map(); // Maps element -> positioning data
//         this.scrollListeners = new Set();
//         this.resizeListeners = new Set();
//         this.animationFrameId = null;
//         this.isUpdating = false;
        
//         this.setupGlobalListeners();
//     }

//     /**
//      * Setup global event listeners for position updates
//      */
//     setupGlobalListeners() {
//         // Throttled scroll handler
//         let scrollTimeout = null;
//         const handleScroll = () => {
//             if (scrollTimeout) return;
            
//             scrollTimeout = setTimeout(() => {
//                 this.updateAllPositions();
//                 scrollTimeout = null;
//             }, 16); // ~60fps
//         };
        
//         // Throttled resize handler
//         let resizeTimeout = null;
//         const handleResize = () => {
//             if (resizeTimeout) return;
            
//             resizeTimeout = setTimeout(() => {
//                 this.updateAllPositions();
//                 resizeTimeout = null;
//             }, 100);
//         };
        
//         window.addEventListener('scroll', handleScroll, { passive: true });
//         window.addEventListener('resize', handleResize, { passive: true });
        
//         // Handle orientation change on mobile
//         window.addEventListener('orientationchange', () => {
//             setTimeout(() => this.updateAllPositions(), 200);
//         });
//     }

//     /**
//      * Position a floating element relative to a reference element
//      * @param {HTMLElement} floatingElement - Element to position
//      * @param {HTMLElement} referenceElement - Reference element
//      * @param {Object} options - Positioning options
//      * @returns {Object} Position data
//      */
//     position(floatingElement, referenceElement, options = {}) {
//         const config = {
//             placement: 'top',
//             offset: 8,
//             padding: 10,
//             flip: true,
//             shift: true,
//             arrow: null,
//             boundary: null,
//             strategy: 'absolute',
//             ...options
//         };
        
//         const positionData = this.computePosition(floatingElement, referenceElement, config);
//         this.applyPosition(floatingElement, positionData, config);
        
//         // Track element for updates
//         this.activeElements.set(floatingElement, {
//             reference: referenceElement,
//             config,
//             positionData
//         });
        
//         return positionData;
//     }

//     /**
//      * Compute optimal position for floating element
//      * @param {HTMLElement} floatingElement - Element to position
//      * @param {HTMLElement} referenceElement - Reference element
//      * @param {Object} config - Configuration options
//      * @returns {Object} Position data
//      */
//     computePosition(floatingElement, referenceElement, config) {
//         const referenceRect = this.getElementRect(referenceElement);
//         const floatingRect = this.getElementRect(floatingElement);
//         const viewport = this.getViewportRect();
//         const boundary = config.boundary ? this.getElementRect(config.boundary) : viewport;
        
//         // Calculate initial position based on placement
//         let position = this.calculateInitialPosition(referenceRect, floatingRect, config);
        
//         // Apply collision detection and flipping
//         if (config.flip) {
//             position = this.applyFlip(position, floatingRect, viewport, boundary, config);
//         }
        
//         // Apply shifting to keep element in bounds
//         if (config.shift) {
//             position = this.applyShift(position, floatingRect, viewport, boundary, config);
//         }
        
//         // Calculate arrow position if needed
//         let arrowPosition = null;
//         if (config.arrow) {
//             arrowPosition = this.calculateArrowPosition(position, referenceRect, floatingRect, config);
//         }
        
//         return {
//             x: Math.round(position.x),
//             y: Math.round(position.y),
//             placement: position.placement,
//             arrow: arrowPosition,
//             referenceRect,
//             floatingRect,
//             viewport,
//             boundary
//         };
//     }

//     /**
//      * Get element bounding rectangle with scroll offset
//      * @param {HTMLElement} element - Element to measure
//      * @returns {Object} Rectangle data
//      */
//     getElementRect(element) {
//         const rect = element.getBoundingClientRect();
//         const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
//         const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
//         return {
//             x: rect.left + scrollX,
//             y: rect.top + scrollY,
//             width: rect.width,
//             height: rect.height,
//             top: rect.top + scrollY,
//             right: rect.right + scrollX,
//             bottom: rect.bottom + scrollY,
//             left: rect.left + scrollX
//         };
//     }

//     /**
//      * Get viewport rectangle
//      * @returns {Object} Viewport data
//      */
//     getViewportRect() {
//         const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
//         const scrollY = window.pageYOffset || document.documentElement.scrollTop;
//         const width = window.innerWidth || document.documentElement.clientWidth;
//         const height = window.innerHeight || document.documentElement.clientHeight;
        
//         return {
//             x: scrollX,
//             y: scrollY,
//             width,
//             height,
//             top: scrollY,
//             right: scrollX + width,
//             bottom: scrollY + height,
//             left: scrollX
//         };
//     }

//     /**
//      * Calculate initial position based on placement
//      * @param {Object} referenceRect - Reference element rectangle
//      * @param {Object} floatingRect - Floating element rectangle
//      * @param {Object} config - Configuration options
//      * @returns {Object} Position data
//      */
//     calculateInitialPosition(referenceRect, floatingRect, config) {
//         const { placement, offset } = config;
//         let x, y, finalPlacement = placement;
        
//         switch (placement) {
//             case 'top':
//                 x = referenceRect.x + (referenceRect.width - floatingRect.width) / 2;
//                 y = referenceRect.y - floatingRect.height - offset;
//                 break;
//             case 'top-start':
//                 x = referenceRect.x;
//                 y = referenceRect.y - floatingRect.height - offset;
//                 break;
//             case 'top-end':
//                 x = referenceRect.x + referenceRect.width - floatingRect.width;
//                 y = referenceRect.y - floatingRect.height - offset;
//                 break;
//             case 'bottom':
//                 x = referenceRect.x + (referenceRect.width - floatingRect.width) / 2;
//                 y = referenceRect.y + referenceRect.height + offset;
//                 break;
//             case 'bottom-start':
//                 x = referenceRect.x;
//                 y = referenceRect.y + referenceRect.height + offset;
//                 break;
//             case 'bottom-end':
//                 x = referenceRect.x + referenceRect.width - floatingRect.width;
//                 y = referenceRect.y + referenceRect.height + offset;
//                 break;
//             case 'left':
//                 x = referenceRect.x - floatingRect.width - offset;
//                 y = referenceRect.y + (referenceRect.height - floatingRect.height) / 2;
//                 break;
//             case 'left-start':
//                 x = referenceRect.x - floatingRect.width - offset;
//                 y = referenceRect.y;
//                 break;
//             case 'left-end':
//                 x = referenceRect.x - floatingRect.width - offset;
//                 y = referenceRect.y + referenceRect.height - floatingRect.height;
//                 break;
//             case 'right':
//                 x = referenceRect.x + referenceRect.width + offset;
//                 y = referenceRect.y + (referenceRect.height - floatingRect.height) / 2;
//                 break;
//             case 'right-start':
//                 x = referenceRect.x + referenceRect.width + offset;
//                 y = referenceRect.y;
//                 break;
//             case 'right-end':
//                 x = referenceRect.x + referenceRect.width + offset;
//                 y = referenceRect.y + referenceRect.height - floatingRect.height;
//                 break;
//             default:
//                 x = referenceRect.x;
//                 y = referenceRect.y - floatingRect.height - offset;
//                 finalPlacement = 'top';
//         }
        
//         return { x, y, placement: finalPlacement };
//     }

//     /**
//      * Apply flip logic to avoid viewport collisions
//      * @param {Object} position - Current position
//      * @param {Object} floatingRect - Floating element rectangle
//      * @param {Object} viewport - Viewport rectangle
//      * @param {Object} boundary - Boundary rectangle
//      * @param {Object} config - Configuration options
//      * @returns {Object} Updated position
//      */
//     applyFlip(position, floatingRect, viewport, boundary, config) {
//         const { placement, offset } = config;
//         const { x, y } = position;
        
//         // Check if current position causes overflow
//         const overflows = this.detectOverflows(x, y, floatingRect, boundary);
        
//         if (!overflows.top && !overflows.bottom && !overflows.left && !overflows.right) {
//             return position; // No overflow, keep current position
//         }
        
//         // Try flipping to opposite side
//         const flippedPlacement = this.getFlippedPlacement(placement);
//         if (flippedPlacement !== placement) {
//             const referenceRect = this.activeElements.get(document.querySelector('[data-positioning]'))?.positionData?.referenceRect;
//             if (referenceRect) {
//                 const flippedPosition = this.calculateInitialPosition(referenceRect, floatingRect, {
//                     ...config,
//                     placement: flippedPlacement
//                 });
                
//                 const flippedOverflows = this.detectOverflows(
//                     flippedPosition.x, 
//                     flippedPosition.y, 
//                     floatingRect, 
//                     boundary
//                 );
                
//                 // Use flipped position if it has fewer overflows
//                 const currentOverflowCount = Object.values(overflows).filter(Boolean).length;
//                 const flippedOverflowCount = Object.values(flippedOverflows).filter(Boolean).length;
                
//                 if (flippedOverflowCount < currentOverflowCount) {
//                     return flippedPosition;
//                 }
//             }
//         }
        
//         return position;
//     }

//     /**
//      * Apply shift logic to keep element within bounds
//      * @param {Object} position - Current position
//      * @param {Object} floatingRect - Floating element rectangle
//      * @param {Object} viewport - Viewport rectangle
//      * @param {Object} boundary - Boundary rectangle
//      * @param {Object} config - Configuration options
//      * @returns {Object} Updated position
//      */
//     applyShift(position, floatingRect, viewport, boundary, config) {
//         let { x, y } = position;
//         const { padding } = config;
        
//         // Shift horizontally if needed
//         const leftOverflow = boundary.left + padding - x;
//         const rightOverflow = (x + floatingRect.width) - (boundary.right - padding);
        
//         if (leftOverflow > 0) {
//             x += leftOverflow;
//         } else if (rightOverflow > 0) {
//             x -= rightOverflow;
//         }
        
//         // Shift vertically if needed
//         const topOverflow = boundary.top + padding - y;
//         const bottomOverflow = (y + floatingRect.height) - (boundary.bottom - padding);
        
//         if (topOverflow > 0) {
//             y += topOverflow;
//         } else if (bottomOverflow > 0) {
//             y -= bottomOverflow;
//         }
        
//         return { ...position, x, y };
//     }

//     /**
//      * Detect overflows for given position
//      * @param {number} x - X coordinate
//      * @param {number} y - Y coordinate
//      * @param {Object} floatingRect - Floating element rectangle
//      * @param {Object} boundary - Boundary rectangle
//      * @returns {Object} Overflow flags
//      */
//     detectOverflows(x, y, floatingRect, boundary) {
//         return {
//             top: y < boundary.top,
//             right: (x + floatingRect.width) > boundary.right,
//             bottom: (y + floatingRect.height) > boundary.bottom,
//             left: x < boundary.left
//         };
//     }

//     /**
//      * Get flipped placement for collision avoidance
//      * @param {string} placement - Current placement
//      * @returns {string} Flipped placement
//      */
//     getFlippedPlacement(placement) {
//         const flipMap = {
//             'top': 'bottom',
//             'top-start': 'bottom-start',
//             'top-end': 'bottom-end',
//             'bottom': 'top',
//             'bottom-start': 'top-start',
//             'bottom-end': 'top-end',
//             'left': 'right',
//             'left-start': 'right-start',
//             'left-end': 'right-end',
//             'right': 'left',
//             'right-start': 'left-start',
//             'right-end': 'left-end'
//         };
        
//         return flipMap[placement] || placement;
//     }

//     /**
//      * Calculate arrow position for tooltip
//      * @param {Object} position - Floating element position
//      * @param {Object} referenceRect - Reference element rectangle
//      * @param {Object} floatingRect - Floating element rectangle
//      * @param {Object} config - Configuration options
//      * @returns {Object} Arrow position data
//      */
//     calculateArrowPosition(position, referenceRect, floatingRect, config) {
//         const { placement } = position;
//         const arrowSize = 8; // Default arrow size
        
//         let x, y, side;
        
//         if (placement.startsWith('top')) {
//             side = 'bottom';
//             x = Math.max(arrowSize, Math.min(
//                 floatingRect.width - arrowSize,
//                 referenceRect.x + referenceRect.width / 2 - position.x
//             ));
//             y = floatingRect.height;
//         } else if (placement.startsWith('bottom')) {
//             side = 'top';
//             x = Math.max(arrowSize, Math.min(
//                 floatingRect.width - arrowSize,
//                 referenceRect.x + referenceRect.width / 2 - position.x
//             ));
//             y = -arrowSize;
//         } else if (placement.startsWith('left')) {
//             side = 'right';
//             x = floatingRect.width;
//             y = Math.max(arrowSize, Math.min(
//                 floatingRect.height - arrowSize,
//                 referenceRect.y + referenceRect.height / 2 - position.y
//             ));
//         } else if (placement.startsWith('right')) {
//             side = 'left';
//             x = -arrowSize;
//             y = Math.max(arrowSize, Math.min(
//                 floatingRect.height - arrowSize,
//                 referenceRect.y + referenceRect.height / 2 - position.y
//             ));
//         }
        
//         return { x, y, side };
//     }

//     /**
//      * Apply computed position to floating element
//      * @param {HTMLElement} floatingElement - Element to position
//      * @param {Object} positionData - Position data
//      * @param {Object} config - Configuration options
//      */
//     applyPosition(floatingElement, positionData, config) {
//         const { x, y, placement, arrow } = positionData;
//         const { strategy } = config;
        
//         // Apply position styles
//         Object.assign(floatingElement.style, {
//             position: strategy,
//             left: `${x}px`,
//             top: `${y}px`,
//             zIndex: '10000'
//         });
        
//         // Add placement class for styling
//         floatingElement.classList.remove(
//             'feelly-placement-top', 'feelly-placement-bottom',
//             'feelly-placement-left', 'feelly-placement-right'
//         );
//         floatingElement.classList.add(`feelly-placement-${placement.split('-')[0]}`);
        
//         // Position arrow if present
//         if (arrow && config.arrow) {
//             this.positionArrow(config.arrow, arrow);
//         }
        
//         // Mark element as positioned
//         floatingElement.setAttribute('data-positioning', 'true');
//     }

//     /**
//      * Position arrow element
//      * @param {HTMLElement} arrowElement - Arrow element
//      * @param {Object} arrowData - Arrow position data
//      */
//     positionArrow(arrowElement, arrowData) {
//         const { x, y, side } = arrowData;
        
//         Object.assign(arrowElement.style, {
//             position: 'absolute',
//             left: `${x}px`,
//             top: `${y}px`
//         });
        
//         // Add side class for styling
//         arrowElement.classList.remove(
//             'feelly-arrow-top', 'feelly-arrow-bottom',
//             'feelly-arrow-left', 'feelly-arrow-right'
//         );
//         arrowElement.classList.add(`feelly-arrow-${side}`);
//     }

//     /**
//      * Update positions of all tracked elements
//      */
//     updateAllPositions() {
//         if (this.isUpdating) return;
        
//         this.isUpdating = true;
        
//         // Use requestAnimationFrame for smooth updates
//         this.animationFrameId = requestAnimationFrame(() => {
//             for (const [floatingElement, data] of this.activeElements) {
//                 if (!document.contains(floatingElement)) {
//                     this.activeElements.delete(floatingElement);
//                     continue;
//                 }
                
//                 const positionData = this.computePosition(
//                     floatingElement,
//                     data.reference,
//                     data.config
//                 );
                
//                 this.applyPosition(floatingElement, positionData, data.config);
//                 data.positionData = positionData;
//             }
            
//             this.isUpdating = false;
//         });
//     }

//     /**
//      * Stop tracking an element
//      * @param {HTMLElement} floatingElement - Element to stop tracking
//      */
//     untrack(floatingElement) {
//         this.activeElements.delete(floatingElement);
//         floatingElement.removeAttribute('data-positioning');
//     }

//     /**
//      * Get responsive positioning based on screen size
//      * @param {string} placement - Desired placement
//      * @returns {string} Responsive placement
//      */
//     getResponsivePlacement(placement) {
//         const viewport = this.getViewportRect();
//         const isMobile = viewport.width < 768;
//         const isTablet = viewport.width >= 768 && viewport.width < 1024;
        
//         if (isMobile) {
//             // On mobile, prefer bottom placement for better accessibility
//             if (placement.startsWith('top')) {
//                 return placement.replace('top', 'bottom');
//             }
//             // Avoid left/right on mobile due to limited width
//             if (placement.startsWith('left') || placement.startsWith('right')) {
//                 return 'bottom';
//             }
//         }
        
//         if (isTablet) {
//             // On tablet, prefer simpler placements
//             if (placement.includes('-start') || placement.includes('-end')) {
//                 return placement.split('-')[0];
//             }
//         }
        
//         return placement;
//     }

//     /**
//      * Check if element is in viewport
//      * @param {HTMLElement} element - Element to check
//      * @returns {boolean} Whether element is visible
//      */
//     isElementInViewport(element) {
//         const rect = element.getBoundingClientRect();
//         const viewport = this.getViewportRect();
        
//         return (
//             rect.top >= 0 &&
//             rect.left >= 0 &&
//             rect.bottom <= viewport.height &&
//             rect.right <= viewport.width
//         );
//     }

//     /**
//      * Clean up resources
//      */
//     destroy() {
//         if (this.animationFrameId) {
//             cancelAnimationFrame(this.animationFrameId);
//         }
        
//         this.activeElements.clear();
//         this.scrollListeners.clear();
//         this.resizeListeners.clear();
        
//         // Remove global listeners would require storing references
//         // For now, they'll be cleaned up when the page unloads
//     }
// }
// // Expor
// t for use in other modules
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = OverlayPositioner;
// } else if (typeof window !== 'undefined') {
//     window.OverlayPositioner = OverlayPositioner;
// }