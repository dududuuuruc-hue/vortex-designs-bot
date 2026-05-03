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

function buildPurchasePanel() {
  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`🎨  ${serverName.toUpperCase()}  |  Design Requests`)
    .setDescription(
      'Looking for a custom design for your ER:LC community? You\'re in the right place.\n' +
      'Our designers create high-quality, tailored liveries, logos, and uniforms — built exactly to your specifications.\n\n' +
      '**What we offer:**\n' +
      '◾  Vehicle Liveries　　◾  Department Logos\n' +
      '◾  Staff Uniforms　　◾  Custom Requests\n\n' +
      '**How it works:**\n' +
      '`1.` Click **Open a Ticket** and fill out the form\n' +
      '`2.` A designer will review your request and reach out\n' +
      '`3.` Confirm your design and complete payment\n' +
      '`4.` Receive your finished design\n\n' +
      '⏱  **Avg. turnaround:** 24–72 hours\n' +
      '📋  Review our **Terms** before opening a ticket\n' +
      '🖼  Check our **Portfolio** to see past work'
    )
    .setFooter({ text: `${serverName} • Design Request Center` })
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
    new ButtonBuilder()
      .setCustomId('purchase_view_portfolio')
      .setLabel('Portfolio')
      .setEmoji('🖼')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

function buildSupportPanel() {
  const embed = new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle(`🎧  ${serverName.toUpperCase()}  |  Support`)
    .setDescription(
      'Having an issue with an order or need to get in touch with staff? Open a ticket below.\n' +
      'All support is handled privately — your ticket is only visible to you and our staff team.\n\n' +
      '**When to open a ticket:**\n' +
      '◾  Issue with a design order or delivery\n' +
      '◾  Payment dispute or question\n' +
      '◾  Designer communication issue\n' +
      '◾  General question for staff\n' +
      '◾  Report a community issue\n\n' +
      '**What to expect:**\n' +
      '`•` Staff typically respond within **a few hours**\n' +
      '`•` Be ready to provide your Roblox username and order details\n' +
      '`•` Keep all communication in the ticket — do not DM staff\n\n' +
      '⚠️  Misuse of the ticket system may result in a warning or ban.'
    )
    .setFooter({ text: `${serverName} • Support Center` })
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
  const modal = new ModalBuilder()
    .setCustomId('purchase_ticket_modal')
    .setTitle('Design Request');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('roblox_username')
        .setLabel('Roblox Username')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. LibertyPlayer123')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('design_type')
        .setLabel('Design Type')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Livery, Logo, Uniform, Custom')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('department')
        .setLabel('Server / Department')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Liberty County Sheriff')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe your design in detail — colors, text, badges, layout, references, etc.')
        .setRequired(true)
        .setMaxLength(1000)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('budget')
        .setLabel('Budget (in Robux)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 500 Robux')
        .setRequired(true)
    ),
  );

  return modal;
}

function buildSupportModal() {
  const modal = new ModalBuilder()
    .setCustomId('support_ticket_modal')
    .setTitle('Support Request');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('subject')
        .setLabel('Subject')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Brief summary of your issue')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe your issue in as much detail as possible...')
        .setRequired(true)
        .setMaxLength(1000)
    ),
  );

  return modal;
}

function buildPurchaseTicketEmbed(fields, user) {
  return new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('📋  NEW DESIGN REQUEST')
    .addFields(
      { name: 'Roblox Username', value: fields.roblox_username, inline: true },
      { name: 'Design Type', value: fields.design_type, inline: true },
      { name: 'Server / Department', value: fields.department, inline: true },
      { name: 'Description', value: fields.description, inline: false },
      { name: 'Budget', value: fields.budget, inline: true },
      { name: 'Payment Status', value: '🔴  Not yet verified', inline: true },
    )
    .setFooter({ text: `Opened by ${user.tag} • ${serverName}` })
    .setTimestamp();
}

function buildSupportTicketEmbed(fields, user) {
  return new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('🎧  NEW SUPPORT REQUEST')
    .addFields(
      { name: 'Subject', value: fields.subject, inline: false },
      { name: 'Description', value: fields.description, inline: false },
    )
    .setFooter({ text: `Opened by ${user.tag} • ${serverName}` })
    .setTimestamp();
}

function buildPaymentStatusRow(currentStatus) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('payment_red')
      .setLabel('Not Verified')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(currentStatus === 'red'),
    new ButtonBuilder()
      .setCustomId('payment_orange')
      .setLabel('Pending')
      .setEmoji('🟠')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentStatus === 'orange'),
    new ButtonBuilder()
      .setCustomId('payment_green')
      .setLabel('Verified')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success)
      .setDisabled(currentStatus === 'green'),
  );
}

function buildCloseRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
  );
}

async function createPurchaseChannel(interaction, fields) {
  const guild = interaction.guild;
  const user = interaction.user;
  const channelName = `purchase-${fields.roblox_username.toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 90);

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    reason: `Purchase ticket opened by ${user.tag}`,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      {
        id: roles.moderator,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      {
        id: roles.designer,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
    ],
  });

  const infoEmbed = new EmbedBuilder()
    .setColor(colors.primary)
    .setDescription(
      `👋 Hey <@${user.id}>, thanks for opening a design request!\n\n` +
      `Please hang tight — a designer will review your request and reach out shortly.\n` +
      `Our team typically responds within **24–72 hours**.\n\n` +
      `Feel free to add any reference images, links, or extra details below.\n\n` +
      `*Staff: use the payment status buttons to track this ticket.*`
    )
    .setFooter({ text: `${serverName} • Design Tickets` });

  const requestEmbed = buildPurchaseTicketEmbed(fields, user);
  const paymentRow = buildPaymentStatusRow('red');
  const closeRow = buildCloseRow();

  await ticketChannel.send({ embeds: [infoEmbed, requestEmbed], components: [paymentRow, closeRow] });

  return ticketChannel;
}

async function createSupportChannel(interaction, fields) {
  const guild = interaction.guild;
  const user = interaction.user;
  const channelName = `support-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`.slice(0, 90);

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    reason: `Support ticket opened by ${user.tag}`,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      {
        id: roles.moderator,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
        ],
      },
    ],
  });

  const infoEmbed = new EmbedBuilder()
    .setColor(colors.dark)
    .setDescription(
      `👋 Hey <@${user.id}>, your support ticket has been created!\n\n` +
      `A staff member will be with you shortly. In the meantime:\n` +
      `• Provide any screenshots or additional context below\n` +
      `• Keep all communication in this channel\n` +
      `• Do not DM staff directly\n\n` +
      `We aim to respond within a few hours.`
    )
    .setFooter({ text: `${serverName} • Support Tickets` });

  const requestEmbed = buildSupportTicketEmbed(fields, user);
  const closeRow = buildCloseRow();

  await ticketChannel.send({ embeds: [infoEmbed, requestEmbed], components: [closeRow] });

  return ticketChannel;
}

module.exports = {
  buildPurchasePanel,
  buildSupportPanel,
  buildPurchaseModal,
  buildSupportModal,
  buildPaymentStatusRow,
  buildCloseRow,
  buildPurchaseTicketEmbed,
  createPurchaseChannel,
  createSupportChannel,
};
