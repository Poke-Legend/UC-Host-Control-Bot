// commands/offline.js
const { sendEmbed, safeDelete, saveConfig, loadConfig } = require('../utils/helper');
const { PermissionsBitField } = require('discord.js');
const config = require('../utils/config');

/**
 * Enhanced function to thoroughly clear all messages in a channel
 * Uses a recursive approach to ensure complete deletion even with many messages
 * @param {TextChannel} channel - The Discord channel to clear
 * @returns {Promise<void>}
 */
async function thoroughlyClearMessages(channel) {
  console.log(`[Offline] Starting thorough message clearing in channel: ${channel.name}`);
  
  // Discord's bulk delete limit is 100 messages at once and only works for messages < 14 days old
  const fourteenDays = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
  const now = Date.now();
  let totalDeleted = 0;
  let fetchedCount = 0;
  let deletedBatch = 0;
  let continueDeletion = true;
  
  // Keep fetching and deleting until no messages are returned
  while (continueDeletion) {
    try {
      // Fetch a batch of messages (up to 100)
      const messages = await channel.messages.fetch({ limit: 100 });
      fetchedCount = messages.size;
      
      console.log(`[Offline] Fetched ${fetchedCount} messages`);
      
      if (fetchedCount === 0) {
        // No more messages to delete, we can exit the loop
        continueDeletion = false;
        break;
      }
      
      // Filter for messages less than 14 days old (eligible for bulkDelete)
      const recentMessages = messages.filter(m => (now - m.createdTimestamp) < fourteenDays);
      
      if (recentMessages.size > 1) {
        // Use bulk delete for efficiency if we have multiple recent messages
        await channel.bulkDelete(recentMessages, true);
        deletedBatch = recentMessages.size;
      } else {
        // Delete messages one by one if they're either:
        // 1. Too old for bulk delete (> 14 days)
        // 2. Only a single message was fetched
        deletedBatch = 0;
        for (const [_, msg] of messages) {
          try {
            await msg.delete();
            deletedBatch++;
          } catch (deleteErr) {
            if (deleteErr.code === 10008) {
              // Message already deleted, just continue
              console.log('[Offline] Message already deleted');
            } else {
              console.error('[Offline] Error deleting individual message:', deleteErr);
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 250));
        }
      }
      
      totalDeleted += deletedBatch;
      console.log(`[Offline] Deleted ${deletedBatch} messages in this batch, ${totalDeleted} total so far`);
      
      // Safety check to avoid infinite loops
      if (deletedBatch === 0) {
        console.log('[Offline] No messages were deleted in this batch, ending deletion process');
        continueDeletion = false;
      }
      
      // Small delay between batches to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      if (err.code === 50035) {
        // "Invalid Form Body" - likely empty channel or all messages too old
        console.log('[Offline] No valid messages to delete, ending deletion process');
        continueDeletion = false;
      } else {
        console.error('[Offline] Error in message deletion loop:', err);
        // Continue to try despite errors
      }
    }
  }
  
  console.log(`[Offline] Message deletion complete. Total deleted: ${totalDeleted}`);
}

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
      
      // First, send a temporary message to let users know we're clearing the channel
      let tempMessage;
      try {
        tempMessage = await channel.send('**Clearing all messages...** This channel is going offline.');
        console.log('[Offline] Temporary message sent');
      } catch (error) {
        console.error('[Offline] Error sending temporary message:', error);
      }
      
      // Thoroughly clear ALL messages in the channel before posting the offline embed.
      try {
        await thoroughlyClearMessages(channel);
        console.log('[Offline] All channel messages cleared thoroughly.');
      } catch (error) {
        console.error('[Offline] Error thoroughly clearing messages:', error);
      }
      
      // Delete the temporary message too, if it exists
      if (tempMessage) {
        try {
          await tempMessage.delete();
        } catch (error) {
          console.error('[Offline] Error deleting temporary message:', error);
        }
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
          config.imageUrls.lock, // Use URL here
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