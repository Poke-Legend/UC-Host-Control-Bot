// utils/config.js
const path = require('path');
require('dotenv').config();

// Base configuration values
const config = {
  // Core bot settings
  prefix: '$',
  version: process.env.BOT_VERSION || '1.1.1',
  
  // Role IDs
  allowedRoleIds: [
    process.env.ALLOWED_ROLE_ID,
    process.env.ALLOWED_ROLE_ID2,
  ].filter(Boolean), // Filter out undefined values
  managedRoleId: process.env.MANAGED_ROLE_ID,
  pingRoleId: process.env.PING_ROLE_ID,
  botRoleId: process.env.BOT_ROLE_ID,
  
  // Priority system roles
  priorityRoleIds: {
    vip: process.env.PRIORITY_ROLE_VIP || '',
    supporter: process.env.PRIORITY_ROLE_SUPPORTER || '',
    regular: process.env.PRIORITY_ROLE_REGULAR || '',
  },
  
  // Category IDs
  ucCategoryId: process.env.UC_CATEGORY_ID,
  
  // UI settings
  lockEmoji: '❌',
  unlockEmoji: '✅',
  
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
  
  // Badge system configuration
  badges: {
    1: path.join(__dirname, '..', 'assets', 'badges', 'pokeball.png'),
    2: path.join(__dirname, '..', 'assets', 'badges', 'eevee.png'),
    3: path.join(__dirname, '..', 'assets', 'badges', 'flareon.png'),
    4: path.join(__dirname, '..', 'assets', 'badges', 'jolteon.png'),
    5: path.join(__dirname, '..', 'assets', 'badges', 'vaporeon.png'),
    6: path.join(__dirname, '..', 'assets', 'badges', 'umbreon.png'),
    7: path.join(__dirname, '..', 'assets', 'badges', 'espeon.png'),
    8: path.join(__dirname, '..', 'assets', 'badges', 'glaceon.png'),
    9: path.join(__dirname, '..', 'assets', 'badges', 'leafeon.png'),
    10: path.join(__dirname, '..', 'assets', 'badges', 'sylveon.png'),
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
  
  // Footer configuration
  footer: {
    text: process.env.FOOTER_TEXT || "© 2022 - {year} Pokémon Legends",
    iconUrl: 'https://i.imgur.com/r2Tc0xZ.png',
  },
  
  // System settings
  cooldownSeconds: 600,
  
  // Data directories
  dataPaths: {
    levels: process.env.LEVELS_DATA_PATH || path.join(__dirname, '..', 'levels'),
    queue: process.env.QUEUE_DATA_PATH || path.join(__dirname, '..', 'queue'),
    bans: process.env.BANS_DATA_PATH || path.join(__dirname, '..', 'Bans'),
  },
};

module.exports = config;