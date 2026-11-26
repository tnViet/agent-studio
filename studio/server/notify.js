// Thong bao tien do len Discord.
// Cu 15 giay hoi Paperclip mot lan, so voi lan truoc de biet task nao moi, xong, bi chan, cho duyet.
// Viec nho: mot dong chu. Video hoan thanh: khung noi bat kem file video.
// Trang thai da biet luu trong notify-state.json de tat bot bat lai khong bao trung.
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const apiBase = process.env.PAPERCLIP_API_BASE;
const companyId = process.env.PAPERCLIP_COMPANY_ID;
const studioUrl = "http://127.0.0.1:4000";
const clipsDir = path.join(__dirname, "..", "..", "clips");
const stateFile = path.join(__dirname, "notify-state.json");
const POLL_SECONDS = 15;

// Nguoi duoc nhac ten khi can duyet: id dau tien trong danh sach cho phep
let ownerId = "";
const allowedText = process.env.DISCORD_ALLOWED_USER_IDS || "";
if (allowedText !== "") {
  ownerId = allowedText.split(",")[0].trim();
}

async function callPaperclip(apiPath) {
  try {
    const response = await fetch(apiBase + "/api" + apiPath);
    if (response.ok === false) {
      console.log("Thong bao: Paperclip loi " + response.status + " " + apiPath);
      return null;
    }
    return await response.json();
  } catch (error) {
    return null;
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  } catch (error) {
    return null;
  }
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 1), "utf-8");
}

function taskNumber(identifier) {
  return parseInt(String(identifier).split("-")[1], 10);
}

function isGate(task) {
  const title = String(task.title).toLowerCase();
  return title.indexOf("approve script") >= 0 || title.indexOf("approve video") >= 0;
}

function gateKind(task) {
  if (String(task.title).toLowerCase().indexOf("script") >= 0) {
    return "kịch bản";
  }
  return "video";
}

function mention() {
  if (ownerId === "") {
    return "";
  }
  return "<@" + ownerId + "> ";
}

// Khung noi bat khi mot video hoan thanh
async function videoDoneMessage(parent, children) {
  const name = parent.identifier;
  const cost = await callPaperclip("/issues/" + encodeURIComponent(name) + "/cost-summary");
  const script = readJson(path.join(clipsDir, name, "script.json"));
  const review = readJson(path.join(clipsDir, name, "review.json"));

  let title = parent.title;
  if (script !== null) {
    title = script.title;
  }
  const embed = new EmbedBuilder();
  embed.setColor(0x4f7d4f);
  embed.setTitle("Video hoàn thành: " + title);
  let description = "Video " + name + " đã đi hết " + children.length + " bước. Bản đóng gói nằm trong thư mục clips/" + name + "/publish.\n";
  description = description + "Xem và đóng video: " + studioUrl + "/clip/" + name;
  embed.setDescription(description);
  if (review !== null) {
    let verdict = "Đạt mọi mục kiểm tra";
    if (review.passed !== true) {
      verdict = "Chưa đạt";
    }
    embed.addFields({ name: "Reviewer", value: verdict, inline: true });
  }
  if (script !== null) {
    embed.addFields({ name: "Kịch bản", value: script.scenes.length + " cảnh, mục tiêu " + script.target_sec + " giây", inline: true });
  }
  if (cost !== null) {
    const tokens = Number(cost.inputTokens || 0) + Number(cost.cachedInputTokens || 0) + Number(cost.outputTokens || 0);
    embed.addFields({ name: "Token", value: tokens.toLocaleString("vi-VN") + " (" + Number(cost.runCount || 0) + " lần chạy)", inline: true });
  }

  const message = { content: mention() + "Có video mới làm xong.", embeds: [embed], allowedMentions: { users: [ownerId] } };
  // Gui kem file video doc neu nho hon 8 MB
  const videoPath = path.join(clipsDir, name, "final", "video_9x16.mp4");
  if (fs.existsSync(videoPath) && fs.statSync(videoPath).size < 8 * 1024 * 1024) {
    message.files = [{ attachment: videoPath, name: name + "_9x16.mp4" }];
  }
  return message;
}

// Hai nut duoi tin nhan cho duyet (Discord: type 1 = hang, type 2 = nut; style 3 = xanh, 2 = xam)
function gateButtons(code) {
  return [{
    type: 1,
    components: [
      { type: 2, style: 3, label: "Duyệt", custom_id: "gate_ok:" + code },
      { type: 2, style: 2, label: "Yêu cầu sửa", custom_id: "gate_fix:" + code },
    ],
  }];
}

