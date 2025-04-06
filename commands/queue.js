// commands/queue.js
const { createEmbed, hexToInt } = require('../utils/helper');

module.exports = {
  name: 'queue',
  description: 'Show the main session queue',
  async execute(message, args, channelConfig, client) {
    const queue = channelConfig.queue.registrations;
    if (!queue || queue.length === 0) {
      const embed = createEmbed({
        color: '#0099ff',
        title: 'Queue is Empty',
        description: 'There are no players in the main queue.',
      });
      return message.channel.send({ embeds: [embed] });
    }
    const list = queue.map((reg, index) => `${index + 1}. <@${reg.userId}>`).join('\n');
    const embed = createEmbed({
      color: '#0099ff',
      title: 'Session Queue',
      description: list,
    });
    await message.channel.send({ embeds: [embed] });
  },
};