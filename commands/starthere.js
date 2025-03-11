const { createEmbed } = require('../utils/helper');

module.exports = {
  name: 'starthere',
  description: 'Display active session details in the channel',
  async execute(message, args, channelConfig, client) {
    if (!channelConfig.activeSession || channelConfig.activeSession.length === 0) {
      return message.channel.send({
        embeds: [{
          color: '#ff0000',
          title: 'No Active Session',
          description: 'There is no active session currently to display.'
        }]
      });
    }
    const details = channelConfig.activeSession.map((reg, index) => {
      return `**Player ${index + 1}:**\nDiscord: <@${reg.userId}>\nIGN: \`${reg.ign}\`\nPokémon: \`${reg.pokemon}\`\nLevel: \`${reg.pokemonLevel}\`\nShiny: \`${reg.shiny}\`\nItem: \`${reg.holdingItem}\``;
    }).join('\n\n');
    const embed = createEmbed({
      color: '#00ff00',
      title: 'Active Session Reminder',
      description: `Current active session details:\n\n${details}`,
    });
    await message.channel.send({ embeds: [embed] });
  },
};