// Cac tin nhan khi mot cong cho duyet. Tin cuoi co nut bam.
// Kich ban dai duoc chia nhieu khung (moi khung toi da khoang 3900 ky tu).
function gateMessages(gate, parent) {
  const name = parent.identifier;
  const messages = [];
  const head = mention() + "Chờ bạn duyệt " + gateKind(gate) + ": " + parent.title + " (" + name + ", cổng " + gate.identifier + ").";

  if (gateKind(gate) === "kịch bản") {
    const script = readJson(path.join(clipsDir, name, "script.json"));
    if (script === null || Array.isArray(script.scenes) === false) {
      messages.push({ content: head + "\nKhông đọc được clips/" + name + "/script.json. Xem ở " + studioUrl + "/progress", components: gateButtons(gate.identifier), allowedMentions: { users: [ownerId] } });
      return messages;
    }
    let total = 0;
    for (let i = 0; i < script.scenes.length; i++) {
      total = total + Number(script.scenes[i].duration_sec || 0);
    }
    // Chia cac dong canh thanh nhieu khung
    const chunks = [];
    let current = "";
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const line = "**Cảnh " + scene.id + "** (" + scene.duration_sec + " giây): " + scene.narration + "\n";
      if (current.length + line.length > 3900) {
        chunks.push(current);
        current = "";
      }
      current = current + line;
    }
    if (current !== "") {
      chunks.push(current);
    }
    for (let i = 0; i < chunks.length; i++) {
      const embed = new EmbedBuilder();
      embed.setColor(0xc96442);
      if (i === 0) {
        embed.setTitle("Kịch bản: " + script.title + " (" + script.scenes.length + " cảnh, " + total + " giây)");
      }
      embed.setDescription(chunks[i]);
      const message = { embeds: [embed] };
      if (i === 0) {
        message.content = head;
        message.allowedMentions = { users: [ownerId] };
      }
      if (i === chunks.length - 1) {
        message.components = gateButtons(gate.identifier);
      }
      messages.push(message);
    }
    return messages;
  }

  // Cong video: tom tat Reviewer va file 9:16 neu nho
  const review = readJson(path.join(clipsDir, name, "review.json"));
  const embed = new EmbedBuilder();
  embed.setColor(0xc96442);
  embed.setTitle("Video chờ duyệt: " + parent.title);
  let text = "Xem đủ 4 định dạng: " + studioUrl + "/clip/" + name;
  if (review !== null && Array.isArray(review.checks)) {
    let okCount = 0;
    for (let i = 0; i < review.checks.length; i++) {
      if (review.checks[i].ok === true) {
        okCount = okCount + 1;
      }
    }
    text = text + "\nReviewer: đạt " + okCount + "/" + review.checks.length + " mục kiểm tra (vòng " + (review.round || 1) + ").";
  }
  embed.setDescription(text);
  const message = { content: head, embeds: [embed], components: gateButtons(gate.identifier), allowedMentions: { users: [ownerId] } };
  const videoPath = path.join(clipsDir, name, "final", "video_9x16.mp4");
  if (fs.existsSync(videoPath) && fs.statSync(videoPath).size < 8 * 1024 * 1024) {
    message.files = [{ attachment: videoPath, name: name + "_9x16.mp4" }];
  }
  messages.push(message);
  return messages;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    return null;
  }
}

