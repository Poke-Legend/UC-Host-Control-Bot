// levels/levelSystem.js
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const config = require('../utils/config');

// Path to the leveling database file
const dbDir = path.join(__dirname);
const dbPath = path.join(dbDir, 'database.json');

// Ensure the levels folder and database.json exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({}), 'utf8');
}

let xpData = {};

// Maximum level constant
const MAX_LEVEL = 10;

// Load leveling data from database.json
const loadData = () => {
  try {
    xpData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    console.error('Error loading leveling data:', err);
    xpData = {};
  }
};

// Save leveling data to database.json
const saveData = () => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(xpData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving leveling data:', err);
  }
};

// XP threshold formula: threshold = level * 100
const getXpThreshold = (level) => level * 100;

// Helper function to load an image from file path with fallback to URL
async function loadImageWithFallback(localPath, fallbackUrl) {
  // First, try loading from the local path if it exists
  try {
    // Check if file exists and log the absolute path for debugging
    const absolutePath = path.resolve(localPath);
    const fileExists = fs.existsSync(absolutePath);
    console.log(`Loading image from: ${absolutePath}`);
    console.log(`File exists: ${fileExists}`);
    
    if (fileExists) {
      try {
        const image = await loadImage(absolutePath);
        console.log(`Successfully loaded image from local path: ${absolutePath}`);
        return image;
      } catch (loadErr) {
        console.error(`Error loading local image from ${absolutePath}:`, loadErr);
        // Fall through to URL fallback
      }
    } else {
      console.log(`File not found at ${absolutePath}, trying fallback URL`);
    }
    
    // If we get here, try the fallback URL if provided
    if (fallbackUrl) {
      console.log(`Attempting to load from fallback URL: ${fallbackUrl}`);
      const image = await loadImage(fallbackUrl);
      console.log(`Successfully loaded image from URL: ${fallbackUrl}`);
      return image;
    }
  } catch (err) {
    console.error(`Complete failure loading image (${localPath} or ${fallbackUrl}):`, err);
  }
  
  // Return null if all attempts failed
  return null;
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

// Function to add XP for a given user.
const addXp = (userId, xp, override = false) => {
  if (!xpData[userId]) {
    xpData[userId] = { 
      xp: 0, 
      level: 1, 
      badges: [config.badges[1]], // Use local badge path from config
      modified: false 
    };
  }
  
  // If not overriding and already at max level, do nothing.
  if (!override && xpData[userId].level >= MAX_LEVEL) return;
  
  // If overriding, mark the data as modified.
  if (override) {
    xpData[userId].modified = true;
  }
  
  xpData[userId].xp += xp;
  
  let threshold = getXpThreshold(xpData[userId].level);
  // Level up while XP is enough and level is below MAX_LEVEL.
  while (xpData[userId].xp >= threshold && xpData[userId].level < MAX_LEVEL) {
    xpData[userId].xp -= threshold;
    xpData[userId].level += 1;
    // Award a badge based on the new level from the config
    const badgePath = config.badges[xpData[userId].level];
    xpData[userId].badges.push(badgePath);
    threshold = getXpThreshold(xpData[userId].level);
  }
  
  // If the user reaches MAX_LEVEL and we are not overriding further XP gain,
  // freeze XP at the threshold.
  if (!override && xpData[userId].level >= MAX_LEVEL) {
    xpData[userId].xp = threshold;
  }
  
  saveData();
  return xpData[userId];
};

// Function to remove XP from a user.
const removeXp = (userId, xp, override = false) => {
  if (!xpData[userId]) {
    xpData[userId] = { 
      xp: 0, 
      level: 1, 
      badges: [config.badges[1]], 
      modified: false 
    };
  }
  
  // If not overriding and user is at max level, do nothing.
  if (!override && xpData[userId].level >= MAX_LEVEL) return;
  
  // If overriding and the XP has been modified (i.e. admin override already applied),
  // do not allow removal.
  if (override && xpData[userId].modified) {
    console.log(`Removal prevented for ${userId} because XP has been modified.`);
    return;
  }
  
  xpData[userId].xp -= xp;
  
  // Level down if XP becomes negative.
  while (xpData[userId].xp < 0 && xpData[userId].level > 1) {
    xpData[userId].level -= 1;
    const threshold = getXpThreshold(xpData[userId].level);
    xpData[userId].xp += threshold;
    if (xpData[userId].badges.length > 1) {
      xpData[userId].badges.pop();
    }
  }
  if (xpData[userId].xp < 0) xpData[userId].xp = 0;
  
  saveData();
  return xpData[userId];
};

// Function to create a level up card with badge centered correctly and header icons
async function createLevelUpCard(user, level, currentXp, threshold, badgePath, badgeName) {
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');
  
  // Draw default gradient background
  const gradient = ctx.createLinearGradient(0, 0, 800, 450);
  gradient.addColorStop(0, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 450);
  
  // Try to load background image
  const bgPath = config.images.levelBackground;
  console.log(`Attempting to load background image from: ${bgPath}`);
  let backgroundImage = null;
  
  try {
    // Try to load from the local path with fallback to URL
    backgroundImage = await loadImageWithFallback(
      bgPath, 
      config.imageUrls.levelBackground
    );
    
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
      
      // Add semi-transparent overlay for better text visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, 800, 450);
    } else {
      console.log('No background image loaded, using gradient background');
    }
  } catch (err) {
    console.error('Error loading background image:', err);
    // Continue with gradient background already set
  }
  
  // Add header
  ctx.fillStyle = '#FFD700'; // Gold color for achievements
  ctx.fillRect(0, 0, 800, 60);
  
  // Try to load the pokeball image for header and footer
  const pokeballPath = path.join(__dirname, '..', 'assets', 'badges', 'pokeball.png');
  console.log(`Attempting to load pokeball from: ${pokeballPath}`);
  
  try {
    // Load the pokeball image
    const pokeball = await loadImageWithFallback(
      pokeballPath,
      // Use URL from badges config or a fallback
      `https://sysbots.net/images/pokeball_72px.png`
    );
    
    if (pokeball) {
      // Calculate size for the icons (keep aspect ratio)
      const iconHeight = 50; // Fixed height for the icons
      const iconWidth = (pokeball.width / pokeball.height) * iconHeight;
      
      // Draw the pokeball on the left side of the header
      ctx.drawImage(pokeball, 10, 5, iconWidth, iconHeight);
      
      // Draw the pokeball on the right side of the header
      ctx.drawImage(pokeball, 800 - iconWidth - 10, 5, iconWidth, iconHeight);
      
      console.log('Successfully added pokeball icons to header');
    } else {
      console.log('Pokeball icon not loaded, continuing without it');
    }
  } catch (err) {
    console.error('Error loading pokeball icon:', err);
    // Continue without the pokeball icon
  }
  
  // Add title - NO EMOJI CHARACTERS to avoid the 01F3C5 issue
  ctx.fillStyle = '#333333';
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('UC Trainer Level Up!', 400, 40);
  
  // Add avatar if available
  try {
    let avatarURL = user.displayAvatarURL({ extension: 'png', size: 128 });
    if (avatarURL) {
      const avatar = await loadImage(avatarURL);
      
      // Draw circle for avatar frame
      ctx.beginPath();
      ctx.arc(130, 150, 70, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = '#333333';
      ctx.fill();
      
      // Draw the avatar (creating a circle by clipping)
      ctx.save();
      ctx.beginPath();
      ctx.arc(130, 150, 65, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 65, 85, 130, 130);
      ctx.restore();
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
  
  // Add shadow for text
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Add congratulations text
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Congratulations, ${user.username}!`, 230, 130);
  
  ctx.font = '26px Arial';
  ctx.fillText(`You've reached UC Level ${level}!`, 230, 170);
  
  // Badge information
  ctx.font = '24px Arial';
  ctx.fillText(`New Gym Badge Unlocked: ${badgeName}`, 230, 210);
  ctx.fillText(`Gym Badge ${level} of ${MAX_LEVEL}`, 230, 250);
  
  // Remove shadow for drawing shapes
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw progress bar
  const barWidth = 500;
  const barHeight = 30;
  const barX = 230;
  const barY = 280;
  const percent = currentXp / threshold;
  
  // Background of progress bar
  ctx.fillStyle = 'rgba(45, 55, 72, 0.8)';
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barHeight/2);
  ctx.fill();
  
  // Filled portion of progress bar
  const fillWidth = Math.max(barHeight, Math.floor(barWidth * percent));
  ctx.fillStyle = '#e94560';
  drawRoundedRect(ctx, barX, barY, fillWidth, barHeight, barHeight/2);
  ctx.fill();
  
  // Add XP text
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`XP Progress: ${currentXp}/${threshold} XP (${Math.floor(percent * 100)}%)`, barX + (barWidth / 2), barY + 20);
  
  // Try to draw badge image centered
  try {
    if (badgePath) {
      // Try to load the badge with fallback to URL
      const badge = await loadImageWithFallback(
        badgePath,
        // Construct a fallback URL for the badge
        `https://sysbots.net/images/${path.basename(badgePath).replace('.png', '')}_72px.png`
      );
      
      if (badge) {
        // Calculate center position for badge
        const badgeSize = 120;
        const centerX = 130;
        const centerY = 350;
        
        // Calculate scaling to maintain aspect ratio
        const badgeRatio = badge.width / badge.height;
        
        // Determine dimensions while preserving aspect ratio
        let drawWidth, drawHeight;
        
        if (badgeRatio >= 1) {
          // Badge is wider than tall (or square)
          drawWidth = badgeSize;
          drawHeight = drawWidth / badgeRatio;
        } else {
          // Badge is taller than wide
          drawHeight = badgeSize;
          drawWidth = drawHeight * badgeRatio;
        }
        
        // Calculate position to perfectly center
        const drawX = centerX - (drawWidth / 2);
        const drawY = centerY - (drawHeight / 2);
        
        // Draw badge
        ctx.shadowColor = 'transparent';
        ctx.drawImage(badge, drawX, drawY, drawWidth, drawHeight);
      } else {
        throw new Error('Badge image could not be loaded');
      }
    }
  } catch (err) {
    console.error('Error drawing badge:', err);
    // Draw placeholder if badge fails
    const placeholder = createBadgePlaceholder(level, 120);
    ctx.drawImage(placeholder, 70, 290, 120, 120);
  }
  
  // Add footer
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 430, 800, 20);
  
  // Add pokeballs to footer too if we have them loaded
  try {
    const pokeballPath = path.join(__dirname, '..', 'assets', 'badges', 'pokeball.png');
    const pokeball = await loadImageWithFallback(
      pokeballPath,
      `https://sysbots.net/images/pokeball_72px.png`
    );
    
    if (pokeball) {
      // Calculate size for the icons (smaller for footer)
      const iconHeight = 16; // Fixed height for the footer icons
      const iconWidth = (pokeball.width / pokeball.height) * iconHeight;
      
      // Draw the pokeball on the left side of the footer
      ctx.drawImage(pokeball, 10, 432, iconWidth, iconHeight);
      
      // Draw the pokeball on the right side of the footer
      ctx.drawImage(pokeball, 800 - iconWidth - 10, 432, iconWidth, iconHeight);
    }
  } catch (err) {
    console.error('Error adding pokeballs to footer:', err);
  }
  
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#333333';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Union Circle Leveling System | This message will disappear in 60 seconds', 400, 445);
  
  return canvas.toBuffer();
}

