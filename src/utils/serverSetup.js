const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { colors, serverName, channels: cfgChannels, adChannelMap, prices } = require('../config');
const { readRecord, writeRecord } = require('./database');

async function postStaffGuide(client) {
  const cfg = require('../config');
  const chId = cfg.channels.staffGuide;
  if (!chId) return;
  const existing = await readRecord(client, 'SETUP:staffGuidePosted').catch(() => null);
  if (existing) return;
  const channel = await client.channels.fetch(chId);

  const embed = new EmbedBuilder()
    .setColor(cfg.colors.primary)
    .setTitle('Bulletin — Staff Handbook')
    .setDescription(
      'Welcome to the Bulletin staff team. Read this thoroughly before taking any action.\n\n' +
      '**— Responsibilities —**\n' +
      '> Monitor all ad channels — remove posts that violate placement rules\n' +
      '> Handle tickets professionally and in a timely manner\n' +
      '> Keep all staff comms inside staff-chat\n' +
      '> Never discuss moderation actions publicly\n' +
      '> Report unusual patterns to Admin or Founder\n\n' +
      '**— Ticket Management —**\n' +
      '> Only Moderator+ can close tickets — openers cannot close their own\n' +
      '> Always complete the closing report accurately when closing\n' +
      '> Use 🔴 🟠 🟢 status buttons to track progress at all times\n' +
      '> Purchase tickets: Moderator and above\n' +
      '> Support tickets: Moderator and above\n\n' +
      '**— Payment Verification —**\n' +
      '> Use the panel in <#' + cfg.channels.paymentVerifierPanel + '> to grant or revoke paid channels\n' +
      '> Always confirm payment with Founder/Admin before granting\n' +
      '> All grants and revocations are logged automatically\n\n' +
      '**— Ad Channel Enforcement —**\n' +
      '> The bot auto-enforces correct member count placements\n' +
      '> Wrong-tier posts are deleted and the user is DM\'d automatically\n' +
      '> All violations are logged in <#' + cfg.channels.wrongMemberCountLogs + '>\n' +
      '> Bot tracks per-user and per-server violation counts in those logs\n' +
      '> If someone bypasses the bot: manually remove, warn in DM, log it\n\n' +
      '**— General Rules —**\n' +
      '> Do not abuse permissions — all actions are logged\n' +
      '> Treat all members with professionalism\n' +
      '> If unsure about a decision, ask in staff-chat first\n' +
      '> Unexplained inactivity may result in role removal'
    )
    .setFooter({ text: 'Bulletin • Staff Operations' })
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
  const panelData = buildPaymentVerifierPanel(cfg);
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

function buildPaymentVerifierPanel(cfg) {
  const p = cfg?.prices || prices;
  const embed = new EmbedBuilder()
    .setColor(colors.orange)
    .setTitle('Payment Verifier Panel')
    .setDescription(
      'Use the buttons below to grant or revoke a user\'s **Premium Ad Channel** after confirming their Robux payment.\n\n' +
      '**💳  Current Pricing (what customer pays):**\n' +
      `> ~~${p.days10.inflated}~~ → **${p.days10.real} Robux** — 10 Days  🏷️ 20% OFF\n` +
      `> ~~${p.days20.inflated}~~ → **${p.days20.real} Robux** — 20 Days  🏷️ 20% OFF\n` +
      `> ~~${p.days30.inflated}~~ → **${p.days30.real} Robux** — 30 Days  🏷️ 20% OFF\n` +
      `> ~~${p.days365.inflated.toLocaleString()}~~ → **${p.days365.real.toLocaleString()} Robux** — 12 Months  🏷️ 20% OFF\n\n` +
      '**⚡  Slow Mode Add-on:**\n' +
      `> ~~${p.slowmode.inflated}~~ → **${p.slowmode.real} Robux** — Remove 30 min from 1hr slow mode\n\n` +
      '⚠️  **Confirm payment with Founder or Admin before granting.** All actions are logged below this panel.'
    )
    .setFooter({ text: 'Bulletin • Payment Verification' })
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

async function postDirectory(client) {
  const cfg = require('../config');
  const chId = cfg.channels.directory;
  if (!chId) return;
  const dbKey = 'SETUP:directory';
  const existing = await readRecord(client, dbKey).catch(() => null);
  if (existing?.messageId) {
    try {
      const ch = await client.channels.fetch(chId);
      await ch.messages.fetch(existing.messageId);
      console.log('[Setup] Directory already posted, skipping.');
      return;
    } catch (_) {}
  }

  const channel = await client.channels.fetch(chId);
  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('BULLETIN  |  Server Directory')
    .setDescription(
      'Welcome to **Bulletin** — your hub for server advertising and community connection.\n' +
      'Use this directory to navigate the server quickly.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '**📌  Information**\n' +
      '> <#1500350260172816406> — Member welcome & intro\n' +
      '> <#1500554760938590238> — Server announcements\n' +
      '> <#1500361629483929722> — Discord rules\n' +
      '> <#1500350260172816407> — You are here!\n' +
      '> <#1500361256681341018> — Purchase terms & refund policy\n\n' +
      '**💬  Community**\n' +
      '> <#1500350260172816409> — General chat\n' +
      '> <#1500350260172816410> — Events & announcements\n' +
      '> <#1500533860826480850> — Media & pictures\n' +
      '> <#1500350260612956210> — Ideas, suggestions & feedback\n' +
      '> <#1500535313183805481> — Bot commands\n\n' +
      '**📢  Free Ad Channels**\n' +
      '> Post your server ad in the channel that matches your member count\n' +
      '> Requires **Community Member+** role (earned automatically after 20 msgs + 10 min)\n' +
      '> Invite link must be included — bot will enforce correct tier placement\n\n' +
      '**⭐  Premium Ad Channels**\n' +
      '> Your own named ad channel — visible to all members\n' +
      '> Open a ticket in <#1500548035749613578> to purchase\n' +
      '> Plans from **190 Robux / 10 days** with 20% off limited-time pricing\n\n' +
      '**🎟️  Support & Shop**\n' +
      '> <#1500548035749613578> — Purchase a premium ad channel slot\n' +
      '> <#1500548607361810643> — Open a support ticket\n\n' +
      '**🔊  Voice Channels**\n' +
      '> Lounge, Community Hangout, Stream Room\n\n' +
      '**🗃️  Free Resources**\n' +
      '> <#1500536259154542612> — Free liveries\n' +
      '> <#1500536366663205037> — Free uniforms\n' +
      '> <#1500536445990076597> — Free logos\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '*Have a question? Open a ticket in <#1500548607361810643>.*'
    )
    .setFooter({ text: 'Bulletin • Server Navigation' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log('[Setup] Directory posted.');
}

async function postPurchaseTerms(client) {
  const cfg = require('../config');
  const chId = cfg.channels.purchaseTerms;
  if (!chId) return;
  const dbKey = 'SETUP:purchaseTerms';
  const existing = await readRecord(client, dbKey).catch(() => null);
  if (existing?.messageId) {
    try {
      const ch = await client.channels.fetch(chId);
      await ch.messages.fetch(existing.messageId);
      console.log('[Setup] Purchase terms already posted, skipping.');
      return;
    } catch (_) {}
  }

  const channel = await client.channels.fetch(chId);
  const embed = new EmbedBuilder()
    .setColor(colors.dark)
    .setTitle('BULLETIN  |  Purchase Terms & Conditions')
    .setDescription(
      'By purchasing any product or service from Bulletin, you agree to the following terms. Please read carefully.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '**1.  Payment**\n' +
      '> All payments are made via Robux through our official Roblox gamepass\n' +
      '> Robux is non-refundable under Roblox\'s Terms of Service\n' +
      '> Do not send Robux through group funds, direct trade, or any other method unless instructed\n' +
      '> All amounts are listed in Robux — no real-money transactions take place\n\n' +
      '**2.  Premium Ad Channels**\n' +
      '> Access is granted manually by our team after payment is confirmed\n' +
      '> Your channel will be created within a reasonable time after payment (usually within 24 hours)\n' +
      '> Your channel expires on the date specified — no automatic extensions\n' +
      '> Expiry dates are final and non-transferable\n\n' +
      '**3.  Refunds**\n' +
      '> Due to the nature of Robux, refunds are not guaranteed\n' +
      '> If your channel was not created within 48 hours of payment, contact staff for a resolution\n' +
      '> Refunds may be considered on a case-by-case basis at the discretion of the Founder\n' +
      '> No refunds for expired plans — it is your responsibility to track your expiry date\n\n' +
      '**4.  Acceptable Use**\n' +
      '> Your ad channel must be used only to advertise your own Discord server\n' +
      '> You may not sell, transfer, or share your channel access with others\n' +
      '> Content posted must comply with Discord\'s Terms of Service and Community Guidelines\n' +
      '> No NSFW, illegal, hateful, or spam content — violations result in immediate revocation with no refund\n\n' +
      '**5.  Revocation**\n' +
      '> Bulletin reserves the right to revoke access at any time for violations of these terms\n' +
      '> Revocations due to violations are non-refundable\n\n' +
      '**6.  Support**\n' +
      '> For any issues, open a ticket in <#1500548607361810643>\n' +
      '> Do not DM staff directly regarding purchases\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '*Last updated: May 2025 • These terms may be updated at any time.*'
    )
    .setFooter({ text: 'Bulletin • Purchase Terms' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log('[Setup] Purchase terms posted.');
}

async function postDiscordRules(client) {
  const cfg = require('../config');
  const chId = cfg.channels.discordRules;
  if (!chId) return;
  const dbKey = 'SETUP:discordRules';
  const existing = await readRecord(client, dbKey).catch(() => null);
  if (existing?.messageId) {
    try {
      const ch = await client.channels.fetch(chId);
      await ch.messages.fetch(existing.messageId);
      console.log('[Setup] Discord rules already posted, skipping.');
      return;
    } catch (_) {}
  }

  const channel = await client.channels.fetch(chId);
  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('BULLETIN  |  Server Rules')
    .setDescription(
      'By being in this server, you agree to abide by all rules below.\n' +
      'Ignorance of the rules is not an excuse. Violations result in warns, mutes, kicks, or bans.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '**`01`  Respect Everyone**\n' +
      '> Treat all members with basic respect. Harassment, insults, discrimination, or targeted hate of any kind is strictly prohibited.\n\n' +
      '**`02`  No Spam or Flooding**\n' +
      '> Do not send repeated messages, excessive pings, or meaningless content. One message is enough.\n\n' +
      '**`03`  Use Channels Correctly**\n' +
      '> Post in the correct channel for your content. Off-topic messages may be deleted without warning.\n\n' +
      '**`04`  English Only in Main Channels**\n' +
      '> All public chat must be in English. Other languages in DMs or designated channels only.\n\n' +
      '**`05`  No NSFW or Inappropriate Content**\n' +
      '> NSFW content, graphic violence, or anything inappropriate is an immediate ban.\n\n' +
      '**`06`  No Advertising Without Permission**\n' +
      '> Use the designated ad channels with a valid invite link. Advertising in DMs or wrong channels is prohibited.\n\n' +
      '**`07`  No Ad Channel Abuse**\n' +
      '> Post only in the ad channel that matches your server\'s member count. The bot enforces this automatically.\n\n' +
      '**`08`  No Impersonation**\n' +
      '> Do not impersonate other members, staff, or public figures.\n\n' +
      '**`09`  No Raiding or Inviting Raiders**\n' +
      '> Coordinated raids, invite flooding, or inciting others to raid is an immediate ban.\n\n' +
      '**`10`  Follow Discord\'s ToS**\n' +
      '> You must comply with [Discord\'s Terms of Service](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines) at all times.\n\n' +
      '**`11`  Staff Decisions Are Final**\n' +
      '> Do not argue with staff in public channels. If you believe a decision is wrong, open a support ticket.\n\n' +
      '**`12`  No DM Advertising**\n' +
      '> Unsolicited DMs to server members for advertising or any promotional purpose are not allowed.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '*Bulletin staff have discretion to enforce rules case-by-case. Punishment is proportional to severity.*'
    )
    .setFooter({ text: 'Bulletin • Rules  |  Last updated May 2025' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await writeRecord(client, dbKey, { messageId: msg.id });
  console.log('[Setup] Discord rules posted.');
}

async function postAdChannelEmbeds(client) {
  const cfg = require('../config');
  for (const [channelId, tier] of Object.entries(cfg.adChannelMap)) {
    const dbKey = `ADCH_EMBED:${channelId}`;
    const existing = await readRecord(client, dbKey).catch(() => null);
    try {
      const channel = await client.channels.fetch(channelId);

      if (existing?.messageId) {
        try {
          const msg = await channel.messages.fetch(existing.messageId);
          await msg.edit({ embeds: [buildAdChannelEmbed(tier, cfg)] });
          await new Promise(r => setTimeout(r, 600));
          continue;
        } catch (_) {}
      }

      const msg = await channel.send({ embeds: [buildAdChannelEmbed(tier, cfg)] });
      await writeRecord(client, dbKey, { messageId: msg.id });
      await new Promise(r => setTimeout(r, 800));
      console.log(`[Setup] Ad channel embed posted in #${channel.name}`);
    } catch (err) {
      console.error(`[Setup] Failed to post ad embed in ${channelId}:`, err.message);
    }
  }
}

function buildAdChannelEmbed(tier, cfg) {
  const nextTier = tier.max === Infinity ? null : tier.max;
  return new EmbedBuilder()
    .setColor(cfg.colors.primary)
    .setTitle(`📣  ${tier.label} — Ad Channel`)
    .setDescription(
      `This channel is for advertising **Discord servers with ${tier.label.toLowerCase()}**.\n\n` +
      '**✅  Requirements:**\n' +
      '> You must have the **Community Member+** role\n' +
      `> Your server must have between **${tier.min.toLocaleString()}** and **${tier.max === Infinity ? '∞' : tier.max.toLocaleString()}** members\n` +
      '> Your message **must include a Discord invite link** (discord.gg/...)\n\n' +
      '**⚠️  Important Rules:**\n' +
      '> Only post in the channel matching your server\'s member count\n' +
      '> Do not post server ads in any other channel\n' +
      '> Do not spam — one ad per slow mode window\n' +
      '> Do not edit posts to include invite links after the bot checks them\n\n' +
      '**🚫  Automatic Enforcement:**\n' +
      '> Posts without an invite link are **deleted** — you will be DM\'d\n' +
      '> Posts in the wrong tier are **deleted** and logged — you will be directed to the correct channel\n' +
      '> Repeated violations are tracked and reported to staff\n\n' +
      '**⭐  Want unlimited ad posting?**\n' +
      `> Purchase a **Premium Ad Channel** in <#${cfg.channels.shop}> — your own dedicated channel from 190 Robux (20% OFF).`
    )
    .setFooter({ text: 'Bulletin • Free Ad Channels  |  Bot enforced' });
}

module.exports = {
  postStaffGuide,
  postPaymentVerifierPanel,
  postDirectory,
  postPurchaseTerms,
  postDiscordRules,
  postAdChannelEmbeds,
};
