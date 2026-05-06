const { ActivityType } = require('discord.js');
const { postAllStickies } = require('../utils/sticky');
const { buildPurchasePanel, buildSupportPanel } = require('../utils/tickets');
const { readRecord, writeRecord } = require('../utils/database');
const { ensureRoles, ensureChannels, postStaffGuide, postPaymentVerifierPanel } = require('../utils/serverSetup');
const { checkExpiredChannels } = require('../utils/paidChannels');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    client.user.setActivity('Division One', { type: ActivityType.Watching });

    await sleep(2000);
    await runStartup(client);

    setInterval(() => checkExpiredChannels(client, client.guilds.cache.first()), 60 * 60 * 1000);
  },
};

async function runStartup(client) {
  console.log('[Bot] Running startup tasks...');
  const guild = client.guilds.cache.first();
  if (!guild) { console.error('[Bot] No guild found.'); return; }

  try {
    await ensureRoles(guild, client);
    console.log('[Bot] Roles ensured.');
  } catch (err) {
    console.error('[Bot] Role setup error:', err.message);
  }

  await sleep(1000);

  try {
    await ensureChannels(guild, client);
    console.log('[Bot] Channels ensured.');
  } catch (err) {
    console.error('[Bot] Channel setup error:', err.message);
  }

  await sleep(1000);

  const cfg = require('../config');

  const stickyChannels = buildStickyChannels(cfg);

  try {
    await upsertPanel(client, 'shop', cfg.channels.shop, buildPurchasePanel);
  } catch (err) {
    console.error('[Bot] Shop panel error:', err.message);
  }

  await sleep(1000);

  try {
    await upsertPanel(client, 'support', cfg.channels.supportTicket, buildSupportPanel);
  } catch (err) {
    console.error('[Bot] Support panel error:', err.message);
  }

  await sleep(1000);

  try {
    await postPaymentVerifierPanel(client);
  } catch (err) {
    console.error('[Bot] Payment verifier panel error:', err.message);
  }

  await sleep(1000);

  try {
    await postStaffGuide(client);
  } catch (err) {
    console.error('[Bot] Staff guide error:', err.message);
  }

  await sleep(1000);

  if (Object.keys(stickyChannels).length > 0) {
    try {
      await postAllStickies(client, stickyChannels);
      console.log('[Bot] All sticky messages refreshed.');
    } catch (err) {
      console.error('[Bot] Sticky error:', err.message);
    }
  }

  try {
    await checkExpiredChannels(client, guild);
  } catch (err) {
    console.error('[Bot] Expired channel check error:', err.message);
  }

  console.log('[Bot] Startup complete.');
}

function buildStickyChannels(cfg) {
  const map = {};
  const { channels } = cfg;

  if (channels.pictures) {
    map[channels.pictures] = {
      rule: 'This channel is for sharing ERLC & design-related pictures only!',
      restriction: 'Do not post memes, unrelated images, or off-topic content.',
    };
  }
  if (channels.privateServerAds) {
    map[channels.privateServerAds] = {
      rule: 'This channel is for ER:LC private server ads only!',
      restriction: 'Do not post design servers, hubs, services, or anything other than ERLC private roleplay servers.',
    };
  }
  if (channels.resourceSubmissions) {
    map[channels.resourceSubmissions] = {
      rule: 'This channel is for free resource submissions only!',
      restriction: 'Always include proper credits to the original creator when submitting resources.',
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
