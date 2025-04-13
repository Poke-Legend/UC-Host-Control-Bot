const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { database } = require('../database/connection');
const { formatTimestamp } = require('../utils/timeUtils');
const logger = require('../utils/logger');

// Session model for database interactions
class SessionModel {
    static async create(guildId, creatorId, gameName) {
        try {
            const query = `
                INSERT INTO sessions 
                (guild_id, creator_id, game_name, start_time, status) 
                VALUES ($1, $2, $3, NOW(), 'active')
                RETURNING *
            `;
            const values = [guildId, creatorId, gameName];
            const result = await database.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating session:', error);
            throw error;
        }
    }

    static async end(sessionId) {
        try {
            const query = `
                UPDATE sessions 
                SET end_time = NOW(), status = 'ended' 
                WHERE id = $1 
                RETURNING *
            `;
            const result = await database.query(query, [sessionId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error ending session:', error);
            throw error;
        }
    }

    static async getCurrentSession(guildId) {
        try {
            const query = `
                SELECT * FROM sessions 
                WHERE guild_id = $1 AND status = 'active' 
                ORDER BY start_time DESC 
                LIMIT 1
            `;
            const result = await database.query(query, [guildId]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error fetching current session:', error);
            throw error;
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('session')
        .setDescription('Manage game sessions')
        .addSubcommand(subcommand => 
            subcommand
                .setName('start')
                .setDescription('Start a new game session')
                .addStringOption(option => 
                    option
                        .setName('game')
                        .setDescription('The name of the game')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('end')
                .setDescription('End the current game session')
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('status')
                .setDescription('Check the current session status')
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            switch(subcommand) {
                case 'start':
                    await this.handleSessionStart(interaction);
                    break;
                case 'end':
                    await this.handleSessionEnd(interaction);
                    break;
                case 'status':
                    await this.handleSessionStatus(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: 'Invalid session command.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            logger.error('Session command error:', error);
            await interaction.reply({
                content: 'An error occurred while processing the session command.',
                ephemeral: true
            });
        }
    },

    async handleSessionStart(interaction) {
        try {
            // Check if an active session already exists
            const existingSession = await SessionModel.getCurrentSession(interaction.guildId);
            if (existingSession) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Session Already Active')
                    .setDescription(`A session for **${existingSession.game_name}** is already in progress.`)
                    .addFields(
                        { name: 'Started At', value: formatTimestamp(existingSession.start_time) },
                        { name: 'Created By', value: `<@${existingSession.creator_id}>` }
                    );
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Get the game name from options
            const gameName = interaction.options.getString('game');

            // Create new session
            const newSession = await SessionModel.create(
                interaction.guildId, 
                interaction.user.id, 
                gameName
            );

            // Create an embed to show session details
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('New Session Started')
                .setDescription(`A new session for **${gameName}** has been created.`)
                .addFields(
                    { name: 'Started At', value: formatTimestamp(newSession.start_time) },
                    { name: 'Created By', value: `<@${interaction.user.id}>` }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error starting session:', error);
            await interaction.reply({
                content: 'Failed to start a new session. Please try again.',
                ephemeral: true
            });
        }
    },

    async handleSessionEnd(interaction) {
        try {
            // Find the current active session
            const currentSession = await SessionModel.getCurrentSession(interaction.guildId);
            
            if (!currentSession) {
                return await interaction.reply({
                    content: 'No active session found.',
                    ephemeral: true
                });
            }

            // Check if the user has permission to end the session
            if (currentSession.creator_id !== interaction.user.id && 
                !interaction.member.permissions.has('MANAGE_CHANNELS')) {
                return await interaction.reply({
                    content: 'You do not have permission to end this session.',
                    ephemeral: true
                });
            }

            // End the session
            const endedSession = await SessionModel.end(currentSession.id);

            // Create an embed to show ended session details
            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('Session Ended')
                .setDescription(`The session for **${endedSession.game_name}** has been closed.`)
                .addFields(
                    { name: 'Started At', value: formatTimestamp(endedSession.start_time) },
                    { name: 'Ended At', value: formatTimestamp(endedSession.end_time) },
                    { name: 'Duration', value: this.calculateSessionDuration(endedSession.start_time, endedSession.end_time) },
                    { name: 'Created By', value: `<@${endedSession.creator_id}>` }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error ending session:', error);
            await interaction.reply({
                content: 'Failed to end the session. Please try again.',
                ephemeral: true
            });
        }
    },

    async handleSessionStatus(interaction) {
        try {
            const currentSession = await SessionModel.getCurrentSession(interaction.guildId);
            
            if (!currentSession) {
                return await interaction.reply({
                    content: 'No active session is currently running.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#0000FF')
                .setTitle('Current Session Status')
                .setDescription(`Active session for **${currentSession.game_name}**`)
                .addFields(
                    { name: 'Started At', value: formatTimestamp(currentSession.start_time) },
                    { name: 'Created By', value: `<@${currentSession.creator_id}>` }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error checking session status:', error);
            await interaction.reply({
                content: 'Failed to retrieve session status.',
                ephemeral: true
            });
        }
    },

    calculateSessionDuration(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const durationMs = end - start;
        
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);

        return `${hours}h ${minutes}m ${seconds}s`;
    }
};