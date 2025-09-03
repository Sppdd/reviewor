/**
 * AnalysisEngine - Integrated text analysis system
 * Combines TextAnalyzer, IssueDetector, and AnalysisCache
 * Provides a unified interface for grammar and writing analysis
 */

// Import dependencies if available
if (typeof window !== 'undefined') {
  // Browser environment - dependencies should be loaded via script tags
  if (!window.TextAnalyzer || !window.IssueDetector || !window.AnalysisCache) {
    console.warn('AnalysisEngine: Required dependencies not loaded');
  }
} else if (typeof require !== 'undefined') {
  // Node.js environment - require dependencies
  try {
    const TextAnalyzer = require('./TextAnalyzer.js');
    const IssueDetector = require('./IssueDetector.js');
    const AnalysisCache = require('./AnalysisCache.js');
  } catch (e) {
    console.warn('AnalysisEngine: Could not load dependencies:', e.message);
  }
}

class AnalysisEngine {
  constructor(options = {}) {
    // Initialize components
    this.textAnalyzer = new TextAnalyzer();
    this.issueDetector = new IssueDetector();
    this.analysisCache = new AnalysisCache({
      maxSize: options.cacheSize || 100,
      maxAge: options.cacheAge || 30 * 60 * 1000, // 30 minutes
      enablePersistence: options.enableCaching !== false
    });

    // Configuration
    this.config = {
      enableCache: options.enableCache !== false,
      enableRealTimeAnalysis: options.enableRealTimeAnalysis !== false,
      analysisDelay: options.analysisDelay || 500,
      maxTextLength: options.maxTextLength || 10000,
      ...options
    };

    // State management
    this.activeAnalyses = new Map();
    this.analysisQueue = [];
    this.isProcessing = false;

    // Statistics
    this.stats = {
      totalAnalyses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageAnalysisTime: 0,
      totalIssuesFound: 0
    };

    // Bind methods
    this.analyze = this.analyze.bind(this);
    this.analyzeRealTime = this.analyzeRealTime.bind(this);
  }

  /**
   * Analyze text for grammar and writing issues
   * @param {string} text - Text to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async analyze(text, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }

      if (text.length > this.config.maxTextLength) {
        throw new Error(`Text too long (max ${this.config.maxTextLength} characters)`);
      }

      // Generate cache key
      const cacheKey = this.analysisCache.generateKey(text, options);

      // Check cache first
      if (this.config.enableCache) {
        const cachedResult = this.analysisCache.get(cacheKey);
        if (cachedResult) {
          this.stats.cacheHits++;
          return this.enrichResult(cachedResult, { fromCache: true });
        }
        this.stats.cacheMisses++;
      }

      // Perform analysis
      const analysisResult = await this.performAnalysis(text, options);

      // Cache the result
      if (this.config.enableCache) {
        this.analysisCache.set(cacheKey, analysisResult, {
          ttl: options.cacheTtl || this.analysisCache.maxAge
        });
      }

      // Update statistics
      this.updateStats(analysisResult, Date.now() - startTime);

      return this.enrichResult(analysisResult, { fromCache: false });

    } catch (error) {
      console.error('AnalysisEngine: Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Real-time analysis with debouncing
   * @param {string} text - Text to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeRealTime(text, options = {}) {
    if (!this.config.enableRealTimeAnalysis) {
      return this.analyze(text, options);
    }

    const analysisId = options.analysisId || `realtime_${Date.now()}`;
    
    // Cancel previous analysis for this ID
    if (this.activeAnalyses.has(analysisId)) {
      clearTimeout(this.activeAnalyses.get(analysisId).timeout);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          const result = await this.analyze(text, options);
          this.activeAnalyses.delete(analysisId);
          resolve(result);
        } catch (error) {
          this.activeAnalyses.delete(analysisId);
          reject(error);
        }
      }, this.config.analysisDelay);

      this.activeAnalyses.set(analysisId, {
        timeout,
        text,
        options,
        resolve,
        reject
      });
    });
  }

  /**
   * Perform the actual analysis using TextAnalyzer and IssueDetector
   * @param {string} text - Text to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async performAnalysis(text, options) {
    // Use TextAnalyzer to get raw analysis
    const rawResult = await this.textAnalyzer.analyzeText(text, options);

    // Process issues with IssueDetector
    const processedIssues = [];
    
    if (rawResult.issues && rawResult.issues.length > 0) {
      for (const issue of rawResult.issues) {
        // If the issue is already processed, use it as-is
        if (issue.id && issue.type && issue.severity) {
          processedIssues.push(issue);
        } else {
          // Otherwise, process it through IssueDetector
          const detectedIssues = this.issueDetector.parseIssues(
            issue.message || JSON.stringify(issue),
            text,
            { originalIssue: issue }
          );
          processedIssues.push(...detectedIssues);
        }
      }
    }

    // Generate enhanced suggestions
    const suggestions = this.generateEnhancedSuggestions(processedIssues, text);

    // Calculate analysis metadata
    const metadata = {
      ...rawResult.metadata,
      analysisEngine: 'AnalysisEngine',
      version: '1.0.0',
      timestamp: Date.now(),
      processingTime: 0, // Will be set by caller
      issueStats: this.issueDetector.getIssueStatistics(processedIssues)
    };

    return {
      issues: processedIssues,
      suggestions: suggestions,
      metadata: metadata,
      originalText: text
    };
  }

  /**
   * Generate enhanced suggestions based on detected issues
   * @param {Array} issues - Detected issues
   * @param {string} text - Original text
   * @returns {Array} Enhanced suggestions
   */
  generateEnhancedSuggestions(issues, text) {
    const suggestions = [];

    // Group issues by type for better suggestions
    const issuesByType = issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {});

