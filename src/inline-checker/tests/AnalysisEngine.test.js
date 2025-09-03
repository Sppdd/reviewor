/**
 * Test suite for AnalysisEngine and related components
 * Tests TextAnalyzer, IssueDetector, AnalysisCache integration
 */

// Mock chrome runtime for testing
if (typeof chrome === 'undefined') {
  global.chrome = {
    runtime: {
      sendMessage: (message, callback) => {
        // Mock successful response for grammar analysis
        setTimeout(() => {
          const mockResponse = {
            success: true,
            enhancedText: JSON.stringify({
              issues: [
                {
                  type: 'grammar',
                  severity: 'error',
                  startIndex: 0,
                  endIndex: 4,
                  message: 'Subject-verb disagreement',
                  suggestions: ['This is', 'These are']
                }
              ]
            })
          };
          callback(mockResponse);
        }, 100);
      },
      lastError: null
    }
  };
}

// Mock localStorage for testing
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    storage: {},
    getItem: function(key) {
      return this.storage[key] || null;
    },
    setItem: function(key, value) {
      this.storage[key] = value;
    },
    removeItem: function(key) {
      delete this.storage[key];
    },
    clear: function() {
      this.storage = {};
    }
  };
}

describe('AnalysisEngine', () => {
  let analysisEngine;

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    
    // Create new analysis engine instance
    analysisEngine = new AnalysisEngine({
      enableCache: true,
      enableRealTimeAnalysis: true,
      analysisDelay: 100,
      cacheSize: 50
    });
  });

  afterEach(() => {
    if (analysisEngine) {
      analysisEngine.destroy();
    }
  });

  describe('Basic Analysis', () => {
    test('should analyze simple text', async () => {
      const text = 'This are a test sentence.';
      const result = await analysisEngine.analyze(text);

      expect(result).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
      expect(result.originalText).toBe(text);
    });

    test('should handle empty text', async () => {
      const result = await analysisEngine.analyze('');
      
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    test('should reject invalid input', async () => {
      await expect(analysisEngine.analyze(null)).rejects.toThrow('Invalid text input');
      await expect(analysisEngine.analyze(123)).rejects.toThrow('Invalid text input');
    });

    test('should reject text that is too long', async () => {
      const longText = 'a'.repeat(20000);
      await expect(analysisEngine.analyze(longText)).rejects.toThrow('Text too long');
    });
  });

  describe('Real-time Analysis', () => {
    test('should debounce real-time analysis', async () => {
      const text = 'This are a test.';
      
      // Start multiple analyses quickly
      const promise1 = analysisEngine.analyzeRealTime(text, { analysisId: 'test1' });
      const promise2 = analysisEngine.analyzeRealTime(text, { analysisId: 'test1' });
      const promise3 = analysisEngine.analyzeRealTime(text, { analysisId: 'test1' });

      // Only the last one should complete
      const result = await promise3;
      expect(result).toBeDefined();
    });

    test('should handle multiple concurrent analyses with different IDs', async () => {
      const text1 = 'This are a test.';
      const text2 = 'That were wrong.';
      
      const [result1, result2] = await Promise.all([
        analysisEngine.analyzeRealTime(text1, { analysisId: 'test1' }),
        analysisEngine.analyzeRealTime(text2, { analysisId: 'test2' })
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.originalText).toBe(text1);
      expect(result2.originalText).toBe(text2);
    });
  });

  describe('Caching', () => {
    test('should cache analysis results', async () => {
      const text = 'This are a test sentence.';
      
      // First analysis
      const result1 = await analysisEngine.analyze(text);
      expect(result1.metadata.fromCache).toBe(false);
      
      // Second analysis should be from cache
      const result2 = await analysisEngine.analyze(text);
      expect(result2.metadata.fromCache).toBe(true);
      
      // Results should be equivalent
      expect(result1.issues).toEqual(result2.issues);
    });

    test('should invalidate cache when text changes', async () => {
      const text1 = 'This are a test sentence.';
      const text2 = 'This is a test sentence.';
      
      await analysisEngine.analyze(text1);
      analysisEngine.invalidateCache(text1);
      
      const result = await analysisEngine.analyze(text1);
      expect(result.metadata.fromCache).toBe(false);
    });

    test('should respect cache configuration', async () => {
      const engineWithoutCache = new AnalysisEngine({ enableCache: false });
      
      const text = 'This are a test sentence.';
      const result1 = await engineWithoutCache.analyze(text);
      const result2 = await engineWithoutCache.analyze(text);
      
      expect(result1.metadata.fromCache).toBe(false);
      expect(result2.metadata.fromCache).toBe(false);
      
      engineWithoutCache.destroy();
    });
  });

  describe('Statistics', () => {
    test('should track analysis statistics', async () => {
      const text = 'This are a test sentence.';
      
      const initialStats = analysisEngine.getEngineStats();
      expect(initialStats.totalAnalyses).toBe(0);
      
      await analysisEngine.analyze(text);
      
      const updatedStats = analysisEngine.getEngineStats();
      expect(updatedStats.totalAnalyses).toBe(1);
      expect(updatedStats.averageAnalysisTime).toBeGreaterThan(0);
    });

    test('should track cache hit/miss ratios', async () => {
      const text = 'This are a test sentence.';
      
      // First analysis (cache miss)
      await analysisEngine.analyze(text);
      let stats = analysisEngine.getEngineStats();
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHits).toBe(0);
      
      // Second analysis (cache hit)
      await analysisEngine.analyze(text);
      stats = analysisEngine.getEngineStats();
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHits).toBe(1);
    });
  });

  describe('Configuration', () => {
    test('should allow configuration updates', () => {
      const newConfig = {
        analysisDelay: 200,
        maxTextLength: 5000
      };
      
      analysisEngine.configure(newConfig);
      const config = analysisEngine.getConfig();
      
      expect(config.analysisDelay).toBe(200);
      expect(config.maxTextLength).toBe(5000);
    });

    test('should preserve existing configuration when updating', () => {
      const originalConfig = analysisEngine.getConfig();
      
      analysisEngine.configure({ analysisDelay: 200 });
      const updatedConfig = analysisEngine.getConfig();
      
      expect(updatedConfig.analysisDelay).toBe(200);
      expect(updatedConfig.enableCache).toBe(originalConfig.enableCache);
    });
  });

  describe('Error Handling', () => {
    test('should handle analysis errors gracefully', async () => {
      // Mock chrome.runtime to return an error
      const originalSendMessage = chrome.runtime.sendMessage;
      chrome.runtime.sendMessage = (message, callback) => {
        callback({ success: false, error: 'Mock error' });
      };

      const text = 'This are a test sentence.';
      
      await expect(analysisEngine.analyze(text)).rejects.toThrow();
      
      // Restore original function
      chrome.runtime.sendMessage = originalSendMessage;
    });

    test('should handle malformed LLM responses', async () => {
      // Mock chrome.runtime to return malformed JSON
      const originalSendMessage = chrome.runtime.sendMessage;
      chrome.runtime.sendMessage = (message, callback) => {
        callback({ success: true, enhancedText: 'invalid json {' });
      };

      const text = 'This are a test sentence.';
      const result = await analysisEngine.analyze(text);
      
      // Should still return a valid result, even if no issues are detected
      expect(result).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      
      // Restore original function
      chrome.runtime.sendMessage = originalSendMessage;
    });
  });

  describe('Memory Management', () => {
    test('should cleanup resources on destroy', () => {
      const engine = new AnalysisEngine();
      
      // Add some active analyses
      engine.analyzeRealTime('test text', { analysisId: 'test' });
      
      expect(engine.activeAnalyses.size).toBeGreaterThan(0);
      
      engine.destroy();
      
      expect(engine.textAnalyzer).toBeNull();
      expect(engine.issueDetector).toBeNull();
      expect(engine.analysisCache).toBeNull();
    });

    test('should reset state correctly', async () => {
      const text = 'This are a test sentence.';
      
      await analysisEngine.analyze(text);
      let stats = analysisEngine.getEngineStats();
      expect(stats.totalAnalyses).toBe(1);
      
      analysisEngine.reset();
      
      stats = analysisEngine.getEngineStats();
      expect(stats.totalAnalyses).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });
  });
});

