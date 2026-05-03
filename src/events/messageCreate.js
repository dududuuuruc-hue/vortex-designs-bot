const { channels, roles, stickyChannels, milestones } = require('../config');
const { incrementUserMessages, getUserData } = require('../utils/database');
const { refreshSticky } = require('../utils/sticky');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const isCommand = message.content.startsWith('/') || message.content.startsWith('!');
    if (isCommand) return;

    const stickyConfig = stickyChannels[message.channel.id];
    if (stickyConfig) {
      await refreshSticky(client, message.channel.id, stickyConfig);
    }

    try {
      const data = await incrementUserMessages(client, message.author.id);
      const member = await message.guild.members.fetch(message.author.id);

      if (!member) return;

      const hasCommunityPlus = member.roles.cache.has(roles.communityMemberPlus);
      if (hasCommunityPlus) return;

      const joinedAt = member.joinedAt;
      const daysSinceJoin = (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (data.messageCount >= milestones.messageCount && daysSinceJoin >= milestones.membershipDays) {
        await member.roles.add(roles.communityMemberPlus);
        console.log(`[Roles] Granted Community Member+ to ${message.author.tag} (${data.messageCount} msgs, ${Math.floor(daysSinceJoin)}d)`);

        try {
          const general = await client.channels.fetch(channels.general);
          const { EmbedBuilder } = require('discord.js');
          const { colors } = require('../config');

          const embed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle('🎉  Community Member+ Unlocked!')
            .setDescription(
              `Congrats <@${message.author.id}>! You've reached **Community Member+** status.\n\n` +
              `You now have access to exclusive channels including private server ads, pictures, and resource submissions.`
            )
            .setFooter({ text: 'Vortex Designs • Community Milestone' })
            .setTimestamp();

          await general.send({ embeds: [embed] });
        } catch (_) {}
      }
    } catch (err) {
      console.error(`[Messages] Failed to process message for ${message.author.tag}:`, err.message);
    }
  },
};
