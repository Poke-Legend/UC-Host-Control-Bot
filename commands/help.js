const { createEmbed } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'help',
  description: 'Displays help information for Union Circle Hosting',
  async execute(message, args, channelConfig, client) {
    const helpEmbed = createEmbed({
      color: '#0099ff',
      title: 'Union Circle Bot - Command Guide',
      description: 'Welcome to the Union Circle Bot help menu! Below you\'ll find all available commands organized by category:',
      extraFields: [
        {
          name: '🔄 Channel Management',
          value: '`$online` - Open the channel, enable messaging, reset all data.\n' +
                 '`$offline` - Close the channel, disable messaging, reset all data.',
        },
        {
          name: '📋 Registration & Session',
          value: '`/register` - Register your in-game details via an interactive modal.\n' +
                 '`$start` - Begin the next session and DM player details to the host.\n' +
                 '`$starthere` - Display active session details in the channel.\n' +
                 '`$startqueue` - Show session details publicly in the channel.',
        },
        {
          name: '📊 Queue Management',
          value: '`$queue` - Show the current main session queue.\n' +
                 '`$waitlist` - View pending registrations with pagination.\n' +
                 '`$nextqueue` - Move players from waiting list to main queue.\n' +
                 '`$resetregister` - Reset all user registrations (queue/waitlist intact).\n' +
                 '`$resetuser` - Reset registration for a specific user.\n' +
                 '`$removewait` - Remove a specific user from the waiting list.',
        },
        {
          name: '🎮 Host Commands',
          value: '`$code` - Send Union Circle codes to active players.\n' +
                 '`$fly` - Fly to Levincia with animation.\n' +
                 '`$fly2` - Fly to Alfornada with animation.\n' +
                 '`$flyplatos` - Fly to Los Platos with animation.\n' +
                 '`$stay` - Request users to remain stationary.\n' +
                 '`$ready` - Indicate readiness (Artazon).\n' +
                 '`$slut` - VIP command for Los Platos.',
        },
        {
          name: '🏆 UC Leveling System',
          value: '`/levels` - View your current level, XP progress, and gym badges.\n' +
                 '`/leveluser` - View leveling info for another user.\n' +
                 '`/modifyxp` - Add or remove XP (Admin only).',
        },
        {
          name: '🔒 Moderation',
          value: '`/ucban` - Ban a user from all Union Circles.\n' +
                 '`/ucunban` - Unban a user from Union Circles.',
        },
        {
          name: 'ℹ️ Bot Information',
          value: '`$help` - Display this help message.\n' +
                 '`$about` - Detailed bot and developer information.\n' +
                 '`$info` - Quick version and uptime information.\n' +
                 '`$stats` - Display server statistics.',
        },
      ],
      image: config.images.custom,
    });
    await message.channel.send({ embeds: [helpEmbed] });
  },
};