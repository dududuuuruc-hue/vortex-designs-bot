const { MessageFlags, EmbedBuilder } = require('discord.js');
const { colors, channels, roles } = require('../config');
const {
  buildPurchaseModal,
  buildSupportModal,
  buildPaymentStatusRow,
  buildCloseRow,
  createPurchaseThread,
  createSupportThread,
} = require('../utils/tickets');
const { postTranscript } = require('../utils/transcript');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Command] Error in /${interaction.commandName}:`, err);
        const msg = { content: 'An error occurred while executing this command.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
      return;
    }

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
          .setFooter({ text: 'Vortex Designs' })
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
          .setFooter({ text: 'Vortex Designs' })
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
            `This channel requires **Community Member+** role.\n\n` +
            `**Requirements:**\n` +
            `• Send **${milestones.messageCount}+ genuine messages** in the server\n` +
            `• Be a member for **${milestones.membershipDays}+ days**\n\n` +
            `⚠️  Bot commands and spam are automatically ignored.\n` +
            `Engage in real conversations in <#${channels.general}> to build your count.`
          )
          .setFooter({ text: 'Vortex Designs • Community Roles' })
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
    const statusMap = { red: '🔴  Not yet verified', orange: '🟠  Payment pending — under review', green: '🟢  Payment confirmed and verified' };
    const statusLabel = statusMap[statusKey];

    const originalMsg = interaction.message;
    const originalEmbed = originalMsg.embeds.find(e => e.title && e.title.includes('DESIGN REQUEST'));

    if (originalEmbed) {
      const { EmbedBuilder } = require('discord.js');
      const updated = EmbedBuilder.from(originalEmbed);
      const fields = updated.data.fields || [];
      const paymentFieldIdx = fields.findIndex(f => f.name === 'Payment Status');
      if (paymentFieldIdx >= 0) {
        fields[paymentFieldIdx] = { name: 'Payment Status', value: statusLabel, inline: true };
      } else {
        updated.addFields({ name: 'Payment Status', value: statusLabel, inline: true });
      }

      const newPaymentRow = buildPaymentStatusRow(statusKey);
      const closeRow = buildCloseRow();

      await originalMsg.edit({ embeds: [originalMsg.embeds[0], updated], components: [newPaymentRow, closeRow] });
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

    const thread = interaction.channel;
    const isPurchase = thread.name.startsWith('purchase-');

    const originalEmbed = interaction.message.embeds.find(e =>
      e.title && (e.title.includes('DESIGN REQUEST') || e.title.includes('SUPPORT REQUEST'))
    );
    const robloxField = originalEmbed?.fields?.find(f => f.name === 'Roblox Username');
    const paymentField = originalEmbed?.fields?.find(f => f.name === 'Payment Status');

    const statusToKey = (val) => {
      if (!val) return null;
      if (val.includes('🟢')) return 'green';
      if (val.includes('🟠')) return 'orange';
      return 'red';
    };

    const ticketData = {
      type: isPurchase ? 'purchase' : 'support',
      openedBy: thread.ownerId || interaction.user.id,
      closedBy: interaction.user.id,
      robloxUsername: robloxField?.value,
      paymentStatus: statusToKey(paymentField?.value),
    };

    await postTranscript(client, thread, ticketData);

    const closedEmbed = new EmbedBuilder()
      .setColor(colors.red)
      .setTitle('🔒  Ticket Closed')
      .setDescription(`This ticket was closed by <@${interaction.user.id}>.\nThis thread will be archived shortly.`)
      .setTimestamp()
      .setFooter({ text: 'Vortex Designs • Support' });

    await thread.send({ embeds: [closedEmbed] });

    setTimeout(async () => {
      try {
        await thread.setArchived(true, 'Ticket closed by staff');
      } catch (_) {}
    }, 3000);
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
      const thread = await createPurchaseThread(interaction, fields);
      await interaction.editReply({
        content: `✅  Your design request has been submitted! Head to ${thread} to track your ticket.`,
      });
    } catch (err) {
      console.error('[Ticket] Failed to create purchase thread:', err);
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
      const thread = await createSupportThread(interaction, fields);
      await interaction.editReply({
        content: `✅  Your support request has been submitted! Head to ${thread} to chat with our team.`,
      });
    } catch (err) {
      console.error('[Ticket] Failed to create support thread:', err);
      await interaction.editReply({ content: 'Failed to create your ticket. Please try again or contact staff.' });
    }
  }
}
