// commands/ucban.js
const { SlashCommandBuilder } = require('discord.js');
const { loadBanDatabase, saveBanDatabase, parseDuration } = require('../utils/banSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ucban')
    .setDescription('Ban a user from all Union Circles')
    .addUserOption(option =>
      option.setName('user').setDescription('User to ban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duration').setDescription('Ban duration (e.g., 7d, 1h, 30m, permanent)').setRequired(true)
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
    const reason = interaction.options.getString('reason', true);
    const durationStr = interaction.options.getString('duration', true);
    
    const bans = loadBanDatabase();
    const now = Date.now();
    const parsed = parseDuration(durationStr);
    const expires = parsed === null ? null : now + parsed;
    
    bans[user.id] = {
      reason,
      bannedAt: now,
      expires,
    };
    
    saveBanDatabase(bans);
    await interaction.reply({
      content: `User **${user.tag}** has been banned from Union Circles.\n**Reason:** ${reason}\n**Duration:** ${durationStr}`,
      ephemeral: false,
    });
  },
};
