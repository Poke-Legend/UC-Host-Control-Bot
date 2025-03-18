// events/interactionCreate.js
const { checkBan } = require('../utils/banSystem');
const { loadConfig, pendingRegistrations, saveConfig } = require('../utils/helper');
const { AttachmentBuilder } = require('discord.js');
const { generateRegistrationCard } = require('../utils/registrationCard');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    
    // Handle slash commands (ChatInputCommand)
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.log('[InteractionCreate] No command found for:', interaction.commandName);
        return;
      }
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error('[InteractionCreate] Error executing command:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          });
        }
      }
    }
    // Handle modal submissions (e.g. registration modal)
    else if (interaction.isModalSubmit() && interaction.customId === 'registrationModal') {
      try {
        // Check if user is banned
        const banResult = checkBan(interaction.user.id);
        if (banResult.banned) {
          await interaction.reply({
            content: `You are banned from Union Circle: ${banResult.reason}`,
            ephemeral: true,
          });
          return;
        }
  
        // Load channel configuration
        const channelName = interaction.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const channelConfig = loadConfig(channelName);
        
        // Check if user is already in the queue or waiting list
        const userInQueue = channelConfig.queue.registrations.some(reg => reg.userId === interaction.user.id);
        const userInWaitlist = channelConfig.waitingList.some(reg => reg.userId === interaction.user.id);
        const userInActiveSession = channelConfig.activeSession.some(reg => reg.userId === interaction.user.id);
        
        if (userInQueue || userInWaitlist || userInActiveSession) {
          await interaction.reply({
            content: "⚠️ You're already registered in this Union Circle. You cannot register twice in the same queue or while in an active session.",
            ephemeral: true,
          });
          return;
        }
        
        // Process registration input
        const ign = interaction.fields.getTextInputValue('ignInput');
        const pokemon = interaction.fields.getTextInputValue('pokemonInput');
        const pokemonLevel = interaction.fields.getTextInputValue('pokemonLevelInput');
        const holdingItem = interaction.fields.getTextInputValue('holdingItemInput');
  
        // Use a composite key (channelID-userID) for pending registrations
        const pendingKey = `${interaction.channel.id}-${interaction.user.id}`;
        pendingRegistrations[pendingKey] = { ign, pokemon, pokemonLevel, holdingItem };
  
        const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('shinySelect')
          .setPlaceholder('Select whether your Pokémon is shiny...')
          .addOptions([
            { label: 'Yes', description: 'It is shiny!', value: 'Yes' },
            { label: 'No', description: 'It is not shiny.', value: 'No' },
          ]);
  
        const row = new ActionRowBuilder().addComponents(selectMenu);
  
        await interaction.reply({
          content: 'Please select whether your Pokémon is shiny:',
          components: [row],
          ephemeral: true,
        });
      } catch (err) {
        console.error('[InteractionCreate] Error processing modal submission:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'There was an error processing your submission. Please try again later.',
            ephemeral: true,
          });
        }
      }
    }
    // Handle select menu submissions for shiny selection
    else if (interaction.isStringSelectMenu() && interaction.customId === 'shinySelect') {
      try {
        const pendingKey = `${interaction.channel.id}-${interaction.user.id}`;
        const pending = pendingRegistrations[pendingKey];
        if (!pending) {
          return interaction.update({
            content: 'No pending registration found.',
            components: [],
          });
        }
  
        const shinyValue = interaction.values[0];
        const registrationEntry = {
          userId: interaction.user.id,
          ign: pending.ign,
          pokemon: pending.pokemon,
          pokemonLevel: pending.pokemonLevel,
          shiny: shinyValue,
          holdingItem: pending.holdingItem,
        };
  
        const channelName = interaction.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const channelConfig = loadConfig(channelName);
        
        // Double-check user isn't already in the waiting list or queue (in case they registered while this was pending)
        const userInQueue = channelConfig.queue.registrations.some(reg => reg.userId === interaction.user.id);
        const userInWaitlist = channelConfig.waitingList.some(reg => reg.userId === interaction.user.id);
        const userInActiveSession = channelConfig.activeSession.some(reg => reg.userId === interaction.user.id);
        
        if (userInQueue || userInWaitlist || userInActiveSession) {
          await interaction.update({
            content: "⚠️ You're already registered in this Union Circle. You cannot register twice in the same queue or while in an active session.",
            components: [],
          });
          delete pendingRegistrations[pendingKey];
          return;
        }
        
        // Add to waiting list and mark as registered
        channelConfig.waitingList.push(registrationEntry);
        channelConfig.registeredUsers[interaction.user.id] = true;
        saveConfig(channelName, channelConfig);
        delete pendingRegistrations[pendingKey];
  
        // Update the interaction's message first to remove the select menu
        await interaction.update({
          content: 'Registration complete! Check below for your registration card.',
          components: [],
        });
        
        try {
          // Generate the registration card using Canvas
          const cardBuffer = await generateRegistrationCard(interaction.user, registrationEntry);
          
          // Create an attachment from the buffer
          const attachment = new AttachmentBuilder(cardBuffer, { name: 'registration-card.png' });
          
          // Send the registration card as a follow-up message
          await interaction.followUp({
            files: [attachment],
            ephemeral: false // Make it visible to everyone in the channel
          });
          
        } catch (error) {
          console.error('[InteractionCreate] Error generating registration card:', error);
          await interaction.followUp({
            content: 'Your registration has been completed, but there was an error generating your registration card.',
            ephemeral: true
          });
        }
      } catch (err) {
        console.error('[InteractionCreate] Error processing select menu submission:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'There was an error processing your selection. Please try again later.',
            ephemeral: true,
          });
        }
      }
    }
  },
};