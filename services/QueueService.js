// services/QueueService.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class QueueService {
  constructor() {
    // Set base paths
    this.queueDir = path.join(process.cwd(), 'queue');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(this.queueDir)) {
      fs.mkdirSync(this.queueDir, { recursive: true });
    }
    
    // In-memory cache for queue configurations
    this.configCache = {};
    
    // Default configuration template
    this.DEFAULT_CONFIG = {
      lastCommands: {},
      lastCodeEmbeds: {},
      registeredUsers: {},
      queue: { registrations: [] },
      waitingList: [],
      activeSession: [],
      sessionStartTime: null,
    };
    
    // System settings
    this.settings = {
      playersPerSession: 3,
      averageSessionTimeMinutes: 5,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
    };
    
    logger.info('QueueService initialized');
  }
  
  /**
   * Get channel configuration
   * @param {string} channelName - Sanitized channel name
   * @returns {Object} Channel configuration
   */
  getChannelConfig(channelName) {
    try {
      // Check if we have a valid cached configuration that's not expired
      const cacheKey = `config:${channelName}`;
      const cachedConfig = this.configCache[cacheKey];
      
      if (cachedConfig && cachedConfig.expiry > Date.now()) {
        // Return a deep copy to prevent mutation of cached data
        return JSON.parse(JSON.stringify(cachedConfig.data));
      }
      
      // No valid cache, load from file
      const configPath = path.join(this.queueDir, `${channelName}.json`);
      let config;
      
      if (fs.existsSync(configPath)) {
        // Load existing configuration
        const fileContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(fileContent);
        
        // Ensure all required properties exist
        if (!config.waitingList) config.waitingList = [];
        if (!config.activeSession) config.activeSession = [];
        if (!config.queue) config.queue = { registrations: [] };
        if (!config.registeredUsers) config.registeredUsers = {};
      } else {
        // Create new default configuration
        config = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
      }
      
      // Cache the configuration with expiry
      this.configCache[cacheKey] = {
        data: JSON.parse(JSON.stringify(config)),
        expiry: Date.now() + this.settings.cacheTTL
      };
      
      return config;
    } catch (error) {
      logger.error(`Error loading config for channel ${channelName}:`, error);
      
      // Return default configuration on error
      return JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
    }
  }
  
  /**
   * Save channel configuration
   * @param {string} channelName - Sanitized channel name
   * @param {Object} config - Channel configuration
   * @returns {boolean} Success status
   */
  saveChannelConfig(channelName, config) {
    try {
      // Ensure queue directory exists
      if (!fs.existsSync(this.queueDir)) {
        fs.mkdirSync(this.queueDir, { recursive: true });
      }
      
      // Save to file
      const configPath = path.join(this.queueDir, `${channelName}.json`);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      // Update cache
      const cacheKey = `config:${channelName}`;
      this.configCache[cacheKey] = {
        data: JSON.parse(JSON.stringify(config)),
        expiry: Date.now() + this.settings.cacheTTL
      };
      
      return true;
    } catch (error) {
      logger.error(`Error saving config for channel ${channelName}:`, error);
      return false;
    }
  }
  
  /**
   * Add user to waiting list with priority
   * @param {string} channelName - Sanitized channel name
   * @param {Object} registration - Registration data
   * @param {number} priority - Priority level (higher = higher priority)
   * @returns {number} Position in waiting list
   */
  addToWaitingList(channelName, registration, priority = 0) {
    const config = this.getChannelConfig(channelName);
    
    // Set priority on registration
    registration.priority = priority;
    registration.registeredAt = Date.now();
    
    // Find position based on priority
    let insertIndex = config.waitingList.length;
    for (let i = 0; i < config.waitingList.length; i++) {
      const currentPriority = config.waitingList[i].priority || 0;
      if (priority > currentPriority) {
        insertIndex = i;
        break;
      }
    }
    
    // Insert at determined position
    config.waitingList.splice(insertIndex, 0, registration);
    
    // Mark user as registered
    config.registeredUsers[registration.userId] = true;
    
    // Save config
    this.saveChannelConfig(channelName, config);
    
    return insertIndex + 1; // Return position in queue (1-based)
  }
  
  /**
   * Move users from waiting list to queue
   * @param {string} channelName - Sanitized channel name
   * @param {number} count - Number of users to move
   * @returns {Array} - Moved users
   */
  moveToQueue(channelName, count = 3) {
    const config = this.getChannelConfig(channelName);
    
    // Get users to move (up to specified count)
    const toMove = config.waitingList.slice(0, count);
    
    // Add to queue
    config.queue.registrations.push(...toMove);
    
    // Remove from waiting list
    config.waitingList = config.waitingList.slice(count);
    
    // Save config
    this.saveChannelConfig(channelName, config);
    
    return toMove; // Return moved users
  }
  
  /**
   * Start a session with current queue
   * @param {string} channelName - Sanitized channel name
   * @param {number} count - Number of users per session
   * @returns {Object} - Result with session data
   */
  startSession(channelName, count = 3) {
    const config = this.getChannelConfig(channelName);
    
    // Check if there's already an active session
    if (config.activeSession && config.activeSession.length > 0) {
      return { success: false, error: 'Session already active' };
    }
    
    // Get users for session (up to specified count)
    const sessionUsers = config.queue.registrations.slice(0, count);
    
    // If no users, return error
    if (sessionUsers.length === 0) {
      return { success: false, error: 'No users in queue' };
    }
    
    // Set as active session
    config.activeSession = sessionUsers;
    config.sessionStartTime = Date.now();
    
    // Remove from queue
    config.queue.registrations = config.queue.registrations.slice(sessionUsers.length);
    
    // Save config
    this.saveChannelConfig(channelName, config);
    
    return { success: true, session: sessionUsers };
  }
  
  /**
   * End current session
   * @param {string} channelName - Sanitized channel name
   * @returns {Object} - Result with session data
   */
  endSession(channelName) {
    const config = this.getChannelConfig(channelName);
    
    // Check if there's an active session
    if (!config.activeSession || config.activeSession.length === 0) {
      return { success: false, error: 'No active session' };
    }
    
    const sessionUsers = [...config.activeSession];
    
    // Clear active session
    config.activeSession = [];
    config.sessionStartTime = null;
    
    // Save config
    this.saveChannelConfig(channelName, config);
    
    return { success: true, session: sessionUsers };
  }
  
  /**
   * Extend current session by adding more players
   * @param {string} channelName - Sanitized channel name
   * @param {number} count - Number of players to add
   * @returns {Object} - Result with added users
   */
  extendSession(channelName, count = 1) {
    const config = this.getChannelConfig(channelName);
    
    // Check if there's an active session
    if (!config.activeSession || config.activeSession.length === 0) {
      return { success: false, error: 'No active session' };
    }
    
    // Check if there are users in the queue
    if (!config.queue.registrations || config.queue.registrations.length === 0) {
      return { success: false, error: 'No users in queue' };
    }
    
    // Get users to add (up to specified count)
    const playersToAdd = config.queue.registrations.slice(0, count);
    
    // Add to active session
    config.activeSession = [...config.activeSession, ...playersToAdd];
    
    // Remove from queue
    config.queue.registrations = config.queue.registrations.slice(playersToAdd.length);
    
    // Save config
    this.saveChannelConfig(channelName, config);
    
    return { success: true, added: playersToAdd };
  }
  
  /**
   * Reset user registration
   * @param {string} channelName - Sanitized channel name
   * @param {string} userId - User ID
   * @returns {boolean} - Success status
   */
  resetUserRegistration(channelName, userId) {
    const config = this.getChannelConfig(channelName);
    
    // Check if user is registered
    if (!config.registeredUsers[userId]) {
      return false;
    }
    
    // Remove from registered users
    delete config.registeredUsers[userId];
    
    // Remove from queue
    if (config.queue && config.queue.registrations) {
      config.queue.registrations = config.queue.registrations.filter(
        reg => reg.userId !== userId
      );
    }
    
    // Remove from waiting list
    if (config.waitingList) {
      config.waitingList = config.waitingList.filter(
        reg => reg.userId !== userId
      );
    }
    
    // Remove from active session
    if (config.activeSession) {
      config.activeSession = config.activeSession.filter(
        reg => reg.userId !== userId
      );
    }
    
    // Save config
    this.saveChannelConfig(channelName, config);
    
    return true;
  }
  
  /**
   * Get user status in the queue/waitlist/session
   * @param {string} channelName - Sanitized channel name
   * @param {string} userId - User ID
   * @returns {Object} - User status information
   */
  getUserStatus(channelName, userId) {
    const config = this.getChannelConfig(channelName);
    
    const status = {
      isRegistered: Boolean(config.registeredUsers[userId]),
      inActiveSession: false,
      inQueue: false,
      inWaitingList: false,
      position: null,
      registration: null
    };
    
    // Check active session
    const activeIndex = config.activeSession.findIndex(reg => reg.userId === userId);
    if (activeIndex >= 0) {
      status.inActiveSession = true;
      status.position = activeIndex + 1;
      status.registration = config.activeSession[activeIndex];
    }
    
    // Check queue
    const queueIndex = config.queue.registrations.findIndex(reg => reg.userId === userId);
    if (queueIndex >= 0) {
      status.inQueue = true;
      status.position = queueIndex + 1;
      status.registration = config.queue.registrations[queueIndex];
    }
    
    // Check waiting list
    const waitingIndex = config.waitingList.findIndex(reg => reg.userId === userId);
    if (waitingIndex >= 0) {
      status.inWaitingList = true;
      status.position = waitingIndex + 1;
      status.registration = config.waitingList[waitingIndex];
    }
    
    return status;
  }
  
  /**
   * Calculate estimated wait time
   * @param {string} channelName - Sanitized channel name
   * @param {number} position - Position in waiting list or queue
   * @param {string} type - Type of position ('waitlist' or 'queue')
   * @returns {string} - Human-readable wait time estimate
   */
  getEstimatedWaitTime(channelName, position, type = 'waitlist') {
    const config = this.getChannelConfig(channelName);
    
    // Get settings from config
    const playersPerSession = this.settings.playersPerSession;
    const averageSessionMinutes = this.settings.averageSessionTimeMinutes;
    
    let waitMinutes = 0;
    
    if (type === 'waitlist') {
      // For waiting list, consider active session and queue
      const activeSessionSize = config.activeSession ? config.activeSession.length : 0;
      const queueSize = config.queue.registrations ? config.queue.registrations.length : 0;
      
      // Calculate sessions before this position is reached
      const totalAhead = queueSize + (activeSessionSize > 0 ? 1 : 0); // +1 for active session if exists
      const sessionsAhead = Math.ceil(totalAhead / playersPerSession);
      
      // Calculate sessions needed for this position
      const positionSessions = Math.ceil(position / playersPerSession);
      
      // Total sessions to wait
      const totalSessions = sessionsAhead + positionSessions - 1; // -1 because position is 1-based
      
      waitMinutes = totalSessions * averageSessionMinutes;
    } else {
      // For queue, only consider position in queue
      const sessionsAhead = Math.ceil(position / playersPerSession) - 1; // -1 because position is 1-based
      waitMinutes = sessionsAhead * averageSessionMinutes;
      
      // If there's an active session, add remaining time
      if (config.sessionStartTime) {
        const sessionElapsed = (Date.now() - config.sessionStartTime) / (60 * 1000); // in minutes
        const remainingTime = Math.max(0, averageSessionMinutes - sessionElapsed);
        waitMinutes += remainingTime;
      }
    }
    
    // Format wait time
    if (waitMinutes <= 5) return "Less than 5 minutes";
    if (waitMinutes <= 15) return "5-15 minutes";
    if (waitMinutes <= 30) return "15-30 minutes";
    if (waitMinutes <= 60) return "30-60 minutes";
    return "Over 1 hour";
  }
  
  /**
   * Get channel statistics
   * @param {string} channelName - Sanitized channel name
   * @returns {Object} - Channel statistics
   */
  getChannelStats(channelName) {
    const config = this.getChannelConfig(channelName);
    
    return {
      queueSize: config.queue.registrations.length,
      waitlistSize: config.waitingList.length,
      activeSessionSize: config.activeSession.length,
      totalRegistered: Object.keys(config.registeredUsers).length,
      hasActiveSession: config.activeSession.length > 0,
      sessionStartTime: config.sessionStartTime,
    };
  }
  
  /**
   * Clear cache for a channel
   * @param {string} channelName - Sanitized channel name
   */
  clearCache(channelName) {
    const cacheKey = `config:${channelName}`;
    delete this.configCache[cacheKey];
  }
  
  /**
   * Clear all cache
   */
  clearAllCache() {
    this.configCache = {};
  }
}

// Export a singleton instance
module.exports = new QueueService();