// levels/levelSystem.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

// Path to the leveling database file
const dbDir = path.join(__dirname);
const dbPath = path.join(dbDir, 'database.json');

// Create cache directory if it doesn't exist
const cacheDir = path.join(__dirname, '..', 'cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

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

// Custom badge image URLs for specific levels
const badgeUrls = {
  1: 'https://sysbots.net/images/Smaller%20Pokeball_72px.png',
  2: 'https://sysbots.net/images/Eevee_72px.png',
  3: 'https://sysbots.net/images/Flareon_72px.png',
  4: 'https://sysbots.net/images/Jolteon_72px.png',
  5: 'https://sysbots.net/images/Vaporeon_72px.png',
  6: 'https://sysbots.net/images/Umbreon_72px.png',
  7: 'https://sysbots.net/images/Espeon_72px.png',
  8: 'https://sysbots.net/images/Glaceon_72px.png',
  9: 'https://sysbots.net/images/Leafeon_72px.png',
  10: 'https://sysbots.net/images/Sylveon_72px.png',
  // Add more levels if needed.
};

// Badge names for each level
const badgeNames = {
  1: "Boulder Badge",
  2: "Cascade Badge",
  3: "Thunder Badge",
  4: "Rainbow Badge",
  5: "Soul Badge",
  6: "Marsh Badge", 
  7: "Volcano Badge",
  8: "Earth Badge",
  9: "Balance Badge",
  10: "Master Badge"
};

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
    const https = require('https');
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

// Function to create a level up card with badge centered correctly
async function createLevelUpCard(username, level, currentXp, threshold, badgeUrl, badgeName) {
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');
  
  // Draw background
  const gradient = ctx.createLinearGradient(0, 0, 800, 450);
  gradient.addColorStop(0, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 450);
  
  // Add header
  ctx.fillStyle = '#FFD700'; // Gold color for achievements
  ctx.fillRect(0, 0, 800, 60);
  
  // Add title
  ctx.fillStyle = '#333333';
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🏅 UC Trainer Level Up! 🏅', 400, 40);
  
  // Add shadow for text
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Add congratulations text
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Congratulations, ${username}!`, 400, 110);
  
  ctx.font = '26px Arial';
  ctx.fillText(`You've reached UC Level ${level}!`, 400, 150);
  
  // Badge information
  ctx.font = '24px Arial';
  ctx.fillText(`New Gym Badge Unlocked: ${badgeName}`, 400, 190);
  ctx.fillText(`Gym Badge ${level} of ${MAX_LEVEL}`, 400, 230);
  
  // Remove shadow for drawing shapes
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw progress bar
  const barWidth = 500;
  const barHeight = 30;
  const barX = 150;
  const barY = 260;
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
  ctx.fillText(`XP Progress: ${currentXp}/${threshold} XP (${Math.floor(percent * 100)}%)`, 400, 310);
  
  // Try to draw badge image centered
  try {
    if (badgeUrl) {
      const badge = await loadAndCacheImage(badgeUrl);
      
      if (badge) {
        // Calculate center position for badge
        const badgeSize = 120;
        const centerX = 400;
        const centerY = 380;
        
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
      }
    }
  } catch (err) {
    console.error('Error drawing badge:', err);
    // Draw placeholder if badge fails
    ctx.fillStyle = '#FFD700';
    ctx.font = '60px Arial';
    ctx.fillText('🏆', 400, 380);
  }
  
  // Add footer
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 430, 800, 20);
  
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#333333';
  ctx.font = '14px Arial';
  ctx.fillText('Union Circle Leveling System | This message will disappear in 60 seconds', 400, 445);
  
  return canvas.toBuffer();
}

// Function to add XP for a given user.
// If override is false (normal XP gain) and user is at MAX_LEVEL, then no further XP is added.
// If override is true (admin command), XP is added regardless, and a flag "modified" is set.
const addXp = (userId, xp, override = false) => {
  if (!xpData[userId]) {
    xpData[userId] = { xp: 0, level: 1, badges: [badgeUrls[1]], modified: false };
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
    // Award a badge based on the new level; if a custom badge URL exists, use it.
    const badge = badgeUrls[xpData[userId].level] || `Level ${xpData[userId].level} Badge`;
    xpData[userId].badges.push(badge);
    threshold = getXpThreshold(xpData[userId].level);
  }
  
  // If the user reaches MAX_LEVEL and we are not overriding further XP gain,
  // freeze XP at the threshold.
  if (!override && xpData[userId].level >= MAX_LEVEL) {
    xpData[userId].xp = threshold;
  }
  
  saveData();
};

// Function to remove XP from a user.
// If override is false and the user is at MAX_LEVEL, removal does nothing.
// If override is true, we normally allow removal unless the data is marked as modified,
// in which case removal is ignored.
const removeXp = (userId, xp, override = false) => {
  if (!xpData[userId]) {
    xpData[userId] = { xp: 0, level: 1, badges: [badgeUrls[1]], modified: false };
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
};

// Helper function to create a progress bar
const progressBar = (xp, threshold, barLength = 10) => {
  const percent = xp / threshold;
  const filledLength = Math.round(barLength * percent);
  const emptyLength = barLength - filledLength;
  return '▰'.repeat(filledLength) + '▱'.repeat(emptyLength);
};

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
        const badgeUrl = badgeUrls[newLevel];
        const badgeName = badgeNames[newLevel] || `Level ${newLevel} Badge`;
        const nextThreshold = getXpThreshold(newLevel);
        const currentXp = xpData[userId].xp;
        const bar = progressBar(currentXp, nextThreshold);
        
        // Create a rich embed for the level up announcement
        const embed = new EmbedBuilder()
          .setColor('#FFD700') // Gold color for achievements
          .setTitle(`🏅 UC Trainer Level Up! 🏅`)
          .setDescription(`Congratulations <@${userId}>! You've reached **UC Level ${newLevel}**!`)
          .addFields(
            { name: `🔥 New Gym Badge Unlocked: ${badgeName}`, value: `Gym Badge ${newLevel} of ${MAX_LEVEL}`, inline: false },
            { name: 'XP Progress', value: `${currentXp}/${nextThreshold} XP\n${bar}`, inline: false }
          )
          .setImage(badgeUrl)
          .setFooter({ text: 'Union Circle Leveling System | This message will disappear in 60 seconds' })
          .setTimestamp();
        
        // Get user's name
        const user = await client.users.fetch(userId);
        const username = user ? user.username : "Trainer";
        
        // Send embed and delete after 60 seconds
        const levelUpMessage = await message.channel.send({ embeds: [embed] });
        
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
  xpData[userId] || { xp: 0, level: 1, badges: [badgeUrls[1]], modified: false };

module.exports = {
  initLevelSystem,
  getUserLevelData,
  addXp,
  removeXp,
};