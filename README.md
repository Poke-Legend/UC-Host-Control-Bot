# 🤖 Union Circle Bot Improvements

## Overview

This project enhances the Union Circle Discord bot for Pokémon Legends, focusing on improving the queue system, optimizing code organization, and adding new features for better host and player experience.

## 🆕 Major Improvements

### Enhanced Queue System
- **Priority Queue**: Users with specific roles now get priority in the waiting list
- **Improved Pagination**: Better navigation through queue and waiting list
- **Estimated Wait Times**: Players now see approximately how long until their turn
- **Session Management**: New commands for better control of active sessions
- **Registration Flow**: More intuitive and error-resistant registration process

### Code Organization
- **Modular Architecture**: Reorganized code with clear separation of concerns
- **Service-based Design**: Core functionality moved to service modules
- **Improved Error Handling**: Centralized error management with helpful messages
- **Optimized Database**: JSON-based storage with caching for better performance
- **Extended Logging**: Comprehensive logging system for easier debugging

### New Features
- **User Status Check**: Players can check their position in queue with `/status`
- **Enhanced Session Management**: Direct `/session` commands for hosts
- **Registration Cards**: Visual confirmation cards when registering for sessions
- **Estimated Wait Times**: Players can see how long until their turn
- **Queue Analytics**: Hosts can view statistics about current queues

## 📋 Command Reference

### Player Commands
- `/register` - Register for a Union Circle session
- `/status` - Check your position in queue and estimated wait time
- `/levels` - View your Union Circle level and badges

### Host Commands
- `/session info` - View details about the current active session
- `/session start` - Start a new session with players from the queue
- `/session end` - End the current session
- `/session extend` - Add more players to the current session
- `$code` - Send Union Circle codes to active players
- `$queue` - Show the current main queue with pagination
- `$queue waiting` - Show the waiting list with pagination
- `$queue stats` - Show queue statistics
- `$queue move <count>` - Move players from waiting list to queue

## 🔧 Technical Improvements

### Database Optimization
- Added caching layer to reduce disk I/O
- Implemented proper error handling for file operations
- Standardized database access through service layer

### Error Handling
- Centralized error handler with user-friendly messages
- Detailed logging for debugging
- Graceful handling of common errors

### Performance
- Reduced redundant file operations
- Optimized queue operations
- Improved memory usage with proper cleanup

## 🚀 Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure your `.env` file with Discord tokens and IDs
4. Run the bot with `node index.js`

## 📝 Configuration

Configure the bot by editing the `.env` file:

```
# Discord Bot Configuration
BOT_TOKEN=your_token_here
BOT_VERSION=1.1.0
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id

# Role IDs
ALLOWED_ROLE_ID=host_role_id
ALLOWED_ROLE_ID2=admin_role_id
MANAGED_ROLE_ID=managed_role_id
PING_ROLE_ID=ping_role_id

# Priority Role IDs (optional)
PRIORITY_ROLE_VIP=vip_role_id
PRIORITY_ROLE_SUPPORTER=supporter_role_id
PRIORITY_ROLE_REGULAR=regular_role_id

# Category ID
UC_CATEGORY_ID=category_id
```

## 🛣️ Further Improvements

Future enhancements could include:

- [ ] Database migration to MongoDB for scalability
- [ ] Auto-cleanup of inactive registrations
- [ ] Web dashboard for hosts
- [ ] Integration with other Pokémon Legends bots
- [ ] Advanced analytics and reporting

## 💖 Support

If you find this project useful, please consider supporting it:

- ⭐ Star this repository on GitHub
- 🍴 Fork this repository
- 📢 Share with others who might find it useful
- 🐛 Open issues or contribute fixes

<p align="center">
  Developed with ❤️ for Pokémon Legends
</p>