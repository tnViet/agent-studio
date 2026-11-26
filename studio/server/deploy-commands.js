// Dang ky lenh /video cho server thu. Chay lai moi khi sua file nay: node deploy-commands.js
// /video khong co tham so: bot mo mot form (modal) co o yeu cau chi tiet nhieu dong.
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

const commands = [
  {
    name: "video",
    description: "Giao Producer làm một video ngắn (mở form nhập yêu cầu)",
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
