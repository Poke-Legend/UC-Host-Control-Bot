// commands/queue.js
const { 
  createEmbed, 
  hexToInt,
  sanitizeChannelName 
} = require('../utils/helper');
const QueueService = require('../services/QueueService');
const ErrorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

module.exports = {
  name: 'queue',
  description: 'Display and manage the main queue and waiting list',
  usage: '$queue [subcommand]',
  subcommands: ['list', 'waiting', 'stats', 'clear', 'move'],
  examples: [
    '$queue',
    '$queue list',
    '$queue waiting',
    '$queue stats',
    '$queue clear',
    '$queue move 3'
  ],
  help: 'Use subcommands to manage the queue:\n' +
        '- `list`: Show the main queue (default)\n' +
        '- `waiting`: Show the waiting list\n' +
        '- `stats`: Show queue statistics\n' +
        '- `clear`: Clear the main queue (host only)\n' +
        '- `move <count>`: Move players from waiting list to main queue (host only)',
  
  async execute(message, args, channelConfig, client) {
    try {
      // Get sanitized channel name
      const channelName = sanitizeChannelName(message.channel.name);
      
      // Extract subcommand
      const subcommand = args[0]?.toLowerCase() || 'list';
      
      // Handle different subcommands
      switch (subcommand) {
        case 'list':
          await handleQueueList(message, channelName);
          break;
        case 'waiting':
          await handleWaitingList(message, channelName);
          break;
        case 'stats':
          await handleQueueStats(message, channelName);
          break;
        case 'clear':
          await handleClearQueue(message, channelName);
          break;
        case 'move':
          const count = parseInt(args[1], 10) || 3;
          await handleMoveToQueue(message, channelName, count);
          break;
        default:
          // Default to showing the main queue
          await handleQueueList(message, channelName);
      }
    } catch (error) {
      await ErrorHandler.handleCommandError(error, message, 'queue');
    }
  }
};

/**
 * Handle queue list subcommand
 * @param {Message} message - Discord message
 * @param {string} channelName - Sanitized channel name
 */
async function handleQueueList(message, channelName) {
  logger.debug(`Queue list requested for channel: ${channelName}`);
  
  // Get channel configuration from service
  const config = QueueService.getChannelConfig(channelName);
  const queue = config.queue.registrations;
  
  // If queue is empty, show a simple message
  if (!queue || queue.length === 0) {
    const embed = createEmbed({
      color: '#0099ff',
      title: 'Main Queue',
      description: 'There are no players in the main queue.',
    });
    
    await message.channel.send({ embeds: [embed] });
    return;
  }
  
  // Display queue with pagination
  await displayPaginatedList(
    message,
    queue,
    'Main Queue',
    10,
    'queue'
  );
}

/**
 * Handle waiting list subcommand
 * @param {Message} message - Discord message
 * @param {string} channelName - Sanitized channel name
 */
async function handleWaitingList(message, channelName) {
  logger.debug(`Waiting list requested for channel: ${channelName}`);
  
  // Get channel configuration from service
  const config = QueueService.getChannelConfig(channelName);
  const waitingList = config.waitingList;
  
  // If waiting list is empty, show a simple message
  if (!waitingList || waitingList.length === 0) {
    const embed = createEmbed({
      color: '#0099ff',
      title: 'Waiting List',
      description: 'There are no players in the waiting list.',
    });
    
    await message.channel.send({ embeds: [embed] });
    return;
  }
  
  // Display waiting list with pagination
  await displayPaginatedList(
    message,
    waitingList,
    'Waiting List',
    10,
    'waitlist'
  );
}

/**
 * Handle queue stats subcommand
 * @param {Message} message - Discord message
 * @param {string} channelName - Sanitized channel name
 */
