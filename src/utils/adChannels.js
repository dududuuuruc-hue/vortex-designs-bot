const { EmbedBuilder } = require('discord.js');
const { colors, serverName } = require('../config');

const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([a-zA-Z0-9\-]+)/i;

async function resolveInviteMemberCount(inviteCode) {
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`, {
      headers: { 'User-Agent': 'DivisionOneBot/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.approximate_member_count ?? null;
  } catch {
    return null;
  }
}

function getTierForCount(count, adChannelTiers) {
  return adChannelTiers.find(t => count >= t.min && count < t.max) || null;
}

function getTierChannelKey(tier) {
  if (!tier) return null;
  if (tier.max === Infinity) return 'adCh_7000_plus';
  return `adCh_${tier.min}_${tier.max}`;
}

async function handleAdChannelMessage(message, client) {
  const cfg = require('../config');
  const { adChannelTiers, roles, channels } = cfg;

  const chMap = await require('./database').readRecord(client, 'SETUP:channels').catch(() => null);
  if (!chMap) return;

  const adChannelIds = Object.entries(chMap)
    .filter(([k]) => k.startsWith('adCh_'))
    .map(([, v]) => v);

  if (!adChannelIds.includes(message.channel.id)) return;

  const currentTier = adChannelTiers.find(t => {
    const key = getTierChannelKey(t);
    return chMap[key] === message.channel.id;
  });

  if (!currentTier) return;

  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!member) return;

  if (!member.roles.cache.has(roles.communityMemberPlus)) {
    try { await message.delete(); } catch (_) {}
    try {
      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.red)
            .setTitle('❌  Missing Role — Community Member+')
            .setDescription(
              `You need the **Community Member+** role to post in ad channels.\n\n` +
              `**How to earn it:**\n` +
              `> • Send **20+ genuine messages** in the server\n` +
              `> • Be a member for **10+ minutes**\n\n` +
              `Keep engaging in <#${channels.general}> and you'll get it automatically!`
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
            .setTitle('❌  Invalid Ad — No Invite Link Found')
            .setDescription(
              `Your message in **${message.channel.name}** was removed because it didn't contain a valid Discord server invite link.\n\n` +
              `Please include a **discord.gg/** invite link in your ad and try again.`
            )
            .setFooter({ text: `${serverName} • Ad Channels` }),
        ],
      });
    } catch (_) {}
    return;
  }

  const inviteCode = match[1];
  const memberCount = await resolveInviteMemberCount(inviteCode);

  if (memberCount === null) {
    return;
  }

  const correctTier = getTierForCount(memberCount, adChannelTiers);
  const correctKey = getTierChannelKey(correctTier);
  const correctChannelId = correctKey ? chMap[correctKey] : null;

  const isCorrectChannel = correctChannelId === message.channel.id;

  if (!isCorrectChannel) {
    try { await message.delete(); } catch (_) {}

    const correctChannelMention = correctChannelId ? `<#${correctChannelId}>` : 'the appropriate channel';
    const tierLabel = correctTier
      ? (correctTier.max === Infinity ? `7,000+ members` : `${correctTier.min}–${correctTier.max} members`)
      : 'unknown range';

    try {
      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.red)
            .setTitle('❌  Wrong Ad Channel')
            .setDescription(
              `Your server ad was removed from **${message.channel.name}** because your server has **${memberCount.toLocaleString()} members**, which doesn't match that channel's range.\n\n` +
              `**Where to post your ad:**\n` +
              `> Channel: ${correctChannelMention}\n` +
              `> Member range: **${tierLabel}**\n\n` +
              `Please repost your ad in the correct channel.`
            )
            .setFooter({ text: `${serverName} • Ad Channels` }),
        ],
      });
    } catch (_) {}

    if (channels.wrongMemberCountLogs) {
      try {
        const logChannel = await client.channels.fetch(channels.wrongMemberCountLogs);
        const logEmbed = new EmbedBuilder()
          .setColor(colors.orange)
          .setTitle('⚠️  Wrong Member Count Violation')
          .addFields(
            { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Posted In', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Server Members', value: memberCount.toLocaleString(), inline: true },
            { name: 'Correct Channel', value: correctChannelMention, inline: true },
            { name: 'Invite Code', value: `\`${inviteCode}\``, inline: true },
            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          )
          .setFooter({ text: `${serverName} • Moderation Logs` })
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      } catch (_) {}
    }
  }
}

module.exports = { handleAdChannelMessage };