describe('TextAnalyzer', () => {
  let textAnalyzer;

  beforeEach(() => {
    textAnalyzer = new TextAnalyzer();
  });

  describe('Text Chunking', () => {
    test('should not chunk short text', () => {
      const text = 'This is a short sentence.';
      const chunks = textAnalyzer.chunkText(text);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    test('should chunk long text at sentence boundaries', () => {
      const sentences = Array(50).fill('This is a sentence.').join(' ');
      const chunks = textAnalyzer.chunkText(sentences);
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Each chunk should end with sentence punctuation (except possibly the last)
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i]).toMatch(/[.!?]$/);
      }
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate consistent cache keys', () => {
      const text = 'Test text';
      const options = { type: 'grammar' };
      
      const key1 = textAnalyzer.generateCacheKey(text, options);
      const key2 = textAnalyzer.generateCacheKey(text, options);
      
      expect(key1).toBe(key2);
    });

    test('should generate different keys for different text', () => {
      const options = { type: 'grammar' };
      
      const key1 = textAnalyzer.generateCacheKey('Text 1', options);
      const key2 = textAnalyzer.generateCacheKey('Text 2', options);
      
      expect(key1).not.toBe(key2);
    });

    test('should generate different keys for different options', () => {
      const text = 'Test text';
      
      const key1 = textAnalyzer.generateCacheKey(text, { type: 'grammar' });
      const key2 = textAnalyzer.generateCacheKey(text, { type: 'style' });
      
      expect(key1).not.toBe(key2);
    });
  });
});

