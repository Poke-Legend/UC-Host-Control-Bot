require('dotenv').config();
const { Client, Intents, MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const prefix = '$';
const allowedRoleIds = [process.env.ALLOWED_ROLE_ID, process.env.ALLOWED_ROLE_ID2];
const lockEmoji = '❌';
const unlockEmoji = '✅';
const managedRoleId = process.env.MANAGED_ROLE_ID;
const lockImageUrl = 'https://i.imgur.com/csmSEVh.png';
const unlockImageUrl = 'https://i.imgur.com/m1RKJak.png';
const footerIconUrl = 'https://i.imgur.com/r2Tc0xZ.png';
const cooldownSeconds = 900; // 15 minutes

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const saveConfig = () => {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
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
    const cooldownKey = `${serverId}-${channelId}`;

    if (!config.lastCommands[serverId]) {
        config.lastCommands[serverId] = {};
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
        setTimeout(() => sentMessage.delete().catch(console.error), 5000); // Delete cooldown embed after 20 seconds
        setTimeout(() => message.delete().catch(console.error), 5000); // Delete command message after 5 seconds
        return;
    }

    const hasPermission = () => message.member.roles.cache.some(role => allowedRoleIds.includes(role.id));
    const sendEmbed = async (color, title, description, imageUrl = null) => {
        const embed = new MessageEmbed().setColor(color).setTitle(title).setDescription(description);
        if (imageUrl) embed.setImage(imageUrl);
        await message.channel.send({ embeds: [embed] });
    };

    const processOfflineCommand = async () => {
        if (!hasPermission()) {
            await sendEmbed('#ff0000', 'Permission Denied', 'You do not have permission to use this command.');
            setTimeout(() => message.delete().catch(console.error), 5000); // Delete command message after 5 seconds
            return;
        }

        const channel = message.channel;
        if (!channel.name.startsWith(lockEmoji)) {
            await channel.setName(`${lockEmoji}${channel.name.replace(unlockEmoji, '')}`);
            await channel.permissionOverwrites.edit(managedRoleId, { SEND_MESSAGES: false });
            await sendEmbed('#ff0000', 'Union Circle Offline', `${message.author} is not hosting Union Circle`, lockImageUrl);
            config.lastCommands[serverId][channelId] = { timestamp: now, command: 'offline' };
            saveConfig();
        } else {
            await sendEmbed('#ff0000', 'Union Circle Already Offline', 'Union Circle Hosting is already offline.');
        }

        setTimeout(() => message.delete().catch(console.error), 5000); // Delete command message after 5 seconds
    };

    const processOnlineCommand = async () => {
        if (!hasPermission()) {
            await sendEmbed('#ff0000', 'Permission Denied', 'You do not have permission to use this command.');
            setTimeout(() => message.delete().catch(console.error), 5000); // Delete command message after 5 seconds
            return;
        }

        const channel = message.channel;
        if (channel.name.startsWith(lockEmoji)) {
            await channel.setName(`${unlockEmoji}${channel.name.replace(lockEmoji, '')}`);
            await channel.permissionOverwrites.edit(managedRoleId, { SEND_MESSAGES: true });
            await sendEmbed('#00ff00', 'Union Circle Online', `${message.author} is hosting Union Circle`, unlockImageUrl);
            config.lastCommands[serverId][channelId] = { timestamp: now, command: 'online' };
            saveConfig();
        } else {
            await sendEmbed('#00ff00', 'Union Circle Already Online', 'This channel is already online.');
        }

        setTimeout(() => message.delete().catch(console.error), 5000); // Delete command message after 5 seconds
    };

    const processHelpCommand = async () => {
        if (!hasPermission()) {
            await sendEmbed('#ff0000', 'Permission Denied', 'You do not have permission to use this command.');
            setTimeout(() => message.delete().catch(console.error), 5000); // Delete command message after 5 seconds
            return;
        }

        const helpEmbed = new MessageEmbed()
            .setColor('#99AAb5')
            .setTitle('Union Hosting Commands')
            .setDescription('Here is a list of commands you can use:')
            .addFields(
                { name: '$offline', value: 'Lock the current channel. Only users with UC Host can use this command.' },
                { name: '$online', value: 'Unlock the current channel. Only users with UC Host can use this command.' }
            )
            .setFooter({ text: '© 2022 - 2024 Pokémon Legends', iconURL: footerIconUrl });

        const sentMessage = await message.channel.send({ embeds: [helpEmbed] });
        setTimeout(() => sentMessage.delete().catch(console.error), 20000); // Delete help embed after 20 seconds
        setTimeout(() => message.delete().catch(console.error), 5000); // Delete command message after 5 seconds
    };

    if (command === 'offline') {
        await processOfflineCommand();
    } else if (command === 'online') {
        await processOnlineCommand();
    } else if (command === 'help') {
        await processHelpCommand();
    }
});

client.login(process.env.BOT_TOKEN);
