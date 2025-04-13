// commands/code.js
const { 
  createEmbed, 
  sendEmbed, 
  safeDelete, 
  sanitizeChannelName,
  generateRandomCode 
} = require('../utils/helper');
const QueueService = require('../services/QueueService');
const ErrorHandler = require('../utils/errorHandler');
const config = require('../utils/config');
const logger = require('../utils/logger');

module.exports = {
  name: 'code',
  description: 'Send a code to players in the active session or main queue',
  usage: '$code [code]',
  examples: [
    '$code 1234-5678',
    '$code (generates random code)'
  ],
  help: 'If no code is provided, a random code will be generated. ' +
        'The code will be sent via DM to all players in the active session, ' +
        'or to the first 3 players in the main queue if no session is active.',
  
  async execute(message, args, channelConfig, client) {
    try {
      // Check if user has permission
      const hasPermission = message.member.roles.cache.some(role =>
        config.allowedRoleIds.includes(role.id)
      );
      
      if (!hasPermission) {
        return ErrorHandler.handlePermissionError(message, 'code');
      }
      
      // Get sanitized channel name
      const channelName = sanitizeChannelName(message.channel.name);
      
      // Get code from args or generate random code
      let code = args.join(' ');
      if (!code) {
        code = generateRandomCode(8);
        logger.debug(`Generated random code: ${code}`);
      }
      
      // Get channel configuration
      const config = QueueService.getChannelConfig(channelName);
      
      // Determine target group (active session or next in queue)
      let targetGroup = [];
      let sourceDescription = '';
      
      if (config.activeSession && config.activeSession.length > 0) {
        targetGroup = config.activeSession;
        sourceDescription = 'active session';
      } else {
        targetGroup = config.queue.registrations.slice(0, 3);
        sourceDescription = 'main queue';
      }
      
      // Check if target group is empty
      if (targetGroup.length === 0) {
        const emptyEmbed = createEmbed({
          color: '#ff0000',
          title: 'No Players Found',
          description: 'No players found for sending the code. Make sure there are players in the active session or queue.',
        });
        
        await message.channel.send({ embeds: [emptyEmbed] });
        return;
      }
      
      // Send code to players
      const { successfulDMs, failedDMs } = await sendCodesToPlayers(targetGroup, code, message.author, client);
      
      // Send ping if configured
      if (config.pingRoleId) {
        const pingMsg = await message.channel.send(`<@&${config.pingRoleId}>`);
        safeDelete(pingMsg, 1000);
      }
      
      // Send success embed
      await sendEmbed(
        message.channel,
        '#00ff00',
        'Union Circle Code Sent',
        `${message.author} has dispatched codes to the ${sourceDescription}.\n\n` +
        `${successfulDMs} out of ${targetGroup.length} players received their code.`,
        null,
        [{ 
          name: 'Status', 
          value: successfulDMs === targetGroup.length 
            ? 'All Direct Messages Sent Successfully' 
            : 'Some Direct Messages Failed (see details below)'
        }]
      );
      
      // Send failed DM information if any
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
      
      // Delete the command message
      safeDelete(message, 0);
    } catch (error) {
      ErrorHandler.handleCommandError(error, message, 'code');
    }
  },
};

/**
 * Send codes to players via DM
 * @param {Array} players - Player registration data
 * @param {string} code - Code to send
 * @param {User} host - Host user
 * @param {Client} client - Discord client
 * @returns {Object} Results of DM sending
 */
async function sendCodesToPlayers(players, code, host, client) {
  const failedDMs = [];
  let successfulDMs = 0;
  
  for (const player of players) {
    try {
      // Fetch user
      const user = await client.users.fetch(player.userId);
      
      if (!user) {
        logger.error(`Failed to fetch user: ${player.userId}`);
        failedDMs.push({ userId: player.userId, reason: 'User not found' });
        continue;
      }
      
      // Create DM embed
      const dmEmbed = createEmbed({
        color: '#0099ff',
        title: `${host.username}'s Union Circle Code`,
        description: `Your code is: \`${code}\``,
        image: config.imageUrls.custom,
        extraFields: [
          { name: 'Your Character', value: `IGN: \`${player.ign}\`\nPokémon: \`${player.pokemon}\`` },
          { name: 'Note', value: 'This code is for the current session only.' }
        ],
      });
      
      // Send DM
      await user.send({ embeds: [dmEmbed] });
      successfulDMs++;
      
      logger.debug(`Successfully sent DM to: ${user.tag} (${player.userId})`);
    } catch (error) {
      logger.error(`DM Error for ${player.userId}:`, error);
      
      if (error.code === 50007) {
        failedDMs.push({ userId: player.userId, reason: 'DMs disabled' });
      } else {
        failedDMs.push({ userId: player.userId, reason: `Error: ${error.message || 'Unknown error'}` });
      }
    }
  }
  
  return { successfulDMs, failedDMs };
}