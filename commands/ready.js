const { sendEmbed } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'ready',
  description: 'Indicate that you are ready',
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
      'Ready',
      `${message.author} is now ready, get moving!`,
      config.images.ready
    );
  },
};
