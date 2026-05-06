const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors, milestones, serverName } = require('../config');

const STICKY_IDENTIFIER = 'DIVISIONONE_STICKY';

function buildStickyEmbeds(stickyConfig) {
  const ruleEmbed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(stickyConfig.rule)
    .setDescription(stickyConfig.restriction)
    .setFooter({ text: `${STICKY_IDENTIFIER} | ${serverName} • Community Standards` });

  const lockEmbed = new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('This channel is locked to Community Member+')
    .setDescription(
      `To gain access to this channel, you must:\n\n` +
      `> Send **${milestones.messageCount}+ messages** in the Discord\n` +
      `> Be a member of our server for **${milestones.membershipMinutes} minutes**\n\n` +
      `Messages must be genuine conversation — bot commands are automatically ignored.`
    )
    .setFooter({ text: `${STICKY_IDENTIFIER} | ${serverName}` });

  return [ruleEmbed, lockEmbed];
}

function buildStickyRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sticky_how_to_send')
      .setLabel('How can I send a message here?')
      .setStyle(ButtonStyle.Danger)
  );
}

function isStickyMessage(msg) {
  if (!msg.author.bot) return false;
  for (const embed of msg.embeds) {
    if (embed.footer?.text?.includes(STICKY_IDENTIFIER)) return true;
  }
  return false;
}

async function clearOldStickies(channel) {
  let lastId;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const opts = { limit: 50 };
      if (lastId) opts.before = lastId;
      const messages = await channel.messages.fetch(opts);
      if (messages.size === 0) break;
      const stickies = messages.filter(isStickyMessage);
      for (const msg of stickies.values()) {
        try {
          await msg.delete();
          await new Promise(r => setTimeout(r, 300));
        } catch (_) {}
      }
      lastId = messages.last()?.id;
      if (messages.size < 50) break;
    } catch (_) {
      break;
    }
  }
}

async function refreshSticky(client, channelId, stickyConfig) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    await clearOldStickies(channel);
    await new Promise(r => setTimeout(r, 500));

    const embeds = buildStickyEmbeds(stickyConfig);
    const row = buildStickyRow();
    await channel.send({ embeds, components: [row] });
    console.log(`[Sticky] Refreshed in #${channel.name}`);
  } catch (err) {
    console.error(`[Sticky] Failed to refresh in ${channelId}:`, err.message);
  }
}

async function postAllStickies(client, stickyChannels) {
  for (const [channelId, cfg] of Object.entries(stickyChannels)) {
    await refreshSticky(client, channelId, cfg);
    await new Promise(r => setTimeout(r, 800));
  }
}

module.exports = { refreshSticky, postAllStickies, buildStickyEmbeds, buildStickyRow };
