/**
 * StatusUpdater - Manages real-time status updates for the StatusWidget
 * Handles error count tracking, issue breakdown, and analysis progress
 */
class StatusUpdater {
  constructor(statusWidget) {
    this.statusWidget = statusWidget;
    this.activeFields = new Map(); // fieldId -> fieldStatus
    this.globalStatus = {
      isActive: false,
      isAnalyzing: false,
      totalErrorCount: 0,
      totalWarningCount: 0,
      totalSuggestionCount: 0,
      breakdown: {
        grammar: 0,
        spelling: 0,
        style: 0,
        clarity: 0,
        tone: 0
      },
      analysisProgress: {
        completed: 0,
        total: 0,
        currentField: null
      }
    };
    
    this.updateInterval = null;
    this.debounceTimeout = null;
    this.isDestroyed = false;
    
    this.startRealTimeUpdates();
  }

  /**
   * Register a text field for status tracking
   */
  registerField(fieldId, element) {
    if (this.isDestroyed) return;

    const fieldStatus = {
      id: fieldId,
      element: element,
      isActive: false,
      isAnalyzing: false,
      lastAnalyzed: null,
      issues: [],
      errorCount: 0,
      warningCount: 0,
      suggestionCount: 0,
      breakdown: {
        grammar: 0,
        spelling: 0,
        style: 0,
        clarity: 0,
        tone: 0
      }
    };

    this.activeFields.set(fieldId, fieldStatus);
    this.updateGlobalStatus();
    
    console.log(`StatusUpdater: Registered field ${fieldId}`);
  }

  /**
   * Unregister a text field from status tracking
   */
  unregisterField(fieldId) {
    if (this.isDestroyed) return;

    if (this.activeFields.has(fieldId)) {
      this.activeFields.delete(fieldId);
      this.updateGlobalStatus();
      console.log(`StatusUpdater: Unregistered field ${fieldId}`);
    }
  }

  /**
   * Update field status when analysis starts
   */
  onAnalysisStart(fieldId, textLength = 0) {
    if (this.isDestroyed) return;

    const fieldStatus = this.activeFields.get(fieldId);
    if (!fieldStatus) return;

    fieldStatus.isAnalyzing = true;
    fieldStatus.isActive = true;
    
    // Update analysis progress
    this.globalStatus.analysisProgress.currentField = fieldId;
    this.globalStatus.analysisProgress.total = Math.max(1, Math.ceil(textLength / 1000)); // Estimate chunks
    this.globalStatus.analysisProgress.completed = 0;

    this.updateGlobalStatus();
    console.log(`StatusUpdater: Analysis started for field ${fieldId}`);
  }

  /**
   * Update analysis progress for a field
   */
  onAnalysisProgress(fieldId, completed, total) {
    if (this.isDestroyed) return;

    const fieldStatus = this.activeFields.get(fieldId);
    if (!fieldStatus || !fieldStatus.isAnalyzing) return;

    this.globalStatus.analysisProgress.completed = completed;
    this.globalStatus.analysisProgress.total = total;

    this.updateGlobalStatus();
  }

  /**
   * Update field status when analysis completes
   */
  onAnalysisComplete(fieldId, analysisResult) {
    if (this.isDestroyed) return;

    const fieldStatus = this.activeFields.get(fieldId);
    if (!fieldStatus) return;

    fieldStatus.isAnalyzing = false;
    fieldStatus.lastAnalyzed = Date.now();
    fieldStatus.issues = analysisResult.issues || [];

    // Calculate issue counts by severity
    fieldStatus.errorCount = fieldStatus.issues.filter(issue => issue.severity === 'error').length;
    fieldStatus.warningCount = fieldStatus.issues.filter(issue => issue.severity === 'warning').length;
    fieldStatus.suggestionCount = fieldStatus.issues.filter(issue => issue.severity === 'suggestion').length;

    // Calculate breakdown by type
    fieldStatus.breakdown = {
      grammar: fieldStatus.issues.filter(issue => issue.type === 'grammar').length,
      spelling: fieldStatus.issues.filter(issue => issue.type === 'spelling').length,
      style: fieldStatus.issues.filter(issue => issue.type === 'style').length,
      clarity: fieldStatus.issues.filter(issue => issue.type === 'clarity').length,
      tone: fieldStatus.issues.filter(issue => issue.type === 'tone').length
    };

    // Reset analysis progress
    if (this.globalStatus.analysisProgress.currentField === fieldId) {
      this.globalStatus.analysisProgress.currentField = null;
      this.globalStatus.analysisProgress.completed = 0;
      this.globalStatus.analysisProgress.total = 0;
    }

    this.updateGlobalStatus();
    console.log(`StatusUpdater: Analysis completed for field ${fieldId}`, {
      errors: fieldStatus.errorCount,
      warnings: fieldStatus.warningCount,
      suggestions: fieldStatus.suggestionCount
    });
  }

