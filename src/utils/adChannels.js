const { EmbedBuilder } = require('discord.js');
const { colors, serverName } = require('../config');
const { incrementUserViolation, incrementServerViolation, getUserViolationCount, getServerViolationCount } = require('./database');

const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([a-zA-Z0-9\-]+)/i;

async function resolveInviteMemberCount(inviteCode) {
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`, {
      headers: { 'User-Agent': 'BulletinBot/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.approximate_member_count ?? null;
  } catch { return null; }
}

function getCorrectChannelId(memberCount, adChannelMap) {
  for (const [chId, tier] of Object.entries(adChannelMap)) {
    if (memberCount >= tier.min && memberCount < tier.max) return chId;
  }
  return null;
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
              `Your message in **#${message.channel.name}** was removed because it didn't include a valid Discord invite link.\n\n` +
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
  if (memberCount === null) {
    try {
      await message.react('💙');
      await message.react('🔥');
    } catch (_) {}
    return;
  }

  const correctChannelId = getCorrectChannelId(memberCount, adChannelMap);
  const isCorrect = correctChannelId === message.channel.id;

  if (!isCorrect) {
    try { await message.delete(); } catch (_) {}

    const userViolations   = await incrementUserViolation(client, message.author.id);
    const serverViolations = await incrementServerViolation(client, inviteCode);

    const correctTier    = correctChannelId ? adChannelMap[correctChannelId] : null;
    const correctMention = correctChannelId ? `<#${correctChannelId}>` : 'no matching channel';
    const correctLabel   = correctTier?.label ?? 'Unknown tier';

    try {
      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.red)
            .setTitle('Wrong Ad Channel')
            .setDescription(
              `Your server ad in **#${message.channel.name}** was removed.\n\n` +
              `Your server has **${memberCount.toLocaleString()} members**, which belongs in a different tier.\n\n` +
              `**Post here instead:**\n` +
              `> ${correctMention} — ${correctLabel}`
            )
            .setFooter({ text: `${serverName} • Ad Channels` }),
        ],
      });
    } catch (_) {}

    if (channels.wrongMemberCountLogs) {
      try {
        const logChannel = await client.channels.fetch(channels.wrongMemberCountLogs);

        const currentTier = adChannelMap[message.channel.id];
        const currentLabel = currentTier?.label ?? 'Unknown';

        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.orange)
              .setTitle('⚠️  Wrong Member Count Violation')
              .setDescription(`A server ad was posted in the wrong tier channel and was removed.`)
              .addFields(
                { name: '👤  User',              value: `<@${message.author.id}>\n${message.author.tag}\n\`${message.author.id}\``, inline: true },
                { name: '📣  Posted In',          value: `<#${message.channel.id}>\n${currentLabel}`,                               inline: true },
                { name: '✅  Correct Channel',    value: `${correctMention}\n${correctLabel}`,                                       inline: true },
                { name: '👥  Server Members',     value: `**${memberCount.toLocaleString()}**`,                                      inline: true },
                { name: '🔗  Invite Code',         value: `\`${inviteCode}\``,                                                       inline: true },
                { name: '⏰  Time',               value: `<t:${Math.floor(Date.now() / 1000)}:F>`,                                  inline: true },
                { name: '🔁  User Violations',    value: `This user has triggered **${userViolations}** automation${userViolations !== 1 ? 's' : ''} total.`,    inline: false },
                { name: '🌐  Server Violations',  value: `This server's invite (\`${inviteCode}\`) has triggered **${serverViolations}** automation${serverViolations !== 1 ? 's' : ''} across all users.`, inline: false },
              )
              .setFooter({ text: `${serverName} • Moderation Logs` })
              .setTimestamp(),
          ],
        });
      } catch (_) {}
    }
    return;
  }

  try {
    await message.react('💙');
    await message.react('🔥');
  } catch (_) {}
}

module.exports = { handleAdChannelMessage };
