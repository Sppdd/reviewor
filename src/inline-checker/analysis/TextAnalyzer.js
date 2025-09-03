/**
 * TextAnalyzer - Coordinates text analysis requests with LLM providers
 * Integrates with existing background.js LLM provider system
 * Handles text chunking, request queuing, and rate limiting
 */

// Import dependencies if available
if (typeof window !== 'undefined' && window.IssueDetector) {
  // Browser environment - dependencies loaded via script tags
} else if (typeof require !== 'undefined') {
  // Node.js environment - require dependencies
  try {
    const IssueDetector = require('./IssueDetector.js');
  } catch (e) {
    // Dependencies not available, will be loaded separately
  }
}

class TextAnalyzer {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.maxChunkSize = 1000;
    this.analysisCache = new Map();
    this.rateLimiter = this.createRateLimiter();
  }

  /**
   * Analyze text for grammar and writing issues
   * @param {string} text - Text to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<AnalysisResult>}
   */
  async analyzeText(text, options = {}) {
    if (!text || text.trim().length === 0) {
      return { issues: [], suggestions: [], metadata: { textLength: 0, chunks: 0 } };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(text, options);
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    try {
      // Chunk text if it's too large
      const chunks = this.chunkText(text);
      const chunkResults = [];

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkResult = await this.analyzeTextChunk(chunk, {
          ...options,
          chunkIndex: i,
          totalChunks: chunks.length,
          originalText: text
        });
        chunkResults.push(chunkResult);
      }

      // Combine results from all chunks
      const combinedResult = this.combineChunkResults(chunkResults, text);
      
      // Cache the result
      this.analysisCache.set(cacheKey, combinedResult);
      
      return combinedResult;
    } catch (error) {
      console.error('TextAnalyzer: Error analyzing text:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze a single text chunk
   * @param {string} chunk - Text chunk to analyze
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>}
   */
  async analyzeTextChunk(chunk, context = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        chunk,
        context,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  /**
   * Process the analysis request queue with rate limiting
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift();
        
        try {
          // Apply rate limiting
          await this.rateLimiter();
          
          // Perform the actual analysis
          const result = await this.performChunkAnalysis(request.chunk, request.context);
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Perform analysis on a text chunk using the existing LLM provider system
   * @param {string} chunk - Text chunk to analyze
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>}
   */
  async performChunkAnalysis(chunk, context) {
    // Create analysis prompt for grammar checking
    const analysisPrompt = this.createAnalysisPrompt(chunk, context);
    
    try {
      // Use the existing background.js LLM system
      const response = await this.sendAnalysisRequest(analysisPrompt);
      
      // Parse the LLM response into structured issues
      return this.parseAnalysisResponse(response, chunk, context);
    } catch (error) {
      console.error('TextAnalyzer: Chunk analysis failed:', error);
      throw error;
    }
  }

  /**
   * Create analysis prompt for LLM
   * @param {string} text - Text to analyze
   * @param {Object} context - Analysis context
   * @returns {string}
   */
  createAnalysisPrompt(text, context) {
    const basePrompt = `Analyze the following text for grammar, spelling, style, and clarity issues. 
Return your response as a JSON object with this exact structure:
{
  "issues": [
    {
      "type": "grammar|spelling|style|clarity",
      "severity": "error|warning|suggestion", 
      "startIndex": number,
      "endIndex": number,
      "message": "description of the issue",
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ]
}

Text to analyze: "${text}"

Important: Return ONLY the JSON object, no additional text or explanations.`;

    return basePrompt;
  }

  /**
   * Send analysis request to background script LLM system
   * @param {string} prompt - Analysis prompt
   * @returns {Promise<string>}
   */
  async sendAnalysisRequest(prompt) {
    return new Promise((resolve, reject) => {
      // Send message to background script to use existing LLM system
      chrome.runtime.sendMessage({
        action: 'enhanceText',
        promptId: 'analyze_grammar', // We'll need to add this to background.js
        selectedText: prompt
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.enhancedText);
        } else {
          reject(new Error(response?.error || 'Analysis request failed'));
        }
      });
    });
  }

  /**
   * Parse LLM response into structured analysis result
   * @param {string} response - LLM response
   * @param {string} originalChunk - Original text chunk
   * @param {Object} context - Analysis context
   * @returns {Object}
   */
  parseAnalysisResponse(response, originalChunk, context) {
    try {
      // Try to extract JSON from response
      let jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback: try to parse the entire response as JSON
        jsonMatch = [response];
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the response
      const issues = (analysisData.issues || []).map(issue => ({
        id: this.generateIssueId(),
        type: issue.type || 'grammar',
        severity: issue.severity || 'warning',
        startIndex: Math.max(0, issue.startIndex || 0),
        endIndex: Math.min(originalChunk.length, issue.endIndex || 0),
        message: issue.message || 'Issue detected',
        suggestions: Array.isArray(issue.suggestions) ? issue.suggestions : [],
        originalText: originalChunk.substring(issue.startIndex, issue.endIndex),
        chunkIndex: context.chunkIndex || 0
      }));

      return {
        issues,
        chunkIndex: context.chunkIndex || 0,
        chunkText: originalChunk
      };
    } catch (error) {
      console.warn('TextAnalyzer: Failed to parse LLM response as JSON:', error);
      
      // Fallback: create a generic issue if parsing fails
      return {
        issues: [],
        chunkIndex: context.chunkIndex || 0,
        chunkText: originalChunk,
        parseError: true
      };
    }
  }

  /**
   * Chunk text into manageable pieces for analysis
   * @param {string} text - Text to chunk
   * @returns {Array<string>}
   */
  chunkText(text) {
    if (text.length <= this.maxChunkSize) {
      return [text];
    }

    const chunks = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let endIndex = currentIndex + this.maxChunkSize;
      
      // Try to break at sentence boundaries
      if (endIndex < text.length) {
        const sentenceEnd = text.lastIndexOf('.', endIndex);
        const questionEnd = text.lastIndexOf('?', endIndex);
        const exclamationEnd = text.lastIndexOf('!', endIndex);
        
        const bestEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
        if (bestEnd > currentIndex + this.maxChunkSize * 0.7) {
          endIndex = bestEnd + 1;
        }
      }

      chunks.push(text.substring(currentIndex, endIndex));
      currentIndex = endIndex;
    }

    return chunks;
  }

  /**
   * Combine results from multiple chunks
   * @param {Array} chunkResults - Results from individual chunks
   * @param {string} originalText - Original full text
   * @returns {Object}
   */
  combineChunkResults(chunkResults, originalText) {
    const allIssues = [];
    let currentOffset = 0;

    chunkResults.forEach((chunkResult, index) => {
      if (chunkResult.issues) {
        chunkResult.issues.forEach(issue => {
          // Adjust indices to account for chunk position in original text
          const adjustedIssue = {
            ...issue,
            startIndex: issue.startIndex + currentOffset,
            endIndex: issue.endIndex + currentOffset,
            originalText: originalText.substring(
              issue.startIndex + currentOffset,
              issue.endIndex + currentOffset
            )
          };
          allIssues.push(adjustedIssue);
        });
      }
      
      // Update offset for next chunk
      if (chunkResult.chunkText) {
        currentOffset += chunkResult.chunkText.length;
      }
    });

    return {
      issues: allIssues,
      suggestions: this.generateSuggestions(allIssues),
      metadata: {
        textLength: originalText.length,
        chunks: chunkResults.length,
        totalIssues: allIssues.length,
        analysisTimestamp: Date.now()
      }
    };
  }

  /**
   * Generate suggestions based on detected issues
   * @param {Array} issues - Detected issues
   * @returns {Array}
   */
  generateSuggestions(issues) {
    const suggestions = [];
    
    // Group issues by type for summary suggestions
    const issuesByType = issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {});

    Object.entries(issuesByType).forEach(([type, typeIssues]) => {
      if (typeIssues.length > 0) {
        suggestions.push({
          id: this.generateIssueId(),
          type: 'summary',
          message: `Found ${typeIssues.length} ${type} issue${typeIssues.length > 1 ? 's' : ''}`,
          count: typeIssues.length,
          issueType: type
        });
      }
    });

    return suggestions;
  }

  /**
   * Generate cache key for analysis results
   * @param {string} text - Text content
   * @param {Object} options - Analysis options
   * @returns {string}
   */
  generateCacheKey(text, options) {
    const optionsStr = JSON.stringify(options);
    return `${this.hashString(text)}_${this.hashString(optionsStr)}`;
  }

  /**
   * Generate unique issue ID
   * @returns {string}
   */
  generateIssueId() {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {string}
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Create rate limiter to prevent API overuse
   * @returns {Function}
   */
  createRateLimiter() {
    const maxRequests = 10;
    const timeWindow = 60000; // 1 minute
    const requests = [];

    return () => {
      return new Promise((resolve) => {
        const now = Date.now();
        
        // Remove old requests outside the time window
        while (requests.length > 0 && requests[0] < now - timeWindow) {
          requests.shift();
        }

        if (requests.length < maxRequests) {
          requests.push(now);
          resolve();
        } else {
          // Wait until we can make another request
          const oldestRequest = requests[0];
          const waitTime = (oldestRequest + timeWindow) - now;
          setTimeout(() => {
            requests.push(Date.now());
            resolve();
          }, waitTime);
        }
      });
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return {
      size: this.analysisCache.size,
      maxSize: 100, // We could make this configurable
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextAnalyzer;
} else if (typeof window !== 'undefined') {
  window.TextAnalyzer = TextAnalyzer;
}