async function handleQueueStats(message, channelName) {
  logger.debug(`Queue stats requested for channel: ${channelName}`);
  
  // Get channel stats from service
  const stats = QueueService.getChannelStats(channelName);
  
  // Calculate session information
  let sessionInfo = 'No active session';
  if (stats.hasActiveSession) {
    const sessionDuration = stats.sessionStartTime 
      ? Math.floor((Date.now() - stats.sessionStartTime) / 60000) // in minutes
      : 'Unknown';
    
    sessionInfo = `Active for ${sessionDuration} minutes with ${stats.activeSessionSize} player(s)`;
  }
  
  // Create stats embed
  const embed = createEmbed({
    color: '#0099ff',
    title: 'Union Circle Queue Statistics',
    description: `Current status of queues in <#${message.channel.id}>:`,
    extraFields: [
      { name: 'Active Session', value: sessionInfo, inline: false },
      { name: 'Main Queue Size', value: `${stats.queueSize} player(s)`, inline: true },
      { name: 'Waiting List Size', value: `${stats.waitlistSize} player(s)`, inline: true },
      { name: 'Total Registered', value: `${stats.totalRegistered} player(s)`, inline: true },
    ]
  });
  
  await message.channel.send({ embeds: [embed] });
}

/**
 * Handle clear queue subcommand
 * @param {Message} message - Discord message
 * @param {string} channelName - Sanitized channel name
 */
async function handleClearQueue(message, channelName) {
  logger.debug(`Clear queue requested for channel: ${channelName}`);
  
  // Check if user has permission (host role)
  const hasPermission = message.member.roles.cache.some(role =>
    require('../utils/config').allowedRoleIds.includes(role.id)
  );
  
  if (!hasPermission) {
    const embed = createEmbed({
      color: '#ff0000',
      title: 'Permission Denied',
      description: 'You do not have permission to clear the queue.',
    });
    
    await message.channel.send({ embeds: [embed] });
    return;
  }
  
  // Get channel configuration
  const config = QueueService.getChannelConfig(channelName);
  const queueSize = config.queue.registrations.length;
  
  // Clear the queue
  config.queue.registrations = [];
  QueueService.saveChannelConfig(channelName, config);
  
  // Send confirmation
  const embed = createEmbed({
    color: '#00ff00',
    title: 'Queue Cleared',
    description: `${message.author} has cleared the main queue (${queueSize} player(s) removed).`,
    extraFields: [
      { name: 'Waiting List', value: `${config.waitingList.length} player(s) still waiting` },
    ]
  });
  
  await message.channel.send({ embeds: [embed] });
}

/**
 * Handle move to queue subcommand
 * @param {Message} message - Discord message
 * @param {string} channelName - Sanitized channel name
 * @param {number} count - Number of players to move
 */
async function handleMoveToQueue(message, channelName, count) {
  logger.debug(`Move to queue requested for channel: ${channelName} (count: ${count})`);
  
  // Check if user has permission (host role)
  const hasPermission = message.member.roles.cache.some(role =>
    require('../utils/config').allowedRoleIds.includes(role.id)
  );
  
  if (!hasPermission) {
    const embed = createEmbed({
      color: '#ff0000',
      title: 'Permission Denied',
      description: 'You do not have permission to move players to the queue.',
    });
    
    await message.channel.send({ embeds: [embed] });
    return;
  }
  
  // Validate count
  if (isNaN(count) || count < 1 || count > 10) {
    const embed = createEmbed({
      color: '#ff0000',
      title: 'Invalid Count',
      description: 'Please provide a number between 1 and 10.',
    });
    
    await message.channel.send({ embeds: [embed] });
    return;
  }
  
  // Move players from waiting list to queue
  const movedPlayers = QueueService.moveToQueue(channelName, count);
  
  // If no players were moved, show a message
  if (movedPlayers.length === 0) {
    const embed = createEmbed({
      color: '#ff9900',
      title: 'No Players Moved',
      description: 'There are no players in the waiting list to move.',
    });
    
    await message.channel.send({ embeds: [embed] });
    return;
  }
  
  // Format moved players list
  const playersList = movedPlayers.map((reg, index) => {
    return `${index + 1}. <@${reg.userId}> | IGN: **${reg.ign}** | ${reg.pokemon}${reg.shiny === 'Yes' ? ' ✨' : ''}`;
  }).join('\n');
  
  // Send confirmation
  const embed = createEmbed({
    color: '#00ff00',
    title: 'Players Moved to Queue',
    description: `${message.author} has moved ${movedPlayers.length} player(s) from the waiting list to the main queue.`,
    extraFields: [
      { name: 'Moved Players', value: playersList },
      { name: 'Next Steps', value: 'Use `$start` to begin a session with these players.' },
    ]
  });
  
  await message.channel.send({ embeds: [embed] });
}

