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
const { colors, channels, roles } = require('../config');

function buildPurchasePanel() {
  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('🎨  VORTEX DESIGNS  |  Custom Design Studio')
    .setDescription(
      'Welcome to the official design request center.\n' +
      'We craft high-quality liveries, logos, and uniforms for ERLC communities — fast, affordable, and built to your exact spec.\n\n' +
      '◾  Liveries　　◾  Logos\n◾  Uniforms　　◾  Custom Requests\n\n' +
      '⏱  **Avg. turnaround:** 24–72 hours\n' +
      '💎  **Starting from:** 200 Robux\n' +
      '✅  **Community-trusted designs**'
    )
    .setFooter({ text: 'Vortex Designs • Design Request Center' })
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
    .setTitle('🎧  VORTEX DESIGNS  |  Support Center')
    .setDescription(
      'Need help with an order, a delivery issue, or have a question?\n' +
      'Open a support ticket and our team will get back to you as soon as possible.\n\n' +
      '◾  Order issues\n◾  Delivery questions\n◾  General enquiries\n◾  Disputes\n\n' +
      '⚠️  Please **do not DM staff** — all support is handled through tickets.'
    )
    .setFooter({ text: 'Vortex Designs • Support Center' })
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
        .setPlaceholder('Describe your design in detail — colors, text, badge, layout, etc.')
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
        .setPlaceholder('Describe your issue in detail...')
        .setRequired(true)
        .setMaxLength(1000)
    ),
  );

  return modal;
}

function buildPurchaseTicketEmbed(fields, user) {
  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('📋  NEW DESIGN REQUEST')
    .addFields(
      { name: 'Roblox Username', value: fields.roblox_username, inline: true },
      { name: 'Design Type', value: fields.design_type, inline: true },
      { name: 'Server / Department', value: fields.department, inline: true },
      { name: 'Description', value: fields.description, inline: false },
      { name: 'Budget', value: fields.budget, inline: true },
    )
    .addFields({ name: 'Payment Status', value: '🔴  Not yet verified', inline: true })
    .setFooter({ text: `Opened by ${user.tag}` })
    .setTimestamp();

  return embed;
}

function buildSupportTicketEmbed(fields, user) {
  const embed = new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('🎧  NEW SUPPORT REQUEST')
    .addFields(
      { name: 'Subject', value: fields.subject, inline: false },
      { name: 'Description', value: fields.description, inline: false },
    )
    .setFooter({ text: `Opened by ${user.tag}` })
    .setTimestamp();

  return embed;
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

async function createPurchaseThread(interaction, fields) {
  const channel = await interaction.client.channels.fetch(channels.shop);
  const user = interaction.user;
  const threadName = `purchase-${fields.roblox_username}-${user.username}`.slice(0, 100);

  const thread = await channel.threads.create({
    name: threadName,
    type: ChannelType.PrivateThread,
    reason: `Purchase ticket opened by ${user.tag}`,
    invitable: false,
  });

  await thread.members.add(user.id);

  const embed = buildPurchaseTicketEmbed(fields, user);
  const paymentRow = buildPaymentStatusRow('red');
  const closeRow = buildCloseRow();

  const infoEmbed = new EmbedBuilder()
    .setColor(colors.primary)
    .setDescription(
      `👋 Hey <@${user.id}>, thanks for opening a design request!\n\n` +
      `A member of our team will review your request shortly.\n` +
      `Please be patient — our designers typically respond within **24–72 hours**.\n\n` +
      `*Staff: Use the payment status buttons below to update this ticket.*`
    );

  await thread.send({ embeds: [infoEmbed, embed], components: [paymentRow, closeRow] });

  return thread;
}

async function createSupportThread(interaction, fields) {
  const channel = await interaction.client.channels.fetch(channels.supportTicket);
  const user = interaction.user;
  const threadName = `support-${user.username}-${Date.now().toString().slice(-4)}`.slice(0, 100);

  const thread = await channel.threads.create({
    name: threadName,
    type: ChannelType.PrivateThread,
    reason: `Support ticket opened by ${user.tag}`,
    invitable: false,
  });

  await thread.members.add(user.id);

  const embed = buildSupportTicketEmbed(fields, user);
  const closeRow = buildCloseRow();

  const infoEmbed = new EmbedBuilder()
    .setColor(colors.dark)
    .setDescription(
      `👋 Hey <@${user.id}>, your support request has been received!\n\n` +
      `A staff member will be with you shortly.\n` +
      `Please provide any additional details in this thread.`
    );

  await thread.send({ embeds: [infoEmbed, embed], components: [closeRow] });

  return thread;
}

module.exports = {
  buildPurchasePanel,
  buildSupportPanel,
  buildPurchaseModal,
  buildSupportModal,
  buildPaymentStatusRow,
  buildCloseRow,
  buildPurchaseTicketEmbed,
  createPurchaseThread,
  createSupportThread,
};
