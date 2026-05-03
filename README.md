# Vortex Designs Discord Bot

A full-featured Discord bot for the Vortex Designs ERLC design community.

## Features

- **Auto-role on join** — new members get `Unverified` automatically
- **Bloxlink integration** — removes `Unverified` when Bloxlink grants `Verified`
- **Community Member+ milestone** — auto-grants role after 50 messages + 2 days membership
- **Sticky messages** — channel rules and lock status always visible in restricted channels
- **Purchase ticket panel** — rich embed with Open Ticket / Terms / Portfolio buttons
- **Support ticket panel** — dedicated support request flow
- **Payment status buttons** — staff can mark tickets 🔴 / 🟠 / 🟢
- **Full transcripts** — auto-posted to ticket log channel on close
- **Discord-based storage** — no external database required

## Setup

### 1. Prerequisites
- Node.js 18+
- A Discord bot application ([Discord Developer Portal](https://discord.com/developers/applications))
- Bloxlink set up in your server for Roblox verification

### 2. Environment Variables (set in Railway)

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your bot token from the Developer Portal |
| `CLIENT_ID` | Your bot's Application ID |
| `GUILD_ID` | Your Discord server ID |
| `DATABASE_CHANNEL_ID` | ID of a private `#bot-database` channel (only bot can see) |

### 3. Create the database channel
1. Create a private channel in your server called `#bot-database`
2. Set permissions so **only your bot role can view and send messages**
3. Copy its channel ID and set it as `DATABASE_CHANNEL_ID`

### 4. Deploy to Railway
1. Connect this repo to Railway
2. Set all four environment variables above
3. Set the start command to: `npm start`
4. Deploy

### 5. Register slash commands
After the bot is online, run once:
```
node src/deploy-commands.js
```
Or add it as a Railway job.

### 6. Post panels
In your Discord server, run:
```
/setup all
```
This posts the purchase panel, support panel, and all sticky messages.

## Bot Permissions Required
- Read/Send Messages
- Manage Roles
- Create Private Threads
- Send Messages in Threads
- Read Message History
- Manage Messages (for sticky deletion)
- Embed Links
- Attach Files

## Required Intents (Developer Portal)
- Server Members Intent ✅
- Message Content Intent ✅
