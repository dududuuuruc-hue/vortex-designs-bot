const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

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

  let text = `TRANSCRIPT — ${channel.name}\nOpened: ${channel.createdAt.toUTCString()}\nClosed: ${new Date().toUTCString()}\n${'='.repeat(60)}\n\n`;
  for (const msg of allMessages) {
    if (msg.author.bot && msg.content.startsWith('KEY:')) continue;
    text += `[${msg.createdAt.toUTCString()}] ${msg.author.tag} (${msg.author.id})\n`;
    if (msg.content) text += `  ${msg.content}\n`;
    for (const embed of msg.embeds) {
      if (embed.title) text += `  [EMBED] ${embed.title}\n`;
      if (embed.description) text += `  ${embed.description}\n`;
      for (const f of embed.fields || []) text += `  ${f.name}: ${f.value}\n`;
    }
    for (const att of msg.attachments.values()) text += `  [ATTACHMENT] ${att.name}: ${att.url}\n`;
    text += '\n';
  }
  return text;
}

async function postTranscript(client, channel, ticketData) {
  const cfg = require('../config');
  if (!cfg.channels.ticketLogs) return;
  const logChannel = await client.channels.fetch(cfg.channels.ticketLogs);
  if (!logChannel) return;

  const transcriptText = await generateTranscript(channel);
  const buffer = Buffer.from(transcriptText, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}-${Date.now()}.txt` });

  const isPurchase = ticketData.type === 'purchase';
  const statusMap = { red: '🔴 Not Verified', orange: '🟠 Pending', green: '🟢 Verified' };

  const embed = new EmbedBuilder()
    .setColor(isPurchase ? cfg.colors.primary : cfg.colors.dark)
    .setTitle(`Ticket Closed — ${channel.name}`)
    .addFields(
      { name: 'Type', value: isPurchase ? 'Design Request' : 'Support', inline: true },
      { name: 'Opened By', value: `<@${ticketData.openedBy}>`, inline: true },
      { name: 'Closed By', value: ticketData.closedBy ? `<@${ticketData.closedBy}>` : 'System', inline: true },
      { name: 'Duration', value: formatDuration(channel.createdAt, new Date()), inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Bulletin • Ticket Logs' });

  if (ticketData.orderId) embed.addFields({ name: 'Order ID', value: ticketData.orderId, inline: true });
  if (ticketData.robloxUsername) embed.addFields({ name: 'Roblox Username', value: ticketData.robloxUsername, inline: true });
  if (ticketData.paymentStatus) embed.addFields({ name: 'Final Status', value: statusMap[ticketData.paymentStatus] || 'Unknown', inline: true });

  if (ticketData.closingReport) {
    const r = ticketData.closingReport;
    embed.addFields({ name: '\u200B', value: '— Staff Closing Report —', inline: false });
    if (isPurchase) {
      embed.addFields({ name: 'Payment Completed?', value: r.paymentCompleted || 'N/A', inline: true }, { name: 'Design Delivered?', value: r.designDelivered || 'N/A', inline: true }, { name: 'Closing Notes', value: r.closeNotes || 'None', inline: false });
    } else {
      embed.addFields({ name: 'Issue Resolved?', value: r.issueResolved || 'N/A', inline: true }, { name: 'Closing Notes', value: r.closeNotes || 'None', inline: false });
    }
  }

  await logChannel.send({ embeds: [embed], files: [attachment] });
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
