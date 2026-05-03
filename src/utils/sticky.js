const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { colors, channels, milestones } = require('../config');
const { getStickyMessageId, setStickyMessageId } = require('./database');

function buildStickyEmbeds(channelId, stickyConfig) {
  const ruleEmbed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(stickyConfig.rule)
    .setDescription(stickyConfig.restriction)
    .setFooter({ text: 'Vortex Designs • Community Standards' });

  const lockEmbed = new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('🔒  This channel is locked to **Community Member+**')
    .setDescription(
      `To gain access to this channel, you must:\n\n` +
      `• Send **${milestones.messageCount}+ messages** in the Discord\n` +
      `• Be a member of our Discord server for **${milestones.membershipDays} days**\n\n` +
      `⚠️  Messages must be genuine conversation — the bot automatically ignores bot commands and spam.`
    )
    .setFooter({ text: 'Engage in real conversations to count towards your role.' });

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

async function refreshSticky(client, channelId, stickyConfig) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    const oldId = await getStickyMessageId(client, channelId);
    if (oldId) {
      try {
        const oldMsg = await channel.messages.fetch(oldId);
        await oldMsg.delete();
      } catch (_) {}
    }

    const embeds = buildStickyEmbeds(channelId, stickyConfig);
    const row = buildStickyRow();
    const newMsg = await channel.send({ embeds, components: [row] });
    await setStickyMessageId(client, channelId, newMsg.id);
  } catch (err) {
    console.error(`[Sticky] Failed to refresh sticky in ${channelId}:`, err.message);
  }
}

async function postAllStickies(client, stickyChannels) {
  for (const [channelId, cfg] of Object.entries(stickyChannels)) {
    await refreshSticky(client, channelId, cfg);
  }
}

module.exports = { refreshSticky, postAllStickies, buildStickyEmbeds, buildStickyRow };
