/**
 * AnalysisCache - Memory-efficient caching system for text analysis results
 * Implements LRU eviction, cache invalidation, and persistence across page reloads
 * Optimizes performance by avoiding redundant API calls for similar text
 */
class AnalysisCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.maxAge = options.maxAge || 30 * 60 * 1000; // 30 minutes default
    this.persistKey = options.persistKey || 'feelly_analysis_cache';
    this.enablePersistence = options.enablePersistence !== false;
    
    // LRU cache implementation
    this.cache = new Map();
    this.accessOrder = new Map(); // Track access times for LRU
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
      persistenceLoads: 0,
      persistenceSaves: 0
    };

    // Initialize cache from persistence if enabled
    if (this.enablePersistence) {
      this.loadFromPersistence();
    }

    // Set up periodic cleanup
    this.setupCleanup();
  }

  /**
   * Get cached analysis result
   * @param {string} key - Cache key
   * @returns {Object|null} Cached result or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access time for LRU and increment access count
    this.accessOrder.set(key, Date.now());
    entry.accessCount = (entry.accessCount || 1) + 1;
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Store analysis result in cache
   * @param {string} key - Cache key
   * @param {Object} data - Analysis result to cache
   * @param {Object} options - Caching options
   */
  set(key, data, options = {}) {
    const now = Date.now();
    const ttl = options.ttl || this.maxAge;
    
    const entry = {
      data: data,
      timestamp: now,
      expires: now + ttl,
      size: this.calculateSize(data),
      accessCount: 1
    };

    // If cache is at capacity, evict LRU entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, now);

    // Persist to storage if enabled
    if (this.enablePersistence) {
      this.saveToPersistence();
    }
  }

  /**
   * Check if cache has a valid entry for the key
   * @param {string} key - Cache key
   * @returns {boolean} Whether valid entry exists
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove entry from cache
   * @param {string} key - Cache key
   * @returns {boolean} Whether entry was removed
   */
  delete(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.accessOrder.delete(key);
    
    if (existed && this.enablePersistence) {
      this.saveToPersistence();
    }
    
    return existed;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    
    if (this.enablePersistence) {
      this.clearPersistence();
    }
  }

  /**
   * Invalidate cache entries based on text similarity
   * @param {string} text - Text that has changed
   * @param {number} threshold - Similarity threshold (0-1)
   */
  invalidateByText(text, threshold = 0.8) {
    const textHash = this.hashText(text);
    const keysToInvalidate = [];

    for (const [key, entry] of this.cache.entries()) {
      // Extract text hash from key (assuming key format includes hash)
      const keyTextHash = this.extractTextHashFromKey(key);
      if (keyTextHash && this.calculateSimilarity(textHash, keyTextHash) > threshold) {
        keysToInvalidate.push(key);
      }
    }

    keysToInvalidate.forEach(key => {
      this.delete(key);
      this.stats.invalidations++;
    });
  }

  /**
   * Generate cache key for text and options
   * @param {string} text - Text content
   * @param {Object} options - Analysis options
   * @returns {string} Cache key
   */
  generateKey(text, options = {}) {
    const textHash = this.hashText(text);
    const optionsHash = this.hashObject(options);
    return `${textHash}_${optionsHash}`;
  }

  /**
   * Evict least recently used entries
   */
  evictLRU() {
    if (this.cache.size === 0) return;

    // Find the least recently accessed entry
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Check if cache entry has expired
   * @param {Object} entry - Cache entry
   * @returns {boolean} Whether entry is expired
   */
  isExpired(entry) {
    return Date.now() > entry.expires;
  }

  /**
   * Calculate approximate size of data for memory management
   * @param {Object} data - Data to measure
   * @returns {number} Approximate size in bytes
   */
  calculateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch (error) {
      return 1000; // Default size if calculation fails
    }
  }

  /**
   * Hash text content for cache keys
   * @param {string} text - Text to hash
   * @returns {string} Hash string
   */
  hashText(text) {
    let hash = 0;
    if (text.length === 0) return hash.toString(36);
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Hash object for cache keys
   * @param {Object} obj - Object to hash
   * @returns {string} Hash string
   */
  hashObject(obj) {
    try {
      const str = JSON.stringify(obj, Object.keys(obj).sort());
      return this.hashText(str);
    } catch (error) {
      return 'default';
    }
  }

  /**
   * Extract text hash from cache key
   * @param {string} key - Cache key
   * @returns {string|null} Text hash or null
   */
  extractTextHashFromKey(key) {
    const parts = key.split('_');
    return parts.length > 0 ? parts[0] : null;
  }

  /**
   * Calculate similarity between two hashes (simple implementation)
   * @param {string} hash1 - First hash
   * @param {string} hash2 - Second hash
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(hash1, hash2) {
    if (hash1 === hash2) return 1;
    
    // Simple character-based similarity
    const maxLength = Math.max(hash1.length, hash2.length);
    let matches = 0;
    
    for (let i = 0; i < maxLength; i++) {
      if (hash1[i] === hash2[i]) {
        matches++;
      }
    }
    
    return matches / maxLength;
  }

  /**
   * Load cache from persistent storage
   */
  loadFromPersistence() {
    try {
      const stored = localStorage.getItem(this.persistKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      const now = Date.now();

      // Restore non-expired entries
      for (const [key, entry] of Object.entries(data.cache || {})) {
        if (entry.expires > now) {
          this.cache.set(key, entry);
          this.accessOrder.set(key, entry.timestamp);
        }
      }

      // Restore statistics
      if (data.stats) {
        Object.assign(this.stats, data.stats);
      }

      this.stats.persistenceLoads++;
    } catch (error) {
      console.warn('AnalysisCache: Failed to load from persistence:', error);
    }
  }

  /**
   * Save cache to persistent storage
   */
  saveToPersistence() {
    try {
      const data = {
        cache: Object.fromEntries(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };

      localStorage.setItem(this.persistKey, JSON.stringify(data));
      this.stats.persistenceSaves++;
    } catch (error) {
      console.warn('AnalysisCache: Failed to save to persistence:', error);
      
      // If storage is full, try clearing old entries
      if (error.name === 'QuotaExceededError') {
        this.clearExpiredEntries();
        try {
          localStorage.setItem(this.persistKey, JSON.stringify(data));
        } catch (retryError) {
          console.warn('AnalysisCache: Retry save failed:', retryError);
        }
      }
    }
  }

  /**
   * Clear persistent storage
   */
  clearPersistence() {
    try {
      localStorage.removeItem(this.persistKey);
    } catch (error) {
      console.warn('AnalysisCache: Failed to clear persistence:', error);
    }
  }

  /**
   * Remove expired entries from cache
   */
  clearExpiredEntries() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });

    if (expiredKeys.length > 0 && this.enablePersistence) {
      this.saveToPersistence();
    }
  }

  /**
   * Setup periodic cleanup of expired entries
   */
  setupCleanup() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.clearExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: hitRate,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get approximate memory usage
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    let totalSize = 0;
    let entryCount = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
      entryCount++;
    }

    return {
      totalSize: totalSize,
      averageEntrySize: entryCount > 0 ? totalSize / entryCount : 0,
      entryCount: entryCount
    };
  }

  /**
   * Optimize cache by removing low-value entries
   */
  optimize() {
    const entries = Array.from(this.cache.entries());
    
    // Sort by access frequency and recency
    entries.sort((a, b) => {
      const [keyA, entryA] = a;
      const [keyB, entryB] = b;
      
      const accessTimeA = this.accessOrder.get(keyA) || 0;
      const accessTimeB = this.accessOrder.get(keyB) || 0;
      
      // Prefer more recently accessed and frequently accessed entries
      const scoreA = (entryA.accessCount || 1) * Math.log(accessTimeA + 1);
      const scoreB = (entryB.accessCount || 1) * Math.log(accessTimeB + 1);
      
      return scoreB - scoreA;
    });

    // Keep only the top entries if we're over capacity
    if (entries.length > this.maxSize * 0.8) {
      const keepCount = Math.floor(this.maxSize * 0.6);
      const toRemove = entries.slice(keepCount);
      
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
        this.accessOrder.delete(key);
      });

      if (this.enablePersistence) {
        this.saveToPersistence();
      }
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.clear();
  }

  /**
   * Export cache data for debugging
   * @returns {Object} Cache data
   */
  export() {
    return {
      cache: Object.fromEntries(this.cache.entries()),
      accessOrder: Object.fromEntries(this.accessOrder.entries()),
      stats: this.stats,
      config: {
        maxSize: this.maxSize,
        maxAge: this.maxAge,
        enablePersistence: this.enablePersistence
      }
    };
  }

  /**
   * Import cache data (for debugging/testing)
   * @param {Object} data - Cache data to import
   */
  import(data) {
    this.clear();
    
    if (data.cache) {
      for (const [key, entry] of Object.entries(data.cache)) {
        this.cache.set(key, entry);
      }
    }
    
    if (data.accessOrder) {
      for (const [key, time] of Object.entries(data.accessOrder)) {
        this.accessOrder.set(key, time);
      }
    }
    
    if (data.stats) {
      Object.assign(this.stats, data.stats);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalysisCache;
} else if (typeof window !== 'undefined') {
  window.AnalysisCache = AnalysisCache;
}