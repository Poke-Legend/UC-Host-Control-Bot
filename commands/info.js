// commands/info.js
const { createEmbed } = require('../utils/helper');
const config = require('../utils/config');
const { version: discordVersion } = require('discord.js');

module.exports = {
  name: 'info',
  description: 'Display bot information and version details',
  async execute(message, args, channelConfig, client) {
    const uptime = client.uptime ? Math.floor(client.uptime / 1000) + ' seconds' : 'N/A';
    const embed = createEmbed({
      color: '#0099ff',
      title: 'Union Circle Bot Information',
      description: `**Version:** 1.0.3
**Creator:** DeVry
**Library:** discord.js v${discordVersion}  
**Prefix:** ${config.prefix}  
**Uptime:** ${uptime}`,
    });
    await message.channel.send({ embeds: [embed] });
  },
};
