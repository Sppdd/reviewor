/**
 * Tests for AnalysisCache - Memory-efficient caching system
 */

// Mock localStorage for testing
const mockLocalStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Set up global localStorage mock
global.localStorage = mockLocalStorage;

const AnalysisCache = require('../analysis/AnalysisCache.js');

describe('AnalysisCache', () => {
  let cache;

  beforeEach(() => {
    // Clear localStorage mock
    mockLocalStorage.clear();
    
    // Create fresh cache instance
    cache = new AnalysisCache({
      maxSize: 5,
      maxAge: 1000, // 1 second for testing
      enablePersistence: true
    });
    
    // Add small delay to ensure different timestamps
    const now = Date.now();
    while (Date.now() === now) {
      // Wait for timestamp to change
    }
  });

  afterEach(() => {
    if (cache) {
      cache.destroy();
    }
  });

  describe('Basic Cache Operations', () => {
    test('should store and retrieve data', () => {
      const key = 'test_key';
      const data = { issues: [], suggestions: [] };
      
      cache.set(key, data);
      const retrieved = cache.get(key);
      
      expect(retrieved).toEqual(data);
      expect(cache.has(key)).toBe(true);
    });

    test('should return null for non-existent keys', () => {
      const result = cache.get('non_existent');
      expect(result).toBeNull();
      expect(cache.has('non_existent')).toBe(false);
    });

    test('should delete entries', () => {
      const key = 'test_key';
      const data = { issues: [] };
      
      cache.set(key, data);
      expect(cache.has(key)).toBe(true);
      
      const deleted = cache.delete(key);
      expect(deleted).toBe(true);
      expect(cache.has(key)).toBe(false);
      expect(cache.get(key)).toBeNull();
    });

    test('should clear all entries', () => {
      cache.set('key1', { data: 1 });
      cache.set('key2', { data: 2 });
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
      
      cache.clear();
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used entries when at capacity', () => {
      // Create a cache with smaller capacity for clearer testing
      const testCache = new AnalysisCache({
        maxSize: 3,
        maxAge: 10000,
        enablePersistence: false
      });
      
      // Fill cache to capacity with small delays to ensure different timestamps
      let baseTime = Date.now();
      testCache.set('key0', { data: 0 });
      testCache.accessOrder.set('key0', baseTime);
      
      testCache.set('key1', { data: 1 });
      testCache.accessOrder.set('key1', baseTime + 1);
      
      testCache.set('key2', { data: 2 });
      testCache.accessOrder.set('key2', baseTime + 2);
      
      // Access key0 to make it recently used
      testCache.get('key0');
      testCache.accessOrder.set('key0', baseTime + 10); // Much later
      
      // Add one more entry, should evict key1 (least recently used)
      testCache.set('key3', { data: 3 });
      
      expect(testCache.has('key0')).toBe(true); // Recently accessed
      expect(testCache.has('key1')).toBe(false); // Should be evicted (oldest)
      expect(testCache.has('key2')).toBe(true); // Should remain
      expect(testCache.has('key3')).toBe(true); // Newly added
      
      // The cache should have exactly 3 entries (maxSize)
      expect(testCache.cache.size).toBe(3);
      
      testCache.destroy();
    });

    test('should track access order correctly', () => {
      // Create a cache with smaller capacity for clearer testing
      const testCache = new AnalysisCache({
        maxSize: 3,
        maxAge: 10000,
        enablePersistence: false
      });
      
      testCache.set('key1', { data: 1 });
      testCache.set('key2', { data: 2 });
      testCache.set('key3', { data: 3 });
      
      // Access key2 and key3 to make them more recently used than key1
      testCache.get('key2');
      testCache.get('key3');
      
      // Add one more, should evict key1 (least recently accessed)
      testCache.set('key4', { data: 4 });
      
      expect(testCache.has('key1')).toBe(false); // Should be evicted
      expect(testCache.has('key2')).toBe(true);  // Recently accessed
      expect(testCache.has('key3')).toBe(true);  // Recently accessed
      expect(testCache.has('key4')).toBe(true);  // Newly added
      
      testCache.destroy();
    });
  });

  describe('Expiration Handling', () => {
    test('should expire entries after maxAge', (done) => {
      const key = 'expiring_key';
      const data = { issues: [] };
      
      cache.set(key, data);
      expect(cache.has(key)).toBe(true);
      
      // Wait for expiration
      setTimeout(() => {
        expect(cache.has(key)).toBe(false);
        expect(cache.get(key)).toBeNull();
        done();
      }, 1100); // Slightly longer than maxAge
    });

    test('should handle custom TTL', (done) => {
      const key = 'custom_ttl_key';
      const data = { issues: [] };
      
      // Set with very short TTL
      cache.set(key, data, { ttl: 100 });
      expect(cache.has(key)).toBe(true);
      
      setTimeout(() => {
        expect(cache.has(key)).toBe(false);
        done();
      }, 150);
    });

    test('should clear expired entries during cleanup', (done) => {
      cache.set('key1', { data: 1 }, { ttl: 100 });
      cache.set('key2', { data: 2 }, { ttl: 2000 });
      
      setTimeout(() => {
        cache.clearExpiredEntries();
        
        expect(cache.has('key1')).toBe(false);
        expect(cache.has('key2')).toBe(true);
        done();
      }, 150);
    });
  });

  describe('Key Generation', () => {
    test('should generate consistent keys for same input', () => {
      const text = 'Hello world';
      const options = { type: 'grammar' };
      
      const key1 = cache.generateKey(text, options);
      const key2 = cache.generateKey(text, options);
      
      expect(key1).toBe(key2);
    });

    test('should generate different keys for different input', () => {
      const key1 = cache.generateKey('Hello world', { type: 'grammar' });
      const key2 = cache.generateKey('Hello world', { type: 'spelling' });
      const key3 = cache.generateKey('Goodbye world', { type: 'grammar' });
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });

  describe('Text-based Invalidation', () => {
    test('should invalidate similar text entries', () => {
      const text1 = 'Hello world';
      const text2 = 'Hello world'; // Identical text (will have same hash)
      
      const key1 = cache.generateKey(text1);
      const key2 = cache.generateKey(text2, { context: 'different' }); // Different options to create different key
      
      cache.set(key1, { issues: ['issue1'] });
      cache.set(key2, { issues: ['issue2'] });
      
      expect(cache.has(key1)).toBe(true);
      expect(cache.has(key2)).toBe(true);
      
      // Invalidate based on similarity - both should be invalidated since they have same text hash
      cache.invalidateByText(text1, 0.8);
      
      // Both should be invalidated due to same text content
      expect(cache.has(key1)).toBe(false);
      expect(cache.has(key2)).toBe(false);
    });

    test('should not invalidate dissimilar text entries', () => {
      const text1 = 'Hello world';
      const text2 = 'Completely different text';
      
      const key1 = cache.generateKey(text1);
      const key2 = cache.generateKey(text2);
      
      cache.set(key1, { issues: ['issue1'] });
      cache.set(key2, { issues: ['issue2'] });
      
      cache.invalidateByText(text1, 0.8);
      
      expect(cache.has(key1)).toBe(false); // Should be invalidated
      expect(cache.has(key2)).toBe(true);  // Should remain
    });
  });

  describe('Persistence', () => {
    test('should save to localStorage', () => {
      cache.set('persist_key', { data: 'test' });
      
      // Check that data was saved to localStorage
      const stored = JSON.parse(localStorage.getItem('feelly_analysis_cache'));
      expect(stored).toBeTruthy();
      expect(stored.cache).toBeTruthy();
      expect(stored.cache.persist_key).toBeTruthy();
    });

    test('should load from localStorage', () => {
      // Manually set data in localStorage
      const cacheData = {
        cache: {
          'loaded_key': {
            data: { issues: ['loaded'] },
            timestamp: Date.now(),
            expires: Date.now() + 10000,
            size: 100
          }
        },
        stats: { hits: 5, misses: 2 }
      };
      
      localStorage.setItem('feelly_analysis_cache', JSON.stringify(cacheData));
      
      // Create new cache instance
      const newCache = new AnalysisCache({ enablePersistence: true });
      
      expect(newCache.has('loaded_key')).toBe(true);
      expect(newCache.get('loaded_key')).toEqual({ issues: ['loaded'] });
      expect(newCache.getStats().hits).toBe(6); // 5 from loaded stats + 1 from get() call above
      
      newCache.destroy();
    });

    test('should not load expired entries from persistence', () => {
      const expiredData = {
        cache: {
          'expired_key': {
            data: { issues: [] },
            timestamp: Date.now() - 10000,
            expires: Date.now() - 5000, // Already expired
            size: 100
          }
        }
      };
      
      localStorage.setItem('feelly_analysis_cache', JSON.stringify(expiredData));
      
      const newCache = new AnalysisCache({ enablePersistence: true });
      
      expect(newCache.has('expired_key')).toBe(false);
      
      newCache.destroy();
    });

    test('should handle persistence errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });
      
      expect(() => {
        cache.set('error_key', { data: 'test' });
      }).not.toThrow();
      
      // Restore original method
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track hit and miss statistics', () => {
      cache.set('key1', { data: 1 });
      
      // Hit
      cache.get('key1');
      
      // Miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should track evictions and invalidations', () => {
      // Fill cache to trigger eviction
      for (let i = 0; i < 6; i++) {
        cache.set(`key${i}`, { data: i });
      }
      
      // Trigger invalidation
      cache.invalidateByText('test', 0.5);
      
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    test('should calculate memory usage', () => {
      cache.set('key1', { large: 'data'.repeat(100) });
      cache.set('key2', { small: 'data' });
      
      const stats = cache.getStats();
      expect(stats.memoryUsage.totalSize).toBeGreaterThan(0);
      expect(stats.memoryUsage.entryCount).toBe(2);
      expect(stats.memoryUsage.averageEntrySize).toBeGreaterThan(0);
    });
  });

  describe('Optimization', () => {
    test('should optimize cache by removing low-value entries', () => {
      // Create a dedicated cache for this test
      const testCache = new AnalysisCache({
        maxSize: 5,
        maxAge: 10000,
        enablePersistence: false
      });
      
      // Add entries with different access patterns
      testCache.set('frequent', { data: 1 });
      testCache.set('infrequent1', { data: 2 });
      testCache.set('infrequent2', { data: 3 });
      testCache.set('infrequent3', { data: 4 });
      testCache.set('infrequent4', { data: 5 });
      
      // Access frequent entry multiple times
      for (let i = 0; i < 5; i++) {
        testCache.get('frequent');
      }
      
      testCache.optimize();
      
      // Frequent entry should still be there
      expect(testCache.has('frequent')).toBe(true);
      
      // Cache should be smaller after optimization
      expect(testCache.cache.size).toBe(3); // 60% of maxSize (5)
      
      testCache.destroy();
    });
  });

  describe('Hash Functions', () => {
    test('should generate consistent hashes', () => {
      const text = 'Hello world';
      const hash1 = cache.hashText(text);
      const hash2 = cache.hashText(text);
      
      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different text', () => {
      const hash1 = cache.hashText('Hello world');
      const hash2 = cache.hashText('Goodbye world');
      
      expect(hash1).not.toBe(hash2);
    });

    test('should hash objects consistently', () => {
      const obj = { type: 'grammar', level: 'strict' };
      const hash1 = cache.hashObject(obj);
      const hash2 = cache.hashObject(obj);
      
      expect(hash1).toBe(hash2);
    });

    test('should handle empty text and objects', () => {
      expect(() => cache.hashText('')).not.toThrow();
      expect(() => cache.hashObject({})).not.toThrow();
      expect(() => cache.hashObject(null)).not.toThrow();
    });
  });

  describe('Import/Export', () => {
    test('should export cache data', () => {
      cache.set('export_key', { data: 'test' });
      
      const exported = cache.export();
      
      expect(exported.cache).toBeTruthy();
      expect(exported.accessOrder).toBeTruthy();
      expect(exported.stats).toBeTruthy();
      expect(exported.config).toBeTruthy();
    });

    test('should import cache data', () => {
      const importData = {
        cache: {
          'import_key': {
            data: { imported: true },
            timestamp: Date.now(),
            expires: Date.now() + 10000,
            size: 100
          }
        },
        accessOrder: {
          'import_key': Date.now()
        },
        stats: {
          hits: 10,
          misses: 5
        }
      };
      
      cache.import(importData);
      
      expect(cache.has('import_key')).toBe(true);
      expect(cache.get('import_key')).toEqual({ imported: true });
      expect(cache.getStats().hits).toBe(11); // 10 from imported stats + 1 from get() call above
    });
  });

  describe('Edge Cases', () => {
    test('should handle circular references in data', () => {
      const circularData = { issues: [] };
      circularData.self = circularData;
      
      expect(() => {
        cache.set('circular', circularData);
      }).not.toThrow();
    });

    test('should handle very large data objects', () => {
      const largeData = {
        issues: new Array(1000).fill({ message: 'test'.repeat(100) })
      };
      
      expect(() => {
        cache.set('large', largeData);
      }).not.toThrow();
    });

    test('should handle unicode text', () => {
      const unicodeText = '🌟 Hello 世界 🚀';
      const key = cache.generateKey(unicodeText);
      
      cache.set(key, { data: 'unicode' });
      
      expect(cache.has(key)).toBe(true);
      expect(cache.get(key)).toEqual({ data: 'unicode' });
    });

    test('should handle cache without persistence', () => {
      const noPersistCache = new AnalysisCache({ enablePersistence: false });
      
      noPersistCache.set('no_persist', { data: 'test' });
      
      expect(noPersistCache.has('no_persist')).toBe(true);
      
      // Should not save to localStorage
      expect(localStorage.getItem('feelly_analysis_cache')).toBeNull();
      
      noPersistCache.destroy();
    });
  });
});