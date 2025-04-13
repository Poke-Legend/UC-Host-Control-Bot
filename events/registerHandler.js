// events/registerHandler.js
const { 
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const { 
  pendingRegistrations, 
  sanitizeChannelName,
  getPriorityLevel
} = require('../utils/helper');
const { generateRegistrationCard } = require('../utils/registrationCard');
const QueueService = require('../services/QueueService');
const { checkBan } = require('../utils/banSystem');
const ErrorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Handle the /register slash command
 * @param {CommandInteraction} interaction - Slash command interaction
 * @param {Client} client - Discord client
 */
async function handleRegisterCommand(interaction, client) {
  try {
    logger.debug(`Registration initiated by ${interaction.user.tag}`);
    
    // Ensure command is run in a guild channel
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
    }

    // Immediate ban check
    const banResult = checkBan(interaction.user.id);
    if (banResult.banned) {
      logger.warn(`Blocked registration attempt by banned user ${interaction.user.tag}: ${banResult.reason}`);
      
      await interaction.reply({
        content: `You are banned from Union Circle: ${banResult.reason}`,
        ephemeral: true,
      });
      return;
    }

    // Load channel-specific config
    const channelName = sanitizeChannelName(interaction.channel.name);
    const channelConfig = QueueService.getChannelConfig(channelName);

    // Check if user is already registered
    const userStatus = QueueService.getUserStatus(channelName, interaction.user.id);
    
    if (userStatus.isRegistered) {
      let statusMessage = "You're already registered in this Union Circle.";
      
      // Give more specific information based on status
      if (userStatus.inActiveSession) {
        statusMessage += ` You're currently in the active session at position ${userStatus.position}.`;
      } else if (userStatus.inQueue) {
        statusMessage += ` You're currently in the main queue at position ${userStatus.position}.`;
      } else if (userStatus.inWaitingList) {
        statusMessage += ` You're currently in the waiting list at position ${userStatus.position}.`;
      }
      
      statusMessage += " You cannot register twice.";
      
      return interaction.reply({
        content: statusMessage,
        ephemeral: true,
      });
    }
    
    // Build the registration modal
    const modal = buildRegistrationModal();
    
    // Show the modal to the user
    await interaction.showModal(modal);
    logger.debug(`Registration modal shown to ${interaction.user.tag}`);
  } catch (err) {
    logger.error(`Error in /register command:`, err);
    return ErrorHandler.handleCommandError(err, interaction, 'register');
  }
}

/**
 * Build the registration modal
 * @returns {ModalBuilder} Discord modal
 */
function buildRegistrationModal() {
  const modal = new ModalBuilder()
    .setCustomId('registrationModal')
    .setTitle('Union Circle Registration');

  const ignInput = new TextInputBuilder()
    .setCustomId('ignInput')
    .setLabel('In-Game Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your character name in the game')
    .setRequired(true)
    .setMaxLength(20);

  const pokemonInput = new TextInputBuilder()
    .setCustomId('pokemonInput')
    .setLabel('Pokémon')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Pokémon you are using')
    .setRequired(true)
    .setMaxLength(30);

  const pokemonLevelInput = new TextInputBuilder()
    .setCustomId('pokemonLevelInput')
    .setLabel('Pokémon Level')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., 100 (optional)')
    .setRequired(false)
    .setMaxLength(3);

  const holdingItemInput = new TextInputBuilder()
    .setCustomId('holdingItemInput')
    .setLabel('Holding Item')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Cherish Ball (optional)')
    .setRequired(false)
    .setMaxLength(30);

  // Each input must be in its own ActionRow
  modal.addComponents(
    new ActionRowBuilder().addComponents(ignInput),
    new ActionRowBuilder().addComponents(pokemonInput),
    new ActionRowBuilder().addComponents(pokemonLevelInput),
    new ActionRowBuilder().addComponents(holdingItemInput)
  );
  
  return modal;
}

/**
 * Handle the registration modal submission
 * @param {ModalSubmitInteraction} interaction - Modal submission interaction
 * @param {Client} client - Discord client
 */
