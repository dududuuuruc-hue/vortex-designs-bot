require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config');

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log('Clearing all guild commands...');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log('Clearing all global commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('All commands cleared successfully.');
  } catch (err) {
    console.error('Error clearing commands:', err.message);
  }
})();
