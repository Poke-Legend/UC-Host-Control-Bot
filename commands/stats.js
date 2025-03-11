// commands/stats.js
const { createEmbed } = require('../utils/helper');

module.exports = {
  name: 'stats',
  description: 'Display server statistics',
  async execute(message, args, channelConfig, client) {
    const guild = message.guild;
    if (!guild) {
      return message.channel.send("This command can only be used in a guild.");
    }
    
    // Ensure all members are cached (if not, you might need to fetch members)
    const totalMembers = guild.memberCount;
    // Using cache for online members may not be fully accurate if presence intent is not enabled
    const onlineMembers = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
    const channels = guild.channels.cache.size;
    const roles = guild.roles.cache.size;

    const embed = createEmbed({
      color: '#00ff00',
      title: 'Pokemon Legends',
      description: `**Server Name:** ${guild.name}  
**Total Members:** ${totalMembers}`,
    });
    await message.channel.send({ embeds: [embed] });
  },
};
