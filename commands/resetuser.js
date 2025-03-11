const { sendEmbed, saveConfig } = require('../utils/helper');

module.exports = {
  name: 'resetuser',
  description: 'Reset registration for a specific user',
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
    let userId, username;
    const mention = message.mentions.users.first();
    if (mention) {
      userId = mention.id;
      username = mention.tag;
    } else {
      userId = args[0];
      try {
        const user = await client.users.fetch(userId);
        username = user.tag;
      } catch (error) {
        console.error('User fetch error:', error);
        username = userId;
      }
    }
    if (!userId) {
      return sendEmbed(
        message.channel,
        '#ff0000',
        'Error',
        'No user ID or mention provided. Please provide one.'
      );
    }
    if (channelConfig.registeredUsers[userId]) {
      delete channelConfig.registeredUsers[userId];
      const channelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      saveConfig(channelName, channelConfig);
      await sendEmbed(
        message.channel,
        '#00ff00',
        'User Reset',
        `Registration for **${username}** has been reset.`,
        null,
        [{ name: 'Notice', value: 'They may re-register now.' }]
      );
    } else {
      await sendEmbed(
        message.channel,
        '#ff0000',
        'User Not Found',
        `No registration found for **${username}**.`,
        null,
        [{ name: 'Info', value: 'Double-check the user ID.' }]
      );
    }
  },
};
