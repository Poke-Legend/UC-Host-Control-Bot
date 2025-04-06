// commands/help.js
const { createEmbed } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'help',
  description: 'Displays help information for Union Circle Hosting',
  async execute(message, args, channelConfig, client) {
    // Check if a specific command was requested
    if (args.length > 0) {
      return displaySpecificHelp(message, args[0], client);
    }
    
    // Display general help with all commands
    const helpEmbed = createEmbed({
      color: '#0099ff',
      title: 'Union Circle Bot - Command Guide',
      description: 'Welcome to the Union Circle Bot help menu! Below you\'ll find all available commands organized by category:',
      extraFields: [
        {
          name: '🔄 Channel Management',
          value: '`$online` - Open the channel, enable messaging, reset data\n' +
                 '`$offline` - Close the channel, disable messaging, reset data',
        },
        {
          name: '📋 Registration & Session',
          value: '`/register` - Register your in-game details via interactive modal\n' +
                 '`$start` - Begin the next session and DM player details to the host\n' +
                 '`$starthere` - Display active session details in the channel\n' +
                 '`$startqueue` - Show session details publicly in the channel\n' +
                 '`$endqueue` - End the current session without starting a new one',
        },
        {
          name: '📊 Queue Management',
          value: '`$queue` - Show the current main session queue\n' +
                 '`$waitlist` - View pending registrations with pagination\n' +
                 '`$nextqueue` - Move players from waiting list to main queue\n' +
                 '`$resetregister` - Reset all user registrations (queue/waitlist intact)\n' +
                 '`$resetuser` - Reset registration for a specific user\n' +
                 '`$removewait` - Remove a specific user from the waiting list',
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
          name: '🏆 UC Leveling System',
          value: '`/levels` - View your current level, XP progress, and gym badges\n' +
                 '`/leveluser` - View leveling info for another user\n' +
                 '`/modifyxp` - Add or remove XP (Admin only)',
        },
        {
          name: '🔒 Moderation',
          value: '`/ucban` - Ban a user from all Union Circles\n' +
                 '`/ucunban` - Unban a user from Union Circles',
        },
        {
          name: 'ℹ️ Bot Information',
          value: '`$help` - Display this help message\n' +
                 '`$help <command>` - Get detailed help for a specific command\n' +
                 '`$about` - Detailed bot and developer information\n' +
                 '`$info` - Quick version and uptime information\n' +
                 '`$stats` - Display server statistics',
        },
      ],
      image: config.imageUrls.custom,  // Use URL here to work in locked channels
    });
    
    await message.channel.send({ embeds: [helpEmbed] });
  },
};

// Function to display help for a specific command
async function displaySpecificHelp(message, commandName, client) {
  // Remove $ or / prefix if user included it
  commandName = commandName.replace(/^[$\/]/, '');
  
  // Check if command exists in the client's commands collection
  const command = client.commands.get(commandName);
  
  if (!command) {
    return message.channel.send(`Command \`${commandName}\` not found. Use \`$help\` to see all available commands.`);
  }
  
  // Prepare command-specific help embed
  const commandHelp = {
    color: '#0099ff',
    title: `Command: ${command.name}`,
    description: command.description || 'No description available.',
    fields: []
  };
  
  // Add usage information if available
  if (command.usage) {
    commandHelp.fields.push({
      name: 'Usage',
      value: `\`${command.usage}\``
    });
  } else {
    commandHelp.fields.push({
      name: 'Usage',
      value: `\`$${command.name}\``
    });
  }
  
  // Add examples if available
  if (command.examples) {
    commandHelp.fields.push({
      name: 'Examples',
      value: command.examples.map(example => `\`${example}\``).join('\n')
    });
  }
  
  // Add additional help information if available
  if (command.help) {
    commandHelp.fields.push({
      name: 'Additional Information',
      value: command.help
    });
  }
  
  // Add permissions if available
  if (command.permissions) {
    commandHelp.fields.push({
      name: 'Required Permissions',
      value: command.permissions
    });
  } else {
    commandHelp.fields.push({
      name: 'Required Permissions',
      value: 'Requires host role to use this command.'
    });
  }
  
  // Create and send the embed
  const helpEmbed = createEmbed({
    color: '#0099ff',
    title: commandHelp.title,
    description: commandHelp.description,
    extraFields: commandHelp.fields
  });
  
  await message.channel.send({ embeds: [helpEmbed] });
}