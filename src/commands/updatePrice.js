const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update-price')
    .setDescription('Update the shop panel pricing, Roblox pass link and merch link.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('roblox_pass')
        .setDescription('Roblox gamepass URL for payment (leave blank to keep current)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('merch_link')
        .setDescription('Merch store link (leave blank to keep current)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('price_10')
        .setDescription('Override real price for 10 days (default: 190)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('price_20')
        .setDescription('Override real price for 20 days (default: 280)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('price_30')
        .setDescription('Override real price for 30 days (default: 360)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('price_365')
        .setDescription('Override real price for 365 days (default: 3600)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const { readRecord, writeRecord } = require('../utils/database');
    const { MessageFlags } = require('discord.js');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const robloxPass = interaction.options.getString('roblox_pass');
    const merchLink  = interaction.options.getString('merch_link');
    const price10    = interaction.options.getInteger('price_10');
    const price20    = interaction.options.getInteger('price_20');
    const price30    = interaction.options.getInteger('price_30');
    const price365   = interaction.options.getInteger('price_365');

    const existing = await readRecord(client, 'SHOPCONFIG') || {};
    if (robloxPass !== null) existing.robloxPassUrl = robloxPass;
    if (merchLink  !== null) existing.merchUrl      = merchLink;
    if (price10    !== null) existing.price10        = price10;
    if (price20    !== null) existing.price20        = price20;
    if (price30    !== null) existing.price30        = price30;
    if (price365   !== null) existing.price365       = price365;

    await writeRecord(client, 'SHOPCONFIG', existing);

    const { upsertShopPanel } = require('../utils/tickets');
    await upsertShopPanel(client);

    await interaction.editReply({
      content:
        '✅ Shop config updated and panel refreshed.\n\n' +
        `**Roblox Pass:** ${existing.robloxPassUrl || '_not set_'}\n` +
        `**Merch Link:** ${existing.merchUrl || '_not set_'}\n` +
        `**Prices (real):** ${existing.price10 || 190} / ${existing.price20 || 280} / ${existing.price30 || 360} / ${existing.price365 || 3600} Robux`,
    });
  },
};
