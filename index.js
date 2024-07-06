require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const prefix = '$';
const allowedRoleIds = [process.env.ALLOWED_ROLE_ID, process.env.ALLOWED_ROLE_ID2];
const lockEmoji = '❌';
const unlockEmoji = '✅';
const managedRoleId = process.env.MANAGED_ROLE_ID;
const pingRoleId = process.env.PING_ROLE_ID;
const lockImageUrl = process.env.LOCK_IMAGE_URL;
const unlockImageUrl = process.env.UNLOCK_IMAGE_URL;
const customImageUrl = process.env.CUSTOM_IMAGE_URL;
const flyImageUrl = process.env.FLY_IMAGE_URL;
const stayImageUrl = process.env.STAY_IMAGE_URL;
const readyImageUrl = process.env.READY_IMAGE_URL;
const footerText = process.env.FOOTER_TEXT;
const footerIconUrl = process.env.FOOTER_ICON_URL;
const cooldownSeconds = 600;

const configPath = path.join(__dirname, 'config.json');
let config;

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
    console.error('Failed to load config file:', err);
    config = { lastCommands: {}, lastCodeEmbeds: {}, registeredUsers: {} };
}

// Ensure all necessary config properties are initialized
config.lastCommands = config.lastCommands || {};
config.lastCodeEmbeds = config.lastCodeEmbeds || {};
config.registeredUsers = config.registeredUsers || {};

const saveConfig = () => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to save config file:', err);
    }
};

const queuePath = channelId => path.join(__dirname, `queue_${channelId}.json`);

const loadQueue = channelId => {
    const filePath = queuePath(channelId);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ registrations: [] }, null, 2), 'utf8');
    }

    let queue;
    try {
        queue = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!queue.registrations) {
            queue.registrations = [];
        }
    } catch (err) {
        console.error('Failed to load queue file:', err);
        queue = { registrations: [] };
    }
    return queue;
};