    // Generate type-specific suggestions
    Object.entries(issuesByType).forEach(([type, typeIssues]) => {
      const suggestion = this.createTypeSuggestion(type, typeIssues, text);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });

    // Generate individual issue suggestions
    issues.forEach(issue => {
      if (issue.suggestions && issue.suggestions.length > 0) {
        const rankedSuggestions = this.issueDetector.rankSuggestions(
          issue.suggestions,
          issue
        );
        
        suggestions.push({
          id: `suggestion_${issue.id}`,
          type: 'individual',
          issueId: issue.id,
          message: `Consider: ${rankedSuggestions[0]}`,
          suggestions: rankedSuggestions,
          confidence: issue.confidence || 0.5,
          priority: this.calculateSuggestionPriority(issue)
        });
      }
    });

    // Sort suggestions by priority
    return suggestions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Create type-specific suggestion
   * @param {string} type - Issue type
   * @param {Array} issues - Issues of this type
   * @param {string} text - Original text
   * @returns {Object|null} Type suggestion
   */
  createTypeSuggestion(type, issues, text) {
    if (issues.length === 0) return null;

    const typeMessages = {
      grammar: `Found ${issues.length} grammar issue${issues.length > 1 ? 's' : ''}`,
      spelling: `Found ${issues.length} spelling error${issues.length > 1 ? 's' : ''}`,
      style: `Found ${issues.length} style suggestion${issues.length > 1 ? 's' : ''}`,
      clarity: `Found ${issues.length} clarity issue${issues.length > 1 ? 's' : ''}`,
      punctuation: `Found ${issues.length} punctuation issue${issues.length > 1 ? 's' : ''}`
    };

    return {
      id: `type_${type}_${Date.now()}`,
      type: 'summary',
      issueType: type,
      message: typeMessages[type] || `Found ${issues.length} ${type} issue${issues.length > 1 ? 's' : ''}`,
      count: issues.length,
      severity: this.calculateTypeSeverity(issues),
      priority: this.calculateTypePriority(type, issues)
    };
  }