describe('IssueDetector', () => {
  let issueDetector;

  beforeEach(() => {
    issueDetector = new IssueDetector();
  });

  describe('Issue Classification', () => {
    test('should classify grammar issues', () => {
      const message = 'Subject-verb agreement error detected';
      const type = issueDetector.classifyIssueType(message);
      
      expect(type).toBe('grammar');
    });

    test('should classify spelling issues', () => {
      const message = 'Misspelled word found';
      const type = issueDetector.classifyIssueType(message);
      
      expect(type).toBe('spelling');
    });

    test('should classify style issues', () => {
      const message = 'Consider using active voice';
      const type = issueDetector.classifyIssueType(message);
      
      expect(type).toBe('style');
    });
  });

  describe('Severity Assessment', () => {
    test('should assess error severity', () => {
      const message = 'This is incorrect and must be fixed';
      const severity = issueDetector.assessSeverity(message);
      
      expect(severity).toBe('error');
    });

    test('should assess warning severity', () => {
      const message = 'You should consider changing this';
      const severity = issueDetector.assessSeverity(message);
      
      expect(severity).toBe('warning');
    });

    test('should assess suggestion severity', () => {
      const message = 'You might want to improve this';
      const severity = issueDetector.assessSeverity(message);
      
      expect(severity).toBe('suggestion');
    });
  });

  describe('JSON Response Parsing', () => {
    test('should parse valid JSON response', () => {
      const response = JSON.stringify({
        issues: [
          {
            type: 'grammar',
            severity: 'error',
            startIndex: 0,
            endIndex: 4,
            message: 'Test issue',
            suggestions: ['fix1', 'fix2']
          }
        ]
      });

      const issues = issueDetector.parseJsonResponse(response);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('grammar');
      expect(issues[0].suggestions).toEqual(['fix1', 'fix2']);
    });

    test('should handle JSON with extra text', () => {
      const response = `Here is the analysis: ${JSON.stringify({
        issues: [{ type: 'grammar', severity: 'error', startIndex: 0, endIndex: 4, message: 'Test' }]
      })} End of analysis.`;

      const issues = issueDetector.parseJsonResponse(response);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('grammar');
    });

    test('should throw error for invalid JSON', () => {
      const response = 'This is not JSON at all';
      
      expect(() => {
        issueDetector.parseJsonResponse(response);
      }).toThrow();
    });
  });

  describe('Issue Deduplication', () => {
    test('should remove duplicate issues', () => {
      const issues = [
        { startIndex: 0, endIndex: 4, type: 'grammar', id: '1' },
        { startIndex: 0, endIndex: 4, type: 'grammar', id: '2' }, // Duplicate
        { startIndex: 5, endIndex: 9, type: 'spelling', id: '3' }
      ];

      const deduplicated = issueDetector.deduplicateIssues(issues);
      
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated.map(i => i.id)).toEqual(['1', '3']);
    });
  });
});