async function handleRegistrationModal(interaction, client) {
  try {
    logger.debug(`Registration modal submitted by ${interaction.user.tag}`);
    
    // Check for ban again (just in case)
    const banResult = checkBan(interaction.user.id);
    if (banResult.banned) {
      return interaction.reply({
        content: `You are banned from Union Circle: ${banResult.reason}`,
        ephemeral: true,
      });
    }

    const channelName = sanitizeChannelName(interaction.channel.name);
    const channelConfig = QueueService.getChannelConfig(channelName);
    
    // Double-check user isn't already registered
    const userStatus = QueueService.getUserStatus(channelName, interaction.user.id);
    if (userStatus.isRegistered) {
      return interaction.reply({
        content: "You're already registered in this Union Circle. You cannot register twice.",
        ephemeral: true,
      });
    }
    
    // Process registration input
    const ign = interaction.fields.getTextInputValue('ignInput').trim();
    const pokemon = interaction.fields.getTextInputValue('pokemonInput').trim();
    const pokemonLevel = interaction.fields.getTextInputValue('pokemonLevelInput').trim();
    const holdingItem = interaction.fields.getTextInputValue('holdingItemInput').trim();

    // Use a composite key (channelID-userID) for pending registrations
    const pendingKey = `${interaction.channel.id}-${interaction.user.id}`;
    pendingRegistrations[pendingKey] = { ign, pokemon, pokemonLevel, holdingItem };

    // Show Mega Evolution select menu
    const megaSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('megaSelect')
      .setPlaceholder('Is your Pokémon a Mega Evolution?')
      .addOptions([
        { label: 'Yes', description: 'It is a Mega Evolution', value: 'Yes' },
        { label: 'No', description: 'It is not a Mega Evolution', value: 'No' },
      ]);

    const megaRow = new ActionRowBuilder().addComponents(megaSelectMenu);

    await interaction.reply({
      content: 'Please select whether your Pokémon is a Mega Evolution:',
      components: [megaRow],
      ephemeral: true,
    });
    
    logger.debug(`Registration mega selection shown to ${interaction.user.tag}`);
  } catch (err) {
    logger.error(`Error processing registration modal:`, err);
    return ErrorHandler.handleCommandError(err, interaction, 'registration');
  }
}

/**
 * Handle the Mega Evolution selection
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 * @param {Client} client - Discord client
 */
async function handleMegaSelection(interaction, client) {
  try {
    logger.debug(`Mega selection made by ${interaction.user.tag}: ${interaction.values[0]}`);
    
    const pendingKey = `${interaction.channel.id}-${interaction.user.id}`;
    const pending = pendingRegistrations[pendingKey];
    
    if (!pending) {
      return interaction.update({
        content: 'No pending registration found. Please use `/register` to start over.',
        components: [],
      });
    }

    const megaValue = interaction.values[0];
    pending.mega = megaValue;
    
    // If they selected Yes for Mega, show another input for Mega details
    if (megaValue === 'Yes') {
      const megaModal = new ModalBuilder()
        .setCustomId('megaDetailsModal')
        .setTitle('Mega Evolution Details');
        
      const megaDetailsInput = new TextInputBuilder()
        .setCustomId('megaDetailsInput')
        .setLabel('Mega Evolution Details')
        .setPlaceholder('e.g., Mega Charizard X, Primal Kyogre')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30);
        
      megaModal.addComponents(
        new ActionRowBuilder().addComponents(megaDetailsInput)
      );
      
      await interaction.showModal(megaModal);
      logger.debug(`Mega details modal shown to ${interaction.user.tag}`);
    } else {
      // If they selected No for Mega, proceed to Shiny selection
      const shinySelectMenu = new StringSelectMenuBuilder()
        .setCustomId('shinySelect')
        .setPlaceholder('Is your Pokémon shiny?')
        .addOptions([
          { label: 'Yes', description: 'It is shiny!', value: 'Yes' },
          { label: 'No', description: 'It is not shiny.', value: 'No' },
        ]);

      const shinyRow = new ActionRowBuilder().addComponents(shinySelectMenu);

      await interaction.update({
        content: 'Please select whether your Pokémon is shiny:',
        components: [shinyRow],
      });
      
      logger.debug(`Shiny selection shown to ${interaction.user.tag}`);
    }
  } catch (err) {
    logger.error(`Error processing mega selection:`, err);
    return ErrorHandler.handleCommandError(err, interaction, 'registration');
  }
}

/**
 * Handle the Mega Details modal submission
 * @param {ModalSubmitInteraction} interaction - Modal submission interaction
 * @param {Client} client - Discord client
 */
