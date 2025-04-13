// commands/status.js
const { SlashCommandBuilder } = require('discord.js');
const QueueService = require('../services/QueueService');
const { createEmbed, sanitizeChannelName, formatTimestamp } = require('../utils/helper');
const ErrorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check your position in the Union Circle queue or waiting list')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check (defaults to yourself)')
        .setRequired(false)
    ),
  
  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      // Get target user (self or specified user)
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const channelName = sanitizeChannelName(interaction.channel.name);
      
      logger.debug(`Status check requested for user ${targetUser.tag} in channel ${channelName}`);
      
      // Get user status from queue service
      const status = QueueService.getUserStatus(channelName, targetUser.id);
      
      // If not registered anywhere
      if (!status.isRegistered) {
        return interaction.editReply({
          content: targetUser.id === interaction.user.id
            ? "You're not currently registered in this Union Circle. Use `/register` to join the waiting list."
            : `${targetUser.username} is not currently registered in this Union Circle.`
        });
      }
      
      // Create status embed
      const embed = createEmbed({
        color: '#0099ff',
        title: `${targetUser.username}'s Queue Status`,
        description: getStatusDescription(status, targetUser, interaction.user)
      });
      
      // Add additional information based on status
      if (status.inActiveSession) {
        // Add session info
        const config = QueueService.getChannelConfig(channelName);
        const sessionStartTime = config.sessionStartTime || Date.now();
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 60000); // in minutes
        
        embed.addFields([{
          name: 'Session Info',
          value: `Active for ${sessionDuration} minute(s) with ${config.activeSession.length} player(s)`
        }]);
      } else if (status.inWaitingList) {
        // Add estimated wait time
        const config = QueueService.getChannelConfig(channelName);
        const waitlistPosition = status.position;
        const estimatedWait = QueueService.getEstimatedWaitTime(
          channelName,
          waitlistPosition,
          'waitlist'
        );
        
        embed.addFields([{
          name: 'Estimated Wait Time',
          value: estimatedWait
        }]);
      } else if (status.inQueue) {
        // Add queue info
        embed.addFields([{
          name: 'Next Session',
          value: 'You will be part of the next session when the host runs `$start`'
        }]);
      }
      
      // Add registration info if available
      if (status.registration && status.registration.registeredAt) {
        embed.addFields([{
          name: 'Registered At',
          value: formatTimestamp(status.registration.registeredAt)
        }]);
      }
      
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return ErrorHandler.handleCommandError(error, interaction, 'status');
    }
  }
};

/**
 * Get status description based on user's status
 * @param {Object} status - User status object
 * @param {User} targetUser - Target Discord user
 * @param {User} requestingUser - User who requested the status
 * @returns {string} Status description
 */
function getStatusDescription(status, targetUser, requestingUser) {
  const isSelf = targetUser.id === requestingUser.id;
  const prefix = isSelf ? "You are" : `${targetUser.username} is`;
  
  if (status.inActiveSession) {
    return `${prefix} currently in the **active session**!\n\n` +
           `Position: **${status.position}** of the current session\n` +
           `Character: **${status.registration.ign}** (${status.registration.pokemon})` +
           `${status.registration.shiny === 'Yes' ? ' ✨' : ''}`;
  }
  
  if (status.inQueue) {
    return `${prefix} in the **main queue**!\n\n` +
           `Position: **${status.position}** in the queue\n` +
           `Character: **${status.registration.ign}** (${status.registration.pokemon})` +
           `${status.registration.shiny === 'Yes' ? ' ✨' : ''}\n\n` +
           `You'll be added to the next session when the host runs \`$start\`.`;
  }
  
  if (status.inWaitingList) {
    return `${prefix} in the **waiting list**!\n\n` +
           `Position: **${status.position}** in the waiting list\n` +
           `Character: **${status.registration.ign}** (${status.registration.pokemon})` +
           `${status.registration.shiny === 'Yes' ? ' ✨' : ''}\n\n` +
           `You'll be moved to the main queue when the host runs \`$nextqueue\`.`;
  }
  
  return `${prefix} registered but not currently in any queue or session.\n\n` +
         `This is unusual - please contact a host if you believe this is an error.`;
}