/**
 * IssueDetector - Identifies and classifies grammar and writing issues
 * Parses LLM responses and extracts structured issue data
 * Handles issue classification, severity assessment, and suggestion ranking
 */
class IssueDetector {
  constructor() {
    this.issueTypes = {
      GRAMMAR: 'grammar',
      SPELLING: 'spelling', 
      STYLE: 'style',
      CLARITY: 'clarity',
      PUNCTUATION: 'punctuation',
      WORD_CHOICE: 'word_choice',
      SENTENCE_STRUCTURE: 'sentence_structure'
    };

    this.severityLevels = {
      ERROR: 'error',
      WARNING: 'warning', 
      SUGGESTION: 'suggestion'
    };

    // Issue type patterns for fallback detection
    this.issuePatterns = {
      grammar: [
        /\b(subject.*verb.*agreement|verb.*tense|pronoun.*reference)\b/i,
        /\b(incorrect.*grammar|grammatical.*error)\b/i
      ],
      spelling: [
        /\b(misspelled|spelling.*error|incorrect.*spelling)\b/i,
        /\b(typo|typographical.*error)\b/i
      ],
      punctuation: [
        /\b(comma.*splice|missing.*comma|semicolon|apostrophe)\b/i,
        /\b(punctuation.*error|incorrect.*punctuation)\b/i
      ],
      style: [
        /\b(passive.*voice|word.*choice|redundant|wordy)\b/i,
        /\b(style.*improvement|better.*phrasing)\b/i
      ],
      clarity: [
        /\b(unclear|confusing|ambiguous|vague)\b/i,
        /\b(clarity|readability|comprehension)\b/i
      ]
    };

    // Severity keywords for classification
    this.severityKeywords = {
      error: ['error', 'incorrect', 'wrong', 'mistake', 'must', 'required'],
      warning: ['should', 'consider', 'may', 'might', 'could', 'recommend'],
      suggestion: ['suggest', 'optional', 'enhance', 'improve', 'better']
    };
  }

  /**
   * Parse LLM response and extract issues
   * @param {string} response - Raw LLM response
   * @param {string} originalText - Original text that was analyzed
   * @param {Object} context - Analysis context
   * @returns {Array<Object>} Array of detected issues
   */
  parseIssues(response, originalText, context = {}) {
    try {
      // First try to parse as JSON
      const jsonIssues = this.parseJsonResponse(response);
      if (jsonIssues.length > 0) {
        return this.processIssues(jsonIssues, originalText, context);
      }

      // Fallback to text parsing if JSON parsing fails
      const textIssues = this.parseTextResponse(response, originalText);
      return this.processIssues(textIssues, originalText, context);

    } catch (error) {
      console.warn('IssueDetector: Failed to parse response:', error);
      return [];
    }
  }

  /**
   * Parse JSON-formatted LLM response
   * @param {string} response - LLM response
   * @returns {Array<Object>} Raw issues from JSON
   */
  parseJsonResponse(response) {
    try {
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonData = JSON.parse(jsonMatch[0]);
      return jsonData.issues || [];
    } catch (error) {
      // Try parsing the entire response as JSON
      try {
        const jsonData = JSON.parse(response);
        return jsonData.issues || [];
      } catch (secondError) {
        throw new Error('Failed to parse JSON response');
      }
    }
  }

