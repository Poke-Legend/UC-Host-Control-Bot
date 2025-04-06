// utils/registrationCard.js
const { createCanvas, loadImage } = require('canvas');

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

/**
 * Generate registration card image for a new user
 * @param {object} user - Discord user object
 * @param {object} registration - Registration data
 * @returns {Buffer} - Canvas buffer for the image
 */
async function generateRegistrationCard(user, registration) {
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
  const bgUrl = process.env.LEVEL_BACKGROUND_URL || 'https://sysbots.net/images/pokemon-legends.png';
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
        
        // Add a semi-transparent overlay for better text visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, 800, 450);
      }
    } catch (err) {
      console.error('Error loading background image:', err);
      // Fallback to gradient background already set
    }
  }
  
  // Add Pokemon Legends header
  ctx.fillStyle = '#e94560';
  ctx.fillRect(0, 0, 800, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Pokémon Legends Union Circle - Registration Complete', 400, 40);
  
  // Add avatar placeholder and circular frame
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
    console.error('Error loading avatar:', err);
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
  
  // Add shadow effect for better readability
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Add user information
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Welcome, ${user.username}!`, 230, 120);
  
  // Registration details (panel with rounded corners)
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Draw a semi-transparent panel for registration details
  ctx.fillStyle = 'rgba(15, 52, 96, 0.7)';
  drawRoundedRect(ctx, 230, 140, 530, 220, 10); // Made the panel taller to fit Mega info
  ctx.fill();
  
  // Add registration details with shadow
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Arial';
  ctx.fillText(`In-Game Name: ${registration.ign}`, 250, 170);
  
  // Adjust spacing to accommodate Mega Evolution info
  let yPos = 170;
  const lineHeight = 40;
  
  // In-Game Name
  ctx.fillText(`In-Game Name: ${registration.ign}`, 250, yPos);
  yPos += lineHeight;
  
  // Pokémon with Level
  ctx.fillText(`Pokémon: ${registration.pokemon}${registration.pokemonLevel ? ` (Lvl ${registration.pokemonLevel})` : ''}`, 250, yPos);
  yPos += lineHeight;
  
  // Mega Evolution Info (only show details if Mega is Yes)
  if (registration.mega === 'Yes' && registration.megaDetails) {
    ctx.fillText(`Mega Evolution: ${registration.megaDetails}`, 250, yPos);
  } else {
    ctx.fillText(`Mega Evolution: ${registration.mega}`, 250, yPos);
  }
  yPos += lineHeight;
  
  // Shiny Status
  ctx.fillText(`Shiny: ${registration.shiny}`, 250, yPos);
  yPos += lineHeight;
  
  // Holding Item (if provided)
  if (registration.holdingItem) {
    ctx.fillText(`Holding: ${registration.holdingItem}`, 250, yPos);
    yPos += lineHeight;
  }
  
  // Status message
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.textAlign = 'center';
  ctx.font = '26px Arial';
  ctx.fillText('You have been added to the waiting list!', 400, 380);
  ctx.font = '20px Arial';
  ctx.fillText('The host will notify you when it\'s your turn', 400, 415);
  
  // Add footer
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#e94560';
  ctx.fillRect(0, 430, 800, 20);
  
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 2;
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  
  // Use dynamic year 
  const year = new Date().getFullYear();
  ctx.fillText(`© ${year} Pokémon Legends Union Circle`, 400, 445);
  
  return canvas.toBuffer();
}

module.exports = { generateRegistrationCard };