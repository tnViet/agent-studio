// Bot Discord:
// - /video mo form, tao task cho Producer trong Paperclip (co o yeu cau chi tiet dai).
// - Nut "Duyet" va "Yeu cau sua" tren tin nhan cho duyet (do notify.js gui).
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

// Discord gioi han moi o nhap trong form la 4000 ky tu, nen co 2 o yeu cau chi tiet (tong 8000).
const NOTES_MAX = 4000;

// GuildMessages + MessageContent: doc tin nhan thuong "/video ..." hoac "!video ...".
// MessageContent phai bat trong Discord Developer Portal (muc Bot, Message Content Intent).
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, function (c) {
  console.log("Bot san sang: " + c.user.tag);
  // Bat dau gui thong bao tien do vao kenh DISCORD_NOTIFY_CHANNEL_ID
  require("./notify.js").start(c);
});

// Goi API Paperclip. Tra ve { ok, status, data, text }
async function paperclip(method, apiPath, body) {
  const options = { method: method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json; charset=utf-8";
    options.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(apiBase + "/api" + apiPath, options);
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = null;
    }
    return { ok: response.ok, status: response.status, data: data, text: text };
  } catch (error) {
    return { ok: false, status: 0, data: null, text: error.message };
  }
}

function isAllowed(userId) {
  for (let i = 0; i < allowedIds.length; i++) {
    if (allowedIds[i].trim() === userId) {
      return true;
    }
  }
  return false;
}

function taskNumber(identifier) {
  return parseInt(String(identifier).split("-")[1], 10);
}

function isGate(task) {
  const title = String(task.title).toLowerCase();
  return title.indexOf("approve script") >= 0 || title.indexOf("approve video") >= 0;
}

// Mot o nhap trong form (Discord: type 1 = hang, type 4 = o chu; style 1 = mot dong, 2 = nhieu dong)
function textRow(id, label, style, required, maxLength, placeholder) {
  const input = { type: 4, custom_id: id, label: label, style: style, required: required, max_length: maxLength };
  if (placeholder !== "") {
    input.placeholder = placeholder;
  }
  return { type: 1, components: [input] };
}

// ---------- /video: mo form ----------
async function openVideoForm(interaction) {
  await interaction.showModal({
    custom_id: "video_form",
    title: "Giao video mới cho Producer",
    components: [
      textRow("topic", "Chủ đề", 1, true, 200, "Ví dụ: Giao thoa sóng"),
      textRow("duration", "Thời lượng (giây, 30 đến 300)", 1, true, 3, "45"),
      textRow("tone", "Giọng điệu (không bắt buộc)", 1, false, 100, ""),
      textRow("notes1", "Yêu cầu chi tiết (không bắt buộc)", 2, false, NOTES_MAX, "Mạch nội dung, cảnh tự vẽ, lưu ý..."),
      textRow("notes2", "Yêu cầu chi tiết, phần tiếp (nếu dài)", 2, false, NOTES_MAX, ""),
    ],
  });
}

// Tao task video cho Producer. Tra ve { ok, text } de tra loi nguoi dung.
async function createVideoTask(topic, duration, tone, notes, source) {
  let description = "Topic: " + topic + "\nDuration: " + duration + " seconds";
  if (tone !== "") {
    description = description + "\nTone: " + tone;
  }
  description = description + "\nRequested from " + source + ".";
  if (notes !== "") {
    description = description + "\nNotes (user request, verbatim):\n" + notes;
  }
  let title = "Video: " + topic;
  if (title.length > 80) {
    title = title.substring(0, 80);
  }
  const result = await paperclip("POST", "/companies/" + companyId + "/issues", {
    title: title,
    description: description,
    status: "todo",
    assigneeAgentId: producerId,
    projectId: projectId,
  });
  if (result.status === 0) {
    return { ok: false, text: "Không kết nối được Paperclip. Máy chủ Paperclip có đang chạy không?" };
  }
  if (result.ok === false || result.data === null) {
    console.log("Paperclip tra loi loi " + result.status + ": " + result.text.substring(0, 300));
    return { ok: false, text: "Không tạo được task (mã lỗi " + result.status + "). Xem cửa sổ chạy bot để biết chi tiết." };
  }
  console.log("Da tao task " + result.data.identifier);
  let reply = "Đã giao cho Producer: " + result.data.identifier + "\nChủ đề: " + topic + "\nThời lượng: " + duration + " giây";
  if (notes !== "") {
    reply = reply + "\nYêu cầu chi tiết: " + notes.length + " ký tự";
  }
  return { ok: true, text: reply };
}

