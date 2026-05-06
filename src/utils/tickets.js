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
const { colors, channels, roles, serverName } = require('../config');
const { getNextOrderId } = require('./database');

const STATUS_EMOJIS = { white: '⚪', red: '🔴', orange: '🟠', green: '🟢' };

function buildPurchasePanel() {
  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('BULLETIN  |  Design Requests')
    .setDescription(
      'Looking for a custom design for your ER:LC community? You\'re in the right place.\n' +
      'Our designers craft high-quality, tailored liveries, logos, and uniforms built to your exact specs.\n\n' +
      '**What we offer:**\n' +
      '> Vehicle Liveries\n' +
      '> Department Logos\n' +
      '> Staff Uniforms\n' +
      '> Custom Design Requests\n\n' +
      '**How it works:**\n' +
      '`1.` Click **Open a Ticket** and fill out the short form\n' +
      '`2.` A designer will review your request and reach out\n' +
      '`3.` Approve the design and complete your payment\n' +
      '`4.` Receive your finished, ready-to-use design\n\n' +
      '> Avg. turnaround: **24–72 hours**\n' +
      '> Review our **Terms** before opening a ticket\n\n' +
      '**Note:** Only staff can close tickets.'
    )
    .setFooter({ text: 'Bulletin • Design Request Center' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('purchase_open_ticket')
      .setLabel('Open a Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('purchase_view_terms')
      .setLabel('Terms')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

function buildSupportPanel() {
  const embed = new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('BULLETIN  |  Support')
    .setDescription(
      'Need help with an order, have a general question, or want to report something? Open a ticket below.\n' +
      'All support is handled privately — only you and our staff team can see your ticket.\n\n' +
      '**When to open a ticket:**\n' +
      '> Issue with a design order or delivery\n' +
      '> Payment dispute or billing question\n' +
      '> General question for staff\n' +
      '> Report a member or incident\n' +
      '> Slow mode reduction request for your paid channel\n\n' +
      '**What to expect:**\n' +
      '> Staff typically respond within **a few hours**\n' +
      '> Keep all communication in the ticket — do **not** DM staff\n\n' +
      '**Note:** Only staff can close tickets. Misuse may result in a warning or ban.'
    )
    .setFooter({ text: 'Bulletin • Support Center' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('support_open_ticket')
      .setLabel('Open a Support Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

function buildPurchaseModal() {
  const modal = new ModalBuilder().setCustomId('purchase_ticket_modal').setTitle('Design Request');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox_username').setLabel('Roblox Username').setStyle(TextInputStyle.Short).setPlaceholder('e.g. LibertyPlayer123').setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('design_type').setLabel('Design Type').setStyle(TextInputStyle.Short).setPlaceholder('e.g. Livery, Logo, Uniform, Custom').setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('department').setLabel('Server / Department').setStyle(TextInputStyle.Short).setPlaceholder('e.g. Liberty County Sheriff').setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setPlaceholder('Describe your design — colors, text, badges, layout, references, etc.').setRequired(true).setMaxLength(1000)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('budget').setLabel('Budget (in Robux)').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 500 Robux').setRequired(true)),
  );
  return modal;
}

function buildSupportModal() {
  const modal = new ModalBuilder().setCustomId('support_ticket_modal').setTitle('Support Request');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subject').setLabel('Subject').setStyle(TextInputStyle.Short).setPlaceholder('Brief summary of your issue').setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setPlaceholder('Describe your issue in as much detail as possible...').setRequired(true).setMaxLength(1000)),
  );
  return modal;
}

function buildCloseModal(isPurchase) {
  const modal = new ModalBuilder().setCustomId(isPurchase ? 'close_modal_purchase' : 'close_modal_support').setTitle('Close Ticket');
  if (isPurchase) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('payment_completed').setLabel('Was payment completed?').setStyle(TextInputStyle.Short).setPlaceholder('Yes / No / Partial').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('design_delivered').setLabel('Was the design delivered?').setStyle(TextInputStyle.Short).setPlaceholder('Yes / No / In Progress').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('close_notes').setLabel('Closing Notes (optional)').setStyle(TextInputStyle.Paragraph).setPlaceholder('Any extra context, issues, or remarks...').setRequired(false).setMaxLength(500)),
    );
  } else {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('issue_resolved').setLabel('Was the issue resolved?').setStyle(TextInputStyle.Short).setPlaceholder('Yes / No / Escalated').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('close_notes').setLabel('Closing Notes (optional)').setStyle(TextInputStyle.Paragraph).setPlaceholder('Any extra context, outcome, or remarks...').setRequired(false).setMaxLength(500)),
    );
  }
  return modal;
}