  /**
   * Update field status when analysis fails
   */
  onAnalysisError(fieldId, error) {
    if (this.isDestroyed) return;

    const fieldStatus = this.activeFields.get(fieldId);
    if (!fieldStatus) return;

    fieldStatus.isAnalyzing = false;
    
    // Reset analysis progress
    if (this.globalStatus.analysisProgress.currentField === fieldId) {
      this.globalStatus.analysisProgress.currentField = null;
      this.globalStatus.analysisProgress.completed = 0;
      this.globalStatus.analysisProgress.total = 0;
    }

    this.updateGlobalStatus();
    console.warn(`StatusUpdater: Analysis failed for field ${fieldId}`, error);
  }

  /**
   * Set active field (when user focuses on a field)
   */
  setActiveField(fieldId) {
    if (this.isDestroyed) return;

    // Mark all fields as inactive
    this.activeFields.forEach(fieldStatus => {
      fieldStatus.isActive = false;
    });

    // Mark specified field as active
    const fieldStatus = this.activeFields.get(fieldId);
    if (fieldStatus) {
      fieldStatus.isActive = true;
    }

    this.updateGlobalStatus();
  }

  /**
   * Update global status based on all field statuses
   */
  updateGlobalStatus() {
    if (this.isDestroyed) return;

    // Clear debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Debounce updates to avoid excessive re-renders
    this.debounceTimeout = setTimeout(() => {
      this.calculateGlobalStatus();
      this.notifyStatusWidget();
    }, 100);
  }

  /**
   * Calculate global status from all field statuses
   */
  calculateGlobalStatus() {
    const fields = Array.from(this.activeFields.values());
    
    // Check if any field is active
    this.globalStatus.isActive = fields.some(field => field.isActive) || fields.length > 0;
    
    // Check if any field is analyzing
    this.globalStatus.isAnalyzing = fields.some(field => field.isAnalyzing);
    
    // Calculate total counts
    this.globalStatus.totalErrorCount = fields.reduce((sum, field) => sum + field.errorCount, 0);
    this.globalStatus.totalWarningCount = fields.reduce((sum, field) => sum + field.warningCount, 0);
    this.globalStatus.totalSuggestionCount = fields.reduce((sum, field) => sum + field.suggestionCount, 0);
    
    // Calculate breakdown totals
    this.globalStatus.breakdown = {
      grammar: fields.reduce((sum, field) => sum + field.breakdown.grammar, 0),
      spelling: fields.reduce((sum, field) => sum + field.breakdown.spelling, 0),
      style: fields.reduce((sum, field) => sum + field.breakdown.style, 0),
      clarity: fields.reduce((sum, field) => sum + field.breakdown.clarity, 0),
      tone: fields.reduce((sum, field) => sum + field.breakdown.tone, 0)
    };
  }

  /**
   * Notify the status widget of status changes
   */
  notifyStatusWidget() {
    if (this.isDestroyed || !this.statusWidget) return;

    const statusUpdate = {
      isActive: this.globalStatus.isActive,
      isAnalyzing: this.globalStatus.isAnalyzing,
      errorCount: this.globalStatus.totalErrorCount,
      warningCount: this.globalStatus.totalWarningCount,
      suggestionCount: this.globalStatus.totalSuggestionCount,
      breakdown: this.globalStatus.breakdown
    };

    this.statusWidget.updateStatus(statusUpdate);
  }

