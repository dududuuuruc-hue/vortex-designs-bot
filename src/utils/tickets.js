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
const { colors, channels, roles, serverName, prices } = require('../config');
const { getNextOrderId, readRecord, writeRecord } = require('./database');

function priceRow(p, days, label) {
  const real     = p?.real     ?? prices[`days${days}`]?.real     ?? 0;
  const inflated = p?.inflated ?? Math.ceil(real * 1.25);
  const link     = prices[`days${days}`]?.link;
  return `> ~~${inflated.toLocaleString()} Robux~~ → **${real.toLocaleString()} Robux** — [${label}](${link})  🏷️ **20% OFF**`;
}

function buildShopEmbed(shopConfig) {
  const cfg = require('../config');
  const p10  = shopConfig?.price10  ? { real: shopConfig.price10,  inflated: Math.ceil(shopConfig.price10  * 1.25) } : cfg.prices.days10;
  const p20  = shopConfig?.price20  ? { real: shopConfig.price20,  inflated: Math.ceil(shopConfig.price20  * 1.25) } : cfg.prices.days20;
  const p30  = shopConfig?.price30  ? { real: shopConfig.price30,  inflated: Math.ceil(shopConfig.price30  * 1.25) } : cfg.prices.days30;
  const p365 = shopConfig?.price365 ? { real: shopConfig.price365, inflated: Math.ceil(shopConfig.price365 * 1.25) } : cfg.prices.days365;

  let description =
    'Get your own **dedicated ad channel** inside Bulletin — one of the most active advertising servers around.\n' +
    'Your channel is visible to every member, 24/7, with your name on it.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🏷️  **LIMITED TIME — 20% OFF ALL PLANS**\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '**📅  Premium Channel Plans:**\n' +
    `${priceRow(p10,  10,  '10 Days'    )}\n` +
    `${priceRow(p20,  20,  '20 Days'    )}\n` +
    `${priceRow(p30,  30,  '30 Days'    )}\n` +
    `${priceRow(p365, 365, '12 Months'  )}\n\n` +
    '**⚡  Slow Mode Add-on:**\n' +
    `> ~~${cfg.prices.slowmode.inflated} Robux~~ → **${cfg.prices.slowmode.real} Robux** — Remove 30 min from the 1hr slow mode  🏷️ **20% OFF**\n\n` +
    '**✅  What\'s included:**\n' +
    '> Your own named channel in Premium AD Channels\n' +
    '> 1-hour slow mode (can be reduced)\n' +
    '> Full server visibility\n' +
    '> Auto-expiry with renewal reminder DM\n\n' +
    '**📋  How to purchase:**\n' +
    '`1.` Pay via the Roblox links above **first**\n' +
    '`2.` Click **Purchase a Slot** and fill the short form\n' +
    '`3.` Our team will verify your payment and create your channel\n' +
    '`4.` Your channel goes live immediately after verification\n';

  if (shopConfig?.robloxPassUrl) {
    description += `\n**💳  Pay Here:** [Roblox Gamepass](${shopConfig.robloxPassUrl})\n`;
  }
  if (shopConfig?.merchUrl) {
    description += `**🛍️  Merch Store:** [Visit Store](${shopConfig.merchUrl})\n`;
  }

  return new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('BULLETIN  |  Premium Ad Channels')
    .setDescription(description)
    .setFooter({ text: 'Bulletin • Premium Advertising  |  Only staff can close tickets.' })
    .setTimestamp();
}

function buildPurchasePanel(shopConfig) {
  const embed = buildShopEmbed(shopConfig);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('purchase_open_ticket')
      .setLabel('Purchase a Slot')
      .setEmoji('⭐')
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
      'Need help? Open a private ticket below — only you and our staff team can see it.\n\n' +
      '**When to open a ticket:**\n' +
      '> Question about a purchase or your channel\n' +
      '> Reporting an issue or member\n' +
      '> Requesting a slow mode reduction\n' +
      '> Payment dispute or billing enquiry\n' +
      '> Any general query\n\n' +
      '**What to expect:**\n' +
      '> Staff respond within a few hours\n' +
      '> Keep all comms in the ticket — do not DM staff directly\n\n' +
      '*Only staff can close tickets. Misuse may result in a ban.*'
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

async function upsertShopPanel(client) {
  if (!channels.shop) return;
  const shopConfig = await readRecord(client, 'SHOPCONFIG').catch(() => null);
  const panelData  = buildPurchasePanel(shopConfig);
  const existing   = await readRecord(client, 'PANEL:shop').catch(() => null);
  const channel    = await client.channels.fetch(channels.shop);

  if (existing?.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.edit(panelData);
      console.log('[Panel] Updated shop panel.');
      return;
    } catch (_) {}
  }
  const msg = await channel.send(panelData);
  await writeRecord(client, 'PANEL:shop', { messageId: msg.id });
  console.log('[Panel] Posted shop panel.');
}

