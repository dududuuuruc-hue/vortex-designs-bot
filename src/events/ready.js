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
    await ensurePanel(client, 'shop', channels.shop, buildPurchasePanel);
  } catch (err) {
    console.error('[Bot] Shop panel error:', err.message);
  }

  await new Promise(r => setTimeout(r, 1000));

  try {
    await ensurePanel(client, 'support', channels.supportTicket, buildSupportPanel);
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

async function ensurePanel(client, key, channelId, buildFn) {
  const dbKey = `PANEL:${key}`;
  const existing = await readRecord(client, dbKey);

  if (existing?.messageId) {
    try {
      const channel = await client.channels.fetch(channelId);
      await channel.messages.fetch(existing.messageId);
      console.log(`[Panel] ${key} panel already exists, skipping.`);
      return;
    } catch (_) {
      console.log(`[Panel] ${key} panel message gone, reposting.`);
    }
  }

  const channel = await client.channels.fetch(channelId);

  const panelData = buildFn();
  const msg = await channel.send(panelData);
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log(`[Panel] Posted ${key} panel (${msg.id})`);
}
