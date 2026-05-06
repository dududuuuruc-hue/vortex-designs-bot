const { MessageFlags, EmbedBuilder } = require('discord.js');
const { colors, channels, roles, serverName, milestones } = require('../config');
const {
  buildPurchaseModal,
  buildSupportModal,
  buildCloseModal,
  buildStatusRow,
  buildCloseRow,
  createPurchaseChannel,
  createSupportChannel,
  STATUS_EMOJIS,
} = require('../utils/tickets');
const { postTranscript } = require('../utils/transcript');
const { buildGrantModal, buildRevokeModal, handleGrantModal, handleRevokeModal } = require('../utils/paidChannels');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isButton()) {
      await handleButton(interaction, client);
      return;
    }
    if (interaction.isModalSubmit()) {
      await handleModal(interaction, client);
      return;
    }
  },
};

function isStaffMember(member) {
  const r = require('../config').roles;
  return (
    member.roles.cache.has(r.moderator) ||
    member.roles.cache.has(r.admin) ||
    member.roles.cache.has(r.founder) ||
    member.roles.cache.has(r.designer) ||
    member.permissions.has('ManageChannels')
  );
}

function isPaymentVerifier(member) {
  const r = require('../config').roles;
  return (
    member.roles.cache.has(r.paymentVerifier) ||
    member.roles.cache.has(r.admin) ||
    member.roles.cache.has(r.founder)
  );
}

function isPurchaseChannel(channel) {
  return channel.name.includes('-order-');
}

async function updateChannelStatus(channel, statusKey) {
  const emojiMap = { red: '🔴', orange: '🟠', green: '🟢', white: '⚪' };
  const newEmoji = emojiMap[statusKey] || '⚪';
  const currentName = channel.name;
  const withoutEmoji = currentName.replace(/^(⚪|🔴|🟠|🟢)-/, '');
  try {
    await channel.setName(`${newEmoji}-${withoutEmoji}`);
  } catch (_) {}
}

