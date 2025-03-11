const fs = require('fs');
const path = require('path');

const bansDir = path.join(__dirname, '..', 'Bans');
if (!fs.existsSync(bansDir)) {
  fs.mkdirSync(bansDir);
}
const banFilePath = path.join(bansDir, 'database.json');
if (!fs.existsSync(banFilePath)) {
  fs.writeFileSync(banFilePath, JSON.stringify({}, null, 2), 'utf8');
}

const loadBanDatabase = () => {
  try {
    return JSON.parse(fs.readFileSync(banFilePath, 'utf8'));
  } catch (error) {
    console.error('Failed to load ban database:', error);
    return {};
  }
};

const saveBanDatabase = (data) => {
  try {
    fs.writeFileSync(banFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save ban database:', error);
  }
};

const parseDuration = (durationStr) => {
  if (!durationStr) return null;
  const lower = durationStr.toLowerCase();
  if (lower === 'permanent') return null;
  const match = lower.match(/^(\d+)([dhms])$/);
  if (!match) {
    const asNumber = parseInt(lower, 10);
    if (isNaN(asNumber)) return null;
    return asNumber * 1000;
  } else {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 's') return value * 1000;
  }
  return null;
};

const checkBan = (userId) => {
  const bans = loadBanDatabase();
  const banData = bans[userId];
  if (!banData) return { banned: false, reason: '' };
  const now = Date.now();
  if (banData.expires === null) return { banned: true, reason: banData.reason || 'No reason provided' };
  if (banData.expires && now > banData.expires) {
    delete bans[userId];
    saveBanDatabase(bans);
    return { banned: false, reason: '' };
  }
  return { banned: true, reason: banData.reason || 'No reason provided' };
};

module.exports = { loadBanDatabase, saveBanDatabase, parseDuration, checkBan };
