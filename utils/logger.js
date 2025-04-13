// utils/logger.js
const fs = require('fs');
const path = require('path');
const { format } = require('util');

/**
 * Enhanced logging utility with file and console output
 */
class Logger {
  /**
   * Create a new logger instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      logToConsole: true,
      logToFile: true,
      logLevel: 'info',
      logDir: path.join(process.cwd(), 'logs'),
      maxLogFiles: 7, // Keep max 7 days of logs
      logPrefix: 'union-circle',
      ...options
    };
    
    // Create log directory if it doesn't exist and logging to file is enabled
    if (this.options.logToFile && !fs.existsSync(this.options.logDir)) {
      try {
        fs.mkdirSync(this.options.logDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create log directory:', error);
        // Disable file logging if directory creation fails
        this.options.logToFile = false;
      }
    }
    
    // Log levels (lower number = more important)
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    // Set current log level based on process.env.LOG_LEVEL or default
    const envLogLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL.toLowerCase() : null;
    this.currentLevel = this.levels[envLogLevel] !== undefined 
      ? this.levels[envLogLevel] 
      : this.levels[this.options.logLevel];
    
    // Clean up old log files if file logging is enabled
    if (this.options.logToFile) {
      this.cleanupOldLogs();
    }
  }
  
  /**
   * Clean up old log files to prevent disk space issues
   */
  cleanupOldLogs() {
    if (!this.options.logToFile || this.options.maxLogFiles <= 0) {
      return;
    }
    
    try {
      // Get all log files
      const files = fs.readdirSync(this.options.logDir)
        .filter(file => file.startsWith(this.options.logPrefix) && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.options.logDir, file),
          time: fs.statSync(path.join(this.options.logDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Sort by modification time, newest first
      
      // Delete oldest files beyond the max limit
      if (files.length > this.options.maxLogFiles) {
        files.slice(this.options.maxLogFiles).forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            console.error(`Failed to delete old log file ${file.path}:`, error);
          }
        });
      }
    } catch (error) {
      // Use console directly since we can't use our own logger here
      console.error('Error cleaning up old log files:', error);
    }
  }
  
  /**
   * Format a log message with timestamp and level
   * @param {string} level - Log level
   * @param {Array} args - Message arguments
   * @returns {string} - Formatted message
   */
  formatMessage(level, ...args) {
    const timestamp = new Date().toISOString();
    
    // Handle multiple arguments and object formatting
    let message;
    if (args.length === 1) {
      // Single argument handling
      const arg = args[0];
      if (typeof arg === 'string') {
        message = arg;
      } else if (arg instanceof Error) {
        message = arg.stack || `${arg.name}: ${arg.message}`;
      } else {
        try {
          message = JSON.stringify(arg);
        } catch (error) {
          message = format(arg);
        }
      }
    } else {
      // Multiple arguments
      message = format(...args);
    }
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }
  
  /**
   * Write to log file
   * @param {string} formattedMessage - Message to write
   */
  writeToFile(formattedMessage) {
    if (!this.options.logToFile) return;
    
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(
        this.options.logDir, 
        `${this.options.logPrefix}-${date}.log`
      );
      
      fs.appendFileSync(logFile, formattedMessage + '\n');
    } catch (error) {
      // Fall back to console if file logging fails
      console.error('Failed to write to log file:', error);
    }
  }
  
  /**
   * Log a message if its level is high enough
   * @param {string} level - Log level
   * @param {...any} args - Message arguments
   */
  log(level, ...args) {
    // Skip if log level is too verbose for current setting
    if (this.levels[level] > this.currentLevel) return;
    
    const formattedMessage = this.formatMessage(level, ...args);
    
    // Log to console if enabled
    if (this.options.logToConsole) {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 'log';
                           
      // Add color for console output
      let coloredMessage = formattedMessage;
      if (process.stdout.isTTY) {
        switch (level) {
          case 'error':
            coloredMessage = `\x1b[31m${formattedMessage}\x1b[0m`; // Red
            break;
          case 'warn':
            coloredMessage = `\x1b[33m${formattedMessage}\x1b[0m`; // Yellow
            break;
          case 'info':
            coloredMessage = `\x1b[36m${formattedMessage}\x1b[0m`; // Cyan
            break;
          case 'debug':
            coloredMessage = `\x1b[90m${formattedMessage}\x1b[0m`; // Gray
            break;
          case 'trace':
            coloredMessage = `\x1b[90m${formattedMessage}\x1b[0m`; // Gray
            break;
        }
      }
      
      console[consoleMethod](coloredMessage);
    }
    
    // Write to file
    this.writeToFile(formattedMessage);
  }
  
  /**
   * Log an error message
   * @param {...any} args - Message arguments
   */
  error(...args) {
    this.log('error', ...args);
  }
  
  /**
   * Log a warning message
   * @param {...any} args - Message arguments
   */
  warn(...args) {
    this.log('warn', ...args);
  }
  
  /**
   * Log an info message
   * @param {...any} args - Message arguments
   */
  info(...args) {
    this.log('info', ...args);
  }
  
  /**
   * Log a debug message
   * @param {...any} args - Message arguments
   */
  debug(...args) {
    this.log('debug', ...args);
  }
  
  /**
   * Log a trace message
   * @param {...any} args - Message arguments
   */
  trace(...args) {
    this.log('trace', ...args);
  }
  
  /**
   * Set the log level
   * @param {string} level - Log level to set
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }
}

// Create and export a singleton instance
module.exports = new Logger({
  logLevel: process.env.LOG_LEVEL || 'info'
});