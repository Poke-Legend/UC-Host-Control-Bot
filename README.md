This bot is designed to manage channel permissions in a Discord server, specifically for locking and unlocking channels for Union Circle hosting. It performs the following functions:

1. **Lock a Channel (`$lock` Command):**
   - **Checks Permissions:** The bot verifies if the user has any of the allowed roles (specified by `ALLOWED_ROLE_ID` and `ALLOWED_ROLE_ID2` in the environment variables).
   - **Lock Channel:** If the user has the required permissions, the bot locks the channel by changing its name to start with a lock emoji (`❌`), updating the channel's permissions to prevent the `managedRoleId` role from sending messages, and sending an embed message indicating that the Union Circle is offline.
   - **Permission Denied:** If the user lacks the required permissions, the bot sends an embed message stating that the user does not have permission to use the command and deletes the user's command message.

2. **Unlock a Channel (`$unlock` Command):**
   - **Checks Permissions:** Similar to the lock command, the bot checks if the user has any of the allowed roles.
   - **Unlock Channel:** If the user has the required permissions, the bot unlocks the channel by changing its name to start with an unlock emoji (`✅`), updating the channel's permissions to allow the `managedRoleId` role to send messages, and sending an embed message indicating that the Union Circle is online.
   - **Permission Denied:** If the user lacks the required permissions, the bot sends an embed message stating that the user does not have permission to use the command and deletes the user's command message.

3. **Help Command (`$help` Command):**
   - **Checks Permissions:** The bot checks if the user has any of the allowed roles.
   - **Send Help Embed:** If the user has the required permissions, the bot sends an embed message containing a list of available commands (`$lock` and `$unlock`).
   - **Permission Denied:** If the user lacks the required permissions, the bot sends an embed message stating that the user does not have permission to use the command and deletes the user's command message.

### Environment Variables
The bot relies on several environment variables for configuration:
- `BOT_TOKEN`: The bot's token for authentication.
- `ALLOWED_ROLE_ID` and `ALLOWED_ROLE_ID2`: The IDs of the roles allowed to use the commands.
- `MANAGED_ROLE_ID`: The ID of the role whose permissions are managed by the bot.

### Usage
- **Locking a Channel:** A user with the appropriate role types `$lock` in a channel. If they have permission, the channel is locked, preventing members with the `MANAGED_ROLE_ID` from sending messages.
- **Unlocking a Channel:** A user with the appropriate role types `$unlock` in a channel. If they have permission, the channel is unlocked, allowing members with the `MANAGED_ROLE_ID` to send messages.
- **Help:** A user with the appropriate role types `$help` to receive information about the available commands.

The bot uses Discord.js to interact with the Discord API and manage the embed messages and permissions.
