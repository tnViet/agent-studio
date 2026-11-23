// Dang ky lenh /video cho server thu. Chay 1 lan: node deploy-commands.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const { REST, Routes } = require("discord.js");

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.log("Thieu DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID hoac DISCORD_GUILD_ID trong .env");
  process.exit(1);
}

// type 3 = chuoi, type 4 = so nguyen
const commands = [
  {
    name: "video",
    description: "Giao Producer làm một video ngắn",
    options: [
      { type: 3, name: "topic", description: "Chủ đề video", required: true, max_length: 200 },
      { type: 4, name: "duration", description: "Thời lượng (giây), từ 15 đến 60", required: false, min_value: 15, max_value: 60 },
      { type: 3, name: "tone", description: "Giọng điệu (tùy chọn)", required: false, max_length: 100 },
    ],
  },
];

const rest = new REST().setToken(token);

async function main() {
  console.log("Dang dang ky lenh...");
  const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log("Da dang ky " + data.length + " lenh.");
}

main().catch(function (error) {
  console.log("Loi:", error.message);
});
