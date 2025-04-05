// commands/slut.js
/**
 * Slutties Airline Command
 * Creates a canvas-based announcement when a host is ready in Los Platos
 */

const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const config = require('../utils/config');
const path = require('path');

// ===================================
// Image Loading Function
// ===================================

/**
 * Load an image directly from URL without caching
 * @param {string} url - The URL of the image to load
 * @returns {Promise<Image>} - The loaded image
 */
async function loadImageDirectly(url) {
  if (!url) return null;
  
  try {
    return await loadImage(url);
  } catch (err) {
    console.error('Error loading image:', err);
    throw err;
  }
}

// ===================================
// Canvas Card Generator
// ===================================

/**
 * Create a Slutties Airline announcement card
 * @param {string} authorName - The name of the command user
 * @param {string} imageUrl - The URL of the Los Platos image
 * @returns {Buffer} - The canvas buffer for the image
 */
async function createSluttiesCard(authorName, imageUrl) {
  // Create canvas with 16:9 aspect ratio
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');
  
  // === Background Setup ===
  // Fill background with dark color (fallback if image fails to load)
  ctx.fillStyle = '#16213e'; // Dark blue
  ctx.fillRect(0, 0, 800, 450);
  
  // === Main Image (Background) ===
  try {
    const backgroundImage = await loadImageDirectly(imageUrl);
    
    if (backgroundImage) {
      // Calculate dimensions to cover the entire canvas while maintaining aspect ratio
      const imgRatio = backgroundImage.width / backgroundImage.height;
      const canvasRatio = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgRatio > canvasRatio) {
        // Image is wider than the canvas (relative to height)
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgRatio;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      } else {
        // Image is taller than the canvas (relative to width)
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      }
      
      // Draw the image to fill the entire canvas
      ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
    }
  } catch (err) {
    // If image fails to load, we'll just show the gradient background
    console.error('Error loading background image:', err);
  }
  
  // === Header (Top Section) ===
  // Add violet top banner
  ctx.fillStyle = 'rgba(138, 43, 226, 0.8)'; // Violet with 80% opacity
  ctx.fillRect(0, 0, 800, 80);
  
  // Add title with shadow for better readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Welcome to Slutties Airline', 400, 40);
  
  // === Message (Bottom Section) ===
  // Add semi-transparent background for text at the bottom to ensure visibility
  ctx.shadowColor = 'transparent'; // Remove shadow for rectangle
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 310, 800, 110);
  
  // Restore shadow for text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  
  // Add main message with larger font
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Space the text evenly in the bottom section
  const messageText = `Hey Slutties, board at the gate`;
  const locationText = `and head to Los Platos`;
  const hostText = `to meet with ${authorName}`;
  
  ctx.fillText(messageText, 400, 330);
  ctx.fillText(locationText, 400, 360);
  ctx.fillText(hostText, 400, 390);
  
  // === Footer ===
  // Add footer bar with clean design
  ctx.shadowColor = 'transparent'; // Remove shadow for the footer rectangle
  ctx.fillStyle = 'rgba(138, 43, 226, 0.9)'; // Violet color matching the header
  ctx.fillRect(0, 425, 800, 25);
  
  // Add footer text with subtle shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 2;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Use dynamic year
  const year = new Date().getFullYear();
  ctx.fillText(`© ${year} Pokémon Legends`, 400, 437);
  
  return canvas.toBuffer();
}

// ===================================
// Command Definition
// ===================================

module.exports = {
  name: 'slut',
  description: 'VIP command for Los Platos',
  
  /**
   * Execute the slut command
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
      const imageUrl = config.images.slut;
      
      if (!imageUrl) {
        return message.channel.send({
          content: 'No image URL found in configuration for Slutties.'
        });
      }
      
      // First send a ping message
      await message.channel.send(`<@&${config.pingRoleId}>`);
      
      // Generate the canvas image
      const cardBuffer = await createSluttiesCard(message.author.username, imageUrl);
      
      // Create an attachment from the buffer
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'slutties-airline.png' });
      
      // Send the canvas image
      await message.channel.send({
        files: [attachment]
      });
      
    } catch (error) {
      console.error('Error in slut command:', error);
      message.channel.send({
        content: 'There was an error generating the Slutties airline image.'
      });
    }
  },
};