// Function to generate level card for UI displays
async function generateLevelCard(user, data) {
  // Create canvas with 16:9 aspect ratio
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');
  
  // Set default gradient background
  const gradient = ctx.createLinearGradient(0, 0, 800, 450);
  gradient.addColorStop(0, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 450);
  
  // Try to load background image
  const bgPath = config.images.levelBackground;
  console.log(`Attempting to load background image from: ${bgPath}`);
  let backgroundImage = null;
  
  try {
    // Try to load from the local path with fallback to URL
    backgroundImage = await loadImageWithFallback(
      bgPath, 
      config.imageUrls.levelBackground
    );
    
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
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, 800, 450);
    } else {
      console.log('No background image loaded, using gradient background');
    }
  } catch (err) {
    console.error('Error loading background image:', err);
    // Continue with gradient background already set
  }
  
  // Add Pokemon Legends logo/banner at the top
  ctx.fillStyle = '#e94560';
  ctx.fillRect(0, 0, 800, 60);
  
  // Try to load the pokeball image for header and footer
  const pokeballPath = path.join(__dirname, '..', 'assets', 'badges', 'pokeball.png');
  console.log(`Attempting to load pokeball from: ${pokeballPath}`);
  
  try {
    // Load the pokeball image
    const pokeball = await loadImageWithFallback(
      pokeballPath,
      // Use URL from badges config or a fallback
      `https://sysbots.net/images/pokeball_72px.png`
    );
    
    if (pokeball) {
      // Calculate size for the icons (keep aspect ratio)
      const iconHeight = 50; // Fixed height for the icons
      const iconWidth = (pokeball.width / pokeball.height) * iconHeight;
      
      // Draw the pokeball on the left side of the header
      ctx.drawImage(pokeball, 10, 5, iconWidth, iconHeight);
      
      // Draw the pokeball on the right side of the header
      ctx.drawImage(pokeball, 800 - iconWidth - 10, 5, iconWidth, iconHeight);
      
      console.log('Successfully added pokeball icons to header');
    } else {
      console.log('Pokeball icon not loaded, continuing without it');
    }
  } catch (err) {
    console.error('Error loading pokeball icon:', err);
    // Continue without the pokeball icon
  }
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Pokemon Legends Union Circle', 400, 40);
  
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
        // Try to load badge with fallback to URL
        const badgePath = data.badges[i];
        const fileName = path.basename(badgePath).replace('.png', '');
        const badge = await loadImageWithFallback(
          badgePath, 
          `https://sysbots.net/images/${fileName}_72px.png`
        );
        
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
  
  // Add pokeballs to footer too if we have them loaded
  try {
    const pokeballPath = path.join(__dirname, '..', 'assets', 'badges', 'pokeball.png');
    const pokeball = await loadImageWithFallback(
      pokeballPath,
      `https://sysbots.net/images/pokeball_72px.png`
    );
    
    if (pokeball) {
      // Calculate size for the icons (smaller for footer)
      const iconHeight = 16; // Fixed height for the footer icons
      const iconWidth = (pokeball.width / pokeball.height) * iconHeight;
      
      // Draw the pokeball on the left side of the footer
      ctx.drawImage(pokeball, 10, 432, iconWidth, iconHeight);
      
      // Draw the pokeball on the right side of the footer
      ctx.drawImage(pokeball, 800 - iconWidth - 10, 432, iconWidth, iconHeight);
    }
  } catch (err) {
    console.error('Error adding pokeballs to footer:', err);
  }
  
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
}

