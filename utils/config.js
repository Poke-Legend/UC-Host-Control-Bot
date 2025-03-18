// utils/config.js
module.exports = {
  prefix: '$',
  version: process.env.BOT_VERSION || '1.0.5', // Added version from env with fallback
  allowedRoleIds: [
    process.env.ALLOWED_ROLE_ID,
    process.env.ALLOWED_ROLE_ID2,
    // add more roles if needed
  ],
  lockEmoji: '❌',
  unlockEmoji: '✅',
  managedRoleId: process.env.MANAGED_ROLE_ID,
  pingRoleId: process.env.PING_ROLE_ID,
  images: {
    lock: process.env.LOCK_IMAGE_URL,
    unlock: process.env.UNLOCK_IMAGE_URL,
    custom: process.env.CUSTOM_IMAGE_URL,
    fly: process.env.FLY_IMAGE_URL,
    fly2: process.env.FLY2_IMAGE_URL,
    flyplatos: process.env.FLYPLATOS_IMAGE_URL,
    stay: process.env.STAY_IMAGE_URL,
    ready: process.env.READY_IMAGE_URL,
    slut: process.env.SLUT_IMAGE_URL,
    levelBackground: process.env.LEVEL_BACKGROUND_URL || 'https://i.imgur.com/yqxPq1J.png'
  },
  footer: {
    text: process.env.FOOTER_TEXT, // e.g. "© 2022 - {year} Pokémon Legends"
    iconUrl: process.env.FOOTER_ICON_URL,
  },
  cooldownSeconds: 600,
};