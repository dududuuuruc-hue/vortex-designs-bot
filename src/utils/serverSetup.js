const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { colors, serverName } = require('../config');
const { readRecord, writeRecord } = require('./database');

async function postStaffGuide(client) {
  const cfg = require('../config');
  const chId = cfg.channels.staffGuide;
  if (!chId) return;

  const existing = await readRecord(client, 'SETUP:staffGuidePosted').catch(() => null);
  if (existing) return;

  const channel = await client.channels.fetch(chId);

  const embed = new EmbedBuilder()
    .setColor(cfg.colors.primary)
    .setTitle('Bulletin — Staff Guide')
    .setDescription(
      'Welcome to the Bulletin staff team. This guide covers your responsibilities, tools, and expectations.\n\n' +
      '**— Core Responsibilities —**\n' +
      '> Monitor all ad channels and remove posts that violate placement rules\n' +
      '> Handle support and purchase tickets professionally and in a timely manner\n' +
      '> Keep all staff communication in staff-chat\n' +
      '> Never discuss moderation actions publicly\n\n' +
      '**— Ticket Management —**\n' +
      '> Only staff (Moderator+) can close tickets — ticket openers cannot close their own\n' +
      '> Always fill in the closing report honestly when closing a ticket\n' +
      '> Use the 🔴 🟠 🟢 status buttons to track ticket progress\n' +
      '> Shop tickets: Moderator and Designer can both see and respond\n' +
      '> Support tickets: Moderator only\n\n' +
      '**— Payment Verification —**\n' +
      '> Payment Verifiers use the panel in <#' + cfg.channels.paymentVerifierPanel + '> to grant paid channel access\n' +
      '> Always confirm payment with the Founder or Admin before granting access\n' +
      '> All grants are logged automatically in the panel channel\n\n' +
      '**— Ad Channel Enforcement —**\n' +
      '> The bot auto-enforces correct member count channels\n' +
      '> Wrong-channel posts are deleted and the user is DM\'d with the correct channel\n' +
      '> All violations are logged in <#' + cfg.channels.wrongMemberCountLogs + '>\n' +
      '> If someone bypasses the bot, manually remove the post and warn the user\n\n' +
      '**— General Rules —**\n' +
      '> Do not abuse your permissions — all actions are logged\n' +
      '> Treat all members respectfully at all times\n' +
      '> If unsure about a decision, ask in staff-chat before acting\n' +
      '> Inactivity without notice may result in role removal'
    )
    .setFooter({ text: 'Bulletin • Staff Operations' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await writeRecord(client, 'SETUP:staffGuidePosted', { posted: true });
  console.log('[Setup] Staff guide posted.');
}

async function postPaymentVerifierPanel(client) {
  const cfg = require('../config');
  const chId = cfg.channels.paymentVerifierPanel;
  if (!chId) return;

  const dbKey = 'PANEL:paymentVerifier';
  const existing = await readRecord(client, dbKey).catch(() => null);
  const channel = await client.channels.fetch(chId);
  const panelData = buildPaymentVerifierPanel();

  if (existing?.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.edit(panelData);
      console.log('[Setup] Updated payment verifier panel.');
      return;
    } catch (_) {}
  }

  const msg = await channel.send(panelData);
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log('[Setup] Posted payment verifier panel.');
}

function buildPaymentVerifierPanel() {
  const embed = new EmbedBuilder()
    .setColor(colors.orange)
    .setTitle('Payment Verifier Panel')
    .setDescription(
      'Use the buttons below to grant or revoke a user\'s **Paid Ad Channel** after confirming their Robux payment.\n\n' +
      '**Pricing:**\n' +
      '> `190 Robux` — 10 days\n' +
      '> `280 Robux` — 20 days\n' +
      '> `360 Robux` — 30 days\n' +
      '> `3,600 Robux` — 12 months\n\n' +
      '**Slow Mode Add-on:**\n' +
      '> `60 Robux` — remove 30 min from the 1-hour slow mode (min: 30 min)\n\n' +
      '⚠️  Confirm payment with Founder or Admin before granting. All actions are logged below.'
    )
    .setFooter({ text: 'Bulletin • Payment Verification' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pv_grant_channel')
      .setLabel('Grant Paid Channel')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('pv_revoke_channel')
      .setLabel('Revoke Access')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { postStaffGuide, postPaymentVerifierPanel };
