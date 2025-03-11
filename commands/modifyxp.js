// commands/modifyxp.js
const { SlashCommandBuilder } = require('discord.js');
const { addXp, removeXp, getUserLevelData } = require('../levels/levelSystem');
const { createEmbed, safeDelete } = require('../utils/helper');
const config = require('../utils/config');

// Helper function to create a progress bar
const progressBar = (xp, threshold, barLength = 20) => {
  const percent = xp / threshold;
  const filledLength = Math.round(barLength * percent);
  const emptyLength = barLength - filledLength;
  return '▰'.repeat(filledLength) + '▱'.repeat(emptyLength);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modifyxp')
    .setDescription('Add or remove XP for a specified user (Admin only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add XP to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to add XP to')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount of XP to add')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove XP from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to remove XP from')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount of XP to remove')
            .setRequired(true)
        )
    ),
    
  async execute(interaction, client) {
    try {
      console.log('[ModifyXP] Command triggered by:', interaction.user.tag);
      
      // Check if the invoking member has one of the allowed roles.
      const allowedRoles = config.allowedRoleIds; // e.g., [process.env.ALLOWED_ROLE_ID, process.env.ALLOWED_ROLE_ID2]
      if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
        console.log('[ModifyXP] User does not have permission.');
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      
      const subcommand = interaction.options.getSubcommand();
      const targetUser = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      
      let embed;
      if (subcommand === 'add') {
        console.log(`[ModifyXP] Adding ${amount} XP to ${targetUser.tag} (override: true)`);
        // Use override true for admin modification.
        addXp(targetUser.id, amount, true);
        const data = getUserLevelData(targetUser.id);
        const threshold = data.level * 100;
        const bar = progressBar(data.xp, threshold);
        embed = createEmbed({
          color: '#00ff00',
          title: `XP Added to ${targetUser.username}`,
          description: `Added **${amount}** XP.\nNew Level: **${data.level}**\nXP: **${data.xp}/${threshold}**\nProgress: ${bar}`,
        });
      } else if (subcommand === 'remove') {
        console.log(`[ModifyXP] Removing ${amount} XP from ${targetUser.tag} (override: true)`);
        // Use override true for admin modification.
        removeXp(targetUser.id, amount, true);
        const data = getUserLevelData(targetUser.id);
        const threshold = data.level * 100;
        const bar = progressBar(data.xp, threshold);
        embed = createEmbed({
          color: '#ff0000',
          title: `XP Removed from ${targetUser.username}`,
          description: `Removed **${amount}** XP.\nNew Level: **${data.level}**\nXP: **${data.xp}/${threshold}**\nProgress: ${bar}`,
        });
      }
      
      // Send the response embed publicly.
      await interaction.reply({ embeds: [embed], ephemeral: false });
      
      // Fetch the reply and schedule deletion after 15 seconds.
      const replyMessage = await interaction.fetchReply();
      safeDelete(replyMessage, 15000);
    } catch (error) {
      console.error('Error in /modifyxp command:', error);
      return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  },
};
