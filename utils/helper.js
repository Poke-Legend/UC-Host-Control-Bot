// utils/helper.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('./config');

// Helper function to convert hex color to integer
function hexToInt(hexColor) {
  // Remove # if present
  if (hexColor && typeof hexColor === 'string') {
    const hex = hexColor.replace('#', '');
    return parseInt(hex, 16);
  }
  
  // If already a number or invalid, return as is
  return hexColor;
}

const createEmbed = ({ color, title, description, image = null, extraFields = [] }) => {
  const systemYear = new Date().getFullYear();
  const systemTime = new Date().toLocaleTimeString();
  const footerText = config.footer.text
    ? config.footer.text.replace(/{year}/g, systemYear)
    : `© ${systemYear} Pokémon Legends - ${systemTime}`;

  // Ensure color is converted to integer
  const embedColor = hexToInt(color);

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ 
      text: footerText, 
      iconURL: config.footer.iconUrl // Use the URL, not local path
    })
    .setTimestamp();

  // Check if image is a URL or local path
  // Only use URLs for Discord embeds
  if (image && image.startsWith('http')) {
    embed.setImage(image);
  }
  
  if (extraFields.length > 0) embed.addFields(extraFields);
  return embed;
};

const sendEmbed = async (channel, color, title, description, image = null, extraFields = []) => {
  // Ensure color is converted to integer
  const embedColor = hexToInt(color);
  
  // If image is a local path, try to find corresponding URL in imageUrls
  if (image && !image.startsWith('http')) {
    // Try to find a matching URL by comparing path segments
    const imageName = path.basename(image);
    const matchingUrlKey = Object.keys(config.imageUrls).find(key => {
      const urlPath = new URL(config.imageUrls[key]).pathname;
      return urlPath.includes(imageName);
    });
    
    if (matchingUrlKey) {
      image = config.imageUrls[matchingUrlKey];
    } else {
      // No matching URL found, don't use the image
      image = null;
    }
  }
  
  const embed = createEmbed({ 
    color: embedColor, 
    title, 
    description, 
    image, 
    extraFields 
  });
  
  return await channel.send({ embeds: [embed] });
};

const safeDelete = async (message, delay = 0) => {
  if (!message) return;
  if (delay) {
    setTimeout(() => {
      message.delete().catch((err) => {
        if (err.code !== 10008) { // Ignore "Unknown Message" errors
          console.error('Failed to delete message after delay:', err);
        }
      });
    }, delay);
  } else {
    await message.delete().catch((err) => {
      if (err.code !== 10008) {
        console.error('Failed to delete message:', err);
      }
    });
  }
};

const clearMessages = async (channel) => {
  const fourteenDays = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
  let messages;
  do {
    messages = await channel.messages.fetch({ limit: 100 });
    // Filter messages to only those under 14 days old
    const deletable = messages.filter(m => (Date.now() - m.createdTimestamp) < fourteenDays);
    if (deletable.size > 0) {
      await channel.bulkDelete(deletable, true).catch(err => {
        console.error('Error bulk deleting messages:', err);
      });
    }
  } while (messages.size >= 2);
};

const pendingRegistrations = {}; // Global store using composite keys: `${channelID}-${userID}`

const saveConfig = (channelName, data) => {
  const queueDir = path.join(__dirname, '..', 'queue');
  if (!fs.existsSync(queueDir)) {
    fs.mkdirSync(queueDir);
  }
  const configPath = path.join(queueDir, `${channelName}.json`);
  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config file:', err);
  }
};

const loadConfig = (channelName) => {
  const queueDir = path.join(__dirname, '..', 'queue');
  const configPath = path.join(queueDir, `${channelName}.json`);
  let channelData = {
    lastCommands: {},
    lastCodeEmbeds: {},
    registeredUsers: {},
    queue: { registrations: [] },
    waitingList: [],
    activeSession: [],
  };
  try {
    if (fs.existsSync(configPath)) {
      channelData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!channelData.activeSession) channelData.activeSession = [];
      if (!channelData.waitingList) channelData.waitingList = [];
    }
  } catch (err) {
    console.error('Failed to load config file:', err);
  }
  return channelData;
};

// Helper function to check if a user is already registered in any capacity
const isUserRegistered = (channelConfig, userId) => {
  if (!channelConfig || !userId) return false;
  
  // Check if already marked as registered
  if (channelConfig.registeredUsers && channelConfig.registeredUsers[userId]) {
    return true;
  }
  
  // Check if in queue
  if (channelConfig.queue && channelConfig.queue.registrations) {
    if (channelConfig.queue.registrations.some(reg => reg.userId === userId)) {
      return true;
    }
  }
  
  // Check if in waiting list
  if (channelConfig.waitingList) {
    if (channelConfig.waitingList.some(reg => reg.userId === userId)) {
      return true;
    }
  }
  
  // Check if in active session
  if (channelConfig.activeSession) {
    if (channelConfig.activeSession.some(reg => reg.userId === userId)) {
      return true;
    }
  }
  
  return false;
};

module.exports = {
  createEmbed,
  sendEmbed,
  safeDelete,
  clearMessages,
  pendingRegistrations,
  saveConfig,
  loadConfig,
  isUserRegistered,
  hexToInt,
};