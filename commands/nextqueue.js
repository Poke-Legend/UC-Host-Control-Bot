const { sendEmbed, saveConfig } = require('../utils/helper');

module.exports = {
  name: 'nextqueue',
  description: 'Move up to 3 players from the waiting list into the main queue',
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
    const playersToMove = channelConfig.waitingList.slice(0, 3);
    channelConfig.queue.registrations.push(...playersToMove);
    channelConfig.waitingList = channelConfig.waitingList.slice(3);
    channelConfig.activeSession = [];
    const channelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    saveConfig(channelName, channelConfig);
    await sendEmbed(
      message.channel,
      '#00ff00',
      'Next Session Ready',
      'Up to 3 players have been moved from the waiting list into the main queue and the active session cleared. Use `$start` to begin the next session.',
      null,
      [{ name: 'Success', value: 'Active session cleared.' }]
    );
  },
};