  /**
   * Calculate suggestion priority
   * @param {Object} issue - Issue object
   * @returns {number} Priority score
   */
  calculateSuggestionPriority(issue) {
    let priority = 0;

    // Base priority on severity
    const severityScores = {
      error: 3,
      warning: 2,
      suggestion: 1
    };
    priority += severityScores[issue.severity] || 1;

    // Boost priority for high-confidence issues
    priority += (issue.confidence || 0) * 2;

    // Boost priority for issues with good suggestions
    if (issue.suggestions && issue.suggestions.length > 0) {
      priority += 1;
    }

    return priority;
  }

  /**
   * Calculate type-level severity
   * @param {Array} issues - Issues of a type
   * @returns {string} Overall severity
   */
  calculateTypeSeverity(issues) {
    const severityScores = { error: 3, warning: 2, suggestion: 1 };
    const maxSeverity = Math.max(...issues.map(issue => 
      severityScores[issue.severity] || 1
    ));

    const severityMap = { 3: 'error', 2: 'warning', 1: 'suggestion' };
    return severityMap[maxSeverity] || 'suggestion';
  }

  /**
   * Calculate type-level priority
   * @param {string} type - Issue type
   * @param {Array} issues - Issues of this type
   * @returns {number} Priority score
   */
  calculateTypePriority(type, issues) {
    const typePriorities = {
      grammar: 5,
      spelling: 4,
      punctuation: 3,
      clarity: 2,
      style: 1
    };

    const basePriority = typePriorities[type] || 1;
    const countMultiplier = Math.min(issues.length / 5, 2); // Cap at 2x
    
    return basePriority * (1 + countMultiplier);
  }

  /**
   * Enrich analysis result with additional metadata
   * @param {Object} result - Analysis result
   * @param {Object} context - Additional context
   * @returns {Object} Enriched result
   */
  enrichResult(result, context = {}) {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        ...context,
        engineStats: this.getEngineStats()
      }
    };
  }

  /**
   * Update analysis statistics
   * @param {Object} result - Analysis result
   * @param {number} processingTime - Time taken for analysis
   */
  updateStats(result, processingTime) {
    this.stats.totalAnalyses++;
    this.stats.totalIssuesFound += result.issues ? result.issues.length : 0;
    
    // Update average processing time
    const totalTime = this.stats.averageAnalysisTime * (this.stats.totalAnalyses - 1) + processingTime;
    this.stats.averageAnalysisTime = totalTime / this.stats.totalAnalyses;

    // Update result metadata
    if (result.metadata) {
      result.metadata.processingTime = processingTime;
    }
  }

  /**
   * Get engine statistics
   * @returns {Object} Engine statistics
   */
  getEngineStats() {
    return {
      ...this.stats,
      cacheStats: this.analysisCache.getStats(),
      activeAnalyses: this.activeAnalyses.size,
      queueSize: this.analysisQueue.length
    };
  }

  /**
   * Invalidate cache for similar text
   * @param {string} text - Text that has changed
   * @param {number} threshold - Similarity threshold
   */
  invalidateCache(text, threshold = 0.8) {
    this.analysisCache.invalidateByText(text, threshold);
  }

  /**
   * Clear all caches and reset state
   */
  reset() {
    this.analysisCache.clear();
    this.activeAnalyses.clear();
    this.analysisQueue = [];
    this.stats = {
      totalAnalyses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageAnalysisTime: 0,
      totalIssuesFound: 0
    };
  }

  /**
   * Configure the analysis engine
   * @param {Object} newConfig - New configuration options
   */
  configure(newConfig) {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Destroy the analysis engine and cleanup resources
   */
  destroy() {
    // Cancel all active analyses
    for (const analysis of this.activeAnalyses.values()) {
      if (analysis.timeout) {
        clearTimeout(analysis.timeout);
      }
    }
    this.activeAnalyses.clear();

    // Cleanup components
    if (this.analysisCache && typeof this.analysisCache.destroy === 'function') {
      this.analysisCache.destroy();
    }

    // Clear references
    this.textAnalyzer = null;
    this.issueDetector = null;
    this.analysisCache = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalysisEngine;
} else if (typeof window !== 'undefined') {
  window.AnalysisEngine = AnalysisEngine;
}