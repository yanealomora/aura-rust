import { config } from 'dotenv';
config();

export default {
  rust: {
    ip: process.env.RUST_SERVER_IP,
    port: parseInt(process.env.RUST_SERVER_PORT) || 28083,
    playerToken: process.env.RUST_PLAYER_TOKEN,
    playerId: process.env.RUST_PLAYER_ID,
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
    adminId: process.env.DISCORD_ADMIN_ID,
  },
  steam: {
    apiKey: process.env.STEAM_API_KEY,
  },
  battlemetrics: {
    token: process.env.BATTLEMETRICS_TOKEN,
  },
  polling: {
    teamInfo: parseInt(process.env.POLL_TEAM_INFO) || 30000,
    mapMarkers: parseInt(process.env.POLL_MAP_MARKERS) || 60000,
    serverInfo: parseInt(process.env.POLL_SERVER_INFO) || 120000,
  },
};
