require('dotenv').config();
const { Client, Intents, MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ]
});

const prefix = '$';
const allowedRoleIds = [process.env.ALLOWED_ROLE_ID, process.env.ALLOWED_ROLE_ID2];
const lockEmoji = '❌';
const unlockEmoji = '✅';
const managedRoleId = process.env.MANAGED_ROLE_ID;
const pingRoleId = process.env.PING_ROLE_ID;
const lockImageUrl = 'https://i.imgur.com/csmSEVh.png';
const unlockImageUrl = 'https://i.imgur.com/m1RKJak.png';
const footerIconUrl = 'https://i.imgur.com/r2Tc0xZ.png';
const customImageUrl = 'https://i.imgur.com/WeMePud.jpg';
const cooldownSeconds = 900;

const configPath = path.join(__dirname, 'config.json');
let config;

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
    console.error('Failed to load config file:', err);
    config = { lastCommands: {}, lastCodeEmbeds: {} };
}

// Ensure both lastCommands and lastCodeEmbeds are initialized
config.lastCommands = config.lastCommands || {};
config.lastCodeEmbeds = config.lastCodeEmbeds || {};

const saveConfig = () => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to save config file:', err);
    }
};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const now = Date.now();
    const serverId = message.guild.id;
    const channelId = message.channel.id;

    if (!config.lastCommands[serverId]) {
        config.lastCommands[serverId] = {};
    }
    if (!config.lastCodeEmbeds[serverId]) {
        config.lastCodeEmbeds[serverId] = {};
    }

    const lastCommand = config.lastCommands[serverId][channelId]?.command;
    const lastTimestamp = config.lastCommands[serverId][channelId]?.timestamp || 0;
    const remainingCooldown = lastTimestamp ? (lastTimestamp + cooldownSeconds * 1000 - now) : 0;
    const isOppositeCommand = (command === 'offline' && lastCommand === 'online') || (command === 'online' && lastCommand === 'offline');

    if (isOppositeCommand && remainingCooldown > 0) {
        const cooldownEmbed = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle('Cooldown')
            .setDescription(`Please wait ${Math.ceil(remainingCooldown / 1000)} more seconds before using the \`${command}\` command again.`);
        const sentMessage = await message.channel.send({ embeds: [cooldownEmbed] });
        setTimeout(() => sentMessage.delete().catch(console.error), 5000);
        message.delete().catch(console.error);
        return;
    }

    const hasPermission = () => message.member.roles.cache.some(role => allowedRoleIds.includes(role.id));
    const sendEmbed = async (color, title, description, imageUrl = null) => {
        const embed = new MessageEmbed().setColor(color).setTitle(title).setDescription(description);
        if (imageUrl) embed.setImage(imageUrl);
        const sentMessage = await message.channel.send({ embeds: [embed] });
        return sentMessage;
    };

    const handlePermissionDenied = async () => {
        const sentMessage = await sendEmbed('#ff0000', 'Permission Denied', 'You do not have permission to use this command.');
        setTimeout(() => sentMessage.delete().catch(console.error), 5000);
        message.delete().catch(console.error);
    };

    const processOfflineCommand = async () => {
        if (!hasPermission()) return handlePermissionDenied();

        const channel = message.channel;
        if (!channel.name.startsWith(lockEmoji)) {
            await channel.setName(`${lockEmoji}${channel.name.replace(unlockEmoji, '')}`);
            await channel.permissionOverwrites.edit(managedRoleId, { SEND_MESSAGES: false });
            await sendEmbed('#ff0000', 'Union Circle Offline', `${message.author} is not hosting Union Circle`, lockImageUrl);
            config.lastCommands[serverId][channelId] = { timestamp: now, command: 'offline' };
            saveConfig();
        } else {
            const sentMessage = await sendEmbed('#ff0000', 'Union Circle Already Offline', 'Union Circle Hosting is already offline.');
            setTimeout(() => sentMessage.delete().catch(console.error), 5000);
        }

        message.delete().catch(console.error);
    };

    const processOnlineCommand = async () => {
        if (!hasPermission()) return handlePermissionDenied();

        const channel = message.channel;
        if (channel.name.startsWith(lockEmoji)) {
            await channel.setName(`${unlockEmoji}${channel.name.replace(lockEmoji, '')}`);
            await channel.permissionOverwrites.edit(managedRoleId, { SEND_MESSAGES: null });
            
            // Send ping and delete it after 2 seconds
            const roleMentionMessage = await message.channel.send(`<@&${pingRoleId}>`);
            setTimeout(() => roleMentionMessage.delete().catch(console.error), 1000);
            
            await sendEmbed('#00ff00', 'Union Circle Online', `${message.author} is hosting Union Circle`, unlockImageUrl);
            config.lastCommands[serverId][channelId] = { timestamp: now, command: 'online' };
            saveConfig();
        } else {
            const sentMessage = await sendEmbed('#00ff00', 'Union Circle Already Online', 'This channel is already online.');
            setTimeout(() => sentMessage.delete().catch(console.error), 5000);
        }

        message.delete().catch(console.error);
    };

    const processHelpCommand = async () => {
        const helpEmbed = new MessageEmbed()
            .setColor('#99AAb5')
            .setTitle('Union Hosting Commands')
            .setDescription('Here is a list of commands you can use:')
            .addFields(
                { name: '$offline', value: 'Lock the current channel. Only users with UC Host can use this command.' },
                { name: '$online', value: 'Unlock the current channel. Only users with UC Host can use this command.' },
                { name: '$code', value: 'Display the Union Circle code.' }
            )
            .setFooter({ text: '© 2022 - 2024 Pokémon Legends', iconURL: footerIconUrl });

        const sentMessage = await message.channel.send({ embeds: [helpEmbed] });
        setTimeout(() => sentMessage.delete().catch(console.error), 20000);
        message.delete().catch(console.error);
    };

    const processCodeCommand = async () => {
        if (!hasPermission()) return handlePermissionDenied();

        const channel = message.channel;
        if (!channel.name.startsWith(unlockEmoji)) {
            const sentMessage = await sendEmbed('#ff0000', 'Union Circle Offline', 'Cannot display the code as the Union Circle is offline.');
            setTimeout(() => sentMessage.delete().catch(console.error), 5000);
            message.delete().catch(console.error);
            return;
        }

        const code = args.join(' ');

        if (!code) {
            const errorEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription('No code provided. Please provide a code to display.');
            const sentMessage = await message.channel.send({ embeds: [errorEmbed] });
            setTimeout(() => sentMessage.delete().catch(console.error), 5000);
            message.delete().catch(console.error);
            return;
        }

        const lastCodeMessageId = config.lastCodeEmbeds[serverId][channelId];
        if (lastCodeMessageId) {
            try {
                const oldEmbedMessage = await message.channel.messages.fetch(lastCodeMessageId);
                if (oldEmbedMessage) await oldEmbedMessage.delete();
            } catch (err) {
                if (err.code !== 10008) {
                    console.error('Failed to delete previous embed message:', err);
                }
            }
        }

        const codeEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`${message.author.username}'s Union Circle`)
            .setDescription(`The current Union Circle code is: \`${code}\`\n<@&${pingRoleId}>`)
            .setImage(customImageUrl)
            .setFooter({ text: '© 2022 - 2024 Pokémon Legends', iconURL: footerIconUrl });

        // Send ping and delete it after 2 seconds
        const roleMentionMessage = await message.channel.send(`<@&${pingRoleId}>`);
        setTimeout(() => roleMentionMessage.delete().catch(console.error), 1000);
        
        const sentMessage = await message.channel.send({ embeds: [codeEmbed] });

        config.lastCodeEmbeds[serverId][channelId] = sentMessage.id;
        saveConfig();

        message.delete().catch(console.error);
    };

    if (command === 'offline') {
        await processOfflineCommand();
    } else if (command === 'online') {
        await processOnlineCommand();
    } else if (command === 'help') {
        await processHelpCommand();
    } else if (command === 'code') {
        await processCodeCommand();
    }
});

client.login(process.env.BOT_TOKEN);
