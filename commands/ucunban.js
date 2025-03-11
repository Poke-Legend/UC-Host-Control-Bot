// commands/ucunban.js
const { SlashCommandBuilder } = require('discord.js');
const { loadBanDatabase, saveBanDatabase } = require('../utils/banSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ucunban')
    .setDescription('Unban a user from Union Circle')
    .addUserOption(option =>
      option.setName('user').setDescription('User to unban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for unbanning').setRequired(false)
    ),
  
  async execute(interaction, client) {
    // Ensure the member has Ban Members permission
    if (!interaction.member.permissions.has('BAN_MEMBERS')) {
      return interaction.reply({
        content: 'You must have the Ban Members permission to use this command.',
        ephemeral: true,
      });
    }
    
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const bans = loadBanDatabase();
    
    if (bans[user.id]) {
      delete bans[user.id];
      saveBanDatabase(bans);
      await interaction.reply({
        content: `User **${user.tag}** has been unbanned.`,
        ephemeral: false,
      });
    } else {
      await interaction.reply({
        content: `User **${user.tag}** is not banned.`,
        ephemeral: true,
      });
    }
  },
};
