const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { colors, serverName } = require('../config');
const { readRecord, writeRecord } = require('./database');

function buildGrantModal() {
  const modal = new ModalBuilder()
    .setCustomId('pv_grant_modal')
    .setTitle('Grant Paid Ad Channel');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('target_user_id')
        .setLabel('Discord User ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 123456789012345678')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('access_days')
        .setLabel('Access Duration (days)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('10, 20, 30, or 365')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('robux_paid')
        .setLabel('Robux Amount Paid')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 190')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('slow_mode_reduction')
        .setLabel('Slow Mode Reduction (minutes, or 0)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('0, 30 (costs 60 Robux)')
        .setRequired(true)
    ),
  );

  return modal;
}

function buildRevokeModal() {
  const modal = new ModalBuilder()
    .setCustomId('pv_revoke_modal')
    .setTitle('Revoke Paid Channel Access');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('target_user_id')
        .setLabel('Discord User ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 123456789012345678')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('revoke_reason')
        .setLabel('Reason for Revocation')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Expired, Refunded, Violation')
        .setRequired(true)
    ),
  );

  return modal;
}

async function handleGrantModal(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const cfg = require('../config');
  const targetUserId = interaction.fields.getTextInputValue('target_user_id').trim();
  const accessDays = parseInt(interaction.fields.getTextInputValue('access_days').trim(), 10);
  const robuxPaid = interaction.fields.getTextInputValue('robux_paid').trim();
  const slowModeReduction = parseInt(interaction.fields.getTextInputValue('slow_mode_reduction').trim(), 10) || 0;

  if (isNaN(accessDays) || accessDays <= 0) {
    return interaction.editReply({ content: '❌ Invalid access duration. Use 10, 20, 30, or 365.' });
  }

  let targetMember;
  try {
    targetMember = await interaction.guild.members.fetch(targetUserId);
  } catch {
    return interaction.editReply({ content: `❌ Could not find user with ID \`${targetUserId}\`. Make sure they are in the server.` });
  }

  const slowModeSecs = Math.max(1800, 3600 - slowModeReduction * 60);

  const chMap = await readRecord(client, 'SETUP:channels').catch(() => ({}));
  const paidCatId = chMap.paidAdChannelsCategory || cfg.channels.paidAdChannelsCategory;

  const safeName = targetMember.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const channelName = `⭐│${safeName}-ads`;

  const expiresAt = Date.now() + accessDays * 24 * 60 * 60 * 1000;

  const paidChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: paidCatId || undefined,
    rateLimitPerUser: slowModeSecs,
    reason: `Paid ad channel granted by ${interaction.user.tag}`,
    permissionOverwrites: [
      { id: interaction.guild.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
      {
        id: targetMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      { id: cfg.roles.moderator, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
      { id: cfg.roles.admin, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
      { id: cfg.roles.founder, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
    ],
  });

  await paidChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(colors.yellow)
        .setTitle('⭐  Welcome to Your Premium Ad Channel!')
        .setDescription(
          `Hey <@${targetMember.id}>, this is **your** dedicated ad channel!\n\n` +
          `**Your plan:**\n` +
          `> Duration: **${accessDays} day${accessDays !== 1 ? 's' : ''}**\n` +
          `> Expires: <t:${Math.floor(expiresAt / 1000)}:F>\n` +
          `> Slow Mode: **${slowModeSecs >= 3600 ? '1 hour' : `${slowModeSecs / 60} minutes`}**\n\n` +
          `You can post your server ad here as often as your slow mode allows. Everyone in the server can see this channel.\n\n` +
          `Need a slow mode reduction or have questions? Open a support ticket.`
        )
        .setFooter({ text: `${serverName} • Premium Advertiser` })
        .setTimestamp(),
    ],
  });

  await writeRecord(client, `PAIDCH:${targetMember.id}`, {
    channelId: paidChannel.id,
    grantedBy: interaction.user.id,
    accessDays,
    expiresAt,
    slowModeSecs,
    robuxPaid,
  });

  if (cfg.roles.premiumAdvertiser) {
    try { await targetMember.roles.add(cfg.roles.premiumAdvertiser); } catch (_) {}
  }

  const logEmbed = new EmbedBuilder()
    .setColor(colors.green)
    .setTitle('✅  Paid Channel Granted')
    .addFields(
      { name: 'Granted By', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
      { name: 'User', value: `<@${targetMember.id}> (${targetMember.user.tag})`, inline: true },
      { name: 'Channel', value: `<#${paidChannel.id}>`, inline: true },
      { name: 'Duration', value: `${accessDays} days`, inline: true },
      { name: 'Robux Paid', value: robuxPaid, inline: true },
      { name: 'Slow Mode', value: slowModeSecs >= 3600 ? '1 hour' : `${slowModeSecs / 60} min`, inline: true },
      { name: 'Slow Mode Reduction', value: slowModeReduction > 0 ? `${slowModeReduction} min (-60 Robux)` : 'None', inline: true },
      { name: 'Expires', value: `<t:${Math.floor(expiresAt / 1000)}:F>`, inline: true },
    )
    .setFooter({ text: `${serverName} • Payment Verification Logs` })
    .setTimestamp();

  try {
    const pvChannel = await client.channels.fetch(cfg.channels.paymentVerifierPanel);
    await pvChannel.send({ embeds: [logEmbed] });
  } catch (_) {}

  await interaction.editReply({ content: `✅ Paid channel <#${paidChannel.id}> created for <@${targetMember.id}> with **${accessDays} days** access.` });
}

async function handleRevokeModal(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const cfg = require('../config');
  const targetUserId = interaction.fields.getTextInputValue('target_user_id').trim();
  const reason = interaction.fields.getTextInputValue('revoke_reason').trim();

  let targetMember;
  try {
    targetMember = await interaction.guild.members.fetch(targetUserId);
  } catch {
    return interaction.editReply({ content: `❌ Could not find user with ID \`${targetUserId}\`.` });
  }

  const record = await readRecord(client, `PAIDCH:${targetUserId}`).catch(() => null);
  if (!record?.channelId) {
    return interaction.editReply({ content: `❌ No paid channel record found for that user.` });
  }

  try {
    const ch = await client.channels.fetch(record.channelId);
    await ch.delete('Paid channel access revoked');
  } catch (_) {}

  if (cfg.roles.premiumAdvertiser) {
    try { await targetMember.roles.remove(cfg.roles.premiumAdvertiser); } catch (_) {}
  }

  await writeRecord(client, `PAIDCH:${targetUserId}`, null);

  const logEmbed = new EmbedBuilder()
    .setColor(colors.red)
    .setTitle('🚫  Paid Channel Revoked')
    .addFields(
      { name: 'Revoked By', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
      { name: 'User', value: `<@${targetMember.id}> (${targetMember.user.tag})`, inline: true },
      { name: 'Reason', value: reason, inline: false },
      { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )
    .setFooter({ text: `${serverName} • Payment Verification Logs` })
    .setTimestamp();

  try {
    const pvChannel = await client.channels.fetch(cfg.channels.paymentVerifierPanel);
    await pvChannel.send({ embeds: [logEmbed] });
  } catch (_) {}

  await interaction.editReply({ content: `✅ Paid channel for <@${targetMember.id}> has been revoked.` });
}

async function checkExpiredChannels(client, guild) {
  const cfg = require('../config');
  const chMap = await readRecord(client, 'SETUP:channels').catch(() => ({}));
  const dbChannel = await client.channels.fetch(cfg.databaseChannelId).catch(() => null);
  if (!dbChannel) return;

  const messages = await dbChannel.messages.fetch({ limit: 100 });
  const paidKeys = messages.filter(m => m.content.startsWith('KEY:PAIDCH:'));

  for (const msg of paidKeys.values()) {
    const key = msg.content.split('|VALUE:')[0].replace('KEY:', '');
    const userId = key.replace('PAIDCH:', '');
    const record = await readRecord(client, key).catch(() => null);
    if (!record || !record.expiresAt || !record.channelId) continue;

    if (Date.now() >= record.expiresAt) {
      try {
        const ch = await client.channels.fetch(record.channelId);
        await ch.delete('Paid channel access expired');
      } catch (_) {}

      try {
        const member = await guild.members.fetch(userId);
        if (cfg.roles.premiumAdvertiser) await member.roles.remove(cfg.roles.premiumAdvertiser);
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.orange)
              .setTitle('⏰  Your Premium Ad Channel Has Expired')
              .setDescription(
                `Your dedicated ad channel in **${serverName}** has expired.\n\n` +
                `To renew, open a ticket in the server and our team will get you set up again.\n\n` +
                `**Renewal Pricing:**\n` +
                `> 10 days — 190 Robux\n` +
                `> 20 days — 280 Robux\n` +
                `> 30 days — 360 Robux\n` +
                `> 12 months — 3,600 Robux`
              )
              .setFooter({ text: `${serverName} • Premium Advertising` }),
          ],
        });
      } catch (_) {}

      await writeRecord(client, key, null);
      console.log(`[PaidChannels] Expired channel for user ${userId}`);
    }
  }
}

module.exports = { buildGrantModal, buildRevokeModal, handleGrantModal, handleRevokeModal, checkExpiredChannels };
