const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { colors, serverName } = require('../config');

async function generateTranscript(channel) {
  const allMessages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;
    allMessages.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  let text = `TRANSCRIPT — ${channel.name}\n`;
  text += `Channel: ${channel.name} | ID: ${channel.id}\n`;
  text += `Opened: ${channel.createdAt.toUTCString()}\n`;
  text += `Closed: ${new Date().toUTCString()}\n`;
  text += '='.repeat(60) + '\n\n';

  for (const msg of allMessages) {
    if (msg.author.bot && msg.content.startsWith('KEY:')) continue;
    const time = msg.createdAt.toUTCString();
    const author = `${msg.author.tag} (${msg.author.id})`;
    text += `[${time}] ${author}\n`;
    if (msg.content) text += `  ${msg.content}\n`;
    if (msg.embeds.length) {
      for (const embed of msg.embeds) {
        if (embed.title) text += `  [EMBED] ${embed.title}\n`;
        if (embed.description) text += `  ${embed.description}\n`;
        for (const field of embed.fields || []) {
          text += `  ${field.name}: ${field.value}\n`;
        }
      }
    }
    if (msg.attachments.size) {
      for (const att of msg.attachments.values()) {
        text += `  [ATTACHMENT] ${att.name}: ${att.url}\n`;
      }
    }
    text += '\n';
  }

  return text;
}

async function postTranscript(client, channel, ticketData) {
  const cfg = require('../config');
  const logChannelId = cfg.channels.ticketLogs;
  if (!logChannelId) return;

  const logChannel = await client.channels.fetch(logChannelId);
  if (!logChannel) return;

  const transcriptText = await generateTranscript(channel);
  const buffer = Buffer.from(transcriptText, 'utf-8');
  const fileName = `transcript-${channel.name}-${Date.now()}.txt`;
  const attachment = new AttachmentBuilder(buffer, { name: fileName });

  const isPurchase = ticketData.type === 'purchase';
  const statusMap = { red: '🔴 Not Verified', orange: '🟠 Pending', green: '🟢 Verified' };

  const summaryEmbed = new EmbedBuilder()
    .setColor(isPurchase ? colors.primary : colors.dark)
    .setTitle(`Ticket Closed — ${channel.name}`)
    .addFields(
      { name: 'Type', value: isPurchase ? 'Design Request' : 'Support', inline: true },
      { name: 'Opened By', value: `<@${ticketData.openedBy}>`, inline: true },
      { name: 'Closed By', value: ticketData.closedBy ? `<@${ticketData.closedBy}>` : 'System', inline: true },
      { name: 'Duration', value: formatDuration(channel.createdAt, new Date()), inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `${serverName} • Ticket Logs` });

  if (ticketData.orderId) {
    summaryEmbed.addFields({ name: 'Order ID', value: ticketData.orderId, inline: true });
  }
  if (ticketData.robloxUsername) {
    summaryEmbed.addFields({ name: 'Roblox Username', value: ticketData.robloxUsername, inline: true });
  }
  if (ticketData.paymentStatus) {
    summaryEmbed.addFields({ name: 'Final Status', value: statusMap[ticketData.paymentStatus] || 'Unknown', inline: true });
  }

  if (ticketData.closingReport) {
    const r = ticketData.closingReport;
    summaryEmbed.addFields({ name: '\u200B', value: '— Staff Closing Report —', inline: false });

    if (isPurchase) {
      summaryEmbed.addFields(
        { name: 'Payment Completed?', value: r.paymentCompleted || 'N/A', inline: true },
        { name: 'Design Delivered?', value: r.designDelivered || 'N/A', inline: true },
        { name: 'Closing Notes', value: r.closeNotes || 'None', inline: false },
      );
    } else {
      summaryEmbed.addFields(
        { name: 'Issue Resolved?', value: r.issueResolved || 'N/A', inline: true },
        { name: 'Closing Notes', value: r.closeNotes || 'None', inline: false },
      );
    }
  }

  await logChannel.send({ embeds: [summaryEmbed], files: [attachment] });
}

function formatDuration(start, end) {
  const ms = end - start;
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

module.exports = { generateTranscript, postTranscript };
