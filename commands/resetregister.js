const { sendEmbed, saveConfig } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'resetregister',
  description: 'Reset user registration data (queue and waiting list remain intact)',
  async execute(message, args, channelConfig, client) {
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
    
    // Clear the registeredUsers object
    channelConfig.registeredUsers = {};
    
    // Preserve users in the waiting list by re-adding them to registeredUsers
    if (channelConfig.waitingList && channelConfig.waitingList.length > 0) {
      channelConfig.waitingList.forEach(registration => {
        // Mark each waiting list user as still registered
        channelConfig.registeredUsers[registration.userId] = true;
      });
    }
    
    // Preserve users in the active queue by re-adding them to registeredUsers
    if (channelConfig.queue && channelConfig.queue.registrations && 
        channelConfig.queue.registrations.length > 0) {
      channelConfig.queue.registrations.forEach(registration => {
        // Mark each queue user as still registered
        channelConfig.registeredUsers[registration.userId] = true;
      });
    }
    
    // Preserve users in active session by re-adding them to registeredUsers
    if (channelConfig.activeSession && channelConfig.activeSession.length > 0) {
      channelConfig.activeSession.forEach(registration => {
        // Mark each active session user as still registered
        channelConfig.registeredUsers[registration.userId] = true;
      });
    }

    const channelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    saveConfig(channelName, channelConfig);
    
    await sendEmbed(
      message.channel,
      '#00ff00',
      'Registrations Reset',
      'User registrations have been reset. The main queue and waiting list remain unchanged. Users in waiting list, main queue, and active session can still participate.',
      null,
      [{ name: 'Action', value: 'New users can now register, while existing queue members remain in place.' }]
    );
  },
};