const saveQueue = (channelId, queue) => {
    const filePath = queuePath(channelId);
    try {
        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to save queue file:', err);
    }
};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const clearMessages = async (channel) => {
    let messages;
    do {
        messages = await channel.messages.fetch({ limit: 100 });
        await channel.bulkDelete(messages);
    } while (messages.size >= 2);
};

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
    if (!config.registeredUsers[channelId]) {
        config.registeredUsers[channelId] = {};
    }

    const lastCommand = config.lastCommands[serverId][channelId]?.command;
    const lastTimestamp = config.lastCommands[serverId][channelId]?.timestamp || 0;
    const remainingCooldown = lastTimestamp ? (lastTimestamp + cooldownSeconds * 1000 - now) : 0;
    const isOppositeCommand = (command === 'offline' && lastCommand === 'online') || (command === 'online' && lastCommand === 'offline');

    if (isOppositeCommand && remainingCooldown > 0) {
        const cooldownEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Cooldown')
            .setDescription(`Please wait ${Math.ceil(remainingCooldown / 1000)} more seconds before using the \`${command}\` command again.`)
            .setFooter({ text: footerText, iconURL: footerIconUrl });
        const sentMessage = await message.channel.send({ embeds: [cooldownEmbed] }).catch(console.error);
        setTimeout(async () => {
            try {
                await sentMessage?.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
        }, 5000);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
        return;
    }

    const hasPermission = message.member.roles.cache.some(role => allowedRoleIds.includes(role.id));
    const sendEmbed = async (color, title, description, imageUrl = null) => {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: footerText, iconURL: footerIconUrl });
        if (imageUrl) embed.setImage(imageUrl);
        const sentMessage = await message.channel.send({ embeds: [embed] }).catch(console.error);
        return sentMessage;
    };

    const handlePermissionDenied = async () => {
        const sentMessage = await sendEmbed('#ff0000', 'Permission Denied', 'You do not have permission to use this command.');
        setTimeout(async () => {
            try {
                await sentMessage?.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
        }, 5000);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    if (command === 'resetuser') {
        if (!hasPermission) return handlePermissionDenied();

        const userId = args[0];
        if (!userId) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription('No user ID provided. Please provide a user ID to reset.')
                .setFooter({ text: footerText, iconURL: footerIconUrl });
            const sentMessage = await message.channel.send({ embeds: [errorEmbed] }).catch(console.error);
            setTimeout(async () => {
                try {
                    await sentMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 5000);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }

        if (config.registeredUsers[channelId][userId]) {
            delete config.registeredUsers[channelId][userId];
            saveConfig();

            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('User Reset')
                .setDescription(`User with ID ${userId} registration has been reset.`)
                .setFooter({ text: footerText, iconURL: footerIconUrl });

            await message.channel.send({ embeds: [successEmbed] }).catch(console.error);
        } else {
            const notFoundEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('User Not Found')
                .setDescription(`No registration found for user with ID ${userId}.`)
                .setFooter({ text: footerText, iconURL: footerIconUrl });

            await message.channel.send({ embeds: [notFoundEmbed] }).catch(console.error);
        }

        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const queue = loadQueue(channelId);

    const processOfflineCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();

        const channel = message.channel;
        if (!channel.name.startsWith(lockEmoji)) {
            await channel.setName(`${lockEmoji}${channel.name.replace(unlockEmoji, '')}`);
            await channel.permissionOverwrites.edit(managedRoleId, { [PermissionsBitField.Flags.SendMessages]: false });
            await sendEmbed('#ff0000', 'Union Circle Offline', `${message.author} is not hosting Union Circle`, lockImageUrl);
            config.lastCommands[serverId][channelId] = { timestamp: now, command: 'offline' };
            queue.registrations = [];
            config.registeredUsers[channelId] = {};
            saveConfig();
            saveQueue(channelId, queue);

            // Clear all messages in the channel
            await clearMessages(channel);
        } else {
            const sentMessage = await sendEmbed('#ff0000', 'Union Circle Already Offline', 'Union Circle Hosting is already offline.');
            setTimeout(async () => {
                try {
                    await sentMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 5000);
        }

        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processOnlineCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();

        const channel = message.channel;
        if (channel.name.startsWith(lockEmoji)) {
            await channel.setName(`${unlockEmoji}${channel.name.replace(lockEmoji, '')}`);
            await channel.permissionOverwrites.edit(managedRoleId, { [PermissionsBitField.Flags.SendMessages]: null });

            const roleMentionMessage = await message.channel.send(`<@&${pingRoleId}>`).catch(console.error);
            setTimeout(async () => {
                try {
                    await roleMentionMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 1000);

            await sendEmbed('#00ff00', 'Union Circle Online', `${message.author} is hosting Union Circle`, unlockImageUrl);
            config.lastCommands[serverId][channelId] = { timestamp: now, command: 'online' };
            saveConfig();
        } else {
            const sentMessage = await sendEmbed('#00ff00', 'Union Circle Already Online', 'This channel is already online.');
            setTimeout(async () => {
                try {
                    await sentMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 5000);
        }

        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processHelpCommand = async () => {
        const helpEmbed = new EmbedBuilder()
            .setColor('#99AAb5')
            .setTitle('Union Hosting Commands')
            .setDescription('Here is a list of commands you can use:')
            .addFields(
                { name: '$offline', value: 'Lock the current channel. Only users with UC Host can use this command.' },
                { name: '$online', value: 'Unlock the current channel. Only users with UC Host can use this command.' },
                { name: '$code', value: 'Display the Union Circle code.' },
                { name: '$fly', value: 'Fly to Levincia (North).' },
                { name: '$stay', value: 'Pull Phones Up and Do not move.' },
                { name: '$ready', value: 'Fly to Artazon (East) and find the hoster.' },
                { name: '$register', value: 'Register your in-game name and Pokémon for the Union Circle.' },
                { name: '$queue', value: 'View the current queue.' },
                { name: '$nextqueue', value: 'Move to the next set of people in the queue (UC Hosts only).' },
                { name: '$resetregister', value: 'Reset the registered users for the current channel.' }
            )
            .setFooter({ text: footerText, iconURL: footerIconUrl });

        await message.channel.send({ embeds: [helpEmbed] }).catch(console.error);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processCodeCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();

        const code = args.join(' ');

        if (!code) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription('No code provided. Please provide a code to display.')
                .setFooter({ text: footerText, iconURL: footerIconUrl });
            const sentMessage = await message.channel.send({ embeds: [errorEmbed] }).catch(console.error);
            setTimeout(async () => {
                try {
                    await sentMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 5000);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }

        const nextInQueue = queue.registrations.slice(0, 3);
        if (nextInQueue.length === 0) {
            const noQueueEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Queue is Empty')
                .setDescription('There are no registrations in the queue.')
                .setFooter({ text: footerText, iconURL: footerIconUrl });

            await message.channel.send({ embeds: [noQueueEmbed] }).catch(console.error);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }

        let failedDMs = [];
        for (const reg of nextInQueue) {
            try {
                const user = await client.users.fetch(reg.userId);
                const dmEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${message.author.username}'s Union Circle`)
                    .setDescription(`The current Union Circle code is: \`${code}\``)
                    .setFooter({ text: footerText, iconURL: footerIconUrl })
                    .setImage(customImageUrl);
                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                if (error.code === 50007) {
                    // Cannot send messages to this user
                    failedDMs.push(reg.userId);
                } else {
                    console.error('Failed to send DM:', error);
                }
            }
        }

        await message.channel.send(`<@&${pingRoleId}>`).then(async sentMessage => {
            await sendEmbed('#00ff00', 'Union Circle Code Sent', `${message.author.username} has sent Union Circle Codes via Direct Message to the current queue.`);

            // Remove the ping role after 2 seconds
            setTimeout(async () => {
                try {
                    await sentMessage.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 2000);
        }).catch(console.error);

        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }

        if (failedDMs.length > 0) {
            const failedDmsEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('DM Failed')
                .setDescription('Could not send the code to the following users:')
                .addFields(failedDMs.map(id => ({ name: 'User ID', value: id })))
                .setFooter({ text: footerText, iconURL: footerIconUrl });
            await message.channel.send({ embeds: [failedDmsEmbed] }).catch(console.error);
        }
    };

    const processNextQueueCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();

        queue.registrations = queue.registrations.slice(3);
        saveQueue(channelId, queue);

        const nextQueueEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Queue Updated')
            .setDescription('Moved to the next set of people in the queue.')
            .setFooter({ text: footerText, iconURL: footerIconUrl });

        await message.channel.send({ embeds: [nextQueueEmbed] }).catch(console.error);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processFlyCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();
        const channel = message.channel;
        if (!channel.name.startsWith(unlockEmoji)) {
            const sentMessage = await sendEmbed('#ff0000', 'Union Circle Offline', 'Cannot use the fly command as the Union Circle is offline.');
            setTimeout(async () => {
                try {
                    await sentMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 5000);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }
        const flyEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Location: Levincia (North)')
            .setDescription(`Proceed to Levincia (North) PokéStop and be ready to follow the upcoming instructions from ${message.author}.`)
            .setImage(flyImageUrl)
            .setFooter({ text: footerText, iconURL: footerIconUrl });

        await message.channel.send({ embeds: [flyEmbed] }).catch(console.error);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processStayCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();
        const channel = message.channel;
        if (!channel.name.startsWith(unlockEmoji)) {
            const sentMessage = await sendEmbed('#ff0000', 'Union Circle Offline', 'Cannot use the stay command as the Union Circle is offline.');
            setTimeout(async () => {
                try {
                    await sentMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 5000);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }
        const stayEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('Attention Trainers at Levincia (North)')
            .setDescription('Please take out your phones to prevent Joycon drifting. Remain stationary and avoid movement.')
            .setImage(stayImageUrl)
            .setFooter({ text: footerText, iconURL: footerIconUrl });

        await message.channel.send({ embeds: [stayEmbed] }).catch(console.error);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processReadyCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();
        const channel = message.channel;
        if (!channel.name.startsWith(unlockEmoji)) {
            const sentMessage = await sendEmbed('#ff0000', 'Union Circle Offline', 'Cannot use the ready command as the Union Circle is offline.');
            setTimeout(async () => {
                try {
                    await sentMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 5000);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }
        const readyEmbed = new EmbedBuilder()
            .setColor('#0000ff')
            .setTitle('Location: Artazon (East)')
            .setDescription(`Travel to Artazon (East) and locate the Union Circle Host: ${message.author}`)
            .setImage(readyImageUrl)
            .setFooter({ text: footerText, iconURL: footerIconUrl });

        await message.channel.send({ embeds: [readyEmbed] }).catch(console.error);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processRegisterCommand = async () => {
        const channel = message.channel;
        if (!channel.name.startsWith(unlockEmoji)) {
            const sentMessage = await sendEmbed('#ff0000', 'Union Circle Offline', 'Cannot register as the Union Circle is offline.');
            setTimeout(async () => {
                try {
                    await sentMessage?.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete message:', error);
                    }
                }
            }, 5000);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }

        if (config.registeredUsers[channelId][message.author.id]) {
            const alreadyRegisteredEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Already Registered')
                .setDescription('You have already registered for the current session.')
                .setFooter({ text: footerText, iconURL: footerIconUrl });

            await message.channel.send({ embeds: [alreadyRegisteredEmbed] }).catch(console.error);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }

        const registrationEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Union Circle Registration')
            .setDescription('Click the button below to register for the Union Circle.');

        await message.channel.send({
            embeds: [registrationEmbed],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('openRegistrationModal')
                        .setLabel('Registration')
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });

        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processQueueCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();

        const nextInQueue = queue.registrations.slice(0, 3);
        if (nextInQueue.length === 0) {
            const noQueueEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Queue is Empty')
                .setDescription('There are no registrations in the queue.')
                .setFooter({ text: footerText, iconURL: footerIconUrl });

            await message.channel.send({ embeds: [noQueueEmbed] }).catch(console.error);
            try {
                await message.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    console.error('Failed to delete message:', error);
                }
            }
            return;
        }

        const queueEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Current Queue')
            .setDescription('Here are the next 3 people in the queue:')
            .setFooter({ text: footerText, iconURL: footerIconUrl })
            .addFields(nextInQueue.map((reg, index) => ({
                name: `Position ${index + 1}`,
                value: `IGN: \`${reg.ign}\`\nPokémon: \`${reg.pokemon}\`\nShiny: \`${reg.shiny}\`\nHolding Item: \`${reg.holdingItem}\`\nUser: <@${reg.userId}>`
            })));

        await message.channel.send({ embeds: [queueEmbed] }).catch(console.error);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    const processResetRegisterCommand = async () => {
        if (!hasPermission) return handlePermissionDenied();

        config.registeredUsers[channelId] = {};
        saveConfig();

        const resetRegisterEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Registrations Reset')
            .setDescription('All registered users for the current channel have been reset.')
            .setFooter({ text: footerText, iconURL: footerIconUrl });

        await message.channel.send({ embeds: [resetRegisterEmbed] }).catch(console.error);
        try {
            await message.delete();
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Failed to delete message:', error);
            }
        }
    };

    if (command === 'offline') {
        await processOfflineCommand();
    } else if (command === 'online') {
        await processOnlineCommand();
    } else if (command === 'help') {
        await processHelpCommand();
    } else if (command === 'code') {
        await processCodeCommand();
    } else if (command === 'fly') {
        await processFlyCommand();
    } else if (command === 'stay') {
        await processStayCommand();
    } else if (command === 'ready') {
        await processReadyCommand();
    } else if (command === 'register') {
        await processRegisterCommand();
    } else if (command === 'queue') {
        await processQueueCommand();
    } else if (command === 'nextqueue') {
        await processNextQueueCommand();
    } else if (command === 'resetregister') {
        await processResetRegisterCommand();
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'openRegistrationModal') {
        const modal = new ModalBuilder()
            .setCustomId('registrationModal')
            .setTitle('Union Circle Registration');

        const ignInput = new TextInputBuilder()
            .setCustomId('ignInput')
            .setLabel('In-Game Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const pokemonInput = new TextInputBuilder()
            .setCustomId('pokemonInput')
            .setLabel('Pokémon')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const shinyInput = new TextInputBuilder()
            .setCustomId('shinyInput')
            .setLabel('Shiny (Yes/No)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const holdingItemInput = new TextInputBuilder()
            .setCustomId('holdingItemInput')
            .setLabel('Holding Item (e.g., Cherish Ball)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const actionRow1 = new ActionRowBuilder().addComponents(ignInput);
        const actionRow2 = new ActionRowBuilder().addComponents(pokemonInput);
        const actionRow3 = new ActionRowBuilder().addComponents(shinyInput);
        const actionRow4 = new ActionRowBuilder().addComponents(holdingItemInput);

        modal.addComponents(actionRow1, actionRow2, actionRow3, actionRow4);

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'registrationModal') {
        const channelId = interaction.channelId;

        const ign = interaction.fields.getTextInputValue('ignInput');
        const pokemon = interaction.fields.getTextInputValue('pokemonInput');
        const shiny = interaction.fields.getTextInputValue('shinyInput');
        const holdingItem = interaction.fields.getTextInputValue('holdingItemInput');

        const queue = loadQueue(channelId);
        queue.registrations.push({ userId: interaction.user.id, ign, pokemon, shiny, holdingItem });

        if (!config.registeredUsers[channelId]) {
            config.registeredUsers[channelId] = {};
        }
        config.registeredUsers[channelId][interaction.user.id] = true;

        saveQueue(channelId, queue);
        saveConfig();

        const registeredEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Registration Successful')
            .setDescription(`You have registered with IGN: \`${ign}\`, Pokémon: \`${pokemon}\`, Shiny: \`${shiny}\`, Holding Item: \`${holdingItem}\``)
            .setFooter({ text: footerText, iconURL: footerIconUrl })
            .setImage(customImageUrl);

        await interaction.reply({ embeds: [registeredEmbed] });

        const thankYouEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Thank You for Registering')
            .setDescription('Please wait for the Union Host to provide your in-game name and code to get you in.')
            .setFooter({ text: footerText, iconURL: footerIconUrl });

        await interaction.followUp({ embeds: [thankYouEmbed] });
    }
});

client.login(process.env.BOT_TOKEN);
