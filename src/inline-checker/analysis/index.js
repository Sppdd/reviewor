/**
 * Analysis Module Index
 * Loads and exports all text analysis components
 */

// Load components in dependency order
if (typeof importScripts === 'function') {
  // Service worker environment
  try {
    importScripts('AnalysisCache.js');
    importScripts('IssueDetector.js');
    importScripts('TextAnalyzer.js');
    importScripts('AnalysisEngine.js');
  } catch (error) {
    console.error('Failed to import analysis components:', error);
  }
} else if (typeof window !== 'undefined') {
  // Browser environment - components should be loaded via script tags
  // This file serves as a reference for the loading order
  console.log('Analysis components should be loaded in this order:');
  console.log('1. AnalysisCache.js');
  console.log('2. IssueDetector.js');
  console.log('3. TextAnalyzer.js');
  console.log('4. AnalysisEngine.js');
} else if (typeof module !== 'undefined') {
  // Node.js environment
  module.exports = {
    AnalysisCache: require('./AnalysisCache.js'),
    IssueDetector: require('./IssueDetector.js'),
    TextAnalyzer: require('./TextAnalyzer.js'),
    AnalysisEngine: require('./AnalysisEngine.js')
  };
}

// Export factory function for creating analysis engine
if (typeof window !== 'undefined') {
  window.createAnalysisEngine = function(options = {}) {
    if (!window.AnalysisEngine) {
      throw new Error('AnalysisEngine not loaded. Please load all analysis components first.');
    }
    return new window.AnalysisEngine(options);
  };
}