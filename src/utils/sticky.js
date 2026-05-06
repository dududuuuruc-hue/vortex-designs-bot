const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors, milestones, serverName } = require('../config');

const STICKY_ID = 'BULLETIN_STICKY';

function buildStickyEmbeds(stickyConfig) {
  const ruleEmbed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(stickyConfig.rule)
    .setDescription(stickyConfig.restriction)
    .setFooter({ text: `${STICKY_ID} | ${serverName} • Community Standards` });

  const lockEmbed = new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('This channel is locked to Community Member+')
    .setDescription(
      `To gain access, you must:\n\n` +
      `> Send **${milestones.messageCount}+ messages** in the server\n` +
      `> Be a member for at least **${milestones.membershipMinutes} minutes**\n\n` +
      `Messages must be genuine conversation — bot commands are ignored.`
    )
    .setFooter({ text: `${STICKY_ID} | ${serverName}` });

  return [ruleEmbed, lockEmbed];
}

function buildStickyRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sticky_how_to_send').setLabel('How do I unlock this channel?').setStyle(ButtonStyle.Secondary)
  );
}

function isStickyMessage(msg) {
  if (!msg.author.bot) return false;
  return msg.embeds.some(e => e.footer?.text?.includes(STICKY_ID));
}

async function clearOldStickies(channel) {
  let lastId;
  for (let i = 0; i < 3; i++) {
    try {
      const opts = { limit: 50 };
      if (lastId) opts.before = lastId;
      const messages = await channel.messages.fetch(opts);
      if (messages.size === 0) break;
      for (const msg of messages.filter(isStickyMessage).values()) {
        try { await msg.delete(); await new Promise(r => setTimeout(r, 300)); } catch (_) {}
      }
      lastId = messages.last()?.id;
      if (messages.size < 50) break;
    } catch (_) { break; }
  }
}

async function refreshSticky(client, channelId, stickyConfig) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;
    await clearOldStickies(channel);
    await new Promise(r => setTimeout(r, 500));
    await channel.send({ embeds: buildStickyEmbeds(stickyConfig), components: [buildStickyRow()] });
    console.log(`[Sticky] Refreshed in #${channel.name}`);
  } catch (err) {
    console.error(`[Sticky] Failed in ${channelId}:`, err.message);
  }
}

async function postAllStickies(client, stickyChannels) {
  for (const [channelId, cfg] of Object.entries(stickyChannels)) {
    await refreshSticky(client, channelId, cfg);
    await new Promise(r => setTimeout(r, 800));
  }
}

module.exports = { refreshSticky, postAllStickies, buildStickyEmbeds, buildStickyRow };
