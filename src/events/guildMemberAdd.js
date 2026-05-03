const { roles } = require('../config');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      await member.roles.add(roles.unverified);
      console.log(`[Roles] Assigned Unverified to ${member.user.tag}`);
    } catch (err) {
      console.error(`[Roles] Failed to assign Unverified to ${member.user.tag}:`, err.message);
    }
  },
};
