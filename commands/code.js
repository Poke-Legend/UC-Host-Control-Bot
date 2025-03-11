// commands/code.js
const { createEmbed, sendEmbed, safeDelete } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'code',
  description: 'Send a code to players in the active session or main queue',
  async execute(message, args, channelConfig, client) {
    const hasPermission = message.member.roles.cache.some(role =>
      config.allowedRoleIds.includes(role.id)
    );
    if (!hasPermission) {
      await sendEmbed(
        message.channel,
        '#ff0000',
        'Permission Denied',
        'You do not have permission to use this command.'
      );
      return;
    }

    const code = args.join(' ');
    if (!code) {
      const errorEmbed = createEmbed({
        color: '#ff0000',
        title: 'Error',
        description: 'No code provided. Please include a code.',
      });
      const errorMsg = await message.channel.send({ embeds: [errorEmbed] });
      safeDelete(errorMsg, 5000);
      return;
    }

    let targetGroup = [];
    if (channelConfig.activeSession && channelConfig.activeSession.length > 0) {
      targetGroup = channelConfig.activeSession;
    } else {
      targetGroup = channelConfig.queue.registrations.slice(0, 3);
    }
    if (targetGroup.length === 0) {
      const emptyEmbed = createEmbed({
        color: '#ff0000',
        title: 'Queue is Empty',
        description: 'No players found for sending the code.',
      });
      await message.channel.send({ embeds: [emptyEmbed] });
      return;
    }

    let failedDMs = [];
    for (const reg of targetGroup) {
      try {
        const user = await client.users.fetch(reg.userId);
        // Create the embed using our helper; this converts hex colors to int.
        const dmEmbed = createEmbed({
          color: '#0099ff',
          title: `${message.author.username}'s Union Circle Code`,
          description: `Your code is: \`${code}\``,
          image: config.images.custom, // Must be a valid URL string (e.g., "https://example.com/image.png")
          extraFields: [{ name: 'Note', value: 'Check your DM for instructions.' }],
        });
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        if (error.code === 50007) {
          failedDMs.push(reg.userId);
        } else {
          console.error('DM Error:', error);
        }
      }
    }

    const pingMsg = await message.channel.send(`<@&${config.pingRoleId}>`);
    await sendEmbed(
      message.channel,
      '#00ff00',
      'Union Circle Code Sent',
      `${message.author} has dispatched codes to the ${
        channelConfig.activeSession && channelConfig.activeSession.length > 0
          ? 'active session'
          : 'current queue'
      }.`,
      null,
      [{ name: 'Status', value: 'Direct Messages Sent' }]
    );
    safeDelete(pingMsg, 1000);

    if (failedDMs.length > 0) {
      const failedEmbed = createEmbed({
        color: '#ff0000',
        title: 'DM Failed',
        description: 'Could not send code to the following users:',
        extraFields: failedDMs.map(id => ({ name: 'User ID', value: id })),
      });
      await message.channel.send({ embeds: [failedEmbed] });
    }
  },
};
