// events/messageCreate.js
const { safeDelete, loadConfig, createEmbed } = require('../utils/helper');
const { checkBan } = require('../utils/banSystem');
const config = require('../utils/config');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore messages from bots or those without your prefix
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

    // Parse the command and its arguments
    const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // Load channel-specific config (sanitize channel name)
    const channelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const channelConfig = loadConfig(channelName);

    // Check if the user is banned
    const banResult = checkBan(message.author.id);
    if (banResult.banned) {
      await message.reply(`You are banned from Union Circle: ${banResult.reason}`);
      safeDelete(message, 2000);
      return;
    }

    // Use an in-memory store on the client for cooldowns
    if (!client.lastCommands) {
      client.lastCommands = {};
    }
    const guildId = message.guild.id;
    const lastCommandObj = client.lastCommands[guildId] || {};
    const lastCommand = lastCommandObj.command;
    const lastTimestamp = lastCommandObj.timestamp || 0;
    const now = Date.now();
    const remainingCooldown = lastTimestamp ? lastTimestamp + config.cooldownSeconds * 1000 - now : 0;
    const isOppositeCommand =
      (commandName === 'offline' && lastCommand === 'online') ||
      (commandName === 'online' && lastCommand === 'offline');

    if (isOppositeCommand && remainingCooldown > 0) {
      // Create the cooldown embed using our helper so color conversion occurs
      const cooldownEmbed = createEmbed({
        color: '#ff0000',
        title: 'Cooldown Active',
        description: `Please wait **${Math.ceil(remainingCooldown / 1000)}** more seconds before using the \`${commandName}\` command.`,
        extraFields: [{ name: 'Tip', value: 'Patience is a virtue!' }],
      });
      const cooldownMsg = await message.channel.send({ embeds: [cooldownEmbed] });
      // Increase deletion delay so it's visible (e.g., 10 seconds)
      safeDelete(cooldownMsg, 10000);
      safeDelete(message, 0);
      return;
    }

    // Find the command in the client's command collection
    const command = client.commands.get(commandName);
    if (!command) {
      safeDelete(message, 0);
      return;
    }

    try {
      await command.execute(message, args, channelConfig, client);
      // Update in-memory cooldown data
      client.lastCommands[guildId] = { command: commandName, timestamp: now };
    } catch (error) {
      console.error(`Error executing command "${commandName}":`, error);
    } finally {
      safeDelete(message, 0);
    }
  },
};
