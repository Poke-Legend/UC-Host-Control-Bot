// commands/offline.js
const { sendEmbed, safeDelete, clearMessages, saveConfig, loadConfig } = require('../utils/helper');
const { PermissionsBitField } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: 'offline',
  description: 'Lock the channel, deny sending messages, clear all messages, and reset queues, waiting list, and registrations',
  async execute(message, args, channelConfig, client) {
    console.log('[Offline] Command triggered by:', message.author.tag);
    
    // Check if the member has one of the allowed roles.
    const hasPermission = message.member.roles.cache.some(role =>
      config.allowedRoleIds.includes(role.id)
    );
    if (!hasPermission) {
      console.log('[Offline] User lacks permission.');
      await sendEmbed(
        message.channel,
        '#ff0000',
        'Permission Denied',
        'You do not have permission to use this command.'
      );
      return;
    }
    
    const channel = message.channel;
    console.log('[Offline] Current channel name:', channel.name);
    
    // If the channel isn't already locked (i.e. doesn't start with the lock emoji)
    if (!channel.name.startsWith(config.lockEmoji)) {
      // Update channel name: Prepend lock emoji and remove any unlock emoji.
      const newName = `${config.lockEmoji}${channel.name.replace(config.unlockEmoji, '')}`;
      try {
        await channel.setName(newName);
        console.log('[Offline] Channel name updated to:', newName);
      } catch (error) {
        console.error('[Offline] Error setting channel name:', error);
      }
      
      // Deny the managed role from sending messages.
      try {
        await channel.permissionOverwrites.edit(config.managedRoleId, {
          [PermissionsBitField.Flags.SendMessages]: false,
        });
        console.log('[Offline] Channel permissions updated: SendMessages denied.');
      } catch (error) {
        console.error('[Offline] Error updating channel permissions:', error);
      }
      
      // Clear **all** messages in the channel before posting the offline embed.
      try {
        await clearMessages(channel);
        console.log('[Offline] All channel messages cleared.');
      } catch (error) {
        console.error('[Offline] Error clearing messages:', error);
      }
      
      // Reset all queues: clear registrations, waiting list, active session, and registered users.
      channelConfig.queue.registrations = [];
      channelConfig.waitingList = [];
      channelConfig.activeSession = [];
      channelConfig.registeredUsers = {};
      
      // Send the offline embed after clearing the channel.
      let offlineMsg;
      try {
        offlineMsg = await sendEmbed(
          channel,
          '#ff0000',
          'Union Circle Offline',
          `${message.author} has closed the Union Circle. All messages have been cleared and data reset.`,
          config.images.lock, // Ensure this is a valid URL string.
          [{ name: 'Status', value: 'Channel Locked and Data Reset' }]
        );
        console.log('[Offline] Offline embed sent successfully.');
      } catch (error) {
        console.error('[Offline] Error sending offline embed:', error);
      }
      
      // Update configuration with the current timestamp and embed ID.
      const now = Date.now();
      channelConfig.lastCommands[message.guild.id] = { timestamp: now, command: 'offline' };
      channelConfig.offlineEmbedMessageId = offlineMsg ? offlineMsg.id : null;
      
      // Save the updated configuration using a sanitized channel name.
      const sanitizedChannelName = channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      saveConfig(sanitizedChannelName, channelConfig);
      console.log('[Offline] Channel configuration saved and queues reset.');
    } else {
      // If the channel is already offline, send an "Already Offline" embed.
      try {
        console.log('[Offline] Channel is already offline. Sending "Already Offline" embed.');
        const alreadyOfflineMsg = await sendEmbed(
          channel,
          '#ff0000',
          'Already Offline',
          'The Union Circle is already offline. Data is already reset.',
          null,
          [{ name: 'Reminder', value: 'Double-check before toggling!' }]
        );
        // Delay deletion so the message remains visible longer.
        safeDelete(alreadyOfflineMsg, 15000);
      } catch (error) {
        console.error('[Offline] Error sending already offline embed:', error);
      }
    }
    
    // Finally, delete the user's command message.
    safeDelete(message, 0);
  },
};
