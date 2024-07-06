# Union Circle Discord Bot

Welcome to the Union Circle Discord Bot repository! This bot helps manage Union Circle sessions for Pokémon games on your Discord server.

## Features

- **Union Circle Registration**: Users can register for Union Circle sessions with their in-game details.
- **Session Management**: Commands to start and end Union Circle sessions, reset registrations, and manage queues.
- **Direct Messaging**: Sends Union Circle codes and registration details via DM.
- **Permissions Handling**: Only designated roles can manage Union Circle sessions.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16.6.0 or higher)
- [Discord.js](https://discord.js.org/) (version 14 or higher)
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/union-circle-discord-bot.git
    cd union-circle-discord-bot
    ```

2. **Install the dependencies:**

    ```bash
    npm install
    ```

3. **Create a `.env` file:**

    ```bash
    touch .env
    ```

    Add your environment variables to the `.env` file:

    ```env
    BOT_TOKEN=your-discord-bot-token
    ALLOWED_ROLE_ID=role-id-that-can-manage-sessions
    ALLOWED_ROLE_ID2=another-role-id-that-can-manage-sessions
    MANAGED_ROLE_ID=role-id-that-can-participate
    PING_ROLE_ID=role-id-to-ping-on-new-session
    LOCK_IMAGE_URL=url-to-lock-image
    UNLOCK_IMAGE_URL=url-to-unlock-image
    CUSTOM_IMAGE_URL=url-to-custom-image-for-embeds
    FLY_IMAGE_URL=url-to-fly-image
    STAY_IMAGE_URL=url-to-stay-image
    READY_IMAGE_URL=url-to-ready-image
    FOOTER_TEXT=footer-text-for-embeds
    FOOTER_ICON_URL=url-to-footer-icon
    ```

### Configuration

1. **Edit `config.json`:**

    The `config.json` file is used to store the bot's state and should be present in the root directory. If it doesn't exist, it will be created automatically.

    ```json
    {
      "lastCommands": {},
      "lastCodeEmbeds": {},
      "registeredUsers": {}
    }
    ```

2. **Running the bot:**

    ```bash
    node index.js
    ```

## Usage

### Commands

- **$online**: Start a Union Circle session.
- **$offline**: End the current Union Circle session and reset registrations.
- **$register**: Register for the current Union Circle session.
- **$resetuser <user-id>**: Reset a specific user's registration.
- **$resetregister**: Reset all registrations for the current session.
- **$code <union-circle-code>**: Send the Union Circle code to the registered users via DM.
- **$queue**: View the current queue.
- **$nextqueue**: Move to the next set of users in the queue.
- **$fly**: Send the fly instruction to the registered users.
- **$stay**: Send the stay instruction to the registered users.
- **$ready**: Send the ready instruction to the registered users.

### Permissions

Only users with the roles specified in `ALLOWED_ROLE_ID` and `ALLOWED_ROLE_ID2` can manage Union Circle sessions. Ensure these roles are set correctly in your `.env` file.

### Interaction with Users

When users register for a session, they will receive a DM with their registration details and any relevant instructions. Union Circle codes and instructions will also be sent via DM during the session.

## Contributing

We welcome contributions to improve the Union Circle Discord Bot! To contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Discord.js](https://discord.js.org/) for the amazing library.
- [Node.js](https://nodejs.org/) for the runtime.

## Contact

For any questions or issues, please open an issue in this repository or contact the maintainer.