function buildPurchaseModal() {
  const modal = new ModalBuilder().setCustomId('purchase_ticket_modal').setTitle('Purchase a Premium Channel');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('plan').setLabel('Which plan? (10 / 20 / 30 / 365 days)').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 30').setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_name').setLabel('Your Server Name').setStyle(TextInputStyle.Short).setPlaceholder('e.g. Liberty County Sheriffs Office').setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('invite_link').setLabel('Your Server Invite Link').setStyle(TextInputStyle.Short).setPlaceholder('e.g. discord.gg/example').setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox_username').setLabel('Roblox Username (for payment)').setStyle(TextInputStyle.Short).setPlaceholder('e.g. LibertyPlayer123').setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('extra').setLabel('Slow mode reduction? Anything else?').setStyle(TextInputStyle.Paragraph).setPlaceholder('e.g. Yes, add -30 min slow mode / No').setRequired(false).setMaxLength(400)),
  );
  return modal;
}

function buildSupportModal() {
  const modal = new ModalBuilder().setCustomId('support_ticket_modal').setTitle('Open a Support Ticket');
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
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel_created').setLabel('Was the channel created?').setStyle(TextInputStyle.Short).setPlaceholder('Yes / No / Pending').setRequired(true)),
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
    .setTitle(`PREMIUM CHANNEL REQUEST  —  Order #${orderId}`)
    .addFields(
      { name: 'Order ID',       value: `#${orderId}`,           inline: true  },
      { name: 'Roblox Username',value: fields.roblox_username,  inline: true  },
      { name: 'Plan',           value: `${fields.plan} days`,   inline: true  },
      { name: 'Server Name',    value: fields.server_name,      inline: true  },
      { name: 'Invite Link',    value: fields.invite_link,      inline: true  },
      { name: 'Payment Status', value: '🔴  Not yet verified',  inline: true  },
      { name: 'Extras',         value: fields.extra || 'None',  inline: false },
    )
    .setFooter({ text: `Opened by ${user.tag} • Bulletin` })
    .setTimestamp();
}

function buildSupportTicketEmbed(fields, user) {
  return new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('SUPPORT REQUEST')
    .addFields(
      { name: 'Subject',     value: fields.subject,     inline: false },
      { name: 'Status',      value: '⚪  Open — awaiting staff', inline: true },
      { name: 'Description', value: fields.description, inline: false },
    )
    .setFooter({ text: `Opened by ${user.tag} • Bulletin` })
    .setTimestamp();
}

async function createPurchaseChannel(interaction, fields) {
  const cfg = require('../config');
  const guild = interaction.guild;
  const user  = interaction.user;
  const orderId = await getNextOrderId(interaction.client);
  const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const channelName = `⚪-order-${orderId}-${safeName}`;

  const perms = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
  ];
  if (cfg.roles.moderator) perms.push({ id: cfg.roles.moderator, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });
  if (cfg.roles.admin)     perms.push({ id: cfg.roles.admin,     allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });
  if (cfg.roles.founder)   perms.push({ id: cfg.roles.founder,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: '1500547731184423063',
    reason: `Purchase ticket #${orderId} by ${user.tag}`,
    permissionOverwrites: perms,
  });

  const infoEmbed = new EmbedBuilder()
    .setColor(colors.primary)
    .setDescription(
      `Hey <@${user.id}>, thanks for your purchase request!\n\n` +
      `Your order number is **#${orderId}** — save this for any future support.\n\n` +
      `**⚠️  PAYMENT REQUIRED FIRST**\n` +
      `If you haven't paid yet, please do so using the links in <#${channels.shop}>.\n` +
      `Once paid, please **upload a screenshot of your purchase** here.\n\n` +
      `A staff member will verify your payment and set up your channel shortly.\n\n` +
      `*Only staff can close tickets.*`
    )
    .setFooter({ text: 'Bulletin • Premium Advertising' });

  const requestEmbed = buildPurchaseTicketEmbed(fields, user, orderId);
  await ticketChannel.send({ embeds: [infoEmbed, requestEmbed], components: [buildStatusRow('red'), buildCloseRow()] });
  return ticketChannel;
}

async function createSupportChannel(interaction, fields) {
  const cfg = require('../config');
  const guild = interaction.guild;
  const user  = interaction.user;
  const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const channelName = `⚪-support-${safeName}-${Date.now().toString().slice(-4)}`;

  const perms = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
  ];
  if (cfg.roles.moderator) perms.push({ id: cfg.roles.moderator, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });
  if (cfg.roles.admin)     perms.push({ id: cfg.roles.admin,     allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });
  if (cfg.roles.founder)   perms.push({ id: cfg.roles.founder,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] });

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: '1500547731184423063',
    reason: `Support ticket by ${user.tag}`,
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

const STATUS_EMOJIS = { white: '⚪', red: '🔴', orange: '🟠', green: '🟢' };

module.exports = {
  buildPurchasePanel, buildSupportPanel, buildShopEmbed, upsertShopPanel,
  buildPurchaseModal, buildSupportModal, buildCloseModal,
  buildStatusRow, buildCloseRow,
  buildPurchaseTicketEmbed, buildSupportTicketEmbed,
  createPurchaseChannel, createSupportChannel,
  STATUS_EMOJIS,
};
