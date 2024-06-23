# Union Circle Bot

A Discord bot for managing Union Circle hosting and other related commands in a Pokémon Legends server. The bot uses commands to lock and unlock channels, display Union Circle codes, and manage user permissions based on roles.

## Features

- **Offline Command:** Locks the current channel, preventing messages from users without specific roles.
- **Online Command:** Unlocks the current channel, allowing messages and notifying specific roles.
- **Code Command:** Displays the Union Circle code with a custom embed.
- **Help Command:** Displays a list of available commands and their descriptions.

## Requirements

- Node.js
- Discord.js v13+
- A Discord bot token
- A .env file with the following environment variables:
  - `BOT_TOKEN`: Your bot's token
  - `ALLOWED_ROLE_ID`: The role ID allowed to use commands
  - `ALLOWED_ROLE_ID2`: Another role ID allowed to use commands
  - `MANAGED_ROLE_ID`: The role ID to manage channel permissions
  - `PING_ROLE_ID`: The role ID to ping when commands are used

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/union-circle-bot.git
cd union-circle-bot
```

2. Install the dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the necessary environment variables:

```env
BOT_TOKEN=your-discord-bot-token
ALLOWED_ROLE_ID=allowed-role-id
ALLOWED_ROLE_ID2=another-allowed-role-id
MANAGED_ROLE_ID=managed-role-id
PING_ROLE_ID=ping-role-id
```

4. Run the bot:

```bash
node index.js
```

## Commands

- **$offline**
  - Locks the current channel, preventing users from sending messages. Only users with the allowed roles can use this command.
- **$online**
  - Unlocks the current channel, allowing users to send messages. Only users with the allowed roles can use this command.
- **$code [code]**
  - Displays the Union Circle code with a custom embed. Only users with the allowed roles can use this command.
- **$help**
  - Displays a list of available commands and their descriptions.

## Configuration

The bot uses a `config.json` file to store the last used commands and code embeds for each server and channel. Ensure the bot has write permissions to the directory where the `config.json` file is located.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