// Form /video gui len: tao task cho Producer
async function submitVideoForm(interaction) {
  const topic = interaction.fields.getTextInputValue("topic").trim();
  const durationText = interaction.fields.getTextInputValue("duration").trim();
  const tone = interaction.fields.getTextInputValue("tone").trim();
  const notes = (interaction.fields.getTextInputValue("notes1") + "\n" + interaction.fields.getTextInputValue("notes2")).trim();

  const duration = parseInt(durationText, 10);
  if (topic === "") {
    await interaction.reply("Chủ đề không được để trống.");
    return;
  }
  if (isNaN(duration) || duration < 30 || duration > 300) {
    await interaction.reply("Thời lượng phải là số từ 30 đến 300 (bạn nhập: " + durationText + ").");
    return;
  }

  // Discord chi cho 3 giay de tra loi, nen bao "dang xu ly" truoc
  await interaction.deferReply();
  const created = await createVideoTask(topic, duration, tone, notes, "Discord form");
  await interaction.editReply(created.text);
}

// ---------- Tin nhan thuong: "/video <prompt>" hoac "!video <prompt>" ----------
// Lay chu de tu dong "Chu de: ..." (cat o dau cham hoac dau phay dau tien), neu khong co thi lay dau prompt.
function findTopic(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lower = line.toLowerCase();
    if (lower.indexOf("chủ đề:") === 0 || lower.indexOf("chu de:") === 0) {
      let topic = line.substring(line.indexOf(":") + 1).trim();
      const cut = topic.search(/[.,]/);
      if (cut > 0) {
        topic = topic.substring(0, cut);
      }
      return topic.substring(0, 200).trim();
    }
  }
  let first = text.trim().split("\n")[0];
  const cut = first.search(/[.,]/);
  if (cut > 0) {
    first = first.substring(0, cut);
  }
  return first.substring(0, 80).trim();
}

// Lay thoi luong: "Thoi luong: 45 giay", neu khong co thi so dau tien di truoc chu "giay". Mac dinh 30.
function findDuration(text) {
  const lower = text.toLowerCase();
  let match = lower.match(/thời lượng\s*:?\s*(\d+)\s*(phút)?/);
  if (match === null) {
    // so dau tien di truoc "giay" hoac "phut"
    match = lower.match(/(\d+)\s*(giây|phút)/);
  }
  if (match === null) {
    return 30;
  }
  let value = parseInt(match[1], 10);
  if (match[2] === "phút") {
    value = value * 60;
  }
  return value;
}

async function handleTextVideo(message) {
  let content = message.content.trim();
  const lower = content.toLowerCase();
  if (lower.indexOf("/video") !== 0 && lower.indexOf("!video") !== 0) {
    return;
  }
  if (isAllowed(message.author.id) === false) {
    await message.reply("Bạn không có quyền dùng bot này.");
    return;
  }
  let text = content.substring(6).trim();

  // File dinh kem .txt hoac .md: noi vao prompt (cho prompt dai hon gioi han tin nhan)
  const files = Array.from(message.attachments.values());
  for (let i = 0; i < files.length; i++) {
    const name = String(files[i].name || "").toLowerCase();
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      try {
        const response = await fetch(files[i].url);
        const fileText = await response.text();
        text = (text + "\n" + fileText).trim();
      } catch (error) {
        await message.reply("Không đọc được file " + files[i].name + ".");
        return;
      }
    }
  }

  if (text === "") {
    await message.reply("Cách dùng: `/video` rồi dán prompt ngay sau, hoặc gửi `/video` kèm file .txt. Prompt nên có dòng \"Chủ đề: ...\" và \"Thời lượng: 45 giây\".");
    return;
  }
  if (text.length > 20000) {
    await message.reply("Prompt dài quá 20000 ký tự.");
    return;
  }
  const topic = findTopic(text);
  const duration = findDuration(text);
  if (topic === "") {
    await message.reply("Không tìm thấy chủ đề. Thêm dòng \"Chủ đề: ...\" vào đầu prompt.");
    return;
  }
  if (duration < 30 || duration > 300) {
    await message.reply("Thời lượng " + duration + " giây nằm ngoài khoảng 30 đến 300.");
    return;
  }
  const created = await createVideoTask(topic, duration, "", text, "Discord message");
  await message.reply(created.text);
}

client.on(Events.MessageCreate, async function (message) {
  if (message.author.bot) {
    return;
  }
  try {
    await handleTextVideo(message);
  } catch (error) {
    console.log("Loi xu ly tin nhan: " + error.message);
  }
});

