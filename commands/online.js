// commands/online.js
const { sendEmbed, safeDelete, saveConfig, loadConfig } = require('../utils/helper');
const { PermissionsBitField } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: 'online',
  description: 'Unlock the channel, allow sending messages, and reset queues, waiting list, and registrations',
  async execute(message, args, channelConfig, client) {
    console.log('[Online] Command triggered by:', message.author.tag);
    
    // Check if the member has one of the allowed roles.
    const hasPermission = message.member.roles.cache.some(role =>
      config.allowedRoleIds.includes(role.id)
    );
    if (!hasPermission) {
      console.log('[Online] User lacks permission.');
      await sendEmbed(
        message.channel,
        '#ff0000',
        'Permission Denied',
        'You do not have permission to use this command.'
      );
      return;
    }
    
    const channel = message.channel;
    console.log('[Online] Current channel name:', channel.name);
    
    // If channel is locked (name starts with lock emoji)
    if (channel.name.startsWith(config.lockEmoji)) {
      // Remove the lock emoji and optionally add the unlock emoji at the beginning.
      const newName = `${config.unlockEmoji}${channel.name.replace(config.lockEmoji, '')}`;
      try {
        await channel.setName(newName);
        console.log('[Online] Channel name updated to:', newName);
      } catch (error) {
        console.error('[Online] Error setting channel name:', error);
      }
      
      try {
        await channel.permissionOverwrites.edit(config.managedRoleId, {
          [PermissionsBitField.Flags.SendMessages]: null,
        });
        console.log('[Online] Channel permissions updated: SendMessages allowed.');
      } catch (error) {
        console.error('[Online] Error updating channel permissions:', error);
      }
      
      // Reset all queues, waiting list, active session and registered users.
      channelConfig.queue.registrations = [];
      channelConfig.waitingList = [];
      channelConfig.activeSession = [];
      channelConfig.registeredUsers = {};
      
      // Delete the offline embed if it exists.
      if (channelConfig.offlineEmbedMessageId) {
        try {
          const offlineMsg = await channel.messages.fetch(channelConfig.offlineEmbedMessageId);
          await offlineMsg.delete();
          console.log('[Online] Offline embed deleted.');
        } catch (error) {
          console.error('[Online] Error deleting offline embed:', error);
        }
      }
      
      try {
        await sendEmbed(
          channel,
          '#00ff00',
          'Union Circle Online',
          `${message.author} has opened the Union Circle. All queues, waiting list, and registrations have been reset.`,
          config.images.unlock,
          [{ name: 'Status', value: 'Channel Unlocked and Data Reset' }]
        );
        console.log('[Online] Online embed sent.');
      } catch (error) {
        console.error('[Online] Error sending online embed:', error);
      }
      
      const now = Date.now();
      channelConfig.lastCommands[message.guild.id] = { timestamp: now, command: 'online' };
      delete channelConfig.offlineEmbedMessageId;
      
      const sanitizedChannelName = channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      saveConfig(sanitizedChannelName, channelConfig);
      console.log('[Online] Configuration saved and data reset.');
    } else {
      // If channel is already online, send an "Already Online" embed.
      try {
        console.log('[Online] Channel is already online. Sending "Already Online" embed.');
        const alreadyOnlineMsg = await sendEmbed(
          channel,
          '#00ff00',
          'Already Online',
          'This channel is already online. Data is already reset.',
          null,
          [{ name: 'Info', value: 'No action needed.' }]
        );
        safeDelete(alreadyOnlineMsg, 5000);
      } catch (error) {
        console.error('[Online] Error sending already online embed:', error);
      }
    }
    
    // Finally, delete the user's command message.
    safeDelete(message, 0);
  },
};
