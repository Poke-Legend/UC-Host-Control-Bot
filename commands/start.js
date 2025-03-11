// commands/start.js
const { sendEmbed, saveConfig, createEmbed } = require('../utils/helper');

module.exports = {
  name: 'start',
  description: 'Start a new session and DM details to the host',
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
    
    if (channelConfig.activeSession && channelConfig.activeSession.length > 0) {
      return await sendEmbed(
        message.channel,
        '#ff0000',
        'Session Already Active',
        'A session is already active. Use `$nextqueue` to clear it before starting a new session.'
      );
    }
    
    const group = channelConfig.queue.registrations.slice(0, 3);
    if (group.length === 0) {
      return await sendEmbed(
        message.channel,
        '#ff0000',
        'No Players Registered',
        'There are no players in the queue to start the session.',
        null,
        [{
          name: 'Info',
          value: 'Please register using /register and then use `$nextqueue` to push the waiting list into the queue.',
        }]
      );
    }
    
    channelConfig.activeSession = group;
    channelConfig.queue.registrations = channelConfig.queue.registrations.slice(group.length);
    
    // Save updated configuration for the channel
    const channelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    saveConfig(channelName, channelConfig);
    
    const details = group.map((reg, index) => {
      return `**Player ${index + 1}:**\nDiscord: <@${reg.userId}>\nIGN: \`${reg.ign}\`\nPokémon: \`${reg.pokemon}\`\nLevel: \`${reg.pokemonLevel}\`\nShiny: \`${reg.shiny}\`\nItem: \`${reg.holdingItem}\``;
    }).join('\n\n');
    
    // Create an embed using our helper function (which converts hex to int)
    const dmEmbed = createEmbed({
      color: '#00ff00', // This will be converted to an integer in our helper
      title: 'Session Locked In',
      description: `Your session has been locked in with the following players:\n\n${details}`,
      extraFields: [{
        name: 'Important',
        value: 'No late joiners will be added to this session. New registrations remain in the waiting list until you run `$nextqueue`.'
      }],
    });
    
    try {
      await message.author.send({ embeds: [dmEmbed] });
    } catch (err) {
      console.error('Error sending DM to host:', err);
      await sendEmbed(
        message.channel,
        '#ff0000',
        'DM Failed',
        'Could not send a DM to you. Please check your DM settings.',
        null,
        []
      );
      return;
    }
    
    await sendEmbed(
      message.channel,
      '#00ff00',
      'Session Started',
      'Your session has been locked in. Check your DMs for detailed registration info. New registrations continue to join the waiting list.',
      null,
      [{ name: 'Note', value: 'Active session remains until cleared with $nextqueue.' }]
    );
  },
};
