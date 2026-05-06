const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { colors, serverName } = require('../config');
const { readRecord, writeRecord } = require('./database');

const ROLE_DEFINITIONS = [
  { key: 'founder',            name: 'Founder',             color: 0xFFD700, hoist: true  },
  { key: 'admin',              name: 'Admin',               color: 0xE53E3E, hoist: true  },
  { key: 'moderator',         name: 'Moderator',           color: 0x2B5CE6, hoist: true  },
  { key: 'paymentVerifier',   name: 'Payment Verifier',    color: 0xED8936, hoist: true  },
  { key: 'premiumAdvertiser', name: 'Premium Advertiser',  color: 0xF6C90E, hoist: true  },
  { key: 'verifiedAdvertiser',name: 'Verified Advertiser', color: 0x38A169, hoist: false },
  { key: 'partner',           name: 'Partner',             color: 0x9B59B6, hoist: false },
  { key: 'booster',           name: 'Server Booster',      color: 0xFF73FA, hoist: false },
  { key: 'communityMemberPlus',name: 'Community Member+',  color: 0x2B5CE6, hoist: false },
  { key: 'communityMember',   name: 'Community Member',    color: 0x99AAB5, hoist: false },
  { key: 'verified',          name: 'Verified',            color: 0x57F287, hoist: false },
  { key: 'unverified',        name: 'Unverified',          color: 0x95A5A6, hoist: false },
];

function perms(id, type, flags) {
  if (!id) return null;
  return { id, [type]: flags };
}

function buildOverwrites(...entries) {
  return entries.filter(Boolean);
}

async function ensureRoles(guild, client) {
  const cfg = require('../config');
  const record = await readRecord(client, 'SETUP:roles').catch(() => null);
  const roleMap = record || {};

  for (const def of ROLE_DEFINITIONS) {
    if (cfg.roles[def.key]) {
      try {
        await guild.roles.fetch(cfg.roles[def.key]);
        roleMap[def.key] = cfg.roles[def.key];
        continue;
      } catch (_) {}
    }

    if (roleMap[def.key]) {
      try {
        await guild.roles.fetch(roleMap[def.key]);
        cfg.roles[def.key] = roleMap[def.key];
        continue;
      } catch (_) {}
    }

    const role = await guild.roles.create({
      name: def.name,
      color: def.color,
      hoist: def.hoist,
      reason: 'Division One Bot — auto role setup',
    });
    roleMap[def.key] = role.id;
    cfg.roles[def.key] = role.id;
    console.log(`[Setup] Created role: ${def.name} (${role.id})`);
    await sleep(500);
  }

  await writeRecord(client, 'SETUP:roles', roleMap);
  return roleMap;
}

