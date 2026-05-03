const { databaseChannelId } = require('../config');

async function getDbChannel(client) {
  const channel = await client.channels.fetch(databaseChannelId);
  if (!channel) throw new Error('Database channel not found. Check DATABASE_CHANNEL_ID in .env');
  return channel;
}

async function readRecord(client, key) {
  const channel = await getDbChannel(client);
  const messages = await channel.messages.fetch({ limit: 100 });
  const msg = messages.find(m => m.content.startsWith(`KEY:${key}|`));
  if (!msg) return null;
  const valueStr = msg.content.split('|VALUE:')[1];
  try {
    return JSON.parse(valueStr);
  } catch {
    return valueStr;
  }
}

async function writeRecord(client, key, value) {
  const channel = await getDbChannel(client);
  const messages = await channel.messages.fetch({ limit: 100 });
  const existing = messages.find(m => m.content.startsWith(`KEY:${key}|`));
  const content = `KEY:${key}|VALUE:${JSON.stringify(value)}`;
  if (existing) {
    await existing.edit(content);
  } else {
    await channel.send(content);
  }
}

async function deleteRecord(client, key) {
  const channel = await getDbChannel(client);
  const messages = await channel.messages.fetch({ limit: 100 });
  const existing = messages.find(m => m.content.startsWith(`KEY:${key}|`));
  if (existing) await existing.delete();
}

async function getUserData(client, userId) {
  const data = await readRecord(client, `USER:${userId}`);
  return data || { messageCount: 0 };
}

async function incrementUserMessages(client, userId) {
  const data = await getUserData(client, userId);
  data.messageCount = (data.messageCount || 0) + 1;
  await writeRecord(client, `USER:${userId}`, data);
  return data;
}

async function getStickyMessageId(client, channelId) {
  const data = await readRecord(client, `STICKY:${channelId}`);
  return data ? data.messageId : null;
}

async function setStickyMessageId(client, channelId, messageId) {
  await writeRecord(client, `STICKY:${channelId}`, { messageId });
}

module.exports = {
  readRecord,
  writeRecord,
  deleteRecord,
  getUserData,
  incrementUserMessages,
  getStickyMessageId,
  setStickyMessageId,
};