async function handleMegaDetailsModal(interaction, client) {
  try {
    logger.debug(`Mega details submitted by ${interaction.user.tag}`);
    
    const pendingKey = `${interaction.channel.id}-${interaction.user.id}`;
    const pending = pendingRegistrations[pendingKey];
    
    if (!pending) {
      return interaction.reply({
        content: 'No pending registration found. Please use `/register` to start over.',
        ephemeral: true,
      });
    }
    
    // Get the mega details
    const megaDetails = interaction.fields.getTextInputValue('megaDetailsInput').trim();
    pending.megaDetails = megaDetails.substring(0, 30); // Limit to 30 chars
    
    // Now proceed to Shiny selection
    const shinySelectMenu = new StringSelectMenuBuilder()
      .setCustomId('shinySelect')
      .setPlaceholder('Is your Pokémon shiny?')
      .addOptions([
        { label: 'Yes', description: 'It is shiny!', value: 'Yes' },
        { label: 'No', description: 'It is not shiny.', value: 'No' },
      ]);

    const shinyRow = new ActionRowBuilder().addComponents(shinySelectMenu);

    await interaction.reply({
      content: 'Please select whether your Pokémon is shiny:',
      components: [shinyRow],
      ephemeral: true,
    });
    
    logger.debug(`Shiny selection shown to ${interaction.user.tag}`);
  } catch (err) {
    logger.error(`Error processing mega details:`, err);
    return ErrorHandler.handleCommandError(err, interaction, 'registration');
  }
}

/**
 * Handle the Shiny selection (final step)
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 * @param {Client} client - Discord client
 */
async function handleShinySelection(interaction, client) {
  try {
    logger.debug(`Shiny selection made by ${interaction.user.tag}: ${interaction.values[0]}`);
    
    const pendingKey = `${interaction.channel.id}-${interaction.user.id}`;
    const pending = pendingRegistrations[pendingKey];
    
    if (!pending) {
      return interaction.update({
        content: 'No pending registration found. Please use `/register` to start over.',
        components: [],
      });
    }

    const shinyValue = interaction.values[0];
    
    // Validate the registration data
    if (!pending.ign || !pending.pokemon) {
      return interaction.update({
        content: 'Missing required registration information. Please use `/register` to start over.',
        components: [],
      });
    }
    
    // Create registration entry with all data
    const registrationEntry = {
      userId: interaction.user.id,
      ign: pending.ign.trim().substring(0, 20), // Limit length
      pokemon: pending.pokemon.trim().substring(0, 30),
      pokemonLevel: pending.pokemonLevel ? pending.pokemonLevel.trim().substring(0, 3) : '',
      mega: pending.mega || 'No',
      megaDetails: (pending.megaDetails || '').trim().substring(0, 30),
      shiny: shinyValue,
      holdingItem: (pending.holdingItem || '').trim().substring(0, 30),
      registeredAt: Date.now(),
      priority: getPriorityLevel(interaction.member)
    };

    const channelName = sanitizeChannelName(interaction.channel.name);
    
    // Double-check user isn't already registered
    const userStatus = QueueService.getUserStatus(channelName, interaction.user.id);
    if (userStatus.isRegistered) {
      return interaction.update({
        content: "You're already registered in this Union Circle. You cannot register twice.",
        components: [],
      });
    }
    
    // Add to waiting list with priority
    const position = QueueService.addToWaitingList(channelName, registrationEntry, registrationEntry.priority);
    
    // Clean up pending registration
    delete pendingRegistrations[pendingKey];
    
    logger.info(`Registration completed for ${interaction.user.tag} at position ${position}`);

    // Update the interaction message
    await interaction.update({
      content: 'Registration complete! Your registration card is being generated...',
      components: [],
    });
    
    try {
      // Generate and send registration card
      const cardBuffer = await generateRegistrationCard(interaction.user, registrationEntry);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'registration-card.png' });
      
      // Calculate wait time
      const waitTime = QueueService.getEstimatedWaitTime(channelName, position, 'waitlist');
      
      // Send the registration card
      await interaction.followUp({
        content: `Registration complete! You are number **${position}** in the waiting list. Estimated wait time: **${waitTime}**`,
        files: [attachment],
        ephemeral: false // Make it visible to everyone
      });
    } catch (error) {
      logger.error('Error generating registration card:', error);
      
      await interaction.followUp({
        content: 'Your registration has been completed successfully, but there was an error generating your registration card. You are in the waiting list.',
        ephemeral: true
      });
    }
  } catch (err) {
    logger.error(`Error completing registration:`, err);
    return ErrorHandler.handleCommandError(err, interaction, 'registration');
  }
}

module.exports = {
  handleRegisterCommand,
  handleRegistrationModal,
  handleMegaSelection,
  handleMegaDetailsModal,
  handleShinySelection
};