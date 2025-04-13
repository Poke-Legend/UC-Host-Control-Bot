// utils/errorHandler.js
const { createEmbed } = require('./helper');
const logger = require('./logger');

/**
 * Centralized error handling for commands
 */
class ErrorHandler {
  /**
   * Handle command errors with standardized responses
   * @param {Error} error - The error object
   * @param {Message|Interaction} source - Discord message or interaction
   * @param {string} commandName - Name of the command that failed
   * @param {boolean} ephemeral - Whether to make response ephemeral (for interactions)
   */
  static async handleCommandError(error, source, commandName, ephemeral = true) {
    // Log the error
    logger.error(`Error in ${commandName}:`, error);
    
    // Different handling based on source type
    if (source.reply && typeof source.reply === 'function') {
      // It's an interaction
      try {
        const content = this.getErrorMessage(error, commandName);
        
        if (!source.replied && !source.deferred) {
          await source.reply({ content, ephemeral });
        } else {
          await source.editReply({ content });
        }
      } catch (replyError) {
        logger.error(`Failed to reply with error for ${commandName}:`, replyError);
      }
    } else if (source.channel && typeof source.channel.send === 'function') {
      // It's a message
      try {
        const embed = createEmbed({
          color: '#ff0000',
          title: 'Error',
          description: this.getErrorMessage(error, commandName)
        });
        
        await source.channel.send({ embeds: [embed] });
      } catch (sendError) {
        logger.error(`Failed to send error for ${commandName}:`, sendError);
      }
    }
  }
  
  /**
   * Get appropriate error message based on error type
   * @param {Error} error - The error object
   * @param {string} commandName - Name of the command that failed
   * @returns {string} User-friendly error message
   */
  static getErrorMessage(error, commandName) {
    // Default message
    let message = `There was an error executing the ${commandName} command.`;
    
    // Specific error types
    if (error.code) {
      switch (error.code) {
        case 'ENOENT':
          message = `Could not find the required file for ${commandName}.`;
          break;
        case 50013:
          message = `I don't have permission to do that! Please check my role permissions.`;
          break;
        case 10008:
          message = `Message not found. It may have been deleted.`;
          break;
        case 50007:
          message = `Cannot send messages to this user. They may have blocked me or have DMs disabled.`;
          break;
        case 50001:
          message = `Missing access permission for the channel.`;
          break;
        case 'ERR_QUEUE_FULL':
          message = `The queue is currently full. Please try again later.`;
          break;
        case 'ERR_USER_REGISTERED':
          message = `You are already registered in the queue or waiting list.`;
          break;
        default:
          message = `Error code ${error.code}: ${error.message || 'Unknown error'}`;
      }
    } else if (error.message) {
      // Include meaningful error messages but filter out sensitive information
      const safeMessage = error.message
        .replace(/[A-Za-z0-9+/=]{50,}/g, '[REDACTED TOKEN]') // Redact tokens
        .replace(/\b\d{17,19}\b/g, '[REDACTED ID]'); // Redact Discord IDs
        
      message = `Error in ${commandName}: ${safeMessage}`;
    }
    
    return message;
  }
  
  /**
   * Create a custom error with additional properties
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} additionalInfo - Additional error info
   * @returns {Error} Custom error object
   */
  static createError(message, code, additionalInfo = {}) {
    const error = new Error(message);
    error.code = code;
    
    // Add additional info
    Object.assign(error, additionalInfo);
    
    return error;
  }
  
  /**
   * Log an error but don't show it to the user
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   */
  static logError(error, context) {
    logger.error(`Error in ${context}:`, error);
  }
  
  /**
   * Check if a user has required permissions for a command
   * @param {GuildMember} member - Guild member
   * @param {Array} requiredRoleIds - Required role IDs
   * @param {boolean} requireAll - Whether all roles are required
   * @returns {boolean} Whether user has permission
   */
  static hasPermission(member, requiredRoleIds, requireAll = false) {
    if (!member || !requiredRoleIds || requiredRoleIds.length === 0) {
      return false;
    }
    
    if (requireAll) {
      // User must have all required roles
      return requiredRoleIds.every(roleId => 
        member.roles.cache.has(roleId)
      );
    } else {
      // User must have at least one required role
      return member.roles.cache.some(role => 
        requiredRoleIds.includes(role.id)
      );
    }
  }
  
  /**
   * Handle permission errors
   * @param {Message|Interaction} source - Discord message or interaction
   * @param {string} commandName - Name of the command that failed
   * @param {boolean} ephemeral - Whether to make response ephemeral (for interactions)
   */
  static async handlePermissionError(source, commandName, ephemeral = true) {
    const errorMessage = `You don't have permission to use the ${commandName} command.`;
    
    // Different handling based on source type
    if (source.reply && typeof source.reply === 'function') {
      // It's an interaction
      try {
        if (!source.replied && !source.deferred) {
          await source.reply({ content: errorMessage, ephemeral });
        } else {
          await source.editReply({ content: errorMessage });
        }
      } catch (replyError) {
        logger.error(`Failed to reply with permission error for ${commandName}:`, replyError);
      }
    } else if (source.channel && typeof source.channel.send === 'function') {
      // It's a message
      try {
        const embed = createEmbed({
          color: '#ff0000',
          title: 'Permission Denied',
          description: errorMessage
        });
        
        await source.channel.send({ embeds: [embed] });
      } catch (sendError) {
        logger.error(`Failed to send permission error for ${commandName}:`, sendError);
      }
    }
  }
}

module.exports = ErrorHandler;