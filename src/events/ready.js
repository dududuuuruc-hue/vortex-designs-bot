const { postAllStickies } = require('../utils/sticky');
const { stickyChannels } = require('../config');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    client.user.setActivity('Vortex Designs | /setup', { type: 3 });

    try {
      await postAllStickies(client, stickyChannels);
      console.log('[Bot] Sticky messages posted successfully.');
    } catch (err) {
      console.error('[Bot] Failed to post sticky messages on ready:', err.message);
    }
  },
};
