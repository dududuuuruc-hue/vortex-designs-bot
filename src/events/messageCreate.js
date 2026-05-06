const { EmbedBuilder } = require('discord.js');
const { incrementUserMessages } = require('../utils/database');
const { handleAdChannelMessage } = require('../utils/adChannels');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const isCommand = message.content.startsWith('/') || message.content.startsWith('!');
    if (isCommand) return;

    const cfg = require('../config');
    const { channels, roles, milestones, colors, serverName, adChannelMap } = cfg;

    if (adChannelMap[message.channel.id]) {
      await handleAdChannelMessage(message, client);
      return;
    }

    if (channels.ideasFeedback && message.channel.id === channels.ideasFeedback) {
      try {
        await message.react('⭐');
        await message.react('📝');
        await message.react('✅');
        await message.react('❌');
        await message.react('⚠️');
      } catch (_) {}
      return;
    }

    const stickyMap = buildStickyMap(cfg);
    if (stickyMap[message.channel.id]) {
      const { refreshSticky } = require('../utils/sticky');
      await refreshSticky(client, message.channel.id, stickyMap[message.channel.id]);
    }

    try {
      const data = await incrementUserMessages(client, message.author.id);
      const member = await message.guild.members.fetch(message.author.id);
      if (!member) return;

      if (member.roles.cache.has(roles.communityMemberPlus)) return;

      const minutesSinceJoin = (Date.now() - member.joinedAt.getTime()) / (1000 * 60);

      if (data.messageCount >= milestones.messageCount && minutesSinceJoin >= milestones.membershipMinutes) {
        await member.roles.add(roles.communityMemberPlus);
        if (roles.communityMember && !member.roles.cache.has(roles.communityMember)) {
          try { await member.roles.add(roles.communityMember); } catch (_) {}
        }
        console.log(`[Roles] Granted Community Member+ to ${message.author.tag}`);

        if (channels.general) {
          try {
            const general = await client.channels.fetch(channels.general);
            await general.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(colors.primary)
                  .setTitle('Community Member+ Unlocked!')
                  .setDescription(
                    `Congrats <@${message.author.id}>! You've earned **Community Member+**.\n\n` +
                    `You now have access to post in all ad channels and exclusive community channels.`
                  )
                  .setFooter({ text: `${serverName} • Community Milestone` })
                  .setTimestamp(),
              ],
            });
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error(`[Messages] Error for ${message.author.tag}:`, err.message);
    }
  },
};

function buildStickyMap(cfg) {
  const map = {};
  if (cfg.channels.pictures)     map[cfg.channels.pictures]     = { rule: 'This channel is for sharing ERLC & design-related pictures only!',     restriction: 'Do not post memes, unrelated images, or off-topic content.' };
  if (cfg.channels.freeLiveries) map[cfg.channels.freeLiveries] = { rule: 'This channel is for sharing free liveries only!',                       restriction: 'Always credit the original creator. Only post liveries you made or have permission to share.' };
  if (cfg.channels.freeUniforms) map[cfg.channels.freeUniforms] = { rule: 'This channel is for sharing free uniforms only!',                       restriction: 'Always credit the original creator. Only post uniforms you made or have permission to share.' };
  if (cfg.channels.freeLogos)    map[cfg.channels.freeLogos]    = { rule: 'This channel is for sharing free logos only!',                          restriction: 'Always credit the original creator. Only post logos you made or have permission to share.' };
  return map;
}
