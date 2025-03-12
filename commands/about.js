// commands/about.js
const { createEmbed } = require('../utils/helper');
const config = require('../utils/config');
const { version: discordVersion } = require('discord.js');

module.exports = {
  name: 'about',
  description: 'Display detailed information about the bot and its developers',
  async execute(message, args, channelConfig, client) {
    const uptime = client.uptime 
      ? formatUptime(client.uptime)
      : 'N/A';
      
    const embed = createEmbed({
      color: '#0099ff',
      title: 'About Union Circle Bot',
      description: 'A specialized Discord bot developed for Pokémon Legends Union Circle hosting.',
      extraFields: [
        {
          name: '🧑‍💻 Development Team',
          value: `**Lead Developer:** DeVry\n**Contributors:** The Pokémon Legends Team\n**Version:** ${config.version}\n**Started:** February 2023`,
        },
        {
          name: '🛠️ Technical Details',
          value: `**Framework:** discord.js v${discordVersion}\n**Backend:** Node.js\n**Database:** JSON-based file system\n**Uptime:** ${uptime}`,
        },
        {
          name: '🎮 Core Features',
          value: '• Queue & session management system\n• Interactive registration modal\n• Code distribution system\n• Automated waiting list\n• Channel state management\n• UC Leveling System with badges',
        },
        {
          name: '💖 Special Thanks',
          value: 'To all hosts and members of the Pokémon Legends community for their feedback and support during development.',
        },
        {
          name: '📌 Contact',
          value: 'For issues or feature requests, please contact server administrators.',
        }
      ],
    });
    
    await message.channel.send({ embeds: [embed] });
  },
};

// Helper function to format uptime in a more readable format
function formatUptime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  
  return parts.join(', ');
}