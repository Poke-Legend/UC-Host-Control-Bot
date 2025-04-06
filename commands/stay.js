// commands/stay.js
/**
 * Stay Command
 * Creates a message with an animated GIF and styled text
 */

const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: 'stay',
  description: 'Request users to stay',
  
  /**
   * Execute the stay command
   * @param {Message} message - The message that triggered the command
   * @param {Array} args - Command arguments
   * @param {Object} channelConfig - Channel configuration
   * @param {Client} client - Discord client
   */
  async execute(message, args, channelConfig, client) {
    // Check user permissions
    const hasPermission = message.member.roles.cache.some(role =>
      config.allowedRoleIds.includes(role.id)
    );
    
    if (!hasPermission) {
      return message.channel.send({
        content: 'You do not have permission to use this command.'
      });
    }
    
    try {
      // Get the image URL from config
      const imageUrl = config.imageUrls.stay;  // Use URL here
      
      if (!imageUrl) {
        return message.channel.send({
          content: 'No image URL found in configuration for Stay announcement.'
        });
      }
      
      // Create a styled embed with the animated GIF
      const embed = new EmbedBuilder()
        .setColor('#FF7E00') // Amber/Orange color
        .setTitle('Please Stay in Position')
        .setDescription(`**${message.author.username}** has requested you to stay in place.\nPlease secure your in-game phone to prevent Joy-Con drifting.`)
        .setImage(imageUrl) // This will display the animated GIF
        .setFooter({ 
          text: `© ${new Date().getFullYear()} Pokémon Legends`, 
          iconURL: config.footer.iconUrl  // Use URL here
        })
        .setTimestamp();
      
      // Send the embed with the GIF
      await message.channel.send({
        embeds: [embed]
      });
      
    } catch (error) {
      console.error('Error in stay command:', error);
      message.channel.send({
        content: 'There was an error generating the Stay announcement.'
      });
    }
  },
};