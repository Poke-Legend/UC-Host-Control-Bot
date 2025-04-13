// utils/databaseManager.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Database instances cache
const instances = {};

/**
 * Database class for JSON file-based storage with caching
 */
class Database {
  /**
   * Initialize the database
   * @param {string} name - Database name
   * @param {Object} options - Configuration options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = {
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes in milliseconds
      baseDir: path.join(process.cwd(), 'data'),
      ...options
    };
    
    // Set the database directory
    this.baseDir = path.join(this.options.baseDir, this.name);
    
    // Initialize cache
    this.cache = {
      data: {},
      ttl: {}
    };
    
    // Ensure the directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    
    logger.debug(`Database initialized: ${this.name} (${this.baseDir})`);
  }
  
  /**
   * Get the full path for a collection/document
   * @param {string} collection - Collection name
   * @param {string} id - Document ID (optional)
   * @returns {string} - Full path
   */
  getPath(collection, id = null) {
    if (id) {
      return path.join(this.baseDir, collection, `${id}.json`);
    }
    return path.join(this.baseDir, collection);
  }
  
  /**
   * Ensure a collection directory exists
   * @param {string} collection - Collection name
   */
  ensureCollection(collection) {
    const collectionPath = this.getPath(collection);
    if (!fs.existsSync(collectionPath)) {
      fs.mkdirSync(collectionPath, { recursive: true });
    }
  }
  
  /**
   * Generate a cache key
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {string} - Cache key
   */
  getCacheKey(collection, id) {
    return `${collection}:${id}`;
  }
  
  /**
   * Check if a document exists
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {boolean} - Whether document exists
   */
  exists(collection, id) {
    const filePath = this.getPath(collection, id);
    return fs.existsSync(filePath);
  }
  
  /**
   * List all document IDs in a collection
   * @param {string} collection - Collection name
   * @returns {Array} - Document IDs
   */
  list(collection) {
    try {
      const collectionPath = this.getPath(collection);
      if (!fs.existsSync(collectionPath)) {
        return [];
      }
      
      return fs.readdirSync(collectionPath)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      logger.error(`Error listing documents in ${collection}:`, error);
      return [];
    }
  }
  
  /**
   * Read a document from the database
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @param {Object} defaultValue - Default value if not found
   * @returns {Object} - Document data
   */
  read(collection, id, defaultValue = {}) {
    const cacheKey = this.getCacheKey(collection, id);
    
    // Check cache if enabled
    if (this.options.cacheEnabled && 
        this.cache.data[cacheKey] && 
        this.cache.ttl[cacheKey] > Date.now()) {
      // Return a copy to prevent mutation of cached data
      return JSON.parse(JSON.stringify(this.cache.data[cacheKey]));
    }
    
    try {
      const filePath = this.getPath(collection, id);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Cache the data if enabled
        if (this.options.cacheEnabled) {
          this.cache.data[cacheKey] = data;
          this.cache.ttl[cacheKey] = Date.now() + this.options.cacheTTL;
        }
        
        // Return a copy to prevent mutation
        return JSON.parse(JSON.stringify(data));
      }
    } catch (error) {
      logger.error(`Error reading document ${collection}/${id}:`, error);
      logger.debug('Returning default value');
    }
    
    return defaultValue;
  }
  
  /**
   * Write a document to the database
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @param {Object} data - Document data
   * @returns {boolean} - Success status
   */
  write(collection, id, data) {
    try {
      this.ensureCollection(collection);
      const filePath = this.getPath(collection, id);
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      
      // Update cache if enabled
      if (this.options.cacheEnabled) {
        const cacheKey = this.getCacheKey(collection, id);
        this.cache.data[cacheKey] = JSON.parse(JSON.stringify(data));
        this.cache.ttl[cacheKey] = Date.now() + this.options.cacheTTL;
      }
      
      return true;
    } catch (error) {
      logger.error(`Error writing document ${collection}/${id}:`, error);
      return false;
    }
  }
  
  /**
   * Update a document in the database
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @param {Object|Function} update - Update data or function
   * @returns {boolean} - Success status
   */
  update(collection, id, update) {
    try {
      // Read current data
      const current = this.read(collection, id, {});
      
      // Apply update
      let updated;
      if (typeof update === 'function') {
        updated = update(current);
      } else {
        updated = { ...current, ...update };
      }
      
      // Write updated data
      return this.write(collection, id, updated);
    } catch (error) {
      logger.error(`Error updating document ${collection}/${id}:`, error);
      return false;
    }
  }
  
  /**
   * Delete a document from the database
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {boolean} - Success status
   */
  delete(collection, id) {
    try {
      const filePath = this.getPath(collection, id);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        
        // Remove from cache if enabled
        if (this.options.cacheEnabled) {
          const cacheKey = this.getCacheKey(collection, id);
          delete this.cache.data[cacheKey];
          delete this.cache.ttl[cacheKey];
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error deleting document ${collection}/${id}:`, error);
      return false;
    }
  }
  
  /**
   * Clear cache for a specific document or all documents
   * @param {string} collection - Collection name (optional)
   * @param {string} id - Document ID (optional)
   */
  clearCache(collection = null, id = null) {
    if (collection && id) {
      // Clear specific document
      const cacheKey = this.getCacheKey(collection, id);
      delete this.cache.data[cacheKey];
      delete this.cache.ttl[cacheKey];
    } else if (collection) {
      // Clear all documents in collection
      const prefix = `${collection}:`;
      Object.keys(this.cache.data).forEach(key => {
        if (key.startsWith(prefix)) {
          delete this.cache.data[key];
          delete this.cache.ttl[key];
        }
      });
    } else {
      // Clear all cache
      this.cache.data = {};
      this.cache.ttl = {};
    }
  }
}

/**
 * Get a database instance
 * @param {string} name - Database name
 * @param {Object} options - Configuration options
 * @returns {Database} - Database instance
 */
function getDatabaseInstance(name, options = {}) {
  // Return existing instance if available
  if (instances[name]) {
    return instances[name];
  }
  
  // Create new instance
  const db = new Database(name, options);
  instances[name] = db;
  
  return db;
}

module.exports = {
  Database,
  getDatabaseInstance
};