// In-memory cooldown store to prevent spam XP gain (per user)
const xpCooldown = {}; // key: userId, value: timestamp
const XP_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown

// Initialize the leveling system by listening to message events.
const initLevelSystem = (client) => {
  loadData();
  client.on('messageCreate', async (message) => {
    // Ignore bot messages.
    if (message.author.bot) return;
    
    const userId = message.author.id;
    const now = Date.now();
    if (xpCooldown[userId] && now - xpCooldown[userId] < XP_COOLDOWN_MS) return;
    xpCooldown[userId] = now;
    
    const prevLevel = xpData[userId] ? xpData[userId].level : 1;
    addXp(userId, 5); // Normal XP gain, no override.
    const newLevel = xpData[userId].level;
    
    if (newLevel > prevLevel) {
      try {
        // Get the badge details for the new level
        const badgePath = config.badges[newLevel];
        const badgeName = config.badgeNames[newLevel] || `Level ${newLevel} Badge`;
        const nextThreshold = getXpThreshold(newLevel);
        const currentXp = xpData[userId].xp;

        // Fetch the user
        const user = await client.users.fetch(userId);
        
        // Generate the level up card using Canvas
        const cardBuffer = await createLevelUpCard(
          user, 
          newLevel, 
          currentXp, 
          nextThreshold, 
          badgePath, 
          badgeName
        );
        
        // Create an attachment from the buffer
        const attachment = new AttachmentBuilder(cardBuffer, { name: 'level-up-card.png' });
        
        // Send the level up card as a message
        const levelUpMessage = await message.channel.send({
          content: `🎉 Congratulations <@${userId}>! You've leveled up!`,
          files: [attachment]
        });
        
        // Delete the message after 60 seconds
        setTimeout(() => {
          levelUpMessage.delete().catch(err => {
            // Ignore messages that are already deleted
            if (err.code !== 10008) {
              console.error('Error deleting level up message:', err);
            }
          });
        }, 60000); // 60 seconds
      } catch (error) {
        console.error('Error sending level up notification:', error);
      }
    }
  });
};

// Function to retrieve leveling data for a given user.
const getUserLevelData = (userId) =>
  xpData[userId] || { xp: 0, level: 1, badges: [config.badges[1]], modified: false };

module.exports = {
  initLevelSystem,
  getUserLevelData,
  addXp,
  removeXp,
  generateLevelCard
};
          