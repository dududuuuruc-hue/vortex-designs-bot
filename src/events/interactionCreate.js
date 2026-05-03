const { MessageFlags, EmbedBuilder } = require('discord.js');
const { colors, channels, roles, serverName } = require('../config');
const {
  buildPurchaseModal,
  buildSupportModal,
  buildPaymentStatusRow,
  buildCloseRow,
  createPurchaseChannel,
  createSupportChannel,
} = require('../utils/tickets');
const { postTranscript } = require('../utils/transcript');

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

async function handleButton(interaction, client) {
  const { customId } = interaction;

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
          .setTitle('📋  Purchase Terms')
          .setDescription(`Please review our full purchase terms in <#${channels.purchaseTerms}>.`)
          .setFooter({ text: serverName })
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
          .setTitle('🖼  Portfolio')
          .setDescription(`Browse our past work in <#${channels.portfolio}>.`)
          .setFooter({ text: serverName })
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId === 'sticky_how_to_send') {
    const { milestones } = require('../config');
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(colors.primary)
          .setTitle('🔒  How to Unlock This Channel')
          .setDescription(
            `This channel requires the **Community Member+** role.\n\n` +
            `**Requirements:**\n` +
            `• Send **${milestones.messageCount}+ genuine messages** in the server\n` +
            `• Be a member for **${milestones.membershipDays}+ days**\n\n` +
            `⚠️  Bot commands and spam are automatically ignored.\n` +
            `Engage in real conversations in <#${channels.general}> to build your count.`
          )
          .setFooter({ text: `${serverName} • Community Roles` })
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (['payment_red', 'payment_orange', 'payment_green'].includes(customId)) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isStaff = member.roles.cache.has(roles.moderator) || interaction.member.permissions.has('ManageChannels');
    if (!isStaff) {
      await interaction.reply({ content: 'Only staff can update the payment status.', flags: MessageFlags.Ephemeral });
      return;
    }

    const statusKey = customId.split('_')[1];
    const statusMap = {
      red: '🔴  Not yet verified',
      orange: '🟠  Payment pending — under review',
      green: '🟢  Payment confirmed and verified',
    };
    const statusLabel = statusMap[statusKey];

    const originalMsg = interaction.message;
    const embedIndex = originalMsg.embeds.findIndex(e => e.title?.includes('DESIGN REQUEST'));

    if (embedIndex >= 0) {
      const updatedEmbed = EmbedBuilder.from(originalMsg.embeds[embedIndex]);
      const fields = updatedEmbed.data.fields || [];
      const paymentIdx = fields.findIndex(f => f.name === 'Payment Status');
      if (paymentIdx >= 0) {
        fields[paymentIdx] = { name: 'Payment Status', value: statusLabel, inline: true };
      } else {
        updatedEmbed.addFields({ name: 'Payment Status', value: statusLabel, inline: true });
      }

      const newEmbeds = [...originalMsg.embeds];
      newEmbeds[embedIndex] = updatedEmbed;

      await originalMsg.edit({
        embeds: newEmbeds,
        components: [buildPaymentStatusRow(statusKey), buildCloseRow()],
      });

      await interaction.reply({
        content: `Payment status updated to **${statusLabel}** by <@${interaction.user.id}>.`,
      });
    } else {
      await interaction.reply({ content: 'Could not find the ticket embed to update.', flags: MessageFlags.Ephemeral });
    }
    return;
  }

  if (customId === 'ticket_close') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isStaff = member.roles.cache.has(roles.moderator) || interaction.member.permissions.has('ManageChannels');
    if (!isStaff) {
      await interaction.reply({ content: 'Only staff can close tickets.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferUpdate();

    const ticketChannel = interaction.channel;
    const isPurchase = ticketChannel.name.startsWith('purchase-');

    const allMessages = await ticketChannel.messages.fetch({ limit: 20 });
    const ticketMsg = allMessages.find(m =>
      m.embeds.some(e => e.title?.includes('DESIGN REQUEST') || e.title?.includes('SUPPORT REQUEST'))
    );

    const ticketEmbed = ticketMsg?.embeds.find(e =>
      e.title?.includes('DESIGN REQUEST') || e.title?.includes('SUPPORT REQUEST')
    );

    const robloxField = ticketEmbed?.fields?.find(f => f.name === 'Roblox Username');
    const paymentField = ticketEmbed?.fields?.find(f => f.name === 'Payment Status');

    const statusToKey = (val) => {
      if (!val) return null;
      if (val.includes('🟢')) return 'green';
      if (val.includes('🟠')) return 'orange';
      return 'red';
    };

    const ticketData = {
      type: isPurchase ? 'purchase' : 'support',
      openedBy: ticketChannel.permissionOverwrites.cache
        .find(o => o.type === 1 && o.id !== interaction.user.id)?.id || interaction.user.id,
      closedBy: interaction.user.id,
      robloxUsername: robloxField?.value,
      paymentStatus: statusToKey(paymentField?.value),
    };

    const closedEmbed = new EmbedBuilder()
      .setColor(colors.red)
      .setTitle('🔒  Ticket Closed')
      .setDescription(
        `This ticket was closed by <@${interaction.user.id}>.\n` +
        `A full transcript has been saved. This channel will be deleted in **5 seconds**.`
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

async function handleModal(interaction, client) {
  const { customId } = interaction;

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
        content: `✅  Your design request has been submitted! Head over to ${ticketChannel} to track your ticket.`,
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
        content: `✅  Your support ticket has been created! Head over to ${ticketChannel} to chat with our team.`,
      });
    } catch (err) {
      console.error('[Ticket] Failed to create support channel:', err);
      await interaction.editReply({ content: 'Failed to create your ticket. Please try again or contact staff.' });
    }
  }
}
