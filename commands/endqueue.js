// commands/endqueue.js
const { sendEmbed, saveConfig } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'endqueue',
  description: 'End the current active session without moving new players from waiting list',
  async execute(message, args, channelConfig, client) {
    // Check if the member has one of the allowed roles
    const hasPermission = message.member.roles.cache.some(role =>
      config.allowedRoleIds.includes(role.id)
    );
    
    if (!hasPermission) {
      return sendEmbed(
        message.channel,
        '#ff0000',
        'Permission Denied',
        'You do not have permission to use this command.'
      );
    }
    
    // Check if there's an active session
    if (!channelConfig.activeSession || channelConfig.activeSession.length === 0) {
      return sendEmbed(
        message.channel,
        '#ff9900',
        'No Active Session',
        'There is no active session to end. Use `$start` to begin a session first.',
        null,
        [{ name: 'Status', value: 'No action taken.' }]
      );
    }
    
    // Store the count of active users for the confirmation message
    const activeUserCount = channelConfig.activeSession.length;
    
    // Clear the active session
    channelConfig.activeSession = [];
    
    // Save the updated configuration
    const channelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    saveConfig(channelName, channelConfig);
    
    // Confirm successful completion
    return sendEmbed(
      message.channel,
      '#00ff00',
      'Session Ended',
      `${message.author} has successfully ended the active session with ${activeUserCount} player(s).`,
      null,
      [
        { 
          name: 'Status', 
          value: 'Active session cleared. Use `$nextqueue` to start a new session with players from the waiting list, or `$start` to begin a new session with the current queue.'
        }
      ]
    );
  },
};