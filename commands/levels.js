// commands/levels.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getUserLevelData } = require('../levels/levelSystem');
const { createCanvas, loadImage } = require('canvas');
require('dotenv').config();

// Helper function to draw a rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// Simple function to load an image directly
async function loadImageDirectly(url) {
  if (!url) return null;
  
  try {
    return await loadImage(url);
  } catch (err) {
    console.error('Error loading image:', err);
    return null;
  }
}

// Function to create a placeholder badge
function createBadgePlaceholder(level, size = 50) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Make background transparent
  ctx.clearRect(0, 0, size, size);
  
  // Draw badge circle background
  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Add badge number/level
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(level.toString(), size/2, size/2);
  
  return canvas;
}

// Function to generate level card as canvas
const generateLevelCard = async (user, data) => {
  // Create canvas with 16:9 aspect ratio
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');
  
  // Set default gradient background
  const gradient = ctx.createLinearGradient(0, 0, 800, 450);
  gradient.addColorStop(0, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 450);
  
  // Try to load background image from env
  const bgUrl = process.env.LEVEL_BACKGROUND_URL;
  if (bgUrl) {
    try {
      const backgroundImage = await loadImageDirectly(bgUrl);
      
      if (backgroundImage) {
        // Calculate dimensions to cover the entire canvas while maintaining aspect ratio
        const bgRatio = backgroundImage.width / backgroundImage.height;
        const canvasRatio = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (bgRatio > canvasRatio) {
          // Image is wider than the canvas (relative to height)
          drawHeight = canvas.height;
          drawWidth = drawHeight * bgRatio;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          // Image is taller than the canvas (relative to width)
          drawWidth = canvas.width;
          drawHeight = drawWidth / bgRatio;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }
        
        // Clear the canvas before drawing the background image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the background image to cover the entire canvas
        ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
      }
    } catch (err) {
      // Fallback to gradient (already set)
    }
  }
  
  // Add a semi-transparent overlay for better text visibility
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, 800, 450);
  
  // Add Pokemon Legends logo/banner at the top
  ctx.fillStyle = '#e94560';
  ctx.fillRect(0, 0, 800, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Pokémon Legends Union Circle', 400, 40);
  
  // Add avatar placeholder
  ctx.beginPath();
  ctx.arc(130, 150, 70, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#333333';
  ctx.fill();
  
  // Try to load and draw user avatar
  try {
    let avatarURL = user.displayAvatarURL({ extension: 'png', size: 128 });
    if (avatarURL) {
      const avatar = await loadImage(avatarURL);
      
      // Draw the avatar (creating a circle by clipping)
      ctx.save();
      ctx.beginPath();
      ctx.arc(130, 150, 65, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 65, 85, 130, 130);
      ctx.restore();
    } else {
      throw new Error('No avatar URL available');
    }
  } catch (err) {
    // Draw avatar letter instead
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(130, 150, 65, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(user.username.charAt(0).toUpperCase(), 130, 170);
  }
  
  // Add user information with a shadow effect for better readability
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(user.username, 230, 130);
  
  // Level information
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.fillText(`Level: ${data.level}`, 230, 170);
  
  // Calculate threshold and percentage
  const threshold = data.level * 100;
  const percent = data.xp / threshold;
  
  // Draw XP information
  ctx.fillText(`XP: ${data.xp} / ${threshold}`, 230, 210);
  
  // Remove shadow for drawing shapes
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw progress bar background
  const barWidth = 500;
  const barHeight = 30;
  const barX = 230;
  const barY = 230;
  
  ctx.fillStyle = 'rgba(45, 55, 72, 0.8)';
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barHeight/2);
  ctx.fill();
  
  // Draw progress bar filled portion
  const fillWidth = Math.max(barHeight, Math.floor(barWidth * percent));
  ctx.fillStyle = '#e94560';
  drawRoundedRect(ctx, barX, barY, fillWidth, barHeight, barHeight/2);
  ctx.fill();
  
  // Add percentage on top of the bar
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(percent * 100)}%`, barX + (barWidth / 2), barY + 20);
  
  // Add shadow back for text
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Badge section
  ctx.textAlign = 'left';
  ctx.font = '24px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Gym Badges:', 80, 300);
  
  // Remove shadow for drawing badges
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw badges from the level system data
  if (data.badges && data.badges.length > 0) {
    const badgeSize = 50; // Size of badge container
    const spacing = 10;   // Space between badges
    const startX = 80;    // Starting X position
    const startY = 320;   // Starting Y position
    const badgesPerRow = 10;
    
    for (let i = 0; i < data.badges.length; i++) {
      const row = Math.floor(i / badgesPerRow);
      const col = i % badgesPerRow;
      
      // Calculate the center position of the badge circle
      const centerX = startX + col * (badgeSize + spacing) + badgeSize/2;
      const centerY = startY + row * (badgeSize + spacing) + badgeSize/2;
      const circleRadius = badgeSize/2;
      
      // Draw badge circle
      ctx.fillStyle = 'rgba(15, 52, 96, 0.7)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      
      try {
        // Try to load badge image directly without caching
        const badge = await loadImageDirectly(data.badges[i]);
        
        if (badge) {
          // Calculate how to perfectly center and scale the badge
          // First, determine the scaling factor to fit within the circle
          const badgeRatio = badge.width / badge.height;
          
          // Calculate the maximum dimensions to fit in the circle (accounting for padding)
          const circleDiameter = (circleRadius * 2) - 4; // 2px padding on each side
          
          // Determine if width or height is the limiting factor
          let drawWidth, drawHeight;
          
          if (badgeRatio >= 1) {
            // Badge is wider than tall (or square)
            drawWidth = circleDiameter;
            drawHeight = drawWidth / badgeRatio;
          } else {
            // Badge is taller than wide
            drawHeight = circleDiameter;
            drawWidth = drawHeight * badgeRatio;
          }
          
          // Calculate position to perfectly center
          const drawX = centerX - (drawWidth / 2);
          const drawY = centerY - (drawHeight / 2);
          
          // Draw with clipping for clean circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, circleRadius - 2, 0, Math.PI * 2);
          ctx.clip();
          
          // Draw badge centered in the circle
          ctx.drawImage(badge, drawX, drawY, drawWidth, drawHeight);
          ctx.restore();
        } else {
          throw new Error('Badge failed to load');
        }
      } catch (err) {
        // Draw placeholder with number if badge fails to load
        const placeholder = createBadgePlaceholder(i+1, badgeSize - 4);
        
        // Draw placeholder centered
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius - 2, 0, Math.PI * 2);
        ctx.clip();
        
        // Center the placeholder
        const placeX = centerX - (badgeSize - 4) / 2;
        const placeY = centerY - (badgeSize - 4) / 2;
        ctx.drawImage(placeholder, placeX, placeY, badgeSize - 4, badgeSize - 4);
        ctx.restore();
      }
    }
  } else {
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '20px Arial';
    ctx.fillText('No badges earned yet', 80, 340);
  }
  
  // Add footer
  ctx.fillStyle = '#e94560';
  ctx.fillRect(0, 430, 800, 20);
  
  // Footer text with shadow
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  
  // Use dynamic year 
  const year = new Date().getFullYear();
  ctx.fillText(`© ${year} Pokémon Legends`, 400, 445);
  
  return canvas.toBuffer();
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('View your current level, XP progress, and gym badges in the Union Circle')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to check levels for (defaults to yourself)')
        .setRequired(false)),
    
  async execute(interaction, client) {
    // Defer the reply as canvas operations might take some time
    await interaction.deferReply();
    
    // Get target user (self or specified)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;
    
    // Get user's level data
    const data = getUserLevelData(userId);
    
    try {
      // Generate the level card
      const cardBuffer = await generateLevelCard(targetUser, data);
      
      // Create attachment
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'level-card.png' });
      
      // Send the card
      await interaction.editReply({ 
        files: [attachment],
        content: targetUser.id === interaction.user.id 
          ? '📊 Here\'s your Union Circle level card!'
          : `📊 Here's the Union Circle level card for ${targetUser}!`
      });
      
    } catch (error) {
      console.error('Error generating level card:', error);
      // Send error message
      await interaction.editReply({ 
        content: `Sorry, I couldn't generate a level card for ${targetUser.username}. Please try again later.`
      });
    }
  },
};