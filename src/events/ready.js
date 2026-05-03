const { ActivityType } = require('discord.js');
const { postAllStickies } = require('../utils/sticky');
const { buildPurchasePanel, buildSupportPanel } = require('../utils/tickets');
const { readRecord, writeRecord } = require('../utils/database');
const { stickyChannels, channels } = require('../config');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    client.user.setActivity('Division One', { type: ActivityType.Watching });

    await new Promise(r => setTimeout(r, 2000));
    await runStartup(client);
  },
};

async function runStartup(client) {
  console.log('[Bot] Running startup tasks...');

  try {
    await upsertPanel(client, 'shop', channels.shop, buildPurchasePanel);
  } catch (err) {
    console.error('[Bot] Shop panel error:', err.message);
  }

  await new Promise(r => setTimeout(r, 1000));

  try {
    await upsertPanel(client, 'support', channels.supportTicket, buildSupportPanel);
  } catch (err) {
    console.error('[Bot] Support panel error:', err.message);
  }

  await new Promise(r => setTimeout(r, 1000));

  try {
    await postAllStickies(client, stickyChannels);
    console.log('[Bot] All sticky messages refreshed.');
  } catch (err) {
    console.error('[Bot] Sticky error:', err.message);
  }

  console.log('[Bot] Startup complete.');
}

async function upsertPanel(client, key, channelId, buildFn) {
  const dbKey = `PANEL:${key}`;
  const existing = await readRecord(client, dbKey);
  const channel = await client.channels.fetch(channelId);
  const panelData = buildFn();

  if (existing?.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.edit(panelData);
      console.log(`[Panel] Updated existing ${key} panel (${existing.messageId})`);
      return;
    } catch (_) {
      console.log(`[Panel] ${key} panel message gone, reposting.`);
    }
  }

  const msg = await channel.send(panelData);
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log(`[Panel] Posted new ${key} panel (${msg.id})`);
}
