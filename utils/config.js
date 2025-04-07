// utils/config.js
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Base assets directories (use env variables if provided, otherwise use defaults)
const assetsDir = path.join(__dirname, '..', 'assets');
const uiDir = process.env.UI_IMAGE_PATH || path.join(assetsDir, 'ui');
const badgesDir = process.env.BADGES_IMAGE_PATH || path.join(assetsDir, 'badges');

// Helper function to get image path and log warning if missing
function getLocalImagePath(localPath, imageName) {
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  
  // Log warning for missing image
  console.warn(`Warning: Local image file not found: ${localPath}`);
  
  // Return the path anyway - the app should handle missing files gracefully
  return localPath;
}

module.exports = {
  prefix: '$',
  version: process.env.BOT_VERSION || '1.1.0',
  allowedRoleIds: [
    process.env.ALLOWED_ROLE_ID,
    process.env.ALLOWED_ROLE_ID2,
  ].filter(Boolean), // Filter out undefined values
  
  lockEmoji: '❌',
  unlockEmoji: '✅',
  managedRoleId: process.env.MANAGED_ROLE_ID,
  pingRoleId: process.env.PING_ROLE_ID,
  ucCategoryId: process.env.UC_CATEGORY_ID,
  botRoleId: process.env.BOT_ROLE_ID,
  
  // Image URLs for Discord embeds (must be URLs, not file paths)
  imageUrls: {
    lock: 'https://i.imgur.com/csmSEVh.png',
    unlock: 'https://i.imgur.com/m1RKJak.png',
    custom: 'https://i.imgur.com/WeMePud.jpg',
    fly: 'https://i.imgur.com/eIs2hYS.gif',
    fly2: 'https://i.imgur.com/TEF6BRk.gif',
    flyplatos: 'https://sysbots.net/images/FlyPlatos/FlyPlatos.png',
    stay: 'https://sysbots.net/images/stay/stay.gif',
    ready: 'https://sysbots.net/images/ready/ready.png',
    slut: 'https://sysbots.net/images/Slut/slut.png',
    levelBackground: 'https://sysbots.net/images/pokemon-legends.png'
  },
  
  // Local image paths for Canvas operations
  images: {
    lock: getLocalImagePath(path.join(uiDir, 'lock.png'), 'lock'),
    unlock: getLocalImagePath(path.join(uiDir, 'unlock.png'), 'unlock'),
    custom: getLocalImagePath(path.join(uiDir, 'custom.jpg'), 'custom'),
    fly: getLocalImagePath(path.join(uiDir, 'fly.gif'), 'fly'),
    fly2: getLocalImagePath(path.join(uiDir, 'fly2.gif'), 'fly2'),
    flyplatos: getLocalImagePath(path.join(uiDir, 'flyplatos.png'), 'flyplatos'),
    stay: getLocalImagePath(path.join(uiDir, 'stay.gif'), 'stay'),
    ready: getLocalImagePath(path.join(uiDir, 'ready.png'), 'ready'),
    slut: getLocalImagePath(path.join(uiDir, 'slut.png'), 'slut'),
    levelBackground: getLocalImagePath(path.join(uiDir, 'background.png'), 'levelBackground')
  },
  
  // Badge image paths with fallbacks
  badges: {
    1: getLocalImagePath(path.join(badgesDir, 'pokeball.png'), 'badge1'),
    2: getLocalImagePath(path.join(badgesDir, 'eevee.png'), 'badge2'),
    3: getLocalImagePath(path.join(badgesDir, 'flareon.png'), 'badge3'),
    4: getLocalImagePath(path.join(badgesDir, 'jolteon.png'), 'badge4'),
    5: getLocalImagePath(path.join(badgesDir, 'vaporeon.png'), 'badge5'),
    6: getLocalImagePath(path.join(badgesDir, 'umbreon.png'), 'badge6'),
    7: getLocalImagePath(path.join(badgesDir, 'espeon.png'), 'badge7'),
    8: getLocalImagePath(path.join(badgesDir, 'glaceon.png'), 'badge8'),
    9: getLocalImagePath(path.join(badgesDir, 'leafeon.png'), 'badge9'),
    10: getLocalImagePath(path.join(badgesDir, 'sylveon.png'), 'badge10'),
  },
  
  // Badge names for easier reference
  badgeNames: {
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
  },
  
  // Footer configuration - URL required for Discord
  footer: {
    text: process.env.FOOTER_TEXT || "© 2022 - {year} Pokémon Legends",
    iconUrl: 'https://i.imgur.com/r2Tc0xZ.png', // Use URL here, not local path
  },
  
  // Other bot configuration
  cooldownSeconds: 600,
  
  // Data directories
  dataPaths: {
    levels: process.env.LEVELS_DATA_PATH || path.join(__dirname, '..', 'levels'),
    queue: process.env.QUEUE_DATA_PATH || path.join(__dirname, '..', 'queue'),
    bans: process.env.BANS_DATA_PATH || path.join(__dirname, '..', 'Bans'),
  },
};