function buildStatusRow(currentStatus) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('status_red').setLabel('Not Verified').setEmoji('🔴').setStyle(ButtonStyle.Danger).setDisabled(currentStatus === 'red'),
    new ButtonBuilder().setCustomId('status_orange').setLabel('Pending').setEmoji('🟠').setStyle(ButtonStyle.Secondary).setDisabled(currentStatus === 'orange'),
    new ButtonBuilder().setCustomId('status_green').setLabel('Verified / Done').setEmoji('🟢').setStyle(ButtonStyle.Success).setDisabled(currentStatus === 'green'),
  );
}

function buildCloseRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );
}

function buildPurchaseTicketEmbed(fields, user, orderId) {
  return new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`DESIGN REQUEST  —  Order #${orderId}`)
    .addFields(
      { name: 'Order ID', value: `#${orderId}`, inline: true },
      { name: 'Roblox Username', value: fields.roblox_username, inline: true },
      { name: 'Design Type', value: fields.design_type, inline: true },
      { name: 'Server / Department', value: fields.department, inline: true },
      { name: 'Budget', value: fields.budget, inline: true },
      { name: 'Payment Status', value: '🔴  Not yet verified', inline: true },
      { name: 'Description', value: fields.description, inline: false },
    )
    .setFooter({ text: `Opened by ${user.tag} • Bulletin` })
    .setTimestamp();
}

function buildSupportTicketEmbed(fields, user) {
  return new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('SUPPORT REQUEST')
    .addFields(
      { name: 'Subject', value: fields.subject, inline: false },
      { name: 'Status', value: '⚪  Open — awaiting staff', inline: true },
      { name: 'Description', value: fields.description, inline: false },
    )
    .setFooter({ text: `Opened by ${user.tag} • Bulletin` })
    .setTimestamp();
}

async function createPurchaseChannel(interaction, fields) {
  const cfg = require('../config');
  const guild = interaction.guild;
  const user = interaction.user;
  const orderId = await getNextOrderId(interaction.client);
  const safeName = fields.roblox_username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const channelName = `⚪-order-${orderId}-${safeName}`;

  const perms = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
  ];
  if (cfg.roles.moderator) perms.push({ id: cfg.roles.moderator, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });
  if (cfg.roles.admin) perms.push({ id: cfg.roles.admin, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });
  if (cfg.roles.designer) perms.push({ id: cfg.roles.designer, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] });

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: '1500547731184423063',
    reason: `Purchase ticket #${orderId} opened by ${user.tag}`,
    permissionOverwrites: perms,
  });

  const infoEmbed = new EmbedBuilder()
    .setColor(colors.primary)
    .setDescription(
      `Hey <@${user.id}>, thanks for opening a design request!\n\n` +
      `Your order number is **#${orderId}** — keep this for any future support.\n` +
      `A designer will review your request and reach out within **24–72 hours**.\n\n` +
      `Feel free to drop reference images, links, or extra details below.\n\n` +
      `*Staff: use the status buttons to track this ticket. Only staff can close tickets.*`
    )
    .setFooter({ text: 'Bulletin • Design Tickets' });

  const requestEmbed = buildPurchaseTicketEmbed(fields, user, orderId);
  await ticketChannel.send({ embeds: [infoEmbed, requestEmbed], components: [buildStatusRow('red'), buildCloseRow()] });
  return ticketChannel;
}

async function createSupportChannel(interaction, fields) {
  const cfg = require('../config');
  const guild = interaction.guild;
  const user = interaction.user;
  const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const channelName = `⚪-support-${safeName}-${Date.now().toString().slice(-4)}`;

  const perms = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
  ];
  if (cfg.roles.moderator) perms.push({ id: cfg.roles.moderator, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });
  if (cfg.roles.admin) perms.push({ id: cfg.roles.admin, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: '1500547731184423063',
    reason: `Support ticket opened by ${user.tag}`,
    permissionOverwrites: perms,
  });

  const infoEmbed = new EmbedBuilder()
    .setColor(colors.dark)
    .setDescription(
      `Hey <@${user.id}>, your support ticket has been created!\n\n` +
      `A staff member will be with you shortly.\n` +
      `> Drop any screenshots or extra context below\n` +
      `> Keep all communication in this channel — do not DM staff\n\n` +
      `*Only staff can close tickets.*`
    )
    .setFooter({ text: 'Bulletin • Support Tickets' });

  const requestEmbed = buildSupportTicketEmbed(fields, user);
  await ticketChannel.send({ embeds: [infoEmbed, requestEmbed], components: [buildStatusRow('white'), buildCloseRow()] });
  return ticketChannel;
}

module.exports = {
  buildPurchasePanel, buildSupportPanel, buildPurchaseModal, buildSupportModal,
  buildCloseModal, buildStatusRow, buildCloseRow, buildPurchaseTicketEmbed,
  buildSupportTicketEmbed, createPurchaseChannel, createSupportChannel, STATUS_EMOJIS,
};
