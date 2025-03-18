// utils/registrationCard.js
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const https = require('https');
// No level system import needed

// Create cache directory if it doesn't exist
const cacheDir = path.join(__dirname, '..', 'cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

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

// Simple function to load and cache an image
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
      const backgroundImage = await loadAndCacheImage(bgUrl);
      
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
      console.error('Error loading background image:', err);
      // Fallback to gradient (already set)
    }
  }
  
  // Add a semi-transparent overlay for better text visibility
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, 800, 450);
  
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
  drawRoundedRect(ctx, 230, 140, 530, 180, 10);
  ctx.fill();
  
  // Add registration details with shadow
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Arial';
  ctx.fillText(`In-Game Name: ${registration.ign}`, 250, 170);
  ctx.fillText(`Pokémon: ${registration.pokemon}${registration.pokemonLevel ? ` (Lvl ${registration.pokemonLevel})` : ''}`, 250, 210);
  ctx.fillText(`Shiny: ${registration.shiny}`, 250, 250);
  
  if (registration.holdingItem) {
    ctx.fillText(`Holding: ${registration.holdingItem}`, 250, 290);
  }
  
  // Status message
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.textAlign = 'center';
  ctx.font = '26px Arial';
  ctx.fillText('You have been added to the waiting list!', 400, 350);
  ctx.font = '20px Arial';
  ctx.fillText('The host will notify you when it\'s your turn', 400, 385);
  
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