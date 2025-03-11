const { createEmbed } = require('../utils/helper');

module.exports = {
  name: 'startqueue',
  description: 'Publicly show active session details',
  async execute(message, args, channelConfig, client) {
    if (!channelConfig.activeSession || channelConfig.activeSession.length === 0) {
      return message.channel.send({
        embeds: [{
          color: '#ff0000',
          title: 'No Active Session',
          description: 'There is no active session currently. Use `$start` to begin a session.'
        }]
      });
    }
    const details = channelConfig.activeSession.map((reg, index) => {
      return `**Player ${index + 1}:**\nDiscord: <@${reg.userId}>\nIGN: \`${reg.ign}\`\nPokémon: \`${reg.pokemon}\`\nLevel: \`${reg.pokemonLevel}\`\nShiny: \`${reg.shiny}\`\nItem: \`${reg.holdingItem}\``;
    }).join('\n\n');
    const embed = createEmbed({
      color: '#00ff00',
      title: 'Active Session',
      description: `Current session registrations:\n\n${details}`,
    });
    await message.channel.send({ embeds: [embed] });
  },
};
