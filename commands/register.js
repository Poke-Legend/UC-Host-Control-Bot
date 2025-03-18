const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { loadConfig } = require('../utils/helper');
const { checkBan } = require('../utils/banSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your in-game details for Union Circle Hosting'),
  
  async execute(interaction, client) {
   
    // Ensure command is run in a guild channel
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
    }

    try {
      // Immediate ban check
      const banResult = checkBan(interaction.user.id);
      if (banResult.banned) {
        await interaction.reply({
          content: `You are banned from Union Circle: ${banResult.reason}`,
          ephemeral: true,
        });
        return;
      }

      // Load channel-specific config (using sanitized channel name)
      const channelName = interaction.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const channelConfig = loadConfig(channelName);

      // Check if user is already registered
      if (channelConfig.registeredUsers && channelConfig.registeredUsers[interaction.user.id]) {
        return interaction.reply({
          content: "You are already registered. Wait for the host to reset registrations or use `$resetuser` to clear your registration.",
          ephemeral: true,
        });
      }
      
      // Check if user is already in queue, waitlist or active session
      const userInQueue = channelConfig.queue.registrations.some(reg => reg.userId === interaction.user.id);
      const userInWaitlist = channelConfig.waitingList.some(reg => reg.userId === interaction.user.id);
      const userInActiveSession = channelConfig.activeSession.some(reg => reg.userId === interaction.user.id);
      
      if (userInQueue || userInWaitlist || userInActiveSession) {
        return interaction.reply({
          content: "⚠️ You're already in the queue, waitlist, or active session for this Union Circle. You cannot register twice.",
          ephemeral: true,
        });
      }

      // Build the registration modal
      const modal = new ModalBuilder()
        .setCustomId('registrationModal')
        .setTitle('Union Circle Registration');

      const ignInput = new TextInputBuilder()
        .setCustomId('ignInput')
        .setLabel('In-Game Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const pokemonInput = new TextInputBuilder()
        .setCustomId('pokemonInput')
        .setLabel('Pokémon')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const pokemonLevelInput = new TextInputBuilder()
        .setCustomId('pokemonLevelInput')
        .setLabel('Pokémon Level')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const holdingItemInput = new TextInputBuilder()
        .setCustomId('holdingItemInput')
        .setLabel('Holding Item (e.g., Cherish Ball)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      // Each input must be in its own ActionRow.
      modal.addComponents(
        new ActionRowBuilder().addComponents(ignInput),
        new ActionRowBuilder().addComponents(pokemonInput),
        new ActionRowBuilder().addComponents(pokemonLevelInput),
        new ActionRowBuilder().addComponents(holdingItemInput)
      );

      await interaction.showModal(modal);
    } catch (err) {
      console.error('[Register] Error in /register command:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'There was an error showing the registration modal. Please try again later.',
          ephemeral: true,
        });
      }
    }
  },
};