require('dotenv').config(); // Load environment variables from .env file
const { Client, Intents, MessageEmbed } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const prefix = '$'; // Your bot's command prefix
const allowedRoleIds = [process.env.ALLOWED_ROLE_ID, process.env.ALLOWED_ROLE_ID2]; // Array of allowed role IDs
const lockEmoji = '❌';
const unlockEmoji = '✅';
const managedRoleId = process.env.MANAGED_ROLE_ID; // Role ID to manage permissions
const lockImageUrl = 'https://i.imgur.com/csmSEVh.png'; // Replace with the actual URL of the lock image
const unlockImageUrl = 'https://i.imgur.com/m1RKJak.png'; // Replace with the actual URL of the unlock image
const footerIconUrl = 'https://i.imgur.com/r2Tc0xZ.png'; // Replace with the actual URL of the footer logo

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'offline') {
        // Check if the user has any of the allowed roles to lock channels
        if (!message.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
            // User does not have permission embed
            const noPermissionEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.');

            await message.channel.send({ embeds: [noPermissionEmbed] });
            
            // Delete the user's command message with error handling
            try {
                await message.delete();
            } catch (error) {
                console.error('Failed to delete the command message:', error);
            }

            return;
        }

        const channel = message.channel;

        if (!channel.name.startsWith(lockEmoji)) {
            const newName = `${lockEmoji}${channel.name.replace(unlockEmoji, '')}`;
            await channel.setName(newName);
            await channel.permissionOverwrites.edit(managedRoleId, {
                SEND_MESSAGES: false
            });

            // Send lock message with embed
            const lockEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Union Circle Offline')
                .setDescription(`${message.author} is not hosting Union Circle`)
                .setImage(lockImageUrl); // Add lock image

            await message.channel.send({ embeds: [lockEmbed] });
        } else {
            // Channel is already locked embed
            const alreadyLockedEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Union Circle Already Offline')
                .setDescription('This channel is already offline.');

            await message.channel.send({ embeds: [alreadyLockedEmbed] });
        }

        // Delete the user's command message with error handling
        try {
            await message.delete();
        } catch (error) {
            console.error('Failed to delete the command message:', error);
        }
    } else if (command === 'online') {
        // Check if the user has any of the allowed roles to unlock channels
        if (!message.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
            // User does not have permission embed
            const noPermissionEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.');

            await message.channel.send({ embeds: [noPermissionEmbed] });
            
            // Delete the user's command message with error handling
            try {
                await message.delete();
            } catch (error) {
                console.error('Failed to delete the command message:', error);
            }

            return;
        }

        const channel = message.channel;

        if (channel.name.startsWith(lockEmoji)) {
            const newName = `${unlockEmoji}${channel.name.replace(lockEmoji, '')}`;
            await channel.setName(newName);
            await channel.permissionOverwrites.edit(managedRoleId, {
                SEND_MESSAGES: true
            });

            // Send unlock message with embed
            const unlockEmbed = new MessageEmbed()
                .setColor('#00ff00')
                .setTitle('Union Circle Online')
                .setDescription(`${message.author} is hosting Union Circle`)
                .setImage(unlockImageUrl); // Add unlock image

            await message.channel.send({ embeds: [unlockEmbed] });
        } else {
            // Channel is already unlocked embed
            const alreadyUnlockedEmbed = new MessageEmbed()
                .setColor('#00ff00')
                .setTitle('Union Circle Already Online')
                .setDescription('This channel is already online.');

            await message.channel.send({ embeds: [alreadyUnlockedEmbed] });
        }

        // Delete the user's command message with error handling
        try {
            await message.delete();
        } catch (error) {
            console.error('Failed to delete the command message:', error);
        }
    } else if (command === 'help') {
        // Check if the user has any of the allowed roles to use the help command
        if (!message.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
            // User does not have permission embed
            const noPermissionEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.');

            await message.channel.send({ embeds: [noPermissionEmbed] });

            // Delete the user's command message with error handling
            try {
                await message.delete();
            } catch (error) {
                console.error('Failed to delete the command message:', error);
            }

            return;
        }

        // Create help embed
        const helpEmbed = new MessageEmbed()
            .setColor('#99AAb5')
            .setTitle('Union Hosting Commands')
            .setDescription('Here is a list of commands you can use:')
            .addFields(
                { name: '$offline', value: 'Lock the current channel. Only users with the allowed roles can use this command.' },
                { name: '$online', value: 'Unlock the current channel. Only users with the allowed roles can use this command.' }
            )
            .setFooter({ text: '© 2022 - 2024 Pokémon Legends', iconURL: footerIconUrl });

        await message.channel.send({ embeds: [helpEmbed] });

        // Delete the user's command message with error handling
        try {
            await message.delete();
        } catch (error) {
            console.error('Failed to delete the command message:', error);
        }
    }
});

client.login(process.env.BOT_TOKEN); // Use the bot token from .env file
