const { sendEmbed } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'fly',
  description: 'Fly to Secret Lair',
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
      'Secret Lair Airline',
      `Please board at the gate and head to Secret Lair to meet with ${message.author}`,
      config.images.fly
    );
  },
};
