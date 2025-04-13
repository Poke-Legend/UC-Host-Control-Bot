// commands/offline.js
const { sendEmbed, safeDelete, sanitizeChannelName } = require('../utils/helper');
const { PermissionsBitField } = require('discord.js');
const QueueService = require('../services/QueueService');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Enhanced function to thoroughly clear all messages in a channel
 * Uses a recursive approach to ensure complete deletion even with many messages
 * @param {TextChannel} channel - The Discord channel to clear
 * @returns {Promise<void>}
 */
async function thoroughlyClearMessages(channel) {
  logger.info(`[Offline] Starting thorough message clearing in channel: ${channel.name}`);
  
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
      
      logger.info(`[Offline] Fetched ${fetchedCount} messages`);
      
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
              logger.info('[Offline] Message already deleted');
            } else {
              logger.error('[Offline] Error deleting individual message:', deleteErr);
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 250));
        }
      }
      
      totalDeleted += deletedBatch;
      logger.info(`[Offline] Deleted ${deletedBatch} messages in this batch, ${totalDeleted} total so far`);
      
      // Safety check to avoid infinite loops
      if (deletedBatch === 0) {
        logger.info('[Offline] No messages were deleted in this batch, ending deletion process');
        continueDeletion = false;
      }
      
      // Small delay between batches to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      if (err.code === 50035) {
        // "Invalid Form Body" - likely empty channel or all messages too old
        logger.info('[Offline] No valid messages to delete, ending deletion process');
        continueDeletion = false;
      } else {
        logger.error('[Offline] Error in message deletion loop:', err);
        // Continue to try despite errors
      }
    }
  }
  
  logger.info(`[Offline] Message deletion complete. Total deleted: ${totalDeleted}`);
}

module.exports = {
  name: 'offline',
  description: 'Lock the channel, deny sending messages, clear all messages, and reset queues, waiting list, and registrations',
  async execute(message, args, channelConfig, client) {
    logger.info('[Offline] Command triggered by:', message.author.tag);
    
    // Check if the member has one of the allowed roles.
    const hasPermission = message.member.roles.cache.some(role =>
      config.allowedRoleIds.includes(role.id)
    );
    if (!hasPermission) {
      logger.warn('[Offline] User lacks permission.');
      await sendEmbed(
        message.channel,
        '#ff0000',
        'Permission Denied',
        'You do not have permission to use this command.'
      );
      return;
    }
    
    const channel = message.channel;
    logger.info('[Offline] Current channel name:', channel.name);
    
    // If the channel isn't already locked (i.e. doesn't start with the lock emoji)
    if (!channel.name.startsWith(config.lockEmoji)) {
      // Update channel name: Prepend lock emoji and remove any unlock emoji.
      const newName = `${config.lockEmoji}${channel.name.replace(config.unlockEmoji, '')}`;
      try {
        await channel.setName(newName);
        logger.info('[Offline] Channel name updated to:', newName);
      } catch (error) {
        logger.error('[Offline] Error setting channel name:', error);
      }
      
      // Deny the managed role from sending messages.
      try {
        await channel.permissionOverwrites.edit(config.managedRoleId, {
          [PermissionsBitField.Flags.SendMessages]: false,
        });
        logger.info('[Offline] Channel permissions updated: SendMessages denied.');
      } catch (error) {
        logger.error('[Offline] Error updating channel permissions:', error);
      }
      
      // First, send a temporary message to let users know we're clearing the channel
      let tempMessage;
      try {
        tempMessage = await channel.send('**Clearing all messages...** This channel is going offline.');
        logger.info('[Offline] Temporary message sent');
      } catch (error) {
        logger.error('[Offline] Error sending temporary message:', error);
      }
      
      // Thoroughly clear ALL messages in the channel before posting the offline embed.
      try {
        await thoroughlyClearMessages(channel);
        logger.info('[Offline] All channel messages cleared thoroughly.');
      } catch (error) {
        logger.error('[Offline] Error thoroughly clearing messages:', error);
      }
      
      // Delete the temporary message too, if it exists
      if (tempMessage) {
        try {
          await tempMessage.delete();
        } catch (error) {
          logger.error('[Offline] Error deleting temporary message:', error);
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
        logger.info('[Offline] Offline embed sent successfully.');
      } catch (error) {
        logger.error('[Offline] Error sending offline embed:', error);
      }
      
      // Update configuration with the current timestamp and embed ID.
      const now = Date.now();
      channelConfig.lastCommands[message.guild.id] = { timestamp: now, command: 'offline' };
      channelConfig.offlineEmbedMessageId = offlineMsg ? offlineMsg.id : null;
      
      // Save the updated configuration using QueueService
      const sanitizedChannelName = sanitizeChannelName(channel.name);
      QueueService.saveChannelConfig(sanitizedChannelName, channelConfig);
      logger.info('[Offline] Channel configuration saved and queues reset.');
    } else {
      // If the channel is already offline, send an "Already Offline" embed.
      try {
        logger.info('[Offline] Channel is already offline. Sending "Already Offline" embed.');
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
        logger.error('[Offline] Error sending already offline embed:', error);
      }
    }
    
    // Finally, delete the user's command message.
    safeDelete(message, 0);
  },
};