/**
 * StatusWidget Tests
 */

import StatusWidget from '../StatusWidget.js';
import StatusUpdater from '../StatusUpdater.js';

describe('StatusWidget', () => {
  let widget;
  let mockDocument;

  beforeEach(() => {
    // Mock DOM environment
    global.document = {
      createElement: jest.fn(() => ({
        className: '',
        innerHTML: '',
        style: {},
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn()
        },
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })),
      head: {
        appendChild: jest.fn()
      },
      body: {
        appendChild: jest.fn()
      },
      getElementById: jest.fn()
    };

    global.window = {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

    widget = new StatusWidget();
  });

  afterEach(() => {
    if (widget) {
      widget.destroy();
    }
  });

  test('should create widget with correct structure', () => {
    expect(widget.widget).toBeDefined();
    expect(widget.isVisible).toBe(false);
    expect(widget.isExpanded).toBe(false);
    expect(widget.position).toBe('bottom-right');
  });

  test('should show and hide widget', () => {
    widget.show();
    expect(widget.isVisible).toBe(true);
    
    widget.hide();
    // Note: hide() is async, so we can't immediately check isVisible
    expect(widget.widget.classList.add).toHaveBeenCalledWith('exiting');
  });

  test('should update status correctly', () => {
    const status = {
      isActive: true,
      isAnalyzing: false,
      errorCount: 5,
      warningCount: 3,
      suggestionCount: 2
    };

    widget.updateStatus(status);
    expect(widget.currentStatus.errorCount).toBe(5);
    expect(widget.currentStatus.warningCount).toBe(3);
    expect(widget.currentStatus.suggestionCount).toBe(2);
  });

  test('should set position correctly', () => {
    widget.setPosition('top-left');
    expect(widget.position).toBe('top-left');
    
    // Invalid position should default to bottom-right
    widget.setPosition('invalid-position');
    expect(widget.position).toBe('bottom-right');
  });

  test('should expand and collapse', () => {
    widget.expand();
    expect(widget.isExpanded).toBe(true);
    
    widget.collapse();
    // collapse() is async, so we can't immediately check isExpanded
    expect(widget.widget.querySelector).toHaveBeenCalled();
  });
});

describe('StatusUpdater', () => {
  let updater;
  let mockWidget;

  beforeEach(() => {
    mockWidget = {
      updateStatus: jest.fn()
    };

    updater = new StatusUpdater(mockWidget);
  });

  afterEach(() => {
    if (updater) {
      updater.destroy();
    }
  });

  test('should register and unregister fields', () => {
    const mockElement = { id: 'test-field' };
    
    updater.registerField('field1', mockElement);
    expect(updater.activeFields.has('field1')).toBe(true);
    
    updater.unregisterField('field1');
    expect(updater.activeFields.has('field1')).toBe(false);
  });

  test('should track analysis lifecycle', () => {
    const mockElement = { id: 'test-field' };
    updater.registerField('field1', mockElement);
    
    // Start analysis
    updater.onAnalysisStart('field1', 1000);
    const fieldStatus = updater.getFieldStatus('field1');
    expect(fieldStatus.isAnalyzing).toBe(true);
    
    // Complete analysis
    const analysisResult = {
      issues: [
        { severity: 'error', type: 'grammar' },
        { severity: 'warning', type: 'style' },
        { severity: 'suggestion', type: 'clarity' }
      ]
    };
    
    updater.onAnalysisComplete('field1', analysisResult);
    const updatedStatus = updater.getFieldStatus('field1');
    expect(updatedStatus.isAnalyzing).toBe(false);
    expect(updatedStatus.errorCount).toBe(1);
    expect(updatedStatus.warningCount).toBe(1);
    expect(updatedStatus.suggestionCount).toBe(1);
  });

  test('should calculate global status correctly', () => {
    const mockElement1 = { id: 'field1' };
    const mockElement2 = { id: 'field2' };
    
    updater.registerField('field1', mockElement1);
    updater.registerField('field2', mockElement2);
    
    // Add issues to field1
    updater.onAnalysisComplete('field1', {
      issues: [
        { severity: 'error', type: 'grammar' },
        { severity: 'warning', type: 'style' }
      ]
    });
    
    // Add issues to field2
    updater.onAnalysisComplete('field2', {
      issues: [
        { severity: 'error', type: 'spelling' },
        { severity: 'suggestion', type: 'clarity' }
      ]
    });
    
    const globalStatus = updater.getGlobalStatus();
    expect(globalStatus.totalErrorCount).toBe(2);
    expect(globalStatus.totalWarningCount).toBe(1);
    expect(globalStatus.totalSuggestionCount).toBe(1);
  });

  test('should handle issue resolution', () => {
    const mockElement = { id: 'test-field' };
    updater.registerField('field1', mockElement);
    
    const analysisResult = {
      issues: [
        { id: 'issue1', severity: 'error', type: 'grammar' },
        { id: 'issue2', severity: 'warning', type: 'style' }
      ]
    };
    
    updater.onAnalysisComplete('field1', analysisResult);
    
    // Resolve one issue
    updater.onIssueResolved('field1', 'issue1');
    
    const fieldStatus = updater.getFieldStatus('field1');
    expect(fieldStatus.issues.length).toBe(1);
    expect(fieldStatus.errorCount).toBe(0);
    expect(fieldStatus.warningCount).toBe(1);
  });

  test('should provide performance metrics', () => {
    const mockElement = { id: 'test-field' };
    updater.registerField('field1', mockElement);
    
    const metrics = updater.getPerformanceMetrics();
    expect(metrics.totalFields).toBe(1);
    expect(metrics.activeFields).toBe(0); // Not set as active
    expect(metrics.analyzingFields).toBe(0);
    expect(typeof metrics.memoryUsage).toBe('number');
  });
});