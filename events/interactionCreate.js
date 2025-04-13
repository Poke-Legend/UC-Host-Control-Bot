// events/interactionCreate.js
const { 
  handleRegisterCommand,
  handleRegistrationModal,
  handleMegaSelection,
  handleMegaDetailsModal,
  handleShinySelection
} = require('./registerHandler');
const { checkBan } = require('../utils/banSystem');
const ErrorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // Check for banned users - reject all interactions from banned users
      const banResult = checkBan(interaction.user.id);
      if (banResult.banned) {
        // Only reply if the interaction can be replied to
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `You are banned from Union Circle: ${banResult.reason}`,
            ephemeral: true,
          });
        }
        return;
      }
      
      // Handle different interaction types
      
      // 1. Slash Commands
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction, client);
      }
      
      // 2. Modal Submissions
      else if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction, client);
      }
      
      // 3. Button Interactions
      else if (interaction.isButton()) {
        await handleButtonInteraction(interaction, client);
      }
      
      // 4. Select Menu Interactions
      else if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction, client);
      }
    } catch (error) {
      logger.error('Error in interactionCreate event:', error);
      
      // Try to respond with error if possible
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'There was an error processing your interaction. Please try again later.',
          ephemeral: true,
        });
      }
    }
  }
};

/**
 * Handle slash command interactions
 * @param {CommandInteraction} interaction - Slash command interaction
 * @param {Client} client - Discord client
 */
async function handleSlashCommand(interaction, client) {
  const commandName = interaction.commandName;
  
  // Special handling for register command
  if (commandName === 'register') {
    return handleRegisterCommand(interaction, client);
  }
  
  // Standard command handling
  const command = client.commands.get(commandName);
  if (!command) {
    logger.warn(`Command not found: ${commandName}`);
    return interaction.reply({
      content: `Command "${commandName}" not found. It may have been removed or is unavailable.`,
      ephemeral: true,
    });
  }
  
  try {
    logger.debug(`Executing slash command: ${commandName}`);
    await command.execute(interaction, client);
  } catch (error) {
    await ErrorHandler.handleCommandError(error, interaction, commandName);
  }
}

/**
 * Handle modal submission interactions
 * @param {ModalSubmitInteraction} interaction - Modal submission interaction
 * @param {Client} client - Discord client
 */
async function handleModalSubmit(interaction, client) {
  const modalId = interaction.customId;
  
  // Registration flow modals
  if (modalId === 'registrationModal') {
    return handleRegistrationModal(interaction, client);
  } else if (modalId === 'megaDetailsModal') {
    return handleMegaDetailsModal(interaction, client);
  }
  
  // Add other modal handlers here as needed
  logger.warn(`Unknown modal ID: ${modalId}`);
}

/**
 * Handle button interactions
 * @param {ButtonInteraction} interaction - Button interaction
 * @param {Client} client - Discord client
 */
async function handleButtonInteraction(interaction, client) {
  const buttonId = interaction.customId;
  
  logger.debug(`Button interaction: ${buttonId}`);
  
  // Handle pagination buttons
  if (buttonId === 'prev_page' || buttonId === 'next_page') {
    // Paginator components handle their own logic
    return;
  }
  
  // Handle queue reset confirmation
  if (buttonId === 'confirm_reset_queue') {
    // This is handled by the component collector in resetqueue command
    return;
  }
  
  // Handle channel management confirmation
  if (buttonId === 'confirm_delete' || buttonId === 'cancel_delete') {
    // This is handled by the component collector in manage command
    return;
  }
  
  // Add other button handlers here as needed
  
  // Default: Unknown button
  logger.warn(`Unhandled button ID: ${buttonId}`);
  await interaction.update({
    content: 'This button is no longer valid.',
    components: []
  });
}

/**
 * Handle select menu interactions
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 * @param {Client} client - Discord client
 */
async function handleSelectMenuInteraction(interaction, client) {
  const menuId = interaction.customId;
  
  logger.debug(`Select menu interaction: ${menuId}`);
  
  // Registration flow select menus
  if (menuId === 'megaSelect') {
    return handleMegaSelection(interaction, client);
  } else if (menuId === 'shinySelect') {
    return handleShinySelection(interaction, client);
  }
  
  // Add other select menu handlers here as needed
  
  // Default: Unknown select menu
  logger.warn(`Unhandled select menu ID: ${menuId}`);
  await interaction.update({
    content: 'This menu is no longer valid.',
    components: []
  });
}