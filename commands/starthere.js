// commands/starthere.js
const { createEmbed, hexToInt } = require('../utils/helper');

module.exports = {
  name: 'starthere',
  description: 'Display active session details in the channel',
  async execute(message, args, channelConfig, client) {
    if (!channelConfig.activeSession || channelConfig.activeSession.length === 0) {
      // Convert color to integer using our helper function
      const errorColor = hexToInt('#ff0000');
      
      return message.channel.send({
        embeds: [{
          color: errorColor,
          title: 'No Active Session',
          description: 'There is no active session currently to display.'
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
      title: 'Active Session Reminder',
      description: `Current active session details:\n\n${details}`,
    });
    
    await message.channel.send({ embeds: [embed] });
  },
};