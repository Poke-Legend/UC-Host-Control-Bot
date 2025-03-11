// utils/helper.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('./config');

const createEmbed = ({ color, title, description, image = null, extraFields = [] }) => {
  const systemYear = new Date().getFullYear();
  const systemTime = new Date().toLocaleTimeString();
  const footerText = config.footer.text
    ? config.footer.text.replace(/{year}/g, systemYear)
    : `© ${systemYear} Pokémon Legends - ${systemTime}`;

  // Convert hex string color to integer if needed.
  let embedColor;
  if (typeof color === 'string') {
    embedColor = parseInt(color.replace('#', ''), 16);
  } else {
    embedColor = color;
  }

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: footerText, iconURL: config.footer.iconUrl })
    .setTimestamp();

  // Use the image URL directly (Discord.js v14 expects a string)
  if (image) embed.setImage(image);
  if (extraFields.length > 0) embed.addFields(extraFields);
  return embed;
};

const sendEmbed = async (channel, color, title, description, image = null, extraFields = []) => {
  const embed = createEmbed({ color, title, description, image, extraFields });
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

module.exports = {
  createEmbed,
  sendEmbed,
  safeDelete,
  clearMessages,
  pendingRegistrations,
  saveConfig,
  loadConfig,
};
