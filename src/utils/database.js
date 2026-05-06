const { databaseChannelId } = require('../config');

async function getDbChannel(client) {
  const channel = await client.channels.fetch(databaseChannelId);
  if (!channel) throw new Error('Database channel not found.');
  return channel;
}

async function readRecord(client, key) {
  const channel = await getDbChannel(client);
  let messages = await channel.messages.fetch({ limit: 100 });
  let msg = messages.find(m => m.content.startsWith(`KEY:${key}|`));
  
  // If not found in first 100, try fetching more (up to 300)
  if (!msg) {
    const lastId = messages.last()?.id;
    if (lastId) {
      const moreMessages = await channel.messages.fetch({ limit: 100, before: lastId });
      msg = moreMessages.find(m => m.content.startsWith(`KEY:${key}|`));
      if (!msg) {
        const lastId2 = moreMessages.last()?.id;
        if (lastId2) {
          const evenMoreMessages = await channel.messages.fetch({ limit: 100, before: lastId2 });
          msg = evenMoreMessages.find(m => m.content.startsWith(`KEY:${key}|`));
        }
      }
    }
  }

  if (!msg) return null;
  const valueStr = msg.content.split('|VALUE:')[1];
  try { return JSON.parse(valueStr); } catch { return valueStr; }
}

async function writeRecord(client, key, value) {
  const channel = await getDbChannel(client);
  let messages = await channel.messages.fetch({ limit: 100 });
  let existing = messages.find(m => m.content.startsWith(`KEY:${key}|`));

  if (!existing) {
    const lastId = messages.last()?.id;
    if (lastId) {
      const moreMessages = await channel.messages.fetch({ limit: 100, before: lastId });
      existing = moreMessages.find(m => m.content.startsWith(`KEY:${key}|`));
    }
  }

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

async function getNextOrderId(client) {
  const data = await readRecord(client, 'COUNTER:orders');
  const next = ((data?.count) || 0) + 1;
  await writeRecord(client, 'COUNTER:orders', { count: next });
  return String(next).padStart(3, '0');
}

async function incrementUserViolation(client, userId) {
  const key = `ADVIOLATION:USER:${userId}`;
  const data = await readRecord(client, key) || { count: 0 };
  data.count = (data.count || 0) + 1;
  data.lastSeen = Date.now();
  await writeRecord(client, key, data);
  return data.count;
}

async function incrementServerViolation(client, inviteCode) {
  const key = `ADVIOLATION:SERVER:${inviteCode}`;
  const data = await readRecord(client, key) || { count: 0, users: [] };
  data.count = (data.count || 0) + 1;
  data.lastSeen = Date.now();
  await writeRecord(client, key, data);
  return data.count;
}

async function getUserViolationCount(client, userId) {
  const data = await readRecord(client, `ADVIOLATION:USER:${userId}`);
  return data?.count || 0;
}

async function getServerViolationCount(client, inviteCode) {
  const data = await readRecord(client, `ADVIOLATION:SERVER:${inviteCode}`);
  return data?.count || 0;
}

module.exports = {
  readRecord, writeRecord, deleteRecord,
  getUserData, incrementUserMessages,
  getStickyMessageId, setStickyMessageId,
  getNextOrderId,
  incrementUserViolation, incrementServerViolation,
  getUserViolationCount, getServerViolationCount,
};
