// Bot Discord: nhan lenh /video va tao task cho Producer trong Paperclip.
// Chay: node bot.js   (dung bang Ctrl+C)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const { Client, Events, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_BOT_TOKEN;
const allowedText = process.env.DISCORD_ALLOWED_USER_IDS || "";
const allowedIds = allowedText.split(",");
const apiBase = process.env.PAPERCLIP_API_BASE;
const companyId = process.env.PAPERCLIP_COMPANY_ID;
const projectId = process.env.PAPERCLIP_PROJECT_ID;
const producerId = process.env.PAPERCLIP_PRODUCER_ID;

if (!token || !apiBase || !companyId || !projectId || !producerId) {
  console.log("Thieu bien trong .env (DISCORD_BOT_TOKEN, PAPERCLIP_API_BASE, PAPERCLIP_COMPANY_ID, PAPERCLIP_PROJECT_ID, PAPERCLIP_PRODUCER_ID)");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, function (c) {
  console.log("Bot san sang: " + c.user.tag);
});

client.on(Events.InteractionCreate, async function (interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  if (interaction.commandName !== "video") {
    return;
  }

  // 1) Kiem tra nguoi gui co trong danh sach cho phep khong
  let allowed = false;
  for (let i = 0; i < allowedIds.length; i++) {
    if (allowedIds[i].trim() === interaction.user.id) {
      allowed = true;
    }
  }
  if (allowed === false) {
    await interaction.reply("Bạn không có quyền dùng lệnh này.");
    return;
  }

  // 2) Doc va kiem tra dau vao
  const topic = interaction.options.getString("topic").trim();
  let duration = interaction.options.getInteger("duration");
  if (duration === null) {
    duration = 30;
  }
  const tone = interaction.options.getString("tone");

  if (topic.length === 0) {
    await interaction.reply("Chủ đề không được để trống.");
    return;
  }

  // 3) Discord chi cho 3 giay de tra loi, nen bao "dang xu ly" truoc
  await interaction.deferReply();

  // 4) Tao task trong Paperclip, giao cho Producer
  let description = "Topic: " + topic + "\nDuration: " + duration + " seconds";
  if (tone !== null) {
    description = description + "\nTone: " + tone;
  }
  description = description + "\nRequested from Discord.";

  let title = "Video: " + topic;
  if (title.length > 80) {
    title = title.substring(0, 80);
  }

  const body = {
    title: title,
    description: description,
    status: "todo",
    assigneeAgentId: producerId,
    projectId: projectId,
  };

  try {
    const response = await fetch(apiBase + "/api/companies/" + companyId + "/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();

    if (response.ok === false) {
      console.log("Paperclip tra loi loi " + response.status + ": " + text.substring(0, 300));
      await interaction.editReply("Không tạo được task (mã lỗi " + response.status + "). Xem cửa sổ chạy bot để biết chi tiết.");
      return;
    }

    const issue = JSON.parse(text);
    await interaction.editReply("Đã giao cho Producer: " + issue.identifier + "\nChủ đề: " + topic + "\nThời lượng: " + duration + " giây");
    console.log("Da tao task " + issue.identifier);
  } catch (error) {
    console.log("Loi khi goi Paperclip: " + error.message);
    await interaction.editReply("Không kết nối được Paperclip. Máy chủ Paperclip có đang chạy không?");
  }
});

client.login(token);