  /**
   * Parse text-based LLM response as fallback
   * @param {string} response - LLM response
   * @param {string} originalText - Original text
   * @returns {Array<Object>} Extracted issues
   */
  parseTextResponse(response, originalText) {
    const issues = [];
    const lines = response.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // Look for issue patterns in the response
      const issue = this.extractIssueFromLine(line, originalText);
      if (issue) {
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Extract issue information from a single line of text
   * @param {string} line - Line of text from LLM response
   * @param {string} originalText - Original text
   * @returns {Object|null} Extracted issue or null
   */
  extractIssueFromLine(line, originalText) {
    // Skip empty lines or lines that don't look like issues
    if (!line.trim() || line.length < 10) {
      return null;
    }

    // Look for quoted text that might indicate the problematic phrase
    const quotedTextMatch = line.match(/["']([^"']+)["']/);
    let problematicText = quotedTextMatch ? quotedTextMatch[1] : null;

    // If no quoted text, try to find text that exists in the original
    if (!problematicText) {
      const words = line.split(/\s+/).filter(word => word.length > 3);
      for (const word of words) {
        if (originalText.includes(word)) {
          problematicText = word;
          break;
        }
      }
    }

    if (!problematicText) {
      return null;
    }

    // Find the position of the problematic text
    const startIndex = originalText.indexOf(problematicText);
    if (startIndex === -1) {
      return null;
    }

    return {
      type: this.classifyIssueType(line),
      severity: this.assessSeverity(line),
      startIndex: startIndex,
      endIndex: startIndex + problematicText.length,
      message: line.trim(),
      suggestions: this.extractSuggestions(line),
      originalText: problematicText
    };
  }

  /**
   * Process and validate detected issues
   * @param {Array<Object>} rawIssues - Raw issues from parsing
   * @param {string} originalText - Original text
   * @param {Object} context - Analysis context
   * @returns {Array<Object>} Processed issues
   */
  processIssues(rawIssues, originalText, context) {
    const processedIssues = [];

    for (const rawIssue of rawIssues) {
      try {
        const issue = this.validateAndNormalizeIssue(rawIssue, originalText, context);
        if (issue) {
          processedIssues.push(issue);
        }
      } catch (error) {
        console.warn('IssueDetector: Failed to process issue:', error, rawIssue);
      }
    }

    // Remove duplicate issues
    return this.deduplicateIssues(processedIssues);
  }

  /**
   * Validate and normalize a single issue
   * @param {Object} rawIssue - Raw issue data
   * @param {string} originalText - Original text
   * @param {Object} context - Analysis context
   * @returns {Object|null} Normalized issue or null if invalid
   */
  validateAndNormalizeIssue(rawIssue, originalText, context) {
    // Validate required fields
    if (!rawIssue || typeof rawIssue !== 'object') {
      return null;
    }

    // Normalize indices
    let startIndex = parseInt(rawIssue.startIndex) || 0;
    let endIndex = parseInt(rawIssue.endIndex) || startIndex + 1;

    // Ensure indices are within bounds
    startIndex = Math.max(0, Math.min(startIndex, originalText.length - 1));
    endIndex = Math.max(startIndex + 1, Math.min(endIndex, originalText.length));

    // Extract the actual text at these indices
    const actualText = originalText.substring(startIndex, endIndex);

    return {
      id: this.generateIssueId(),
      type: this.normalizeIssueType(rawIssue.type),
      severity: this.normalizeSeverity(rawIssue.severity),
      startIndex: startIndex,
      endIndex: endIndex,
      message: this.normalizeMessage(rawIssue.message),
      suggestions: this.normalizeSuggestions(rawIssue.suggestions),
      originalText: actualText,
      confidence: this.calculateConfidence(rawIssue, actualText),
      context: {
        chunkIndex: context.chunkIndex || 0,
        analysisTimestamp: Date.now()
      }
    };
  }

  /**
   * Classify issue type based on message content
   * @param {string} message - Issue message
   * @returns {string} Issue type
   */
  classifyIssueType(message) {
    const lowerMessage = message.toLowerCase();

    for (const [type, patterns] of Object.entries(this.issuePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          return type;
        }
      }
    }

    // Default classification based on keywords
    if (lowerMessage.includes('spell') || lowerMessage.includes('typo')) {
      return this.issueTypes.SPELLING;
    }
    if (lowerMessage.includes('grammar') || lowerMessage.includes('tense')) {
      return this.issueTypes.GRAMMAR;
    }
    if (lowerMessage.includes('comma') || lowerMessage.includes('period')) {
      return this.issueTypes.PUNCTUATION;
    }
    if (lowerMessage.includes('clear') || lowerMessage.includes('confus')) {
      return this.issueTypes.CLARITY;
    }

    return this.issueTypes.STYLE; // Default fallback
  }

  /**
   * Assess issue severity based on message content
   * @param {string} message - Issue message
   * @returns {string} Severity level
   */
  assessSeverity(message) {
    const lowerMessage = message.toLowerCase();

    // Check for error keywords
    for (const keyword of this.severityKeywords.error) {
      if (lowerMessage.includes(keyword)) {
        return this.severityLevels.ERROR;
      }
    }

    // Check for warning keywords
    for (const keyword of this.severityKeywords.warning) {
      if (lowerMessage.includes(keyword)) {
        return this.severityLevels.WARNING;
      }
    }

    // Check for suggestion keywords
    for (const keyword of this.severityKeywords.suggestion) {
      if (lowerMessage.includes(keyword)) {
        return this.severityLevels.SUGGESTION;
      }
    }

    return this.severityLevels.WARNING; // Default
  }

  /**
   * Extract suggestions from issue message
   * @param {string} message - Issue message
   * @returns {Array<string>} Extracted suggestions
   */
  extractSuggestions(message) {
    const suggestions = [];

    // Look for quoted suggestions
    const quotedMatches = message.match(/["']([^"']+)["']/g);
    if (quotedMatches) {
      suggestions.push(...quotedMatches.map(match => match.slice(1, -1)));
    }

    // Look for "try" or "use" patterns
    const tryPattern = /(?:try|use|consider|replace with)\s+["']?([^"'.]+)["']?/gi;
    let match;
    while ((match = tryPattern.exec(message)) !== null) {
      suggestions.push(match[1].trim());
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Normalize issue type to standard values
   * @param {string} type - Raw issue type
   * @returns {string} Normalized type
   */
  normalizeIssueType(type) {
    if (!type) return this.issueTypes.STYLE;
    
    const lowerType = type.toLowerCase();
    
    // Map variations to standard types
    const typeMap = {
      'grammar': this.issueTypes.GRAMMAR,
      'grammatical': this.issueTypes.GRAMMAR,
      'spelling': this.issueTypes.SPELLING,
      'spell': this.issueTypes.SPELLING,
      'style': this.issueTypes.STYLE,
      'clarity': this.issueTypes.CLARITY,
      'clear': this.issueTypes.CLARITY,
      'punctuation': this.issueTypes.PUNCTUATION,
      'word': this.issueTypes.WORD_CHOICE,
      'sentence': this.issueTypes.SENTENCE_STRUCTURE
    };

    for (const [key, value] of Object.entries(typeMap)) {
      if (lowerType.includes(key)) {
        return value;
      }
    }

    return this.issueTypes.STYLE; // Default
  }

  /**
   * Normalize severity to standard values
   * @param {string} severity - Raw severity
   * @returns {string} Normalized severity
   */
  normalizeSeverity(severity) {
    if (!severity) return this.severityLevels.WARNING;
    
    const lowerSeverity = severity.toLowerCase();
    
    if (lowerSeverity.includes('error') || lowerSeverity.includes('critical')) {
      return this.severityLevels.ERROR;
    }
    if (lowerSeverity.includes('warning') || lowerSeverity.includes('caution')) {
      return this.severityLevels.WARNING;
    }
    if (lowerSeverity.includes('suggestion') || lowerSeverity.includes('optional')) {
      return this.severityLevels.SUGGESTION;
    }

    return this.severityLevels.WARNING; // Default
  }

  /**
   * Normalize issue message
   * @param {string} message - Raw message
   * @returns {string} Normalized message
   */
  normalizeMessage(message) {
    if (!message) return 'Issue detected';
    
    // Clean up the message
    let normalized = message.trim();
    
    // Remove common prefixes
    normalized = normalized.replace(/^(Issue:|Error:|Warning:|Suggestion:)\s*/i, '');
    
    // Ensure it ends with proper punctuation
    if (!/[.!?]$/.test(normalized)) {
      normalized += '.';
    }

    return normalized;
  }

  /**
   * Normalize suggestions array
   * @param {Array|string} suggestions - Raw suggestions
   * @returns {Array<string>} Normalized suggestions
   */
  normalizeSuggestions(suggestions) {
    if (!suggestions) return [];
    
    if (typeof suggestions === 'string') {
      return [suggestions];
    }
    
    if (Array.isArray(suggestions)) {
      return suggestions
        .filter(s => s && typeof s === 'string')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    return [];
  }

  /**
   * Calculate confidence score for an issue
   * @param {Object} rawIssue - Raw issue data
   * @param {string} actualText - Actual text at the issue location
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(rawIssue, actualText) {
    let confidence = 0.5; // Base confidence

    // Increase confidence if we have suggestions
    if (rawIssue.suggestions && rawIssue.suggestions.length > 0) {
      confidence += 0.2;
    }

    // Increase confidence if the message is detailed
    if (rawIssue.message && rawIssue.message.length > 20) {
      confidence += 0.1;
    }

    // Increase confidence if indices seem accurate
    if (rawIssue.startIndex !== undefined && rawIssue.endIndex !== undefined) {
      confidence += 0.1;
    }

    // Decrease confidence if the text seems too short or generic
    if (actualText.length < 2) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Remove duplicate issues
   * @param {Array<Object>} issues - Array of issues
   * @returns {Array<Object>} Deduplicated issues
   */
  deduplicateIssues(issues) {
    const seen = new Set();
    const deduplicated = [];

    for (const issue of issues) {
      // Create a key based on position and type
      const key = `${issue.startIndex}-${issue.endIndex}-${issue.type}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(issue);
      }
    }

    return deduplicated;
  }

  /**
   * Rank suggestions by relevance and quality
   * @param {Array<string>} suggestions - Array of suggestions
   * @param {Object} issue - Issue context
   * @returns {Array<string>} Ranked suggestions
   */
  rankSuggestions(suggestions, issue) {
    if (!suggestions || suggestions.length <= 1) {
      return suggestions;
    }

    // Score suggestions based on various factors
    const scoredSuggestions = suggestions.map(suggestion => ({
      text: suggestion,
      score: this.scoreSuggestion(suggestion, issue)
    }));

    // Sort by score (highest first)
    scoredSuggestions.sort((a, b) => b.score - a.score);

    return scoredSuggestions.map(s => s.text);
  }

  /**
   * Score a suggestion for ranking
   * @param {string} suggestion - Suggestion text
   * @param {Object} issue - Issue context
   * @returns {number} Suggestion score
   */
  scoreSuggestion(suggestion, issue) {
    let score = 0;

    // Prefer shorter, more concise suggestions
    if (suggestion.length < issue.originalText.length * 1.5) {
      score += 1;
    }

    // Prefer suggestions that maintain similar meaning
    const originalWords = issue.originalText.toLowerCase().split(/\s+/);
    const suggestionWords = suggestion.toLowerCase().split(/\s+/);
    const commonWords = originalWords.filter(word => suggestionWords.includes(word));
    score += (commonWords.length / originalWords.length) * 2;

    // Prefer grammatically correct suggestions (basic heuristics)
    if (this.looksGrammaticallyCorrect(suggestion)) {
      score += 1;
    }

    return score;
  }

  /**
   * Basic heuristic to check if text looks grammatically correct
   * @param {string} text - Text to check
   * @returns {boolean} Whether text looks correct
   */
  looksGrammaticallyCorrect(text) {
    // Very basic checks
    if (!text || text.length === 0) return false;
    
    // Check for proper capitalization
    if (text[0] !== text[0].toUpperCase() && !/^[a-z]/.test(text)) {
      return false;
    }

    // Check for balanced quotes and parentheses
    const quotes = (text.match(/"/g) || []).length;
    const parens = (text.match(/\(/g) || []).length - (text.match(/\)/g) || []).length;
    
    return quotes % 2 === 0 && parens === 0;
  }

  /**
   * Generate unique issue ID
   * @returns {string} Unique ID
   */
  generateIssueId() {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get issue statistics
   * @param {Array<Object>} issues - Array of issues
   * @returns {Object} Statistics
   */
  getIssueStatistics(issues) {
    const stats = {
      total: issues.length,
      byType: {},
      bySeverity: {},
      averageConfidence: 0
    };

    let totalConfidence = 0;

    for (const issue of issues) {
      // Count by type
      stats.byType[issue.type] = (stats.byType[issue.type] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
      
      // Sum confidence
      totalConfidence += issue.confidence || 0;
    }

    if (issues.length > 0) {
      stats.averageConfidence = totalConfidence / issues.length;
    }

    return stats;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IssueDetector;
} else if (typeof window !== 'undefined') {
  window.IssueDetector = IssueDetector;
}