const { EmbedBuilder } = require('discord.js');
const { colors, serverName } = require('../config');

const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([a-zA-Z0-9\-]+)/i;

async function resolveInviteMemberCount(inviteCode) {
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`, {
      headers: { 'User-Agent': 'BulletinBot/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.approximate_member_count ?? null;
  } catch {
    return null;
  }
}

function getCorrectChannelId(memberCount, adChannelMap) {
  for (const [chId, tier] of Object.entries(adChannelMap)) {
    if (memberCount >= tier.min && memberCount < tier.max) return chId;
  }
  return null;
}

function getTierLabel(tier) {
  if (!tier) return 'unknown';
  return tier.max === Infinity ? `${tier.min.toLocaleString()}+ members` : `${tier.min.toLocaleString()}–${tier.max.toLocaleString()} members`;
}

async function handleAdChannelMessage(message, client) {
  const cfg = require('../config');
  const { adChannelMap, roles, channels, milestones } = cfg;

  if (!adChannelMap[message.channel.id]) return;

  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!member) return;

  if (!member.roles.cache.has(roles.communityMemberPlus)) {
    try { await message.delete(); } catch (_) {}
    try {
      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.red)
            .setTitle('Missing Role — Community Member+')
            .setDescription(
              `You need the **Community Member+** role to post in ad channels.\n\n` +
              `**How to earn it:**\n` +
              `> Send **${milestones.messageCount}+ genuine messages** in the server\n` +
              `> Be a member for at least **${milestones.membershipMinutes} minutes**\n\n` +
              `Engage in <#${channels.general}> and it will be granted automatically.`
            )
            .setFooter({ text: `${serverName} • Ad Channels` }),
        ],
      });
    } catch (_) {}
    return;
  }

  const match = message.content.match(INVITE_REGEX);
  if (!match) {
    try { await message.delete(); } catch (_) {}
    try {
      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.red)
            .setTitle('Invalid Ad — No Invite Link Found')
            .setDescription(
              `Your message in **${message.channel.name}** was removed because it didn't include a valid Discord invite link.\n\n` +
              `Include a **discord.gg/** link in your ad and try again.`
            )
            .setFooter({ text: `${serverName} • Ad Channels` }),
        ],
      });
    } catch (_) {}
    return;
  }

  const inviteCode = match[1];
  const memberCount = await resolveInviteMemberCount(inviteCode);
  if (memberCount === null) return;

  const correctChannelId = getCorrectChannelId(memberCount, adChannelMap);
  const currentTier = adChannelMap[message.channel.id];
  const isCorrect = correctChannelId === message.channel.id;

  if (!isCorrect) {
    try { await message.delete(); } catch (_) {}

    const correctTier = correctChannelId ? adChannelMap[correctChannelId] : null;
    const tierLabel = getTierLabel(correctTier);
    const correctMention = correctChannelId ? `<#${correctChannelId}>` : 'the appropriate channel';

    try {
      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.red)
            .setTitle('Wrong Ad Channel')
            .setDescription(
              `Your server ad was removed from **${message.channel.name}**.\n\n` +
              `Your server has **${memberCount.toLocaleString()} members**, which belongs in a different channel.\n\n` +
              `**Post your ad here instead:**\n` +
              `> ${correctMention} — ${tierLabel}`
            )
            .setFooter({ text: `${serverName} • Ad Channels` }),
        ],
      });
    } catch (_) {}

    if (channels.wrongMemberCountLogs) {
      try {
        const logChannel = await client.channels.fetch(channels.wrongMemberCountLogs);
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.orange)
              .setTitle('Wrong Member Count Violation')
              .addFields(
                { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                { name: 'Posted In', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Server Members', value: memberCount.toLocaleString(), inline: true },
                { name: 'Correct Channel', value: correctMention, inline: true },
                { name: 'Invite Code', value: `\`${inviteCode}\``, inline: true },
                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              )
              .setFooter({ text: `${serverName} • Moderation Logs` })
              .setTimestamp(),
          ],
        });
      } catch (_) {}
    }
  }
}

module.exports = { handleAdChannelMessage };
