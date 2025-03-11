const { sendEmbed, saveConfig } = require('../utils/helper');

module.exports = {
  name: 'resetregister',
  description: 'Reset user registration data (queue and waiting list remain intact)',
  async execute(message, args, channelConfig, client) {
    const hasPermission = message.member.roles.cache.some(role =>
      require('../utils/config').allowedRoleIds.includes(role.id)
    );
    if (!hasPermission) {
      return sendEmbed(
        message.channel,
        '#ff0000',
        'Permission Denied',
        'You do not have permission to use this command.'
      );
    }
    channelConfig.registeredUsers = {};
    const channelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    saveConfig(channelName, channelConfig);
    await sendEmbed(
      message.channel,
      '#00ff00',
      'Registrations Reset',
      'User registrations have been reset. The main queue and waiting list remain unchanged.',
      null,
      [{ name: 'Action', value: 'Users can re-register if needed.' }]
    );
  },
};
