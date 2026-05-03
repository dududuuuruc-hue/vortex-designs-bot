const { roles } = require('../config');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    const hadVerified = oldMember.roles.cache.has(roles.verified);
    const hasVerified = newMember.roles.cache.has(roles.verified);

    if (!hadVerified && hasVerified) {
      if (newMember.roles.cache.has(roles.unverified)) {
        try {
          await newMember.roles.remove(roles.unverified);
          console.log(`[Roles] Removed Unverified from ${newMember.user.tag} (Bloxlink verified)`);
        } catch (err) {
          console.error(`[Roles] Failed to remove Unverified from ${newMember.user.tag}:`, err.message);
        }
      }
    }
  },
};
