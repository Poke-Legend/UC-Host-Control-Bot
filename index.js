// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const config = require('./utils/config');

// Create a new Discord client with required intents and partials.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Create a Collection for commands.
client.commands = new Collection();
const slashCommands = [];

// Load command files from the commands folder.
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.data.name) {
    client.commands.set(command.data.name, command);
    slashCommands.push(command.data.toJSON());
  } else if (command.name) {
    client.commands.set(command.name, command);
  }
}

// Load event files from the events folder.
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// When the client is ready, register slash commands and initialize leveling.
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Register slash commands for the specified guild.
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: slashCommands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
  
  // Initialize the UC Leveling System.
  // Note: our leveling system file is in a folder named "levels" (lowercase).
  const levelSystem = require('./levels/levelSystem.js');
  levelSystem.initLevelSystem(client);
});

client.login(process.env.BOT_TOKEN);
