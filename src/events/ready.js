const { ActivityType } = require('discord.js');
const { postAllStickies } = require('../utils/sticky');
const { buildPurchasePanel, buildSupportPanel } = require('../utils/tickets');
const { readRecord, writeRecord } = require('../utils/database');
const { postStaffGuide, postPaymentVerifierPanel } = require('../utils/serverSetup');
const { checkExpiredChannels } = require('../utils/paidChannels');
const { channels, stickyChannels: staticSticky } = require('../config');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    client.user.setActivity('Bulletin', { type: ActivityType.Watching });
    await sleep(2000);
    await runStartup(client);
    setInterval(() => {
      const guild = client.guilds.cache.first();
      if (guild) checkExpiredChannels(client, guild).catch(console.error);
    }, 60 * 60 * 1000);
  },
};

async function runStartup(client) {
  console.log('[Bot] Running startup tasks...');

  try {
    await upsertPanel(client, 'shop', channels.shop, buildPurchasePanel);
  } catch (err) { console.error('[Bot] Shop panel error:', err.message); }

  await sleep(1000);

  try {
    await upsertPanel(client, 'support', channels.supportTicket, buildSupportPanel);
  } catch (err) { console.error('[Bot] Support panel error:', err.message); }

  await sleep(1000);

  try {
    await postPaymentVerifierPanel(client);
  } catch (err) { console.error('[Bot] Payment verifier panel error:', err.message); }

  await sleep(1000);

  try {
    await postStaffGuide(client);
  } catch (err) { console.error('[Bot] Staff guide error:', err.message); }

  await sleep(1000);

  const stickyMap = buildStickyMap();
  if (Object.keys(stickyMap).length > 0) {
    try {
      await postAllStickies(client, stickyMap);
      console.log('[Bot] Sticky messages refreshed.');
    } catch (err) { console.error('[Bot] Sticky error:', err.message); }
  }

  try {
    const guild = client.guilds.cache.first();
    if (guild) await checkExpiredChannels(client, guild);
  } catch (err) { console.error('[Bot] Expired channel check error:', err.message); }

  console.log('[Bot] Startup complete.');
}

function buildStickyMap() {
  const cfg = require('../config');
  const map = {};
  if (cfg.channels.pictures) {
    map[cfg.channels.pictures] = {
      rule: 'This channel is for sharing ERLC & design-related pictures only!',
      restriction: 'Do not post memes, unrelated images, or off-topic content.',
    };
  }
  if (cfg.channels.freeLiveries) {
    map[cfg.channels.freeLiveries] = {
      rule: 'This channel is for sharing free liveries only!',
      restriction: 'Always credit the original creator. Only post liveries you made or have permission to share.',
    };
  }
  if (cfg.channels.freeUniforms) {
    map[cfg.channels.freeUniforms] = {
      rule: 'This channel is for sharing free uniforms only!',
      restriction: 'Always credit the original creator. Only post uniforms you made or have permission to share.',
    };
  }
  if (cfg.channels.freeLogos) {
    map[cfg.channels.freeLogos] = {
      rule: 'This channel is for sharing free logos only!',
      restriction: 'Always credit the original creator. Only post logos you made or have permission to share.',
    };
  }
  return map;
}

async function upsertPanel(client, key, channelId, buildFn) {
  if (!channelId) return;
  const dbKey = `PANEL:${key}`;
  const existing = await readRecord(client, dbKey);
  const channel = await client.channels.fetch(channelId);
  const panelData = buildFn();

  if (existing?.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.edit(panelData);
      console.log(`[Panel] Updated ${key} panel.`);
      return;
    } catch (_) {
      console.log(`[Panel] ${key} panel gone, reposting.`);
    }
  }

  const msg = await channel.send(panelData);
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log(`[Panel] Posted ${key} panel (${msg.id})`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