// ---------- Duyet cong ----------
// Kiem tra cong con cho duyet khong. Tra ve { error } hoac { gate, parentId }
async function findOpenGate(code) {
  const got = await paperclip("GET", "/issues/" + encodeURIComponent(code));
  if (got.ok === false || got.data === null) {
    return { error: "Không đọc được task " + code + " từ Paperclip." };
  }
  const gate = got.data;
  if (isGate(gate) === false || !gate.parentId) {
    return { error: code + " không phải task cổng duyệt." };
  }
  if (gate.status === "done") {
    return { error: code + " đã được duyệt rồi." };
  }
  if (gate.status === "cancelled") {
    return { error: code + " đã bị hủy." };
  }
  return { gate: gate, parentId: gate.parentId };
}

async function approveGate(interaction, code) {
  await interaction.deferReply();
  const found = await findOpenGate(code);
  if (found.error !== undefined) {
    await interaction.editReply(found.error);
    return;
  }
  // Task ngay truoc cong phai xong
  const siblings = await paperclip("GET", "/companies/" + companyId + "/issues?parentId=" + found.parentId + "&limit=50");
  if (siblings.ok === false || Array.isArray(siblings.data) === false) {
    await interaction.editReply("Không đọc được các bước của video.");
    return;
  }
  let previous = null;
  for (let i = 0; i < siblings.data.length; i++) {
    const other = siblings.data[i];
    if (taskNumber(other.identifier) < taskNumber(code)) {
      if (previous === null || taskNumber(other.identifier) > taskNumber(previous.identifier)) {
        previous = other;
      }
    }
  }
  if (previous === null || previous.status !== "done") {
    await interaction.editReply("Bước trước cổng " + code + " chưa xong, chưa duyệt được.");
    return;
  }
  const result = await paperclip("PATCH", "/issues/" + encodeURIComponent(code), { status: "done" });
  if (result.ok === false) {
    console.log("Duyet loi " + result.status + ": " + result.text.substring(0, 300));
    await interaction.editReply("Paperclip không cho duyệt (mã lỗi " + result.status + ").");
    return;
  }
  await interaction.editReply("Đã duyệt " + code + ". Bước tiếp theo sẽ tự chạy.");
  // Bo nut tren tin nhan goc de khong bam lai
  try {
    await interaction.message.edit({ components: [] });
  } catch (error) {
    console.log("Khong bo duoc nut: " + error.message);
  }
  console.log("Da duyet " + code + " tu Discord");
}

async function openFixForm(interaction, code) {
  await interaction.showModal({
    custom_id: "fix_form:" + code,
    title: "Yêu cầu sửa (" + code + ")",
    components: [
      textRow("text", "Cần sửa gì?", 2, true, NOTES_MAX, "Ví dụ: Cảnh 5 vân quá nhỏ, làm to hơn"),
    ],
  });
}

async function submitFixForm(interaction, code) {
  const text = interaction.fields.getTextInputValue("text").trim();
  await interaction.deferReply();
  const found = await findOpenGate(code);
  if (found.error !== undefined) {
    await interaction.editReply(found.error);
    return;
  }
  // Yeu cau sua gui vao task cha (video) de Producer xu ly
  const parent = await paperclip("GET", "/issues/" + encodeURIComponent(found.parentId));
  if (parent.ok === false || parent.data === null) {
    await interaction.editReply("Không đọc được task video.");
    return;
  }
  const result = await paperclip("POST", "/issues/" + encodeURIComponent(parent.data.identifier) + "/comments", { body: text });
  if (result.ok === false) {
    console.log("Gui comment loi " + result.status + ": " + result.text.substring(0, 300));
    await interaction.editReply("Không gửi được yêu cầu sửa (mã lỗi " + result.status + ").");
    return;
  }
  await interaction.editReply("Đã gửi yêu cầu sửa cho Producer (video " + parent.data.identifier + "):\n> " + text.substring(0, 300));
}

// ---------- Nhan moi tuong tac ----------
client.on(Events.InteractionCreate, async function (interaction) {
  try {
    if (isAllowed(interaction.user.id) === false) {
      if (interaction.isRepliable()) {
        await interaction.reply({ content: "Bạn không có quyền dùng bot này.", flags: 64 });
      }
      return;
    }
    if (interaction.isChatInputCommand() && interaction.commandName === "video") {
      await openVideoForm(interaction);
      return;
    }
    if (interaction.isModalSubmit() && interaction.customId === "video_form") {
      await submitVideoForm(interaction);
      return;
    }
    if (interaction.isButton()) {
      const parts = interaction.customId.split(":");
      if (parts[0] === "gate_ok") {
        await approveGate(interaction, parts[1]);
      } else if (parts[0] === "gate_fix") {
        await openFixForm(interaction, parts[1]);
      }
      return;
    }
    if (interaction.isModalSubmit() && interaction.customId.indexOf("fix_form:") === 0) {
      await submitFixForm(interaction, interaction.customId.substring(9));
      return;
    }
  } catch (error) {
    console.log("Loi xu ly tuong tac: " + error.message);
  }
});

client.login(token);