describe('AnalysisCache', () => {
  let cache;

  beforeEach(() => {
    localStorage.clear();
    cache = new AnalysisCache({
      maxSize: 5,
      maxAge: 1000,
      enablePersistence: true
    });
  });

  afterEach(() => {
    if (cache) {
      cache.destroy();
    }
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', () => {
      const key = 'test_key';
      const data = { issues: [], metadata: {} };
      
      cache.set(key, data);
      const retrieved = cache.get(key);
      
      expect(retrieved).toEqual(data);
    });

    test('should return null for non-existent keys', () => {
      const result = cache.get('non_existent_key');
      expect(result).toBeNull();
    });

    test('should handle expiration', (done) => {
      const key = 'test_key';
      const data = { test: 'data' };
      
      cache.set(key, data, { ttl: 100 });
      
      // Should exist immediately
      expect(cache.get(key)).toEqual(data);
      
      // Should expire after TTL
      setTimeout(() => {
        expect(cache.get(key)).toBeNull();
        done();
      }, 150);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used items', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        cache.set(`key_${i}`, { data: i });
      }
      
      // Access first item to make it recently used
      cache.get('key_0');
      
      // Add one more item to trigger eviction
      cache.set('key_new', { data: 'new' });
      
      // key_0 should still exist (recently accessed)
      expect(cache.get('key_0')).toBeDefined();
      
      // key_1 should be evicted (least recently used)
      expect(cache.get('key_1')).toBeNull();
      
      // New item should exist
      expect(cache.get('key_new')).toBeDefined();
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate consistent keys', () => {
      const text = 'Test text';
      const options = { type: 'grammar' };
      
      const key1 = cache.generateKey(text, options);
      const key2 = cache.generateKey(text, options);
      
      expect(key1).toBe(key2);
    });

    test('should generate different keys for different inputs', () => {
      const key1 = cache.generateKey('Text 1', { type: 'grammar' });
      const key2 = cache.generateKey('Text 2', { type: 'grammar' });
      const key3 = cache.generateKey('Text 1', { type: 'style' });
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });

  describe('Statistics', () => {
    test('should track cache statistics', () => {
      const key = 'test_key';
      const data = { test: 'data' };
      
      // Initial stats
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      // Cache miss
      cache.get(key);
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      
      // Cache set and hit
      cache.set(key, data);
      cache.get(key);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
    });
  });

  describe('Persistence', () => {
    test('should persist cache to localStorage', () => {
      const key = 'test_key';
      const data = { test: 'data' };
      
      cache.set(key, data);
      
      // Check that data was saved to localStorage
      const stored = localStorage.getItem(cache.persistKey);
      expect(stored).toBeDefined();
      
      const parsedData = JSON.parse(stored);
      expect(parsedData.cache[key]).toBeDefined();
    });

    test('should load cache from localStorage', () => {
      const key = 'test_key';
      const data = { test: 'data' };
      
      // Set data in first cache instance
      cache.set(key, data);
      
      // Create new cache instance (should load from persistence)
      const newCache = new AnalysisCache({
        maxSize: 5,
        enablePersistence: true,
        persistKey: cache.persistKey
      });
      
      // Should have the data from persistence
      expect(newCache.get(key)).toEqual(data);
      
      newCache.destroy();
    });
  });
});

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  console.log('Running AnalysisEngine tests...');
  
  // Simple test runner for Node.js environment
  const runTests = async () => {
    try {
      // Load required modules
      require('./TextAnalyzer.js');
      require('./IssueDetector.js');
      require('./AnalysisCache.js');
      require('./AnalysisEngine.js');
      
      console.log('All modules loaded successfully');
      console.log('Tests would run here in a proper test environment');
      
    } catch (error) {
      console.error('Test setup failed:', error);
    }
  };
  
  runTests();
}