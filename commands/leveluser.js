// commands/leveluser.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils/helper');
// Adjust the folder name if needed – here we assume your leveling system is in "levels" (all lowercase)
const { getUserLevelData } = require('../levels/levelSystem');

// Helper function to create a progress bar
const progressBar = (xp, threshold, barLength = 20) => {
  const percent = xp / threshold;
  const filledLength = Math.round(barLength * percent);
  const emptyLength = barLength - filledLength;
  return '▰'.repeat(filledLength) + '▱'.repeat(emptyLength);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leveluser')
    .setDescription('View leveling info for a specified user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose leveling info to view')
        .setRequired(true)
    ),
    
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user', true);
    const data = getUserLevelData(targetUser.id);
    const threshold = data.level * 100;
    const bar = progressBar(data.xp, threshold);

    // Build a gym badge display string.
    // Each badge (assumed to be a URL) is formatted as a clickable link.
    let gymBadgeDisplay = '';
    if (data.badges && data.badges.length > 0) {
      gymBadgeDisplay = data.badges.map((badge, index) => {
        if (typeof badge === 'string' && badge.startsWith('http')) {
          return `[Badge ${index + 1}](${badge})`;
        } else {
          return badge;
        }
      }).join(' | ');
    } else {
      gymBadgeDisplay = 'None';
    }
    
    const embed = createEmbed({
      color: '#0099ff',
      title: `${targetUser.username}'s Union Circle Level`,
      description: `**Level:** ${data.level}\n**XP:** ${data.xp}/${threshold}\n${bar}\n**Gym Badges:** ${gymBadgeDisplay}`,
    });
    
    // Optionally, set the thumbnail to the latest badge if it exists and is a valid URL.
    const lastBadge = data.badges && data.badges[data.badges.length - 1];
    if (lastBadge && typeof lastBadge === 'string' && lastBadge.startsWith('http')) {
      embed.setThumbnail(lastBadge);
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
