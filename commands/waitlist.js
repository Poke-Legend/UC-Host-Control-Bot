// commands/waitlist.js
const { createEmbed, sendEmbed, hexToInt } = require('../utils/helper');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'waitlist',
  description: 'View pending registrations with pagination',
  async execute(message, args, channelConfig, client) {
    const waitingList = channelConfig.waitingList;
    if (!waitingList || waitingList.length === 0) {
      return sendEmbed(
        message.channel,
        '#0099ff',
        'Waiting List',
        'There are no pending registrations in the waiting list.'
      );
    }

    const itemsPerPage = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(waitingList.length / itemsPerPage);

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const pageItems = waitingList.slice(start, end);
      const description = pageItems
        .map((entry, index) => `${start + index + 1}. <@${entry.userId}>`)
        .join('\n');
      return createEmbed({
        color: '#0099ff', // Will be converted to int by createEmbed
        title: 'Waiting List',
        description: description || 'No pending registrations.',
        extraFields: [{ name: 'Page', value: `${page + 1} / ${totalPages}` }],
      });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prevWait')
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId('nextWait')
        .setLabel('➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage >= totalPages - 1)
    );

    const embedMessage = await message.channel.send({
      embeds: [generateEmbed(currentPage)],
      components: [row],
    });

    const filter = (i) => i.user.id === message.author.id;
    const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (i) => {
      if (i.customId === 'prevWait' && currentPage > 0) {
        currentPage--;
      } else if (i.customId === 'nextWait' && currentPage < totalPages - 1) {
        currentPage++;
      }
      try {
        await i.update({
          embeds: [generateEmbed(currentPage)],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prevWait')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
              new ButtonBuilder()
                .setCustomId('nextWait')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage >= totalPages - 1)
            ),
          ],
        });
      } catch (error) {
        console.error('Error updating interaction in waitlist:', error);
      }
    });

    collector.on('end', async () => {
      try {
        await embedMessage.edit({ components: [] });
      } catch (error) {
        console.error('Error editing embed message on collector end:', error);
      }
    });
  },
};