async function ensureChannels(guild, client) {
  const cfg = require('../config');
  const record = await readRecord(client, 'SETUP:channels').catch(() => null);
  const chMap = record || {};

  const everyoneId = guild.id;
  const r = cfg.roles;

  const staffView = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.AttachFiles,
  ];

  const readOnly = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory];

  async function getOrCreateCategory(key, name) {
    const existingId = chMap[key] || cfg.channels[key];
    if (existingId) {
      try {
        await guild.channels.fetch(existingId);
        chMap[key] = existingId;
        cfg.channels[key] = existingId;
        return existingId;
      } catch (_) {}
    }
    const cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Division One Bot — auto setup' });
    chMap[key] = cat.id;
    cfg.channels[key] = cat.id;
    console.log(`[Setup] Created category: ${name} (${cat.id})`);
    await sleep(500);
    return cat.id;
  }

  async function getOrCreateChannel(key, name, opts = {}) {
    const existingId = chMap[key] || cfg.channels[key];
    if (existingId) {
      try {
        await guild.channels.fetch(existingId);
        chMap[key] = existingId;
        cfg.channels[key] = existingId;
        return existingId;
      } catch (_) {}
    }
    const ch = await guild.channels.create({ name, type: ChannelType.GuildText, reason: 'Division One Bot — auto setup', ...opts });
    chMap[key] = ch.id;
    cfg.channels[key] = ch.id;
    console.log(`[Setup] Created channel: ${name} (${ch.id})`);
    await sleep(500);
    return ch.id;
  }

  const staffCatId  = await getOrCreateCategory('staffCategory',           '🔒 Staff');
  const freeAdCatId = await getOrCreateCategory('freeAdChannelsCategory',  '📢 Free Ad Channels');
  const paidAdCatId = await getOrCreateCategory('paidAdChannelsCategory',  '⭐ Premium Ad Channels');

  await getOrCreateChannel('staffChat', '💬│staff-chat', {
    parent: staffCatId,
    permissionOverwrites: buildOverwrites(
      { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
      perms(r.moderator,       'allow', staffView),
      perms(r.admin,           'allow', staffView),
      perms(r.founder,         'allow', staffView),
      perms(r.paymentVerifier, 'allow', staffView),
    ),
  });

  await getOrCreateChannel('staffGuide', '📖│staff-guide', {
    parent: staffCatId,
    permissionOverwrites: buildOverwrites(
      { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
      perms(r.moderator,       'allow', readOnly),
      perms(r.admin,           'allow', staffView),
      perms(r.founder,         'allow', staffView),
      perms(r.paymentVerifier, 'allow', readOnly),
    ),
  });

  await getOrCreateChannel('ticketLogs', '📋│ticket-logs', {
    parent: staffCatId,
    permissionOverwrites: buildOverwrites(
      { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
      perms(r.moderator, 'allow', readOnly),
      perms(r.admin,     'allow', staffView),
      perms(r.founder,   'allow', staffView),
    ),
  });

  await getOrCreateChannel('wrongMemberCountLogs', '⚠️│wrong-member-count-logs', {
    parent: staffCatId,
    permissionOverwrites: buildOverwrites(
      { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
      perms(r.moderator, 'allow', readOnly),
      perms(r.admin,     'allow', staffView),
      perms(r.founder,   'allow', staffView),
    ),
  });

  await getOrCreateChannel('paymentVerifierPanel', '💳│payment-verifier-panel', {
    parent: staffCatId,
    permissionOverwrites: buildOverwrites(
      { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
      perms(r.paymentVerifier, 'allow', staffView),
      perms(r.admin,           'allow', staffView),
      perms(r.founder,         'allow', staffView),
    ),
  });

  const adPostPerms = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
  ];

  const adTiers = [
    { key: 'adCh_1_50',     name: '📣│1-50-members'    },
    { key: 'adCh_50_100',   name: '📣│50-100-members'   },
    { key: 'adCh_100_200',  name: '📣│100-200-members'  },
    { key: 'adCh_200_400',  name: '📣│200-400-members'  },
    { key: 'adCh_400_800',  name: '📣│400-800-members'  },
    { key: 'adCh_800_1200', name: '📣│800-1200-members' },
    { key: 'adCh_1200_1600',name: '📣│1200-1600-members'},
    { key: 'adCh_1600_2000',name: '📣│1600-2000-members'},
    { key: 'adCh_2000_3000',name: '📣│2000-3000-members'},
    { key: 'adCh_3000_5000',name: '📣│3000-5000-members'},
    { key: 'adCh_5000_7000',name: '📣│5000-7000-members'},
    { key: 'adCh_7000_plus',name: '📣│7000-plus-members'},
  ];

  for (const tier of adTiers) {
    await getOrCreateChannel(tier.key, tier.name, {
      parent: freeAdCatId,
      rateLimitPerUser: 21600,
      permissionOverwrites: buildOverwrites(
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        perms(r.communityMemberPlus, 'allow', adPostPerms),
        perms(r.premiumAdvertiser,   'allow', adPostPerms),
        perms(r.moderator,  'allow', staffView),
        perms(r.admin,      'allow', staffView),
        perms(r.founder,    'allow', staffView),
      ),
    });
  }

  await writeRecord(client, 'SETUP:channels', chMap);
  return chMap;
}

async function postStaffGuide(client) {
  const cfg = require('../config');
  const chId = cfg.channels.staffGuide;
  if (!chId) return;

  const existing = await readRecord(client, 'SETUP:staffGuidePosted').catch(() => null);
  if (existing) return;

  const channel = await client.channels.fetch(chId);

  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('Division One — Staff Guide')
    .setDescription(
      'Welcome to the Division One staff team. This guide covers your responsibilities, tools, and expectations.\n\n' +
      '**— Core Responsibilities —**\n' +
      '> Monitor all ad channels and remove posts that violate placement rules\n' +
      '> Handle support and purchase tickets in a professional, timely manner\n' +
      '> Keep all staff communication in staff-chat\n' +
      '> Never discuss moderation actions publicly\n\n' +
      '**— Ticket Management —**\n' +
      '> Only staff (Moderator+) can close tickets — ticket openers cannot close their own tickets\n' +
      '> Always fill in the closing report honestly when closing a ticket\n' +
      '> Use the Red/Orange/Green status buttons to update ticket progress\n' +
      '> Shop tickets: Moderator and Designer can both see and respond\n' +
      '> Support tickets: Moderator only\n\n' +
      '**— Payment Verification —**\n' +
      '> Payment Verifiers use the panel in payment-verifier-panel to grant paid channel access\n' +
      '> Always confirm payment with the founder or admin before granting access\n' +
      '> Log everything — the panel does this automatically\n\n' +
      '**— Ad Channel Enforcement —**\n' +
      '> The bot auto-enforces correct member count channels\n' +
      '> Wrong-channel posts are auto-deleted and the user is DM\'d with the correct channel\n' +
      '> All violations are logged in wrong-member-count-logs\n' +
      '> If someone bypasses the bot, manually remove the post and warn the user\n\n' +
      '**— General Rules —**\n' +
      '> Do not abuse your permissions — all actions are logged\n' +
      '> Treat all members respectfully at all times\n' +
      '> If unsure about a decision, ask in staff-chat before acting\n' +
      '> Inactivity without notice may result in role removal'
    )
    .setFooter({ text: 'Division One • Staff Operations' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await writeRecord(client, 'SETUP:staffGuidePosted', { posted: true });
  console.log('[Setup] Staff guide posted.');
}

async function postPaymentVerifierPanel(client) {
  const cfg = require('../config');
  const chId = cfg.channels.paymentVerifierPanel;
  if (!chId) return;

  const dbKey = 'PANEL:paymentVerifier';
  const existing = await readRecord(client, dbKey).catch(() => null);
  const channel = await client.channels.fetch(chId);
  const panelData = buildPaymentVerifierPanel();

  if (existing?.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.edit(panelData);
      console.log('[Setup] Updated payment verifier panel.');
      return;
    } catch (_) {}
  }

  const msg = await channel.send(panelData);
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log('[Setup] Posted payment verifier panel.');
}

function buildPaymentVerifierPanel() {
  const embed = new EmbedBuilder()
    .setColor(colors.orange)
    .setTitle('Payment Verifier Panel')
    .setDescription(
      'Use the buttons below to grant a user their **Paid Ad Channel** after confirming their Robux payment.\n\n' +
      '**Pricing Reference:**\n' +
      '> `190 Robux` → 10 days of private ad channel\n' +
      '> `280 Robux` → 20 days of private ad channel\n' +
      '> `360 Robux` → 30 days of private ad channel\n' +
      '> `3,600 Robux` → 12 months of private ad channel\n\n' +
      '**Slow Mode Add-on:**\n' +
      '> `60 Robux` → Remove 30 minutes from the 1-hour slow mode (minimum 30 min)\n\n' +
      '⚠️  Only grant access after the founder or admin confirms payment.\n' +
      'All grants are logged automatically below this message.'
    )
    .setFooter({ text: 'Division One • Payment Verification' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pv_grant_channel')
      .setLabel('Grant Paid Channel')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('pv_revoke_channel')
      .setLabel('Revoke Access')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { ensureRoles, ensureChannels, postStaffGuide, postPaymentVerifierPanel };
