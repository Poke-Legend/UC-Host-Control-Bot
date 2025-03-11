// commands/help.js
const { createEmbed } = require('../utils/helper');
const config = require('../utils/config');

module.exports = {
  name: 'help',
  description: 'Displays help information for Union Circle Hosting',
  async execute(message, args, channelConfig, client) {
    const helpEmbed = createEmbed({
      color: '#0099ff',
      title: 'Union Hosting - Help & Commands',
      description: 'Below are the available commands for Union Circle Hosting.',
      extraFields: [
        {
          name: '🔒 Channel Management',
          value: '`$offline` - Lock the channel, reset queues, and disable messaging.\n' +
                 '`$online` - Unlock the channel, reset queues, and enable messaging.',
        },
        {
          name: '📋 Registration & Session',
          value: '`/register` - Register your in-game details via a modal.\n' +
                 '`$start` - Begin the next session and DM details to the host.\n' +
                 '`$starthere` - Display active session details in the channel.\n' +
                 '`$startqueue` - Show session details publicly.',
        },
        {
          name: '⏩ Queue Management',
          value: '`$waitlist` - View pending registrations with pagination.\n' +
                 '`$queue` - Show the main session queue.\n' +
                 '`$nextqueue` - Move players from the waiting list to the main queue.',
        },
        {
          name: '🛠 Registration Reset & User Management',
          value: '`$resetregister` - Reset user registrations (queue/waitlist remain intact).\n' +
                 '`$resetuser` - Reset registration for a specific user.\n' +
                 '`$removewait` - Remove a user from the waiting list.',
        },
        {
          name: '🔑 Code Distribution',
          value: '`$code` - Distribute codes to players.',
        },
        {
          name: '✈️ Flight & Fun Commands',
          value: '`$fly` - Fly to Levincia.\n' +
                 '`$fly2` - Fly to Alfornada.\n' +
                 '`$flyplatos` - Fly to Los Platos.\n' +
                 '`$stay` - Request users to stay.\n' +
                 '`$ready` - Indicate readiness.\n' +
                 '`$slut` - VIP command for Los Platos.',
        },
        {
          name: '🚫 Ban Commands (Slash)',
          value: '`/ucban` - Ban a user (requires Ban Members permission).\n' +
                 '`/ucunban` - Unban a user (requires Ban Members permission).',
        },
        {
          name: '🎮 UC Leveling System',
          value: '`/levels` - View your current level, XP progress, and gym badges.\n' +
                 '`/leveluser` - View leveling info for a specified user (by mention or ID).',
        },
        {
          name: 'ℹ️ Additional Commands',
          value: '`$help` - Display this help message.\n' +
                 '`$info` - Show bot information and version details.\n' +
                 '`$stats` - Display server statistics.',
        },
      ],
    });
    await message.channel.send({ embeds: [helpEmbed] });
  },
};