async function handleButton(interaction, client) {
  const { customId } = interaction;
  const cfg = require('../config');

  if (customId === 'purchase_open_ticket') {
    await interaction.showModal(buildPurchaseModal());
    return;
  }

  if (customId === 'support_open_ticket') {
    await interaction.showModal(buildSupportModal());
    return;
  }

  if (customId === 'purchase_view_terms') {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(colors.primary)
          .setTitle('Purchase Terms')
          .setDescription(`Please review our full purchase terms in <#${channels.purchaseTerms}>.`)
          .setFooter({ text: serverName }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId === 'purchase_view_portfolio') {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(colors.primary)
          .setTitle('Portfolio')
          .setDescription(`Browse our past work in <#${channels.portfolio}>.`)
          .setFooter({ text: serverName }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId === 'sticky_how_to_send') {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(colors.primary)
          .setTitle('How to Unlock This Channel')
          .setDescription(
            `This channel requires the **Community Member+** role.\n\n` +
            `**Requirements:**\n` +
            `> Send **${milestones.messageCount}+ genuine messages** in the server\n` +
            `> Be a member for **${milestones.membershipMinutes}+ minutes**\n\n` +
            `Bot commands and spam are automatically ignored.\n` +
            `Engage in real conversations in <#${channels.general}> to build your count.`
          )
          .setFooter({ text: `${serverName} • Community Roles` }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId === 'pv_grant_channel') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isPaymentVerifier(member)) {
      await interaction.reply({ content: 'Only Payment Verifiers can use this panel.', flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.showModal(buildGrantModal());
    return;
  }

  if (customId === 'pv_revoke_channel') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isPaymentVerifier(member)) {
      await interaction.reply({ content: 'Only Payment Verifiers can use this panel.', flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.showModal(buildRevokeModal());
    return;
  }

  if (['status_red', 'status_orange', 'status_green'].includes(customId)) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isStaffMember(member)) {
      await interaction.reply({ content: 'Only staff can update the ticket status.', flags: MessageFlags.Ephemeral });
      return;
    }

    const statusKey = customId.split('_')[1];
    const isPurchase = isPurchaseChannel(interaction.channel);

    const statusLabels = {
      red: isPurchase ? '🔴  Not yet verified' : '🔴  Awaiting staff response',
      orange: isPurchase ? '🟠  Payment pending — under review' : '🟠  In progress',
      green: isPurchase ? '🟢  Payment confirmed and verified' : '🟢  Resolved',
    };
    const statusLabel = statusLabels[statusKey];
    const fieldName = isPurchase ? 'Payment Status' : 'Status';

    const originalMsg = interaction.message;
    const embedIndex = originalMsg.embeds.findIndex(e =>
      e.title?.includes('DESIGN REQUEST') || e.title?.includes('SUPPORT REQUEST') || e.title?.includes('AD CHANNEL CLAIM')
    );

    if (embedIndex >= 0) {
      const updatedEmbed = EmbedBuilder.from(originalMsg.embeds[embedIndex]);
      const fields = updatedEmbed.data.fields || [];
      const fieldIdx = fields.findIndex(f => f.name === fieldName);
      if (fieldIdx >= 0) {
        fields[fieldIdx] = { name: fieldName, value: statusLabel, inline: true };
      } else {
        updatedEmbed.addFields({ name: fieldName, value: statusLabel, inline: true });
      }

      const newEmbeds = [...originalMsg.embeds];
      newEmbeds[embedIndex] = updatedEmbed;

      await originalMsg.edit({
        embeds: newEmbeds,
        components: [buildStatusRow(statusKey), buildCloseRow()],
      });

      await updateChannelStatus(interaction.channel, statusKey);

      await interaction.reply({
        content: `Status updated to **${statusLabel}** by <@${interaction.user.id}>.`,
      });
    } else {
      await interaction.reply({ content: 'Could not find the ticket embed to update.', flags: MessageFlags.Ephemeral });
    }
    return;
  }

  if (customId === 'ticket_close') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isStaffMember(member)) {
      await interaction.reply({
        content: 'Only staff can close tickets.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const isPurchase = isPurchaseChannel(interaction.channel);
    await interaction.showModal(buildCloseModal(isPurchase));
    return;
  }
}

async function handleModal(interaction, client) {
  const { customId } = interaction;

  if (customId === 'pv_grant_modal') {
    await handleGrantModal(interaction, client);
    return;
  }

  if (customId === 'pv_revoke_modal') {
    await handleRevokeModal(interaction, client);
    return;
  }

  if (customId === 'purchase_ticket_modal') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const fields = {
      roblox_username: interaction.fields.getTextInputValue('roblox_username'),
      design_type: interaction.fields.getTextInputValue('design_type'),
      department: interaction.fields.getTextInputValue('department'),
      description: interaction.fields.getTextInputValue('description'),
      budget: interaction.fields.getTextInputValue('budget'),
    };
    try {
      const ticketChannel = await createPurchaseChannel(interaction, fields);
      await interaction.editReply({
        content: `Your design request has been submitted! Head over to ${ticketChannel} to track your ticket.`,
      });
    } catch (err) {
      console.error('[Ticket] Failed to create purchase channel:', err);
      await interaction.editReply({ content: 'Failed to create your ticket. Please try again or contact staff.' });
    }
    return;
  }

  if (customId === 'support_ticket_modal') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const fields = {
      subject: interaction.fields.getTextInputValue('subject'),
      description: interaction.fields.getTextInputValue('description'),
    };
    try {
      const ticketChannel = await createSupportChannel(interaction, fields);
      await interaction.editReply({
        content: `Your support ticket has been created! Head over to ${ticketChannel} to chat with our team.`,
      });
    } catch (err) {
      console.error('[Ticket] Failed to create support channel:', err);
      await interaction.editReply({ content: 'Failed to create your ticket. Please try again or contact staff.' });
    }
    return;
  }

  if (customId === 'close_modal_purchase' || customId === 'close_modal_support') {
    await interaction.deferUpdate();

    const isPurchase = customId === 'close_modal_purchase';
    const ticketChannel = interaction.channel;

    let closingReport;
    if (isPurchase) {
      const paymentCompleted = interaction.fields.getTextInputValue('payment_completed');
      const designDelivered = interaction.fields.getTextInputValue('design_delivered');
      const closeNotes = interaction.fields.getTextInputValue('close_notes') || 'None';
      closingReport = { paymentCompleted, designDelivered, closeNotes };
    } else {
      const issueResolved = interaction.fields.getTextInputValue('issue_resolved');
      const closeNotes = interaction.fields.getTextInputValue('close_notes') || 'None';
      closingReport = { issueResolved, closeNotes };
    }

    const allMessages = await ticketChannel.messages.fetch({ limit: 20 });
    const ticketMsg = allMessages.find(m =>
      m.embeds.some(e =>
        e.title?.includes('DESIGN REQUEST') ||
        e.title?.includes('SUPPORT REQUEST') ||
        e.title?.includes('AD CHANNEL CLAIM')
      )
    );
    const ticketEmbed = ticketMsg?.embeds.find(e =>
      e.title?.includes('DESIGN REQUEST') || e.title?.includes('SUPPORT REQUEST') || e.title?.includes('AD CHANNEL CLAIM')
    );

    const robloxField = ticketEmbed?.fields?.find(f => f.name === 'Roblox Username');
    const orderField = ticketEmbed?.fields?.find(f => f.name === 'Order ID');
    const paymentField = ticketEmbed?.fields?.find(f => f.name === 'Payment Status');
    const statusField = ticketEmbed?.fields?.find(f => f.name === 'Status');

    const statusToKey = (val) => {
      if (!val) return null;
      if (val.includes('🟢')) return 'green';
      if (val.includes('🟠')) return 'orange';
      return 'red';
    };

    const ticketData = {
      type: isPurchase ? 'purchase' : 'support',
      openedBy: ticketChannel.permissionOverwrites.cache
        .find(o => o.type === 1 && o.id !== interaction.user.id)?.id || 'Unknown',
      closedBy: interaction.user.id,
      robloxUsername: robloxField?.value,
      orderId: orderField?.value,
      paymentStatus: statusToKey(paymentField?.value || statusField?.value),
      closingReport,
    };

    const { colors, serverName } = require('../config');
    const { EmbedBuilder } = require('discord.js');

    const closedEmbed = new EmbedBuilder()
      .setColor(colors.red)
      .setTitle('Ticket Closed')
      .setDescription(
        `This ticket was closed by <@${interaction.user.id}>.\n` +
        `A full transcript has been saved to the logs. This channel will be deleted in **5 seconds**.`
      )
      .setTimestamp()
      .setFooter({ text: `${serverName} • Support` });

    await ticketChannel.send({ embeds: [closedEmbed] });

    try {
      await postTranscript(client, ticketChannel, ticketData);
    } catch (err) {
      console.error('[Transcript] Failed to post transcript:', err.message);
    }

    setTimeout(async () => {
      try {
        await ticketChannel.delete('Ticket closed by staff');
      } catch (err) {
        console.error('[Ticket] Failed to delete channel:', err.message);
      }
    }, 5000);
  }
}