/**
 * Display a paginated list (queue or waiting list)
 * @param {Message} message - Discord message
 * @param {Array} items - List items
 * @param {string} title - Embed title
 * @param {number} itemsPerPage - Items per page
 * @param {string} listType - List type ('queue' or 'waitlist')
 */
async function displayPaginatedList(message, items, title, itemsPerPage = 10, listType = 'queue') {
  // Calculate total pages
  const totalPages = Math.ceil(items.length / itemsPerPage);
  let currentPage = 0;
  
  // Function to generate embed for a specific page
  const generateEmbed = (page) => {
    const start = page * itemsPerPage;
    const end = Math.min(start + itemsPerPage, items.length);
    const pageItems = items.slice(start, end);
    
    // Format list items
    const formattedList = pageItems.map((reg, index) => {
      const position = start + index + 1;
      
      // Build item string with priority indicator
      const prioritySymbol = (reg.priority > 0) ? ' 🌟'.repeat(reg.priority) : '';
      
      return `${position}. <@${reg.userId}>${prioritySymbol}\n` +
             `IGN: **${reg.ign}** | ${reg.pokemon}${reg.shiny === 'Yes' ? ' ✨' : ''}` +
             `${reg.pokemonLevel ? ` (Lvl ${reg.pokemonLevel})` : ''}`;
    }).join('\n\n');
    
    // Get estimated wait time for first item on page
    let waitTimeField = {};
    if (items.length > 0 && listType) {
      const waitTime = QueueService.getEstimatedWaitTime(
        sanitizeChannelName(message.channel.name),
        start + 1,
        listType
      );
      
      waitTimeField = {
        name: 'Estimated Wait Time',
        value: waitTime
      };
    }
    
    // Create embed
    return createEmbed({
      color: '#0099ff',
      title: `${title} (${items.length} players)`,
      description: formattedList || 'No players in the list.',
      extraFields: [
        waitTimeField,
        { name: 'Page', value: `${page + 1} / ${totalPages}` }
      ]
    });
  };
  
  // Create navigation buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev_page')
      .setLabel('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId('next_page')
      .setLabel('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages - 1)
  );
  
  // Send initial embed with buttons
  const embedMessage = await message.channel.send({
    embeds: [generateEmbed(currentPage)],
    components: [row]
  });
  
  // Set up collector for button interactions
  const filter = i => i.user.id === message.author.id && 
                     ['prev_page', 'next_page'].includes(i.customId);
  const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });
  
  collector.on('collect', async i => {
    if (i.customId === 'prev_page' && currentPage > 0) {
      currentPage--;
    } else if (i.customId === 'next_page' && currentPage < totalPages - 1) {
      currentPage++;
    }
    
    // Update navigation buttons
    const updatedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage >= totalPages - 1)
    );
    
    await i.update({
      embeds: [generateEmbed(currentPage)],
      components: [updatedRow]
    });
  });
  
  collector.on('end', async () => {
    try {
      // Remove buttons when collector ends
      await embedMessage.edit({
        components: []
      });
    } catch (error) {
      logger.error('Error removing buttons from queue list:', error);
    }
  });
}