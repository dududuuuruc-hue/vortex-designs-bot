const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { buildPurchasePanel, buildSupportPanel } = require('../utils/tickets');
const { postAllStickies } = require('../utils/sticky');
const { stickyChannels, channels } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post or refresh bot panels and sticky messages (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('all').setDescription('Post all panels and sticky messages')
    )
    .addSubcommand(sub =>
      sub.setName('shop').setDescription('Post the purchase/design panel in the shop channel')
    )
    .addSubcommand(sub =>
      sub.setName('support').setDescription('Post the support panel in the support channel')
    )
    .addSubcommand(sub =>
      sub.setName('stickies').setDescription('Refresh all sticky messages')
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    try {
      if (sub === 'all' || sub === 'shop') {
        const shopChannel = await client.channels.fetch(channels.shop);
        await shopChannel.send(buildPurchasePanel());
      }

      if (sub === 'all' || sub === 'support') {
        const supportChannel = await client.channels.fetch(channels.supportTicket);
        await supportChannel.send(buildSupportPanel());
      }

      if (sub === 'all' || sub === 'stickies') {
        await postAllStickies(client, stickyChannels);
      }

      await interaction.editReply({ content: `✅  Done! \`/setup ${sub}\` completed successfully.` });
    } catch (err) {
      console.error('[Setup] Error:', err);
      await interaction.editReply({ content: `❌  An error occurred: ${err.message}` });
    }
  },
};
