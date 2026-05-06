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
    founder:            process.env.ROLE_FOUNDER            || null,
    admin:              process.env.ROLE_ADMIN               || null,
    moderator:          process.env.ROLE_MODERATOR           || '1500515372305092618',
    paymentVerifier:    process.env.ROLE_PAYMENT_VERIFIER    || null,
    premiumAdvertiser:  process.env.ROLE_PREMIUM_ADVERTISER  || null,
    verifiedAdvertiser: process.env.ROLE_VERIFIED_ADVERTISER || null,
    partner:            process.env.ROLE_PARTNER             || null,
    booster:            process.env.ROLE_BOOSTER             || null,
    communityMemberPlus:process.env.ROLE_CM_PLUS             || '1500514698758459562',
    communityMember:    process.env.ROLE_CM                  || '1500514565773987882',
    verified:           process.env.ROLE_VERIFIED            || '1500514378699767808',
    unverified:         process.env.ROLE_UNVERIFIED          || '1500514306733899881',
    designer:           process.env.ROLE_DESIGNER            || '1500543046054580394',
  },

  channels: {
    general:              process.env.CH_GENERAL               || '1500350260172816409',
    pictures:             process.env.CH_PICTURES              || '1500533860826480850',
    privateServerAds:     process.env.CH_PRIVATE_ADS           || '1500539570016747571',
    resourceSubmissions:  process.env.CH_RESOURCE_SUBMISSIONS  || '1500536540487487640',
    ticketLogs:           process.env.CH_TICKET_LOGS           || '1500515275467128883',
    shop:                 process.env.CH_SHOP                  || '1500548035749613578',
    supportTicket:        process.env.CH_SUPPORT_TICKET        || '1500548607361810643',
    botCommands:          process.env.CH_BOT_COMMANDS          || '1500535313183805481',
    portfolio:            process.env.CH_PORTFOLIO             || '1500539937349439518',
    purchaseTerms:        process.env.CH_PURCHASE_TERMS        || '1500361256681341018',
    paymentVerifierPanel: process.env.CH_PAYMENT_VERIFIER_PANEL || null,
    wrongMemberCountLogs: process.env.CH_WRONG_MEMBER_COUNT_LOGS || null,
    staffChat:            process.env.CH_STAFF_CHAT            || null,
    staffGuide:           process.env.CH_STAFF_GUIDE           || null,
    paidAdChannelsCategory: process.env.CAT_PAID_AD_CHANNELS  || null,
    freeAdChannelsCategory: process.env.CAT_FREE_AD_CHANNELS  || null,
  },

  milestones: {
    messageCount: 20,
    membershipMinutes: 10,
  },

  adChannelTiers: [
    { label: '1–50 Members',        min: 1,    max: 50   },
    { label: '50–100 Members',      min: 50,   max: 100  },
    { label: '100–200 Members',     min: 100,  max: 200  },
    { label: '200–400 Members',     min: 200,  max: 400  },
    { label: '400–800 Members',     min: 400,  max: 800  },
    { label: '800–1,200 Members',   min: 800,  max: 1200 },
    { label: '1,200–1,600 Members', min: 1200, max: 1600 },
    { label: '1,600–2,000 Members', min: 1600, max: 2000 },
    { label: '2,000–3,000 Members', min: 2000, max: 3000 },
    { label: '3,000–5,000 Members', min: 3000, max: 5000 },
    { label: '5,000–7,000 Members', min: 5000, max: 7000 },
    { label: '7,000+ Members',      min: 7000, max: Infinity },
  ],

  paidChannelPricing: [
    { days: 10,  robux: 190  },
    { days: 20,  robux: 280  },
    { days: 30,  robux: 360  },
    { days: 365, robux: 3600 },
  ],

  stickyChannels: {},
};
