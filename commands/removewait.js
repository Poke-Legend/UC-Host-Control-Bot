const { sendEmbed, saveConfig } = require('../utils/helper');

module.exports = {
  name: 'removewait',
  description: 'Remove a user from the waiting list (by mention, ID, or tag)',
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
    let input = args.join(' ').trim();
    if (!input) {
      return sendEmbed(
        message.channel,
        '#ff0000',
        'Error',
        'No user provided. Please mention a user, provide their Discord ID, or their Discord tag.'
      );
    }
    let userId = null;
    let username = input;
    const mentionMatch = input.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      userId = mentionMatch[1];
    } else if (/^\d{17,19}$/.test(input)) {
      userId = input;
    } else if (input.includes('#')) {
      const member = message.guild.members.cache.find(
        m => m.user.tag.toLowerCase() === input.toLowerCase()
      );
      if (member) {
        userId = member.id;
        username = member.user.tag;
      }
    }
    if (!userId) {
      return sendEmbed(
        message.channel,
        '#ff0000',
        'Error',
        'Could not find a valid user from the provided input. Please try a mention, Discord ID, or Discord tag.'
      );
    }
    const originalLength = channelConfig.waitingList.length;
    channelConfig.waitingList = channelConfig.waitingList.filter(entry => entry.userId !== userId);
    const hadRegistration = channelConfig.registeredUsers[userId];
    if (hadRegistration) {
      delete channelConfig.registeredUsers[userId];
    }
    if (channelConfig.waitingList.length === originalLength && !hadRegistration) {
      return sendEmbed(
        message.channel,
        '#ff0000',
        'User Not Found',
        `User **${username}** was not found in the waiting list or registered users.`
      );
    } else {
      const channelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      saveConfig(channelName, channelConfig);
      return sendEmbed(
        message.channel,
        '#00ff00',
        'User Removed',
        `User **${username}** has been removed from the waiting list and their registration has been reset.`
      );
    }
  },
};
