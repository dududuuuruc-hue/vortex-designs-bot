const { ActivityType, REST, Routes } = require('discord.js');
const { upsertShopPanel, buildSupportPanel } = require('../utils/tickets');
const { readRecord, writeRecord } = require('../utils/database');
const { postStaffGuide, postPaymentVerifierPanel, postDirectory, postPurchaseTerms, postDiscordRules, postAdChannelEmbeds } = require('../utils/serverSetup');
const { checkExpiredChannels } = require('../utils/paidChannels');
const { postAllStickies } = require('../utils/sticky');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    client.user.setActivity('Bulletin', { type: ActivityType.Watching });

    await sleep(2000);

    try { await deployCommands(); } catch (err) { console.error('[Commands] Deploy error:', err.message); }

    await runStartup(client);

    setInterval(() => {
      const guild = client.guilds.cache.first();
      if (guild) checkExpiredChannels(client, guild).catch(console.error);
    }, 60 * 60 * 1000);
  },
};

async function deployCommands() {
  const fs   = require('fs');
  const path = require('path');
  const cfg  = require('../config');
  if (!cfg.token || !cfg.clientId || !cfg.guildId) return;

  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(path.join(commandsPath, file));
    if (cmd.data) commands.push(cmd.data.toJSON());
  }

  const rest = new REST().setToken(cfg.token);
  await rest.put(Routes.applicationGuildCommands(cfg.clientId, cfg.guildId), { body: commands });
  console.log(`[Commands] Registered ${commands.length} slash command(s).`);
}

async function runStartup(client) {
  console.log('[Bot] Running startup tasks...');

  try { await upsertShopPanel(client); }
  catch (err) { console.error('[Bot] Shop panel error:', err.message); }
  await sleep(1000);

  try {
    const cfg = require('../config');
    const { buildSupportPanel: sp } = require('../utils/tickets');
    await upsertPanel(client, 'support', cfg.channels.supportTicket, sp);
  } catch (err) { console.error('[Bot] Support panel error:', err.message); }
  await sleep(1000);

  try { await postPaymentVerifierPanel(client); }
  catch (err) { console.error('[Bot] PV panel error:', err.message); }
  await sleep(1000);

  try { await postStaffGuide(client); }
  catch (err) { console.error('[Bot] Staff guide error:', err.message); }
  await sleep(1000);

  try { await postDirectory(client); }
  catch (err) { console.error('[Bot] Directory error:', err.message); }
  await sleep(800);

  try { await postPurchaseTerms(client); }
  catch (err) { console.error('[Bot] Purchase terms error:', err.message); }
  await sleep(800);

  try { await postDiscordRules(client); }
  catch (err) { console.error('[Bot] Discord rules error:', err.message); }
  await sleep(800);

  try { await postAdChannelEmbeds(client); }
  catch (err) { console.error('[Bot] Ad channel embeds error:', err.message); }
  await sleep(800);

  const stickyMap = buildStickyMap();
  if (Object.keys(stickyMap).length > 0) {
    try { await postAllStickies(client, stickyMap); console.log('[Bot] Sticky messages refreshed.'); }
    catch (err) { console.error('[Bot] Sticky error:', err.message); }
  }

  try {
    const guild = client.guilds.cache.first();
    if (guild) await checkExpiredChannels(client, guild);
  } catch (err) { console.error('[Bot] Expired check error:', err.message); }

  console.log('[Bot] Startup complete.');
}

function buildStickyMap() {
  const cfg = require('../config');
  const map = {};
  if (cfg.channels.pictures)     map[cfg.channels.pictures]     = { rule: 'This channel is for sharing ERLC & design-related pictures only!',     restriction: 'Do not post memes, unrelated images, or off-topic content.' };
  if (cfg.channels.freeLiveries) map[cfg.channels.freeLiveries] = { rule: 'This channel is for sharing free liveries only!',                       restriction: 'Always credit the original creator. Only post liveries you made or have permission to share.' };
  if (cfg.channels.freeUniforms) map[cfg.channels.freeUniforms] = { rule: 'This channel is for sharing free uniforms only!',                       restriction: 'Always credit the original creator. Only post uniforms you made or have permission to share.' };
  if (cfg.channels.freeLogos)    map[cfg.channels.freeLogos]    = { rule: 'This channel is for sharing free logos only!',                          restriction: 'Always credit the original creator. Only post logos you made or have permission to share.' };
  return map;
}

async function upsertPanel(client, key, channelId, buildFn) {
  if (!channelId) return;
  const dbKey   = `PANEL:${key}`;
  const existing = await readRecord(client, dbKey);
  const channel  = await client.channels.fetch(channelId);
  const panelData = buildFn();

  if (existing?.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.edit(panelData);
      console.log(`[Panel] Updated ${key} panel.`);
      return;
    } catch (_) { console.log(`[Panel] ${key} panel gone, reposting.`); }
  }

  const msg = await channel.send(panelData);
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log(`[Panel] Posted ${key} panel.`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
