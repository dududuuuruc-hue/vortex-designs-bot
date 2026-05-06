const { roles } = require('../config');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const { writeRecord } = require('../utils/database');
    try {
      await member.roles.add(roles.unverified);
      console.log(`[Roles] Assigned Unverified to ${member.user.tag}`);
      
      // Log member join to database channel
      await writeRecord(member.client, `JOIN:${member.id}`, {
        tag: member.user.tag,
        joinedAt: member.joinedAt.toISOString(),
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(`[Roles] Failed to assign Unverified to ${member.user.tag}:`, err.message);
    }
  },
};
