// levels/levelSystem.js
const fs = require('fs');
const path = require('path');

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

// Custom badge image URLs for specific levels
const badgeUrls = {
  1: 'https://i.imgur.com/QAOmpNv.png',
  2: 'https://i.imgur.com/lPW4LC9.png',
  3: 'https://i.imgur.com/Y0dpWdL.png',
  4: 'https://i.imgur.com/xXUUwzx.png',
  5: 'https://i.imgur.com/9RNbY7J.png',
  6: 'https://i.imgur.com/JBlyYaY.png',
  7: 'https://i.imgur.com/eLjeAgE.png',
  8: 'https://i.imgur.com/hccRVbT.png',
  9: 'https://i.imgur.com/crCBXpJ.png',
  10: 'https://i.imgur.com/ocH0QGV.png',
  // Add more levels if needed.
};

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

// In-memory cooldown store to prevent spam XP gain (per user)
const xpCooldown = {}; // key: userId, value: timestamp
const XP_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown

// Initialize the leveling system by listening to message events.
const initLevelSystem = (client) => {
  loadData();
  client.on('messageCreate', (message) => {
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
      message.channel.send(`Congratulations <@${userId}>! You've leveled up to level ${newLevel}!`);
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
