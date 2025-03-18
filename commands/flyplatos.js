// commands/flyplatos.js
/**
 * Los Platos Airline Command
 * Creates a canvas-based announcement when a host is ready in Los Platos
 */

const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const config = require('../utils/config');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ===================================
// Image Caching System
// ===================================

// Create cache directory if it doesn't exist
const cacheDir = path.join(__dirname, '..', 'cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

/**
 * Load an image from URL and cache it for future use
 * @param {string} url - The URL of the image to load
 * @returns {Promise<Image>} - The loaded image
 */
async function loadAndCacheImage(url) {
  if (!url) return null;
  
  // Create a filename from the URL
  const filename = url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 100) + '.png';
  
  const filePath = path.join(cacheDir, filename);
  
  // If the file exists in cache, load it directly
  if (fs.existsSync(filePath)) {
    try {
      return await loadImage(filePath);
    } catch (err) {
      // If cached file is corrupted, delete it and try downloading again
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  }
  
  // Otherwise, download it first
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    const request = https.get(url, response => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(filePath); } catch (e) {}
        loadAndCacheImage(response.headers.location)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(filePath); } catch (e) {}
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', async () => {
        file.close();
        try {
          const image = await loadImage(filePath);
          resolve(image);
        } catch (err) {
          try { fs.unlinkSync(filePath); } catch (e) {}
          reject(err);
        }
      });
      
      file.on('error', err => {
        file.close();
        try { fs.unlinkSync(filePath); } catch (e) {}
        reject(err);
      });
    });
    
    request.on('error', err => {
      file.close();
      try { fs.unlinkSync(filePath); } catch (e) {}
      reject(err);
    });
    
    // Set timeout to avoid hanging
    request.setTimeout(10000, () => {
      request.abort();
      file.close();
      try { fs.unlinkSync(filePath); } catch (e) {}
      reject(new Error('Request timeout'));
    });
  });
}

// ===================================
// Canvas Card Generator
// ===================================

/**
 * Create a Los Platos Airline announcement card
 * @param {string} authorName - The name of the command user
 * @param {string} imageUrl - The URL of the Los Platos image
 * @returns {Buffer} - The canvas buffer for the image
 */
async function createFlyPlatosCard(authorName, imageUrl) {
  // Create canvas with 16:9 aspect ratio
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');
  
  // === Background Setup ===
  // Fill background with dark color (fallback if image fails to load)
  ctx.fillStyle = '#16213e'; // Dark blue
  ctx.fillRect(0, 0, 800, 450);
  
  // === Header (Top Section) ===
  // Add semi-transparent top banner
  ctx.fillStyle = 'rgba(0, 153, 255, 0.8)'; // Discord blue with 80% opacity
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
  ctx.fillText('Platos VIP Airline', 400, 40);
  
  // === Main Image (Background) ===
  try {
    const flyImage = await loadAndCacheImage(imageUrl);
    
    if (flyImage) {
      // Calculate dimensions to cover the entire canvas while maintaining aspect ratio
      const imgRatio = flyImage.width / flyImage.height;
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
      ctx.drawImage(flyImage, drawX, drawY, drawWidth, drawHeight);
      
      // No overall overlay - keep image fully visible
    }
  } catch (err) {
    // If image fails to load, we'll just show the gradient background
  }
  
  // === Message (Bottom Section) ===
  // Add semi-transparent background for text at the bottom to ensure visibility
  ctx.shadowColor = 'transparent'; // Remove shadow for rectangle
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 330, 800, 120);
  
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
  const messageText = `VIP, please board at the gate`;
  const locationText = `and head to Los Platos`;
  const hostText = `to meet with ${authorName}`;
  
  ctx.fillText(messageText, 400, 360);
  ctx.fillText(locationText, 400, 395);
  ctx.fillText(hostText, 400, 430);
  
  return canvas.toBuffer();
  
  // === Footer ===
  // Add footer bar
  ctx.shadowColor = 'transparent'; // Remove shadow for the footer rectangle
  ctx.fillStyle = '#0099ff';
  ctx.fillRect(0, 430, 800, 20);
  
  // Add footer text with subtle shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 2;
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  
  // Use dynamic year
  const year = new Date().getFullYear();
  ctx.fillText(`© ${year} Pokémon Legends`, 400, 445);
  
  return canvas.toBuffer();
}

// ===================================
// Command Definition
// ===================================

module.exports = {
  name: 'flyplatos',
  description: 'Fly to Los Platos',
  
  /**
   * Execute the flyplatos command
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
      const imageUrl = config.images.flyplatos;
      
      if (!imageUrl) {
        return message.channel.send({
          content: 'No image URL found in configuration for Los Platos.'
        });
      }
      
      // First send a ping message
      await message.channel.send(`<@&${config.pingRoleId}>`);
      
      // Generate the canvas image
      const cardBuffer = await createFlyPlatosCard(message.author.username, imageUrl);
      
      // Create an attachment from the buffer
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'los-platos-airline.png' });
      
      // Send the canvas image
      await message.channel.send({
        files: [attachment]
      });
      
    } catch (error) {
      message.channel.send({
        content: 'There was an error generating the Los Platos airline image.'
      });
    }
  },
};