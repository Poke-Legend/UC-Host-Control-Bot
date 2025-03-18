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

    // Improved DM handling
    let failedDMs = [];
    let successfulDMs = 0;
    
    for (const reg of targetGroup) {
      try {
        const user = await client.users.fetch(reg.userId);
        
        if (!user) {
          console.log(`Failed to fetch user: ${reg.userId}`);
          failedDMs.push({ userId: reg.userId, reason: 'User not found' });
          continue;
        }
        
        // Create the embed using our helper; this converts hex colors to int.
        const dmEmbed = createEmbed({
          color: '#0099ff',
          title: `${message.author.username}'s Union Circle Code`,
          description: `Your code is: \`${code}\``,
          image: config.images.custom, // Must be a valid URL string (e.g., "https://example.com/image.png")
          extraFields: [{ name: 'Note', value: 'This code is for the current session only.' }],
        });
        
        await user.send({ embeds: [dmEmbed] });
        successfulDMs++;
        console.log(`Successfully sent DM to: ${user.tag} (${reg.userId})`);
      } catch (error) {
        console.error(`DM Error for ${reg.userId}:`, error);
        if (error.code === 50007) {
          failedDMs.push({ userId: reg.userId, reason: 'DMs disabled' });
        } else {
          failedDMs.push({ userId: reg.userId, reason: `Error: ${error.message}` });
        }
      }
    }

    // Send ping with mention
    const pingMsg = await message.channel.send(`<@&${config.pingRoleId}>`);
    
    // Main success embed
    await sendEmbed(
      message.channel,
      '#00ff00',
      'Union Circle Code Sent',
      `${message.author} has dispatched codes to the ${
        channelConfig.activeSession && channelConfig.activeSession.length > 0
          ? 'active session'
          : 'current queue'
      }.\n\n${successfulDMs} out of ${targetGroup.length} players received their code.`,
      null,
      [{ 
        name: 'Status', 
        value: successfulDMs === targetGroup.length 
          ? 'All Direct Messages Sent Successfully' 
          : 'Some Direct Messages Failed (see details below)'
      }]
    );
    
    // Remove the ping after a short delay
    safeDelete(pingMsg, 1000);

    // Send more detailed failed DM information
    if (failedDMs.length > 0) {
      const failedEmbed = createEmbed({
        color: '#ff0000',
        title: 'DM Failed',
        description: 'Could not send code to the following users:',
        extraFields: failedDMs.map((fail, index) => ({ 
          name: `User ${index + 1}`, 
          value: `<@${fail.userId}>: ${fail.reason}`
        })),
      });
      
      const failureMsg = await message.channel.send({ embeds: [failedEmbed] });
      
      // This message with error info will stay longer
      safeDelete(failureMsg, 30000);
    }
  },
};