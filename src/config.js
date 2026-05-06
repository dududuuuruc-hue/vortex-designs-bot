require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  databaseChannelId: process.env.DATABASE_CHANNEL_ID,

  serverName: 'Division One',

  colors: {
    primary: 0x2B5CE6,
    dark: 0x0A0A0A,
    light: 0xF0F4FF,
    red: 0xE53E3E,
    orange: 0xED8936,
    green: 0x38A169,
    yellow: 0xF6C90E,
    white: 0xFFFFFF,
  },

  roles: {
    founder: process.env.ROLE_FOUNDER || null,
    admin: process.env.ROLE_ADMIN || null,
    moderator: process.env.ROLE_MODERATOR || null,
    paymentVerifier: process.env.ROLE_PAYMENT_VERIFIER || null,
    premiumAdvertiser: process.env.ROLE_PREMIUM_ADVERTISER || null,
    verifiedAdvertiser: process.env.ROLE_VERIFIED_ADVERTISER || null,
    partner: process.env.ROLE_PARTNER || null,
    booster: process.env.ROLE_BOOSTER || null,
    communityMemberPlus: process.env.ROLE_CM_PLUS || null,
    communityMember: process.env.ROLE_CM || null,
    verified: process.env.ROLE_VERIFIED || null,
    unverified: process.env.ROLE_UNVERIFIED || null,
    designer: process.env.ROLE_DESIGNER || null,
  },

  channels: {
    general: process.env.CH_GENERAL || null,
    pictures: process.env.CH_PICTURES || null,
    privateServerAds: process.env.CH_PRIVATE_ADS || null,
    resourceSubmissions: process.env.CH_RESOURCE_SUBMISSIONS || null,
    ticketLogs: process.env.CH_TICKET_LOGS || null,
    shop: process.env.CH_SHOP || null,
    supportTicket: process.env.CH_SUPPORT_TICKET || null,
    botCommands: process.env.CH_BOT_COMMANDS || null,
    portfolio: process.env.CH_PORTFOLIO || null,
    purchaseTerms: process.env.CH_PURCHASE_TERMS || null,
    paymentVerifierPanel: process.env.CH_PAYMENT_VERIFIER_PANEL || null,
    wrongMemberCountLogs: process.env.CH_WRONG_MEMBER_COUNT_LOGS || null,
    staffChat: process.env.CH_STAFF_CHAT || null,
    staffGuide: process.env.CH_STAFF_GUIDE || null,
    paidAdChannelsCategory: process.env.CAT_PAID_AD_CHANNELS || null,
    freeAdChannelsCategory: process.env.CAT_FREE_AD_CHANNELS || null,
  },

  milestones: {
    messageCount: 20,
    membershipMinutes: 10,
  },

  adChannelTiers: [
    { label: '1–50 Members', min: 1, max: 50 },
    { label: '50–100 Members', min: 50, max: 100 },
    { label: '100–200 Members', min: 100, max: 200 },
    { label: '200–400 Members', min: 200, max: 400 },
    { label: '400–800 Members', min: 400, max: 800 },
    { label: '800–1,200 Members', min: 800, max: 1200 },
    { label: '1,200–1,600 Members', min: 1200, max: 1600 },
    { label: '1,600–2,000 Members', min: 1600, max: 2000 },
    { label: '2,000–3,000 Members', min: 2000, max: 3000 },
    { label: '3,000–5,000 Members', min: 3000, max: 5000 },
    { label: '5,000–7,000 Members', min: 5000, max: 7000 },
    { label: '7,000+ Members', min: 7000, max: Infinity },
  ],

  paidChannelPricing: [
    { days: 10, robux: 190 },
    { days: 20, robux: 280 },
    { days: 30, robux: 360 },
    { days: 365, robux: 3600 },
  ],

  stickyChannels: {},
};
