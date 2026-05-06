const { EmbedBuilder } = require('discord.js');
const { roles, channels, milestones, serverName } = require('../config');
const { incrementUserMessages, getUserData, readRecord } = require('../utils/database');
const { refreshSticky } = require('../utils/sticky');
const { handleAdChannelMessage } = require('../utils/adChannels');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const isCommand = message.content.startsWith('/') || message.content.startsWith('!');
    if (isCommand) return;

    const cfg = require('../config');
    const stickyChannels = buildStickyChannels(cfg);

    const stickyConfig = stickyChannels[message.channel.id];
    if (stickyConfig) {
      await refreshSticky(client, message.channel.id, stickyConfig);
    }

    await handleAdChannelMessage(message, client);

    try {
      const data = await incrementUserMessages(client, message.author.id);
      const member = await message.guild.members.fetch(message.author.id);
      if (!member) return;

      const hasCommunityPlus = member.roles.cache.has(roles.communityMemberPlus);
      if (hasCommunityPlus) return;

      const joinedAt = member.joinedAt;
      const minutesSinceJoin = (Date.now() - joinedAt.getTime()) / (1000 * 60);

      if (data.messageCount >= milestones.messageCount && minutesSinceJoin >= milestones.membershipMinutes) {
        await member.roles.add(roles.communityMemberPlus);
        console.log(`[Roles] Granted Community Member+ to ${message.author.tag} (${data.messageCount} msgs, ${Math.floor(minutesSinceJoin)}m)`);

        if (roles.communityMember && !member.roles.cache.has(roles.communityMember)) {
          try { await member.roles.add(roles.communityMember); } catch (_) {}
        }

        try {
          const generalChId = channels.general;
          if (generalChId) {
            const general = await client.channels.fetch(generalChId);
            const embed = new EmbedBuilder()
              .setColor(cfg.colors.primary)
              .setTitle('Community Member+ Unlocked!')
              .setDescription(
                `Congrats <@${message.author.id}>! You've earned **Community Member+**.\n\n` +
                `You now have access to post in all ad channels and exclusive community channels.`
              )
              .setFooter({ text: `${serverName} • Community Milestone` })
              .setTimestamp();
            await general.send({ embeds: [embed] });
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error(`[Messages] Failed to process message for ${message.author.tag}:`, err.message);
    }
  },
};

function buildStickyChannels(cfg) {
  const map = {};
  const { channels } = cfg;
  if (channels.pictures) map[channels.pictures] = { rule: 'This channel is for sharing ERLC & design-related pictures only!', restriction: 'Do not post memes, unrelated images, or off-topic content.' };
  if (channels.privateServerAds) map[channels.privateServerAds] = { rule: 'This channel is for ER:LC private server ads only!', restriction: 'Do not post design servers, hubs, services, or anything other than ERLC private roleplay servers.' };
  if (channels.resourceSubmissions) map[channels.resourceSubmissions] = { rule: 'This channel is for free resource submissions only!', restriction: 'Always include proper credits to the original creator when submitting resources.' };
  return map;
}