// Kiem tra mot lan. send(message) gui mot tin nhan (chuoi hoac doi tuong).
async function checkOnce(send) {
  const issues = await callPaperclip("/companies/" + companyId + "/issues?status=backlog,todo,in_progress,in_review,blocked,done,cancelled&limit=200");
  const agents = await callPaperclip("/companies/" + companyId + "/agents");
  if (issues === null || agents === null) {
    return;
  }
  const agentName = {};
  for (let i = 0; i < agents.length; i++) {
    agentName[agents[i].id] = agents[i].name;
  }
  const byId = {};
  for (let i = 0; i < issues.length; i++) {
    byId[issues[i].id] = issues[i];
  }

  let state = loadState();
  const firstRun = state === null;
  if (firstRun) {
    state = { status: {}, gateNotified: {}, videoDone: {} };
  }

  // Gom task con moi theo video de bao mot lan
  const newChildren = {};
  for (let i = 0; i < issues.length; i++) {
    const task = issues[i];
    const before = state.status[task.identifier];
    state.status[task.identifier] = task.status;
    if (firstRun || before === task.status) {
      continue;
    }
    let who = "";
    if (task.assigneeAgentId && agentName[task.assigneeAgentId] !== undefined) {
      who = " (" + agentName[task.assigneeAgentId] + ")";
    }

    if (before === undefined) {
      // Task moi
      if (task.parentId && byId[task.parentId] !== undefined) {
        const parentCode = byId[task.parentId].identifier;
        if (newChildren[parentCode] === undefined) {
          newChildren[parentCode] = [];
        }
        newChildren[parentCode].push(task);
      } else {
        await send("Việc mới: " + task.identifier + " " + task.title + who + ".");
      }
      continue;
    }

    // Doi trang thai
    let progress = "";
    if (task.parentId && byId[task.parentId] !== undefined) {
      let total = 0;
      let done = 0;
      for (let k = 0; k < issues.length; k++) {
        if (issues[k].parentId === task.parentId) {
          total = total + 1;
          if (issues[k].status === "done") {
            done = done + 1;
          }
        }
      }
      progress = " Video " + byId[task.parentId].identifier + ": " + done + "/" + total + " bước.";
    }
    if (task.status === "done") {
      if (task.parentId) {
        await send("Xong " + task.identifier + " " + task.title + who + "." + progress);
      } else {
        await send("Đã đóng video " + task.identifier + " " + task.title + ".");
      }
    } else if (task.status === "blocked" && task.parentId && task.assigneeAgentId) {
      await send(mention() + "Bị chặn: " + task.identifier + " " + task.title + who + "." + progress + " Xem comment trong task để biết lý do.");
    } else if (task.status === "in_progress" && task.parentId) {
      // Bat dau lam: khong bao de tranh nhieu tin
    } else if (task.status === "cancelled") {
      await send("Đã hủy " + task.identifier + " " + task.title + ".");
    }
  }

  // Producer vua chia viec cho mot video
  const parentCodes = Object.keys(newChildren);
  for (let i = 0; i < parentCodes.length; i++) {
    const list = newChildren[parentCodes[i]];
    list.sort(function (a, b) {
      return taskNumber(a.identifier) - taskNumber(b.identifier);
    });
    let lines = "Producer đã chia video " + parentCodes[i] + " thành " + list.length + " bước:";
    for (let k = 0; k < list.length; k++) {
      let who = "bạn duyệt";
      if (list[k].assigneeAgentId && agentName[list[k].assigneeAgentId] !== undefined) {
        who = agentName[list[k].assigneeAgentId];
      }
      lines = lines + "\n" + (k + 1) + ". " + list[k].identifier + " " + list[k].title + " (" + who + ")";
    }
    if (firstRun === false) {
      await send(lines);
    }
  }

  // Cong dang cho duyet (task ngay truoc da xong)
  for (let i = 0; i < issues.length; i++) {
    const gate = issues[i];
    if (isGate(gate) === false || gate.status === "done" || gate.status === "cancelled" || !gate.parentId) {
      continue;
    }
    if (state.gateNotified[gate.identifier] === true) {
      continue;
    }
    let previous = null;
    for (let k = 0; k < issues.length; k++) {
      const other = issues[k];
      if (other.parentId === gate.parentId && taskNumber(other.identifier) < taskNumber(gate.identifier)) {
        if (previous === null || taskNumber(other.identifier) > taskNumber(previous.identifier)) {
          previous = other;
        }
      }
    }
    if (previous !== null && previous.status === "done") {
      state.gateNotified[gate.identifier] = true;
      const parent = byId[gate.parentId];
      if (firstRun === false && parent !== undefined) {
        const messages = gateMessages(gate, parent);
        for (let m = 0; m < messages.length; m++) {
          await send(messages[m]);
        }
      }
    }
  }

  // Video hoan thanh: moi task con da xong (bao mot lan)
  for (let i = 0; i < issues.length; i++) {
    const parent = issues[i];
    if (parent.parentId || state.videoDone[parent.identifier] === true) {
      continue;
    }
    const children = [];
    let allDone = true;
    for (let k = 0; k < issues.length; k++) {
      if (issues[k].parentId === parent.id) {
        children.push(issues[k]);
        if (issues[k].status !== "done") {
          allDone = false;
        }
      }
    }
    if (children.length > 0 && allDone) {
      state.videoDone[parent.identifier] = true;
      if (firstRun === false) {
        await send(await videoDoneMessage(parent, children));
      }
    }
  }

  saveState(state);
  if (firstRun) {
    console.log("Thong bao: da ghi trang thai ban dau, tu gio se bao thay doi.");
  }
}

// Bat dau hoi dinh ky. client: bot Discord da dang nhap.
function start(client) {
  const channelId = process.env.DISCORD_NOTIFY_CHANNEL_ID;
  if (!channelId) {
    console.log("Thong bao: chua co DISCORD_NOTIFY_CHANNEL_ID trong .env, bo qua thong bao.");
    return;
  }
  let busy = false;
  async function tick() {
    if (busy) {
      return;
    }
    busy = true;
    try {
      const channel = await client.channels.fetch(channelId);
      await checkOnce(async function (message) {
        await channel.send(message);
      });
    } catch (error) {
      console.log("Thong bao loi: " + error.message);
    }
    busy = false;
  }
  tick();
  setInterval(tick, POLL_SECONDS * 1000);
  console.log("Thong bao: gui vao kenh " + channelId + ", hoi Paperclip moi " + POLL_SECONDS + " giay.");
}

module.exports = { start: start, checkOnce: checkOnce, gateMessages: gateMessages };
