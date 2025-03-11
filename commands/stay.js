const { sendEmbed } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'stay',
  description: 'Request users to stay',
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
    await sendEmbed(
      message.channel,
      '#0099ff',
      'Stay',
      `${message.author} has requested you to stay and secure your in-game phone to prevent Joy-Con drifting.`,
      config.images.stay
    );
  },
};