  /**
   * Start real-time status updates
   */
  startRealTimeUpdates() {
    if (this.isDestroyed) return;

    // Update every 2 seconds to ensure UI stays in sync
    this.updateInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.updateGlobalStatus();
      }
    }, 2000);
  }

  /**
   * Stop real-time status updates
   */
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  /**
   * Get current status for a specific field
   */
  getFieldStatus(fieldId) {
    return this.activeFields.get(fieldId) || null;
  }

  /**
   * Get global status summary
   */
  getGlobalStatus() {
    return { ...this.globalStatus };
  }

  /**
   * Get status summary for all fields
   */
  getAllFieldsStatus() {
    const fields = Array.from(this.activeFields.values());
    return fields.map(field => ({
      id: field.id,
      isActive: field.isActive,
      isAnalyzing: field.isAnalyzing,
      errorCount: field.errorCount,
      warningCount: field.warningCount,
      suggestionCount: field.suggestionCount,
      lastAnalyzed: field.lastAnalyzed
    }));
  }

  /**
   * Force immediate status update
   */
  forceUpdate() {
    if (this.isDestroyed) return;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    this.calculateGlobalStatus();
    this.notifyStatusWidget();
  }

  /**
   * Reset all status data
   */
  reset() {
    if (this.isDestroyed) return;

    this.activeFields.clear();
    this.globalStatus = {
      isActive: false,
      isAnalyzing: false,
      totalErrorCount: 0,
      totalWarningCount: 0,
      totalSuggestionCount: 0,
      breakdown: {
        grammar: 0,
        spelling: 0,
        style: 0,
        clarity: 0,
        tone: 0
      },
      analysisProgress: {
        completed: 0,
        total: 0,
        currentField: null
      }
    };

    this.updateGlobalStatus();
    console.log('StatusUpdater: Reset all status data');
  }

  /**
   * Update issue counts when issues are resolved/ignored
   */
  onIssueResolved(fieldId, issueId) {
    if (this.isDestroyed) return;

    const fieldStatus = this.activeFields.get(fieldId);
    if (!fieldStatus) return;

    // Find and remove the issue
    const issueIndex = fieldStatus.issues.findIndex(issue => issue.id === issueId);
    if (issueIndex === -1) return;

    const resolvedIssue = fieldStatus.issues[issueIndex];
    fieldStatus.issues.splice(issueIndex, 1);

    // Update counts
    if (resolvedIssue.severity === 'error') fieldStatus.errorCount--;
    if (resolvedIssue.severity === 'warning') fieldStatus.warningCount--;
    if (resolvedIssue.severity === 'suggestion') fieldStatus.suggestionCount--;

    // Update breakdown
    if (fieldStatus.breakdown[resolvedIssue.type] > 0) {
      fieldStatus.breakdown[resolvedIssue.type]--;
    }

    this.updateGlobalStatus();
    console.log(`StatusUpdater: Issue resolved in field ${fieldId}`, issueId);
  }

  /**
   * Batch update multiple issues (for performance)
   */
  batchUpdateIssues(fieldId, issues) {
    if (this.isDestroyed) return;

    const fieldStatus = this.activeFields.get(fieldId);
    if (!fieldStatus) return;

    fieldStatus.issues = issues || [];

    // Recalculate all counts
    fieldStatus.errorCount = fieldStatus.issues.filter(issue => issue.severity === 'error').length;
    fieldStatus.warningCount = fieldStatus.issues.filter(issue => issue.severity === 'warning').length;
    fieldStatus.suggestionCount = fieldStatus.issues.filter(issue => issue.severity === 'suggestion').length;

    fieldStatus.breakdown = {
      grammar: fieldStatus.issues.filter(issue => issue.type === 'grammar').length,
      spelling: fieldStatus.issues.filter(issue => issue.type === 'spelling').length,
      style: fieldStatus.issues.filter(issue => issue.type === 'style').length,
      clarity: fieldStatus.issues.filter(issue => issue.type === 'clarity').length,
      tone: fieldStatus.issues.filter(issue => issue.type === 'tone').length
    };

    this.updateGlobalStatus();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const fields = Array.from(this.activeFields.values());
    const now = Date.now();
    
    return {
      totalFields: fields.length,
      activeFields: fields.filter(f => f.isActive).length,
      analyzingFields: fields.filter(f => f.isAnalyzing).length,
      totalIssues: this.globalStatus.totalErrorCount + this.globalStatus.totalWarningCount + this.globalStatus.totalSuggestionCount,
      averageAnalysisAge: fields.length > 0 
        ? fields.reduce((sum, f) => sum + (f.lastAnalyzed ? now - f.lastAnalyzed : 0), 0) / fields.length 
        : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of stored data
   */
  estimateMemoryUsage() {
    let totalIssues = 0;
    this.activeFields.forEach(field => {
      totalIssues += field.issues.length;
    });
    
    // Rough estimate: each issue ~200 bytes, each field ~500 bytes
    return (totalIssues * 200) + (this.activeFields.size * 500);
  }

  /**
   * Destroy the status updater and clean up
   */
  destroy() {
    this.isDestroyed = true;
    this.stopRealTimeUpdates();
    this.activeFields.clear();
    this.statusWidget = null;
    
    console.log('StatusUpdater: Destroyed');
  }
}

export default StatusUpdater;