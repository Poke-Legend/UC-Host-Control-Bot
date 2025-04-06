// commands/startqueue.js
const { createEmbed, hexToInt } = require('../utils/helper');

module.exports = {
  name: 'startqueue',
  description: 'Publicly show active session details',
  async execute(message, args, channelConfig, client) {
    if (!channelConfig.activeSession || channelConfig.activeSession.length === 0) {
      // Convert hex color to integer by using our helper
      const errorColor = hexToInt('#ff0000');
      
      return message.channel.send({
        embeds: [{
          color: errorColor,
          title: 'No Active Session',
          description: 'There is no active session currently. Use `$start` to begin a session.'
        }]
      });
    }
    
    const details = channelConfig.activeSession.map((reg, index) => {
      // Build the mega information string
      let megaInfo = '';
      if (reg.mega === 'Yes' && reg.megaDetails) {
        megaInfo = `\nMega Evolution: \`${reg.megaDetails}\``;
      } else if (reg.mega) {
        megaInfo = `\nMega Evolution: \`${reg.mega}\``;
      }
      
      return `**Player ${index + 1}:**\nDiscord: <@${reg.userId}>\nIGN: \`${reg.ign}\`\nPokémon: \`${reg.pokemon}\`\nLevel: \`${reg.pokemonLevel || 'N/A'}\`${megaInfo}\nShiny: \`${reg.shiny || 'No'}\`\nItem: \`${reg.holdingItem || 'None'}\``;
    }).join('\n\n');
    
    const embed = createEmbed({
      color: '#00ff00',
      title: 'Active Session',
      description: `Current session registrations:\n\n${details}`,
    });
    
    await message.channel.send({ embeds: [embed] });
  },
};