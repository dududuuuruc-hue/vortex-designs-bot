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
  },

  roles: {
    unverified: '1500514306733899881',
    verified: '1500514378699767808',
    communityMember: '1500514565773987882',
    communityMemberPlus: '1500514698758459562',
    moderator: '1500515372305092618',
    designer: '1500543046054580394',
  },

  channels: {
    pictures: '1500533860826480850',
    privateServerAds: '1500539570016747571',
    resourceSubmissions: '1500536540487487640',
    ticketLogs: '1500515275467128883',
    shop: '1500548035749613578',
    supportTicket: '1500548607361810643',
    botCommands: '1500535313183805481',
    portfolio: '1500539937349439518',
    purchaseTerms: '1500361256681341018',
    general: '1500350260172816409',
  },

  milestones: {
    messageCount: 50,
    membershipDays: 2,
  },

  stickyChannels: {
    '1500533860826480850': {
      rule: 'This channel is for sharing **ERLC & design-related pictures only!**',
      restriction: 'Do not post memes, unrelated images, or off-topic content.',
    },
    '1500539570016747571': {
      rule: 'This channel is for **ER:LC private server ads only!**',
      restriction: 'Do not post design servers, hubs, services, or anything other than ERLC private roleplay servers.',
    },
    '1500536540487487640': {
      rule: 'This channel is for **free resource submissions only!**',
      restriction: 'Always include proper credits to the original creator when submitting resources.',
    },
  },
};
