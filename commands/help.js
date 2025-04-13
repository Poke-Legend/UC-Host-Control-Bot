// commands/help.js
const { 
  createEmbed, 
  hexToInt, 
  sanitizeChannelName 
} = require('../utils/helper');
const { SlashCommandBuilder } = require('discord.js');
const config = require('../utils/config');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Both message command and slash command versions
module.exports = {
  // Message command properties
  name: 'help',
  description: 'Displays help information for Union Circle Bot commands',
  usage: '$help [command]',
  examples: [
    '$help',
    '$help queue',
    '$help session',
    '$help code'
  ],
  
  // Slash command properties
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays help information for Union Circle Bot commands')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('Specific command to get help for')
        .setRequired(false)
    ),
  
  // Message command execution
  async execute(message, args, channelConfig, client) {
    try {
      // Check if a specific command was requested
      if (args.length > 0) {
        return displaySpecificHelp(message, args[0], client);
      }
      
      // Display general help with all commands
      await displayGeneralHelp(message, client);
    } catch (error) {
      logger.error('Error in help command:', error);
      await message.channel.send('An error occurred while displaying help information.');
    }
  },
  
  // Slash command execution
  async executeSlash(interaction, client) {
    try {
      await interaction.deferReply();
      
      // Check if specific command help was requested
      const commandName = interaction.options.getString('command');
      
      if (commandName) {
        // Display help for specific command
        const helpEmbed = await getSpecificHelpEmbed(commandName, client);
        return interaction.editReply({ embeds: [helpEmbed] });
      }
      
      // Display general help
      const helpEmbed = getGeneralHelpEmbed(client);
      await interaction.editReply({ embeds: [helpEmbed] });
    } catch (error) {
      logger.error('Error in /help command:', error);
      await interaction.editReply('An error occurred while displaying help information.');
    }
  }
};

/**
 * Display general help for all commands
 * @param {Message} message - Discord message
 * @param {Client} client - Discord client
 */
async function displayGeneralHelp(message, client) {
  const helpEmbed = getGeneralHelpEmbed(client);
  await message.channel.send({ embeds: [helpEmbed] });
}

/**
 * Display help for a specific command
 * @param {Message} message - Discord message
 * @param {string} commandName - Command name
 * @param {Client} client - Discord client
 */
async function displaySpecificHelp(message, commandName, client) {
  // Remove $ or / prefix if user included it
  commandName = commandName.replace(/^[$\/]/, '');
  
  // Get help embed for the specified command
  const helpEmbed = await getSpecificHelpEmbed(commandName, client);
  
  await message.channel.send({ embeds: [helpEmbed] });
}

/**
 * Get general help embed with all commands
 * @param {Client} client - Discord client
 * @returns {EmbedBuilder} Help embed
 */
function getGeneralHelpEmbed(client) {
  return createEmbed({
    color: '#0099ff',
    title: 'Union Circle Bot - Command Guide',
    description: 'Welcome to the Union Circle Bot help menu! Below you\'ll find all available commands organized by category:',
    extraFields: [
      {
        name: '🔄 Channel Management',
        value: '`$online` - Open the channel, enable messaging, reset data\n' +
               '`$offline` - Close the channel, disable messaging, reset data\n' +
               '`/manage` - Admin commands for channel management',
      },
      {
        name: '📋 Registration & Session',
        value: '`/register` - Register your in-game details via interactive modal\n' +
               '`/session start` - Begin the next session and DM player details to the host\n' +
               '`/session info` - View details of the current active session\n' +
               '`/session end` - End the current session\n' +
               '`/session extend` - Add more players to the current session',
      },
      {
        name: '📊 Queue Management',
        value: '`$queue list` - Show the current main queue\n' +
               '`$queue waiting` - View pending registrations with pagination\n' +
               '`$queue move` - Move players from waiting list to main queue\n' +
               '`$queue stats` - View statistics about current queues\n' +
               '`$queue clear` - Clear the main queue\n' +
               '`$resetregister` - Reset all user registrations\n' +
               '`$resetuser` - Reset registration for a specific user',
      },
      {
        name: '👤 Player Commands',
        value: '`/status` - Check your position in queue and estimated wait time\n' +
               '`/levels` - View your current level, XP progress, and gym badges\n' +
               '`/leveluser` - View leveling info for another user',
      },
      {
        name: '🎮 Host Commands',
        value: '`$code` - Send Union Circle codes to active players\n' +
               '`$fly` - Fly to Levincia with animation\n' +
               '`$fly2` - Fly to Alfornada with animation\n' +
               '`$flyplatos` - Fly to Los Platos with animation\n' +
               '`$stay` - Request users to remain stationary\n' +
               '`$ready` - Indicate readiness (Artazon)\n' +
               '`$slut` - VIP command for Los Platos',
      },
      {
        name: '🔒 Moderation',
        value: '`/ucban` - Ban a user from all Union Circles\n' +
               '`/ucunban` - Unban a user from Union Circles\n' +
               '`/modifyxp` - Add or remove XP (Admin only)',
      },
      {
        name: 'ℹ️ Bot Information',
        value: '`$help` or `/help` - Display this help message\n' +
               '`$help <command>` - Get detailed help for a specific command\n' +
               '`$about` - Detailed bot and developer information\n' +
               '`$info` - Quick version and uptime information\n' +
               '`$stats` - Display server statistics',
      },
    ],
    image: config.imageUrls.custom,
  });
}

/**
 * Get specific help embed for a command
 * @param {string} commandName - Command name
 * @param {Client} client - Discord client
 * @returns {EmbedBuilder} Command help embed
 */
async function getSpecificHelpEmbed(commandName, client) {
  // Check if command exists in client's commands collection
  const command = client.commands.get(commandName);
  
  // If command not found, return error embed
  if (!command) {
    return createEmbed({
      color: '#ff0000',
      title: 'Command Not Found',
      description: `Command \`${commandName}\` not found. Use \`$help\` to see all available commands.`,
    });
  }
  
  // Build fields array
  const fields = [];
  
  // Add usage information if available
  if (command.usage) {
    fields.push({
      name: 'Usage',
      value: `\`${command.usage}\``
    });
  } else {
    fields.push({
      name: 'Usage',
      value: `\`$${command.name}\``
    });
  }
  
  // Add examples if available
  if (command.examples && command.examples.length > 0) {
    fields.push({
      name: 'Examples',
      value: command.examples.map(example => `\`${example}\``).join('\n')
    });
  }
  
  // Add subcommands if available
  if (command.subcommands && command.subcommands.length > 0) {
    fields.push({
      name: 'Subcommands',
      value: command.subcommands.map(subcommand => `\`${subcommand}\``).join(', ')
    });
  }
  
  // Add additional help information if available
  if (command.help) {
    fields.push({
      name: 'Additional Information',
      value: command.help
    });
  }
  
  // Add permissions if available
  if (command.permissions) {
    fields.push({
      name: 'Required Permissions',
      value: command.permissions
    });
  } else if (command.name !== 'help' && command.name !== 'info' && 
             command.name !== 'stats' && command.name !== 'about') {
    fields.push({
      name: 'Required Permissions',
      value: 'Requires host role to use this command.'
    });
  }
  
  // Create and return the embed
  return createEmbed({
    color: '#0099ff',
    title: `Command: ${command.name}`,
    description: command.description || 'No description available.',
    extraFields: fields
  });
}