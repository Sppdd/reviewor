/**
 * Tests for OverlayPositioner class
 */

// Mock DOM environment for testing
const mockElement = (rect) => ({
    getBoundingClientRect: () => rect,
    style: {},
    classList: {
        remove: jest.fn(),
        add: jest.fn()
    },
    setAttribute: jest.fn(),
    removeAttribute: jest.fn()
});

const mockWindow = (viewport) => {
    global.window = {
        pageXOffset: 0,
        pageYOffset: 0,
        innerWidth: viewport.width,
        innerHeight: viewport.height,
        addEventListener: jest.fn(),
        requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16))
    };
    
    global.document = {
        documentElement: {
            scrollLeft: 0,
            scrollTop: 0,
            clientWidth: viewport.width,
            clientHeight: viewport.height
        },
        contains: jest.fn(() => true)
    };
};

// Import after mocking
const OverlayPositioner = require('../OverlayPositioner');

describe('OverlayPositioner', () => {
    let positioner;
    
    beforeEach(() => {
        mockWindow({ width: 1024, height: 768 });
        positioner = new OverlayPositioner();
    });
    
    afterEach(() => {
        if (positioner) {
            positioner.destroy();
        }
    });
    
    describe('getElementRect', () => {
        it('should calculate element rectangle with scroll offset', () => {
            const element = mockElement({
                left: 100,
                top: 50,
                width: 200,
                height: 100,
                right: 300,
                bottom: 150
            });
            
            const rect = positioner.getElementRect(element);
            
            expect(rect).toEqual({
                x: 100,
                y: 50,
                width: 200,
                height: 100,
                top: 50,
                right: 300,
                bottom: 150,
                left: 100
            });
        });
    });
    
    describe('getViewportRect', () => {
        it('should return viewport dimensions', () => {
            const viewport = positioner.getViewportRect();
            
            expect(viewport).toEqual({
                x: 0,
                y: 0,
                width: 1024,
                height: 768,
                top: 0,
                right: 1024,
                bottom: 768,
                left: 0
            });
        });
    });
    
    describe('calculateInitialPosition', () => {
        const referenceRect = {
            x: 100,
            y: 100,
            width: 100,
            height: 50
        };
        
        const floatingRect = {
            width: 200,
            height: 100
        };
        
        it('should position element on top', () => {
            const position = positioner.calculateInitialPosition(
                referenceRect,
                floatingRect,
                { placement: 'top', offset: 8 }
            );
            
            expect(position).toEqual({
                x: 50, // centered horizontally
                y: -8, // above with offset
                placement: 'top'
            });
        });
        
        it('should position element on bottom', () => {
            const position = positioner.calculateInitialPosition(
                referenceRect,
                floatingRect,
                { placement: 'bottom', offset: 8 }
            );
            
            expect(position).toEqual({
                x: 50, // centered horizontally
                y: 158, // below with offset (100 + 50 + 8)
                placement: 'bottom'
            });
        });
        
        it('should position element on left', () => {
            const position = positioner.calculateInitialPosition(
                referenceRect,
                floatingRect,
                { placement: 'left', offset: 8 }
            );
            
            expect(position).toEqual({
                x: -108, // left with offset (100 - 200 - 8)
                y: 75, // centered vertically
                placement: 'left'
            });
        });
        
        it('should position element on right', () => {
            const position = positioner.calculateInitialPosition(
                referenceRect,
                floatingRect,
                { placement: 'right', offset: 8 }
            );
            
            expect(position).toEqual({
                x: 208, // right with offset (100 + 100 + 8)
                y: 75, // centered vertically
                placement: 'right'
            });
        });
    });
    
    describe('detectOverflows', () => {
        const boundary = {
            top: 0,
            right: 1024,
            bottom: 768,
            left: 0
        };
        
        const floatingRect = {
            width: 200,
            height: 100
        };
        
        it('should detect no overflows for centered position', () => {
            const overflows = positioner.detectOverflows(400, 300, floatingRect, boundary);
            
            expect(overflows).toEqual({
                top: false,
                right: false,
                bottom: false,
                left: false
            });
        });
        
        it('should detect top overflow', () => {
            const overflows = positioner.detectOverflows(400, -50, floatingRect, boundary);
            
            expect(overflows.top).toBe(true);
        });
        
        it('should detect right overflow', () => {
            const overflows = positioner.detectOverflows(900, 300, floatingRect, boundary);
            
            expect(overflows.right).toBe(true);
        });
        
        it('should detect bottom overflow', () => {
            const overflows = positioner.detectOverflows(400, 700, floatingRect, boundary);
            
            expect(overflows.bottom).toBe(true);
        });
        
        it('should detect left overflow', () => {
            const overflows = positioner.detectOverflows(-50, 300, floatingRect, boundary);
            
            expect(overflows.left).toBe(true);
        });
    });
    
    describe('getFlippedPlacement', () => {
        it('should flip vertical placements', () => {
            expect(positioner.getFlippedPlacement('top')).toBe('bottom');
            expect(positioner.getFlippedPlacement('bottom')).toBe('top');
            expect(positioner.getFlippedPlacement('top-start')).toBe('bottom-start');
            expect(positioner.getFlippedPlacement('bottom-end')).toBe('top-end');
        });
        
        it('should flip horizontal placements', () => {
            expect(positioner.getFlippedPlacement('left')).toBe('right');
            expect(positioner.getFlippedPlacement('right')).toBe('left');
            expect(positioner.getFlippedPlacement('left-start')).toBe('right-start');
            expect(positioner.getFlippedPlacement('right-end')).toBe('left-end');
        });
    });
    
    describe('getResponsivePlacement', () => {
        it('should adjust placement for mobile', () => {
            mockWindow({ width: 600, height: 800 });
            positioner = new OverlayPositioner();
            
            expect(positioner.getResponsivePlacement('top')).toBe('bottom');
            expect(positioner.getResponsivePlacement('left')).toBe('bottom');
            expect(positioner.getResponsivePlacement('right')).toBe('bottom');
        });
        
        it('should simplify placement for tablet', () => {
            mockWindow({ width: 800, height: 600 });
            positioner = new OverlayPositioner();
            
            expect(positioner.getResponsivePlacement('top-start')).toBe('top');
            expect(positioner.getResponsivePlacement('bottom-end')).toBe('bottom');
        });
        
        it('should keep placement for desktop', () => {
            expect(positioner.getResponsivePlacement('top-start')).toBe('top-start');
            expect(positioner.getResponsivePlacement('left-end')).toBe('left-end');
        });
    });
    
    describe('position', () => {
        it('should position element and track it', () => {
            const floatingElement = mockElement({ width: 200, height: 100 });
            const referenceElement = mockElement({
                left: 100,
                top: 100,
                width: 100,
                height: 50,
                right: 200,
                bottom: 150
            });
            
            const result = positioner.position(floatingElement, referenceElement, {
                placement: 'top',
                offset: 8
            });
            
            expect(result.x).toBeDefined();
            expect(result.y).toBeDefined();
            expect(result.placement).toBe('top');
            expect(positioner.activeElements.has(floatingElement)).toBe(true);
        });
    });
    
    describe('isElementInViewport', () => {
        it('should detect element in viewport', () => {
            const element = mockElement({
                top: 100,
                left: 100,
                bottom: 200,
                right: 200
            });
            
            expect(positioner.isElementInViewport(element)).toBe(true);
        });
        
        it('should detect element outside viewport', () => {
            const element = mockElement({
                top: -100,
                left: -100,
                bottom: -50,
                right: -50
            });
            
            expect(positioner.isElementInViewport(element)).toBe(false);
        });
    });
});