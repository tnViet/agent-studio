// Studio web: xem kich ban, giong, canh, video; tien do; duyet cong; token; van phong 3D.
// Chay: node web.js   roi mo http://127.0.0.1:4000
// Dung bang Ctrl+C
const http = require("http");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const port = 4000;
const clipsDir = path.join(__dirname, "..", "..", "clips");
const apiBase = process.env.PAPERCLIP_API_BASE;
const companyId = process.env.PAPERCLIP_COMPANY_ID;

// Goi API Paperclip. Tra ve du lieu JSON, hoac null neu loi (Paperclip chua chay...)
// Loi gan nhat Paperclip tra ve, de hien len trang khi bam nut that bai
let lastPaperclipError = "";

async function callPaperclip(method, apiPath, body) {
  const options = { method: method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(apiBase + "/api" + apiPath, options);
    const text = await response.text();
    if (response.ok === false) {
      console.log("Paperclip loi " + response.status + " " + method + " " + apiPath + ": " + text.substring(0, 300));
      lastPaperclipError = "Paperclip trả lỗi " + response.status + ": " + text.substring(0, 200);
      return null;
    }
    if (text === "") {
      return {};
    }
    return JSON.parse(text);
  } catch (error) {
    console.log("Khong goi duoc Paperclip: " + error.message);
    lastPaperclipError = "Không kết nối được Paperclip (" + error.message + ")";
    return null;
  }
}

// Lay task cha (ma VIEA-xx trung ten thu muc) va cac task con
async function loadTasks(name) {
  const parent = await callPaperclip("GET", "/issues/" + encodeURIComponent(name));
  if (parent === null) {
    return null;
  }
  const children = await callPaperclip("GET", "/companies/" + companyId + "/issues?parentId=" + parent.id + "&limit=50");
  if (children === null) {
    return null;
  }
  // Sap xep theo ma task (VIEA-17, VIEA-18...)
  children.sort(function (a, b) {
    const na = parseInt(String(a.identifier).split("-")[1], 10);
    const nb = parseInt(String(b.identifier).split("-")[1], 10);
    return na - nb;
  });
  return { parent: parent, children: children };
}

// Task cong la task co tieu de chua "approve script" hoac "approve video"
function isGate(task) {
  const title = String(task.title).toLowerCase();
  if (title.indexOf("approve script") >= 0 || title.indexOf("approve video") >= 0) {
    return true;
  }
  return false;
}

// Tieng Viet cho trang thai task
function statusText(status) {
  if (status === "done") return '<span class="ok">xong</span>';
  if (status === "in_progress") return "đang chạy";
  if (status === "todo") return "chờ chạy";
  if (status === "blocked") return '<span class="bad">bị chặn</span>';
  if (status === "in_review") return "đang xét";
  if (status === "cancelled") return "đã hủy";
  if (status === "backlog") return "backlog";
  return escapeHtml(status);
}

// Doi so token cho de doc: 12345 -> 12.345
function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

// Doc file JSON, neu loi thi tra ve null
function readJson(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

// Kieu hinh tung canh doc tu storyboard.json: { "3": {mode: "draw", drawing: "wave"} }
function sceneModes(folder) {
  const modes = {};
  const board = readJson(path.join(folder, "storyboard.json"));
  if (board === null || !Array.isArray(board.scenes)) {
    return modes;
  }
  for (let i = 0; i < board.scenes.length; i++) {
    const scene = board.scenes[i];
    let mode = "asset";
    if (scene.mode === "draw") {
      mode = "draw";
    }
    modes[String(scene.id)] = { mode: mode, drawing: scene.drawing || "" };
  }
  return modes;
}

// Doi ky tu dac biet de chen chu vao HTML an toan
function escapeHtml(text) {
  let result = String(text);
  result = result.split("&").join("&amp;");
  result = result.split("<").join("&lt;");
  result = result.split(">").join("&gt;");
  result = result.split('"').join("&quot;");
  return result;
}

// ---------- Giao dien ----------
// Bang mau kieu giao dien Claude: nen kem, muc den am, mau dat nung cho thao tac va cong duyet
const css = `
:root{--paper:#F5F4ED;--sheet:#FAF9F5;--ink:#141413;--muted:#6B6A63;--line:#E5E2D6;
--cobalt:#C96442;--gate:#D97757;--gate-soft:#F6E7DE;--ok:#4F7D4F;--bad:#B53D2E;--run:#C96442;--serif:"Source Serif 4",Georgia,serif}
*{box-sizing:border-box}
html{font-size:16px}
body{margin:0;background:var(--paper);color:var(--ink);font-family:"Be Vietnam Pro",system-ui,sans-serif;line-height:1.55;font-variant-numeric:tabular-nums}
a{color:var(--cobalt)}
a:focus-visible,button:focus-visible,textarea:focus-visible{outline:3px solid var(--gate);outline-offset:2px}
.top{display:flex;gap:28px;align-items:baseline;padding:18px 32px;border-bottom:1px solid var(--line);background:var(--paper)}
.brand{font-family:var(--serif);font-weight:600;font-size:1.3rem;color:var(--ink);text-decoration:none}
.top nav a{color:var(--muted);text-decoration:none;font-weight:500}
.top nav a.here{color:var(--ink);border-bottom:2px solid var(--ink)}
.wrap{max-width:1180px;margin:0 auto;padding:32px}
h1{font-family:var(--serif);font-size:2.5rem;line-height:1.15;letter-spacing:-.015em;margin:0 0 6px;font-weight:500}
h2{font-family:var(--serif);font-size:1.4rem;margin:44px 0 14px;font-weight:500}
.code{color:var(--muted);font-weight:500;margin:0}
.sub{color:var(--muted);margin:4px 0 0;max-width:70ch}
.ok{color:var(--ok)}.bad{color:var(--bad)}
/* Dai quy trinh: phan noi bat nhat cua trang */
.strip{display:flex;margin:28px 0 8px;border:1px solid var(--line);border-radius:14px;background:var(--sheet);overflow-x:auto}
.step{flex:1 1 0;min-width:118px;padding:12px 14px;border-right:1px solid var(--line);position:relative}
.step:last-child{border-right:0}
.step .n{font-size:.8rem;color:var(--muted);font-weight:600}
.step .t{display:block;font-weight:600;font-size:.92rem;line-height:1.3;margin:2px 0 6px}
.step .s{font-size:.82rem;color:var(--muted)}
.step.done{box-shadow:inset 0 -4px 0 var(--ok)}
.step.in_progress{box-shadow:inset 0 -4px 0 var(--run)}
.step.blocked{box-shadow:inset 0 -4px 0 var(--bad)}
.step.gate{background:var(--gate-soft)}
.step.gate .t::before{content:"";display:inline-block;width:.6em;height:.6em;background:var(--gate);transform:rotate(45deg);margin-right:.45em;vertical-align:.08em}
.step form{margin-top:8px}
.step .who{display:block;margin-top:2px}
.video-block{margin:0 0 30px}
.video-block h3{font-family:var(--serif);font-weight:500;font-size:1.2rem;margin:0}
.task-card{background:var(--sheet);border:1px solid var(--line);border-left:6px solid var(--bad);border-radius:12px;padding:14px 20px;margin:0 0 16px}
.task-card.review{border-left-color:var(--gate)}
.task-card p{margin:2px 0}
.task-card .reason{white-space:pre-wrap;background:#fff;border:1px solid var(--line);border-radius:8px;padding:8px 12px;margin:8px 0;font-size:.9rem;max-height:180px;overflow:auto}
.task-card form{display:flex;gap:10px;align-items:flex-start;margin-top:8px;flex-wrap:wrap}
.task-card textarea{flex:1;min-width:240px;min-height:44px}
.plain{list-style:none;padding:0;margin:0}
.plain li{padding:8px 4px;border-top:1px solid var(--line)}
.plain li:last-child{border-bottom:1px solid var(--line)}
.progress-note{color:var(--muted);font-size:.9rem;margin:0}
/* Hai cot: kich ban ben trai, video co dinh ben phai */
.cols{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:40px;align-items:start}
.side{position:sticky;top:20px}
.player{background:#262624;border-radius:14px;padding:10px}
.player video{display:block;width:100%;aspect-ratio:9/16;border-radius:6px;background:#000}
.formats{display:flex;gap:14px;margin:10px 2px 0;font-size:.9rem}
.formats a{color:#E8B9A3}
.empty{color:var(--muted);border:1px dashed var(--line);border-radius:10px;padding:28px;text-align:center}
/* Kich ban: moi canh mot hang */
.scene{display:grid;grid-template-columns:44px 132px minmax(0,1fr);gap:18px;padding:18px 0;border-top:1px solid var(--line)}
.scene:last-child{border-bottom:1px solid var(--line)}
.scene .no{font-family:var(--serif);font-size:1.7rem;font-weight:500;color:var(--gate);line-height:1}
.scene video{width:132px;aspect-ratio:9/16;border-radius:8px;background:var(--ink);display:block}
.scene-media{position:relative;width:132px}
.playscene{position:absolute;inset:0;width:100%;height:100%;background:transparent;border-radius:8px;padding:0;display:flex;align-items:center;justify-content:center}
.playscene span{width:46px;height:46px;border-radius:50%;background:rgba(20,20,19,.62);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.05rem}
.playscene:hover span{background:var(--cobalt)}
.scene .say{font-family:var(--serif);font-size:1.22rem;line-height:1.55;margin:0 0 6px;max-width:60ch}
.scene .see{color:var(--muted);font-size:.9rem;margin:0 0 10px;max-width:70ch}
.scene .meta{font-size:.85rem;color:var(--muted);margin-left:10px}
.scene audio{height:34px;vertical-align:middle;max-width:100%}
.none{font-size:.85rem;color:var(--muted)}
.badge{display:inline-block;margin-left:10px;font-size:.75rem;padding:2px 8px;border-radius:10px;background:#ebe7dc;color:var(--muted)}
.badge.draw{background:var(--gate-soft);color:var(--cobalt)}
/* Bang so lieu */
table{border-collapse:collapse;width:100%;background:var(--sheet);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--line)}
th{font-weight:600;color:var(--muted);font-size:.88rem}
td.num,th.num{text-align:right}
tr:last-child td{border-bottom:0}
tfoot td{font-weight:700;border-top:2px solid var(--ink)}
.figures{display:flex;flex-wrap:wrap;gap:0;border:1px solid var(--line);border-radius:10px;background:var(--sheet)}
.figures div{padding:12px 18px;border-right:1px solid var(--line)}
.figures div:last-child{border-right:0}
.figures b{display:block;font-family:var(--serif);font-weight:500;font-size:1.45rem}
.figures span{color:var(--muted);font-size:.85rem}
/* Bieu do token */
.legend{display:flex;gap:18px;font-size:.85rem;color:var(--muted);margin:6px 0 10px}
.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.k1{background:#257de0}.k2{background:#f47230}.k3{background:#00b894}
.bars{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.bar-row{display:grid;grid-template-columns:minmax(120px,300px) minmax(0,1fr) 110px;gap:12px;align-items:center}
.bar-label{font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-label a{color:var(--ink)}
.bar-track{display:flex;gap:2px;height:18px;border-left:1px solid var(--line)}
.bar-track i{display:block;height:100%;min-width:2px}
.bar-track i:last-child{border-radius:0 4px 4px 0}
.bar-value{text-align:right;font-size:.9rem;color:var(--muted)}
details.tbl,details.video-tokens{margin:8px 0 16px}
details summary{cursor:pointer;padding:6px 0}
details.video-tokens{border:1px solid var(--line);border-radius:12px;padding:8px 16px;background:var(--sheet)}
details.video-tokens table{margin-bottom:8px}
#tip{position:fixed;z-index:10;background:var(--ink);color:#fff;font-size:.82rem;padding:5px 9px;border-radius:6px;pointer-events:none}
.checks{list-style:none;padding:0;margin:0}
.checks li{padding:8px 0;border-top:1px solid var(--line);font-size:.93rem}
.checks li b{display:inline-block;min-width:52px}
.verdict{font-size:1.1rem;font-weight:700}
button{font:inherit;font-weight:500;border:0;border-radius:9px;padding:8px 14px;cursor:pointer;background:var(--cobalt);color:#fff}
button.approve{background:var(--cobalt);color:#fff}
button.quiet{background:transparent;color:var(--cobalt);border:1px solid var(--cobalt)}
textarea{width:100%;min-height:84px;font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:#fff}
.wait{font-size:.8rem;color:var(--muted)}
.list a.row{display:grid;grid-template-columns:110px minmax(0,1fr) 230px 130px;gap:16px;padding:16px 4px;border-top:1px solid var(--line);color:var(--ink);text-decoration:none;align-items:baseline}
.list a.row:hover{background:var(--sheet)}
.list a.row:last-child{border-bottom:1px solid var(--line)}
.list .title{font-family:var(--serif);font-weight:500;font-size:1.2rem}
.list .dim{color:var(--muted);font-size:.9rem}
.notice{border-left:4px solid var(--bad);background:var(--sheet);padding:14px 18px;border-radius:0 8px 8px 0}
@media (max-width:860px){
  .cols{grid-template-columns:1fr}
  .side{position:static;max-width:340px}
  .wrap{padding:20px}
  .top{padding:14px 20px}
  h1{font-size:1.8rem}
  .scene{grid-template-columns:30px 96px minmax(0,1fr);gap:12px}
  .scene video,.scene-media{width:96px}
  .list a.row{grid-template-columns:1fr;gap:2px}
}
/* O cho duyet */
.approve-card{background:var(--sheet);border:1px solid var(--gate);border-left:6px solid var(--gate);border-radius:14px;padding:18px 24px;margin:20px 0 32px}
.approve-card h2{margin:0 0 4px}
.read{padding-left:1.4em;margin:14px 0}
.read li{margin:0 0 12px}
.read li p{font-family:var(--serif);font-size:1.15rem;margin:0;max-width:62ch}
.read li span{color:var(--muted);font-size:.85rem}
.approve-video{height:420px;border-radius:10px;background:#262624;display:block;margin:12px 0}
.approve-actions{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-top:8px}
.approve-actions .fix{flex:1;min-width:260px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.approve-actions button.approve{padding:12px 20px;font-size:1rem}
/* Van phong 3D */
.office{display:grid;grid-template-columns:minmax(0,1fr) 540px;height:calc(100vh - 64px)}
#scene{position:relative;overflow:hidden;background:#c9e6f6;min-height:0}
#scene canvas{display:block}
.labels{position:absolute;top:0;left:0;pointer-events:none}
.hint{position:absolute;left:14px;bottom:10px;margin:0;font-size:.8rem;color:#3d5a73;background:rgba(255,255,255,.7);padding:4px 10px;border-radius:8px;pointer-events:none}
#roster{position:absolute;top:12px;left:14px;right:14px;z-index:3;display:flex;flex-wrap:nowrap;gap:8px;overflow-x:auto;padding:4px 2px;scrollbar-width:none}
#roster::-webkit-scrollbar{display:none}
#roster .chip{box-shadow:0 2px 8px rgba(20,20,19,.12);padding:7px 13px;font-size:.88rem;gap:7px}
.chip-text{display:flex;flex-direction:column;line-height:1.2;text-align:left}
.chip-text small{font-size:.7rem;color:var(--muted);font-weight:400}
#banner{position:absolute;top:66px;left:14px;right:14px;background:#fff;border-left:4px solid var(--bad);padding:10px 14px;border-radius:0 8px 8px 0;z-index:2}
.lbl{background:rgba(250,249,245,.94);border:1px solid var(--line);border-radius:10px;padding:5px 10px;font-size:12px;line-height:1.35;text-align:center;min-width:110px;max-width:190px;color:var(--ink)}
.lbl .nm{font-family:var(--serif);font-weight:600;font-size:13.5px}
.lbl .tk{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbl .tm{color:var(--muted);font-size:11px}
.lbl .bar{height:5px;background:#ebe7dc;border-radius:3px;overflow:hidden;margin:4px 0 2px}
.lbl .bar i{display:block;height:100%;background:var(--gate)}
.lbl.idle{min-width:0;padding:2px 8px;opacity:.9}.lbl.idle .nm{font-size:12px}
.lbl.work{border-color:var(--gate)}
.lbl.err{border-color:var(--bad)}.lbl.err .tk{color:var(--bad)}
.lbl.sel{box-shadow:0 0 0 2px var(--gate)}
.side3d{border-left:1px solid var(--line);display:flex;flex-direction:column;background:var(--sheet);min-height:0}
#info{flex:1;overflow:auto;padding:18px 22px;min-height:0}
#info h2{margin:4px 0 2px;font-size:1.5rem}
#info h3{font-family:var(--serif);font-weight:500;font-size:1.05rem;margin:18px 0 6px}
#info p{margin:4px 0}
.muted{color:var(--muted);font-size:.9rem}
.warn{color:var(--bad);font-size:.9rem;margin-top:14px!important}
.roster{list-style:none;padding:0;margin:14px 0 0}
.roster-chips{display:flex;flex-wrap:nowrap;gap:8px;margin:0 0 16px;overflow-x:auto;padding:2px 2px 8px}
.chip{flex:0 0 auto;white-space:nowrap;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:22px;padding:9px 16px;font-size:.95rem;font-weight:500;display:flex;align-items:center;gap:8px}
.chip .dot{margin:0}
.chip.on{border-color:var(--gate);background:var(--gate-soft)}
.chip.bug{color:var(--bad);border-color:var(--bad)}
.tasks.pick li{cursor:pointer;padding:6px 6px;border-radius:6px}
.tasks.pick li:hover{background:#fff}
.tasks.pick li.on{background:var(--gate-soft)}
.tasks.small li{font-size:.8rem;padding:3px 6px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button.more{background:transparent;color:var(--cobalt);padding:4px 6px;font-size:.82rem}
button.small{padding:4px 10px;font-size:.78rem;border-radius:7px}
.st{font-size:.78rem;color:var(--muted)}
.st.done{color:var(--ok)}.st.blocked{color:var(--bad)}.st.in_progress{color:var(--gate)}
#assign{margin-top:16px}
#assign summary{font-family:var(--serif);font-size:1.05rem;cursor:pointer;padding:6px 0}
#assignForm{display:flex;flex-direction:column;gap:8px;margin-top:6px}
#assignForm label{display:flex;flex-direction:column;font-size:.82rem;color:var(--muted);gap:3px}
#assignForm input{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink)}
#assignForm textarea{min-height:64px}
#assignForm .row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#assignForm button{align-self:flex-start}
.assign-msg{font-size:.85rem;color:var(--muted)}
.roster li{display:grid;grid-template-columns:14px 1fr;column-gap:8px;padding:9px 6px;border-top:1px solid var(--line);cursor:pointer}
.roster li:hover{background:#fff}
.roster li span:last-child{grid-column:2;color:var(--muted);font-size:.85rem}
.dot{width:9px;height:9px;border-radius:50%;margin-top:7px;background:#b9b5a8}
.dot.work{background:var(--gate)}.dot.err{background:var(--bad)}
.tasks{list-style:none;padding:0;margin:0}
.tasks li{padding:6px 0;border-top:1px solid var(--line);font-size:.9rem}
.bigbar{height:8px;background:#ebe7dc;border-radius:4px;overflow:hidden;margin:8px 0 4px}
.bigbar i{display:block;height:100%;background:var(--gate)}
.figs{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:12px;background:#fff}
.figs div{padding:8px 10px;border-right:1px solid var(--line)}
.figs div:last-child{border-right:0}
.figs b{display:block;font-family:var(--serif);font-weight:500;font-size:1.05rem}
.figs span{color:var(--muted);font-size:.75rem}
#chat{height:48vh;min-height:320px;border-top:1px solid var(--line);display:flex;flex-direction:column;background:var(--paper)}
.chat-title{display:flex;justify-content:space-between;align-items:center;gap:10px}
.chat-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#chatHead{padding:10px 16px;font-weight:600;font-size:.9rem;border-bottom:1px solid var(--line)}
#chatHead span{display:block;font-weight:400;color:var(--muted);font-size:.78rem;margin-top:2px}
#chatLog{flex:1;overflow:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px;min-height:0}
.msg{max-width:88%;padding:7px 11px;border-radius:12px;font-size:.87rem;white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid var(--line)}
.msg.mine{align-self:flex-end;background:var(--gate-soft);border-color:transparent}
.msg small{display:block;color:var(--muted);font-size:.72rem;margin-bottom:2px}
#chatForm{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line);align-items:flex-end}
#chatForm textarea{min-height:110px;height:110px;max-height:260px;border-radius:12px;padding:10px 12px;resize:vertical;line-height:1.45}
@media (max-width:900px){.office{grid-template-columns:1fr;height:auto}#scene{height:62vh}.side3d{border-left:0;border-top:1px solid var(--line)}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

// Dau trang. "here" la muc menu dang mo: "video" hoac "tokens"
function pageHead(title, here, mainClass) {
  let videoClass = "";
  let tokenClass = "";
  let officeClass = "";
  let progressClass = "";
  if (here === "progress") progressClass = ' class="here"';
  if (here === "video") videoClass = ' class="here"';
  if (here === "tokens") tokenClass = ' class="here"';
  if (here === "office") officeClass = ' class="here"';
  if (mainClass === undefined) mainClass = "wrap";
  return '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + escapeHtml(title) + " - Studio</title>" +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap" rel="stylesheet">' +
    "<style>" + css + "</style></head><body>" +
    '<header class="top"><a class="brand" href="/">Studio</a><nav><a href="/"' + videoClass + '>Video</a> &nbsp; <a href="/progress"' + progressClass + '>Tiến độ</a> &nbsp; <a href="/office"' + officeClass + '>Văn phòng</a> &nbsp; <a href="/tokens"' + tokenClass + ">Token</a></nav></header>" +
    '<main class="' + mainClass + '">';
}
const pageStart = pageHead("Thông báo", "");
const pageEnd = "</main></body></html>";

// Cac cong (Approve script, Approve video) dang cho nguoi dung duyet, o moi video.
// Cong san sang khi task ngay truoc da xong. Tra ve null neu khong goi duoc Paperclip.
async function pendingApprovals() {
  const issues = await callPaperclip("GET", "/companies/" + companyId + "/issues?status=backlog,todo,in_progress,in_review,blocked,done&limit=200");
  if (issues === null) {
    return null;
  }
  const byId = {};
  for (let i = 0; i < issues.length; i++) {
    byId[issues[i].id] = issues[i];
  }
  const result = [];
  for (let i = 0; i < issues.length; i++) {
    const gate = issues[i];
    if (isGate(gate) === false || gate.status === "done" || gate.status === "cancelled" || !gate.parentId) {
      continue;
    }
    const parent = byId[gate.parentId];
    if (parent === undefined) {
      continue;
    }
    // Tim task ngay truoc cong trong cung video
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
      result.push({ gate: gate, parent: parent });
    }
  }
  return result;
}

// Ke kich ban de doc: moi canh mot doan
function scriptText(name) {
  const script = readJson(path.join(clipsDir, name, "script.json"));
  if (script === null) {
    return '<p class="empty">Không tìm thấy clips/' + escapeHtml(name) + "/script.json.</p>";
  }
  let total = 0;
  for (let i = 0; i < script.scenes.length; i++) {
    total = total + script.scenes[i].duration_sec;
  }
  let html = '<p class="sub">' + escapeHtml(script.title) + ": " + script.scenes.length + " cảnh, " + total + " giây (mục tiêu " + script.target_sec + " giây).</p>";
  html = html + '<ol class="read">';
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    html = html + "<li><p>" + escapeHtml(scene.narration) + '</p><span>' + scene.duration_sec + " giây. Hình: " + escapeHtml(scene.visual) + "</span></li>";
  }
  return html + "</ol>";
}

// Mot o duyet: noi dung can duyet va hai nut
function approvalCard(item, back) {
  const name = item.parent.identifier;
  const isScript = String(item.gate.title).toLowerCase().indexOf("script") >= 0;
  let html = '<section class="approve-card">';
  if (isScript) {
    html = html + "<h2>Duyệt kịch bản: " + escapeHtml(item.parent.title) + "</h2>";
    html = html + scriptText(name);
  } else {
    html = html + "<h2>Duyệt video: " + escapeHtml(item.parent.title) + "</h2>";
    const fileBase = "/files/" + encodeURIComponent(name) + "/";
    if (fs.existsSync(path.join(clipsDir, name, "final", "video_9x16.mp4"))) {
      html = html + '<video class="approve-video" controls preload="metadata" src="' + fileBase + 'final/video_9x16.mp4"></video>';
    } else {
      html = html + '<p class="empty">Chưa thấy file video cuối.</p>';
    }
    const review = readJson(path.join(clipsDir, name, "review.json"));
    if (review !== null && review.passed === true) {
      html = html + '<p class="ok">Reviewer: đạt mọi mục kiểm tra.</p>';
    }
    if (review !== null && review.passed === false) {
      html = html + '<p class="bad">Reviewer: chưa đạt.</p>';
    }
  }
  html = html + '<div class="approve-actions">' +
    '<form method="post" action="/approve"><input type="hidden" name="clip" value="' + escapeHtml(name) + '">' +
    '<input type="hidden" name="task" value="' + escapeHtml(item.gate.identifier) + '"><input type="hidden" name="back" value="' + back + '">' +
    '<button class="approve">Duyệt, cho chạy tiếp</button></form>' +
    '<form method="post" action="/comment" class="fix"><input type="hidden" name="clip" value="' + escapeHtml(name) + '"><input type="hidden" name="back" value="' + back + '">' +
    '<textarea name="text" aria-label="Yêu cầu sửa" placeholder="Yêu cầu sửa"></textarea><button class="quiet">Gửi yêu cầu sửa</button></form>' +
    "</div>";
  html = html + '<p class="progress-note">' + escapeHtml(item.gate.identifier) + ' trong video ' + escapeHtml(name) + '. <a href="/clip/' + encodeURIComponent(name) + '">Mở trang video</a></p>';
  return html + "</section>";
}

// Trang chu: viec cho duyet va danh sach video
async function homePage() {
  let html = pageHead("Video", "video");
  const pending = await pendingApprovals();
  if (pending !== null && pending.length > 0) {
    html = html + '<p class="approve-card"><b>Có ' + pending.length + ' việc chờ bạn duyệt.</b> <a href="/progress">Mở tab Tiến độ để đọc và duyệt</a></p>';
  }
  html = html + "<h1>Video</h1>";
  html = html + '<div class="list" style="margin-top:28px">';
  const names = fs.readdirSync(clipsDir);
  let count = 0;
  for (let i = names.length - 1; i >= 0; i--) {
    const full = path.join(clipsDir, names[i]);
    if (fs.statSync(full).isDirectory() === false) {
      continue;
    }
    count = count + 1;
    const script = readJson(path.join(full, "script.json"));
    const review = readJson(path.join(full, "review.json"));
    let title = "Chưa có kịch bản";
    let target = "";
    if (script !== null) {
      title = script.title;
      target = "mục tiêu " + script.target_sec + " giây";
    }
    // So canh tu ve trong video
    const modes = sceneModes(full);
    const modeKeys = Object.keys(modes);
    let drawn = 0;
    for (let k = 0; k < modeKeys.length; k++) {
      if (modes[modeKeys[k]].mode === "draw") {
        drawn = drawn + 1;
      }
    }
    if (modeKeys.length > 0) {
      target = target + ", " + drawn + "/" + modeKeys.length + " cảnh tự vẽ";
    }
    let state = "Đang làm";
    if (fs.existsSync(path.join(full, "final", "video_9x16.mp4"))) {
      state = "Đã có video";
    }
    if (review !== null && review.passed === true) {
      state = '<span class="ok">Reviewer đạt</span>';
    }
    if (review !== null && review.passed === false) {
      state = '<span class="bad">Reviewer chưa đạt</span>';
    }
    html = html + '<a class="row" href="/clip/' + encodeURIComponent(names[i]) + '"><span class="dim">' + escapeHtml(names[i]) +
      '</span><span class="title">' + escapeHtml(title) + '</span><span class="dim">' + target + "</span><span>" + state + "</span></a>";
  }
  html = html + "</div>";
  if (count === 0) {
    html = html + '<p class="empty">Chưa có video nào.</p>';
  }
  return html + pageEnd;
}

// Trang mot video
async function clipPage(name) {
  const folder = path.join(clipsDir, name);
  const fileBase = "/files/" + encodeURIComponent(name) + "/";
  const script = readJson(path.join(folder, "script.json"));
  let title = name;
  if (script !== null) {
    title = script.title;
  }
  let html = pageHead(title, "video");
  html = html + '<p class="code">' + escapeHtml(name) + "</p><h1>" + escapeHtml(title) + "</h1>";

  if (script !== null) {
    let total = 0;
    for (let i = 0; i < script.scenes.length; i++) {
      total = total + script.scenes[i].duration_sec;
    }
    html = html + '<p class="sub">' + script.scenes.length + " cảnh, kịch bản " + total + " giây, mục tiêu " + script.target_sec + " giây.</p>";
  }

  // O duyet noi bat neu video nay dang cho duyet
  const pending = await pendingApprovals();
  if (pending !== null) {
    for (let i = 0; i < pending.length; i++) {
      if (pending[i].parent.identifier === name) {
        html = html + approvalCard(pending[i], "clip");
      }
    }
  }

  // Dai quy trinh va so lieu tu Paperclip
  const tasks = await loadTasks(name);
  html = html + stripSection(name, tasks);

  html = html + '<div class="cols"><div>';

  // Kich ban
  html = html + "<h2>Kịch bản</h2>";
  if (script === null) {
    html = html + '<p class="empty">Scriptwriter chưa viết xong kịch bản.</p>';
  } else {
    const modes = sceneModes(folder);
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      let badge = "";
      const info = modes[String(scene.id)];
      if (info !== undefined && info.mode === "draw") {
        badge = '<span class="badge draw">Tự vẽ: ' + escapeHtml(info.drawing) + "</span>";
      } else if (info !== undefined) {
        badge = '<span class="badge">Kho hình</span>';
      }
      let number = String(scene.id);
      if (number.length < 2) {
        number = "0" + number;
      }
      const audioFile = "audio/scene_" + number + ".wav";
      const videoFile = "scenes/scene_" + number + ".mp4";
      let videoCell = '<span class="none">chưa dựng</span>';
      if (fs.existsSync(path.join(folder, videoFile))) {
        // Bam vao hinh: phat video canh va giong doc cung luc
        videoCell = '<div class="scene-media"><video muted playsinline preload="metadata" src="' + fileBase + videoFile + '"></video>' +
          '<button type="button" class="playscene" aria-label="Phát cảnh ' + scene.id + ' kèm giọng đọc"><span>&#9654;</span></button></div>';
      }
      let audioCell = '<span class="none">chưa có giọng đọc</span>';
      if (fs.existsSync(path.join(folder, audioFile))) {
        audioCell = '<audio controls preload="metadata" src="' + fileBase + audioFile + '"></audio>';
      }
      html = html + '<div class="scene"><div class="no">' + scene.id + "</div><div>" + videoCell + "</div><div>" +
        '<p class="say">' + escapeHtml(scene.narration) + "</p>" +
        '<p class="see">' + escapeHtml(scene.visual) + "</p>" +
        audioCell + '<span class="meta">' + scene.duration_sec + " giây</span>" + badge + "</div></div>";
    }
  }

  // Reviewer
  html = html + "<h2>Kiểm tra của Reviewer</h2>";
  const review = readJson(path.join(folder, "review.json"));
  if (review === null) {
    html = html + '<p class="empty">Reviewer chưa kiểm tra.</p>';
  } else {
    if (review.passed === true) {
      html = html + '<p class="verdict ok">Đạt mọi mục kiểm tra</p>';
    } else {
      html = html + '<p class="verdict bad">Chưa đạt</p>';
    }
    html = html + '<ul class="checks">';
    for (let i = 0; i < review.checks.length; i++) {
      const check = review.checks[i];
      let mark = '<b class="bad">lỗi</b>';
      if (check.ok === true) {
        mark = '<b class="ok">ok</b>';
      }
      html = html + "<li>" + mark + " " + escapeHtml(check.detail) + "</li>";
    }
    html = html + "</ul>";
  }

  // Token va yeu cau sua
  html = html + await tokenSection(name);
  if (tasks !== null) {
    html = html + "<h2>Yêu cầu sửa</h2>" +
      '<form method="post" action="/comment"><input type="hidden" name="clip" value="' + escapeHtml(name) + '">' +
      '<textarea name="text" aria-label="Nội dung yêu cầu sửa" placeholder="Yêu cầu sửa"></textarea>' +
      '<p style="margin:10px 0 0"><button class="quiet">Gửi cho Producer</button></p></form>';
  }

  html = html + '</div><aside class="side">';

  // Video cuoi
  if (fs.existsSync(path.join(folder, "final", "video_9x16.mp4"))) {
    html = html + '<div class="player"><video controls preload="metadata" src="' + fileBase + 'final/video_9x16.mp4"></video><div class="formats">';
    const formats = ["9x16", "1x1", "4x5", "16x9"];
    for (let i = 0; i < formats.length; i++) {
      if (fs.existsSync(path.join(folder, "final", "video_" + formats[i] + ".mp4"))) {
        html = html + '<a href="' + fileBase + "final/video_" + formats[i] + '.mp4" target="_blank">' + formats[i].replace("x", ":") + "</a>";
      }
    }
    html = html + "</div></div>";
  } else {
    html = html + '<div class="empty">Editor chưa xuất video cuối.</div>';
  }

  // Dong video khi moi buoc da xong
  if (tasks !== null && tasks.parent.status !== "done" && tasks.children.length > 0) {
    let allDone = true;
    for (let i = 0; i < tasks.children.length; i++) {
      if (tasks.children[i].status !== "done") {
        allDone = false;
      }
    }
    if (allDone === true) {
      html = html + '<form method="post" action="/close" style="margin-top:16px"><input type="hidden" name="clip" value="' + escapeHtml(name) + '">' +
        '<button>Đóng video</button></form>';
    }
  }
  if (tasks !== null && tasks.parent.status === "done") {
    html = html + '<p class="progress-note ok" style="margin-top:12px">Video đã đóng.</p>';
  }

  html = html + "</aside></div>";
  html = html + "<script>" + scenePlayerScript + "</script>";
  return html + pageEnd;
}

// Nut phat canh: chay video canh (cam) va file giong cung luc, bam lan nua de dung
const scenePlayerScript = `
function stopAllScenes() {
  const media = document.querySelectorAll(".scene video, .scene audio");
  for (let i = 0; i < media.length; i++) {
    media[i].pause();
  }
  const buttons = document.querySelectorAll(".playscene span");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].innerHTML = "&#9654;";
  }
}
document.addEventListener("click", function (event) {
  const button = event.target.closest(".playscene");
  if (button === null) {
    return;
  }
  const row = button.closest(".scene");
  const video = row.querySelector("video");
  const audio = row.querySelector("audio");
  const playing = video.paused === false;
  stopAllScenes();
  if (playing) {
    return;
  }
  video.currentTime = 0;
  video.play();
  if (audio !== null) {
    audio.currentTime = 0;
    audio.play();
  }
  button.querySelector("span").innerHTML = "&#10074;&#10074;";
});
const sceneVideos = document.querySelectorAll(".scene video");
for (let i = 0; i < sceneVideos.length; i++) {
  sceneVideos[i].addEventListener("ended", function () {
    const span = sceneVideos[i].parentNode.querySelector(".playscene span");
    span.innerHTML = "&#9654;";
  });
}
`;

// Dai 8 buoc, nut duyet nam ngay tren cong
function stripSection(name, tasks, names, back) {
  if (tasks === null) {
    return '<p class="notice">Không đọc được tiến độ từ Paperclip.</p>';
  }
  let html = '<div class="strip">';
  let doneCount = 0;
  for (let i = 0; i < tasks.children.length; i++) {
    const task = tasks.children[i];
    if (task.status === "done") {
      doneCount = doneCount + 1;
    }
    let classes = "step " + task.status;
    if (isGate(task)) {
      classes = classes + " gate";
    }
    html = html + '<div class="' + classes + '"><span class="n">Bước ' + (i + 1) + '</span><span class="t">' +
      escapeHtml(task.title) + '</span><span class="s">' + statusText(task.status) + ', <span style="white-space:nowrap">' + escapeHtml(task.identifier) + "</span></span>";
    if (names !== undefined && task.assigneeAgentId && names[task.assigneeAgentId] !== undefined) {
      html = html + '<span class="s who">' + escapeHtml(names[task.assigneeAgentId]) + "</span>";
    }
    if (isGate(task) && task.status !== "done" && task.status !== "cancelled") {
      let previousDone = false;
      if (i > 0 && tasks.children[i - 1].status === "done") {
        previousDone = true;
      }
      if (previousDone === true) {
        html = html + '<form method="post" action="/approve"><input type="hidden" name="clip" value="' + escapeHtml(name) + '">' +
          '<input type="hidden" name="task" value="' + escapeHtml(task.identifier) + '">' +
          (back !== undefined ? '<input type="hidden" name="back" value="' + back + '">' : "") + '<button class="approve">Duyệt</button></form>';
      } else {
        html = html + '<div class="wait">Chờ bước trước</div>';
      }
    }
    html = html + "</div>";
  }
  html = html + "</div>";
  // Task cha bi chan trong luc cac buoc chay la binh thuong (Producer de blocked)
  let parentText = statusText(tasks.parent.status);
  if (tasks.parent.status === "blocked" && doneCount < tasks.children.length) {
    parentText = "đang chạy các bước";
  }
  if (tasks.parent.status === "blocked" && doneCount === tasks.children.length) {
    parentText = "chờ bạn đóng video";
  }
  html = html + '<p class="progress-note">Xong ' + doneCount + " trên " + tasks.children.length + " bước. Task cha " +
    escapeHtml(tasks.parent.identifier) + ": " + parentText + ".</p>";
  return html;
}

// So token cua ca cay task
async function tokenSection(name) {
  const cost = await callPaperclip("GET", "/issues/" + encodeURIComponent(name) + "/cost-summary");
  let html = "<h2>Token của video này</h2>";
  if (cost === null) {
    return html + '<p class="empty">Không đọc được số token từ Paperclip.</p>';
  }
  html = html + '<div class="figures">' +
    "<div><b>" + formatNumber(cost.inputTokens) + "</b><span>input</span></div>" +
    "<div><b>" + formatNumber(cost.cachedInputTokens) + "</b><span>input từ cache</span></div>" +
    "<div><b>" + formatNumber(cost.outputTokens) + "</b><span>output</span></div>" +
    "<div><b>" + formatNumber(cost.runCount) + "</b><span>lần chạy</span></div>" +
    "<div><b>" + Math.round(Number(cost.runtimeMs || 0) / 60000) + " phút</b><span>thời gian chạy</span></div>" +
    "</div>";
  return html;
}

// Trang token: tong, theo video (tung buoc), theo agent, theo hang/model.
// Bieu do thanh ngang xep chong: input, input tu cache, output.

// Cong 3 loai token
function tokenTotal(row) {
  return Number(row.input || 0) + Number(row.cached || 0) + Number(row.output || 0);
}

// Doi ket qua cost-summary cua Paperclip sang dang gon
function costRow(cost) {
  if (cost === null) {
    return { input: 0, cached: 0, output: 0, runs: 0, ms: 0 };
  }
  return {
    input: Number(cost.inputTokens || 0),
    cached: Number(cost.cachedInputTokens || 0),
    output: Number(cost.outputTokens || 0),
    runs: Number(cost.runCount || 0),
    ms: Number(cost.runtimeMs || 0),
  };
}

// Chu thich mau, dat tren bieu do
const chartLegend = '<div class="legend"><span><i class="k1"></i>Input</span><span><i class="k2"></i>Input từ cache</span><span><i class="k3"></i>Output</span></div>';

// Bieu do thanh ngang: moi hang mot nhan va mot thanh 3 doan.
// rows: [{ label, href, input, cached, output }]
function barChart(rows) {
  let max = 0;
  for (let i = 0; i < rows.length; i++) {
    if (tokenTotal(rows[i]) > max) {
      max = tokenTotal(rows[i]);
    }
  }
  if (max === 0) {
    return '<p class="empty">Chưa có token nào được ghi.</p>';
  }
  let html = chartLegend + '<div class="bars">';
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let label = escapeHtml(row.label);
    if (row.href) {
      label = '<a href="' + row.href + '">' + label + "</a>";
    }
    const parts = [
      { cls: "k1", name: "Input", value: row.input },
      { cls: "k2", name: "Input từ cache", value: row.cached },
      { cls: "k3", name: "Output", value: row.output },
    ];
    html = html + '<div class="bar-row"><div class="bar-label">' + label + '</div><div class="bar-track">';
    for (let k = 0; k < parts.length; k++) {
      const width = (parts[k].value / max) * 100;
      if (parts[k].value > 0) {
        html = html + '<i class="' + parts[k].cls + '" style="width:' + width.toFixed(2) + '%" data-tip="' +
          escapeHtml(row.label + " · " + parts[k].name + ": " + formatNumber(parts[k].value)) + '"></i>';
      }
    }
    html = html + '</div><div class="bar-value">' + formatNumber(tokenTotal(row)) + "</div></div>";
  }
  return html + "</div>";
}

// Bang so lieu di kem bieu do
function tokenTable(firstHeader, rows, withTime) {
  let html = "<table><thead><tr><th>" + firstHeader + '</th><th class="num">Input</th><th class="num">Input từ cache</th><th class="num">Output</th><th class="num">Tổng</th><th class="num">Lần chạy</th>';
  if (withTime === true) {
    html = html + '<th class="num">Phút chạy</th>';
  }
  html = html + "</tr></thead><tbody>";
  const sum = { input: 0, cached: 0, output: 0, runs: 0, ms: 0 };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let label = escapeHtml(row.label);
    if (row.href) {
      label = '<a href="' + row.href + '">' + label + "</a>";
    }
    html = html + "<tr><td>" + label + '</td><td class="num">' + formatNumber(row.input) + '</td><td class="num">' + formatNumber(row.cached) +
      '</td><td class="num">' + formatNumber(row.output) + '</td><td class="num">' + formatNumber(tokenTotal(row)) + '</td><td class="num">' + formatNumber(row.runs);
    if (withTime === true) {
      html = html + '</td><td class="num">' + Math.round(Number(row.ms || 0) / 60000);
    }
    html = html + "</td></tr>";
    sum.input = sum.input + Number(row.input || 0);
    sum.cached = sum.cached + Number(row.cached || 0);
    sum.output = sum.output + Number(row.output || 0);
    sum.runs = sum.runs + Number(row.runs || 0);
    sum.ms = sum.ms + Number(row.ms || 0);
  }
  html = html + '</tbody><tfoot><tr><td>Tổng</td><td class="num">' + formatNumber(sum.input) + '</td><td class="num">' + formatNumber(sum.cached) +
    '</td><td class="num">' + formatNumber(sum.output) + '</td><td class="num">' + formatNumber(tokenTotal(sum)) + '</td><td class="num">' + formatNumber(sum.runs);
  if (withTime === true) {
    html = html + '</td><td class="num">' + Math.round(sum.ms / 60000);
  }
  return html + "</td></tr></tfoot></table>";
}

async function tokensPage() {
  let html = pageHead("Token", "tokens") + "<h1>Token</h1>";
  const byAgent = await callPaperclip("GET", "/companies/" + companyId + "/costs/by-agent");
  const issues = await callPaperclip("GET", "/companies/" + companyId + "/issues?status=backlog,todo,in_progress,in_review,blocked,done,cancelled&limit=200");
  if (byAgent === null || issues === null) {
    return html + '<p class="notice">Không đọc được số token từ Paperclip.</p>' + pageEnd;
  }
  let agents = await callPaperclip("GET", "/companies/" + companyId + "/agents");
  if (agents === null) {
    agents = [];
  }
  const names = {};
  for (let i = 0; i < agents.length; i++) {
    names[agents[i].id] = agents[i].name;
  }

  // Tong cua ca company, cong tu bang theo agent
  const total = { input: 0, cached: 0, output: 0, runs: 0 };
  const agentRows = [];
  for (let i = 0; i < byAgent.length; i++) {
    const row = byAgent[i];
    let agentName = row.agentName;
    if (agentName === null || agentName === undefined) {
      agentName = "Không gắn agent";
    }
    const item = {
      label: agentName,
      input: Number(row.inputTokens || 0),
      cached: Number(row.cachedInputTokens || 0),
      output: Number(row.outputTokens || 0),
      runs: Number(row.apiRunCount || 0) + Number(row.subscriptionRunCount || 0),
    };
    agentRows.push(item);
    total.input = total.input + item.input;
    total.cached = total.cached + item.cached;
    total.output = total.output + item.output;
    total.runs = total.runs + item.runs;
  }
  agentRows.sort(function (a, b) {
    return tokenTotal(b) - tokenTotal(a);
  });

  // Video = task cha co task con
  const hasChildren = {};
  for (let i = 0; i < issues.length; i++) {
    if (issues[i].parentId) {
      hasChildren[issues[i].parentId] = true;
    }
  }
  const videos = [];
  for (let i = 0; i < issues.length; i++) {
    if (hasChildren[issues[i].id] === true) {
      videos.push(issues[i]);
    }
  }
  videos.sort(function (a, b) {
    return taskNumber(b.identifier) - taskNumber(a.identifier);
  });

  // Token tung video va tung buoc trong video
  const videoRows = [];
  const details = [];
  const videoSum = { input: 0, cached: 0, output: 0 };
  for (let v = 0; v < videos.length; v++) {
    const video = videos[v];
    const whole = costRow(await callPaperclip("GET", "/issues/" + encodeURIComponent(video.identifier) + "/cost-summary"));
    whole.label = video.identifier + " " + video.title;
    whole.href = "/clip/" + encodeURIComponent(video.identifier);
    videoRows.push(whole);
    videoSum.input = videoSum.input + whole.input;
    videoSum.cached = videoSum.cached + whole.cached;
    videoSum.output = videoSum.output + whole.output;

    const children = [];
    for (let i = 0; i < issues.length; i++) {
      if (issues[i].parentId === video.id) {
        children.push(issues[i]);
      }
    }
    children.sort(function (a, b) {
      return taskNumber(a.identifier) - taskNumber(b.identifier);
    });
    const stepRows = [];
    const childSum = { input: 0, cached: 0, output: 0, runs: 0, ms: 0 };
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child.assigneeAgentId) {
        continue; // cong duyet, khong ton token
      }
      const row = costRow(await callPaperclip("GET", "/issues/" + encodeURIComponent(child.identifier) + "/cost-summary"));
      let who = names[child.assigneeAgentId];
      if (who === undefined) {
        who = "?";
      }
      row.label = who + " (" + child.identifier + ")";
      stepRows.push(row);
      childSum.input = childSum.input + row.input;
      childSum.cached = childSum.cached + row.cached;
      childSum.output = childSum.output + row.output;
      childSum.runs = childSum.runs + row.runs;
      childSum.ms = childSum.ms + row.ms;
    }
    // Phan con lai cua ca cay la cua task cha (Producer lap ke hoach, tra loi comment)
    const own = {
      label: "Producer (" + video.identifier + ")",
      input: Math.max(0, whole.input - childSum.input),
      cached: Math.max(0, whole.cached - childSum.cached),
      output: Math.max(0, whole.output - childSum.output),
      runs: Math.max(0, whole.runs - childSum.runs),
      ms: Math.max(0, whole.ms - childSum.ms),
    };
    stepRows.unshift(own);
    details.push({ video: video, whole: whole, steps: stepRows });
  }

  // 1. So tong
  let average = 0;
  if (videos.length > 0) {
    average = Math.round(tokenTotal(videoSum) / videos.length);
  }
  const other = Math.max(0, tokenTotal(total) - tokenTotal(videoSum));
  html = html + '<div class="figures" style="margin-top:24px">' +
    "<div><b>" + formatNumber(tokenTotal(total)) + "</b><span>tổng token</span></div>" +
    "<div><b>" + formatNumber(total.input) + "</b><span>input</span></div>" +
    "<div><b>" + formatNumber(total.cached) + "</b><span>input từ cache</span></div>" +
    "<div><b>" + formatNumber(total.output) + "</b><span>output</span></div>" +
    "<div><b>" + formatNumber(total.runs) + "</b><span>lần chạy</span></div>" +
    "<div><b>" + videos.length + "</b><span>video</span></div>" +
    "<div><b>" + formatNumber(average) + "</b><span>token trung bình mỗi video</span></div>" +
    "<div><b>" + formatNumber(other) + "</b><span>ngoài video (chat, việc riêng)</span></div>" +
    "</div>";

  // 2. Theo video
  html = html + "<h2>Theo video</h2>";
  html = html + barChart(videoRows);
  html = html + '<details class="tbl"><summary>Xem bảng số</summary>' + tokenTable("Video", videoRows, true) + "</details>";

  // 3. Chi tiet tung video: moi buoc mot thanh
  html = html + "<h2>Từng bước trong video</h2>";
  if (details.length === 0) {
    html = html + '<p class="empty">Chưa có video.</p>';
  }
  for (let i = 0; i < details.length; i++) {
    const item = details[i];
    let open = "";
    if (i === 0) {
      open = " open";
    }
    html = html + '<details class="video-tokens"' + open + "><summary><b>" + escapeHtml(item.video.identifier) + "</b> " + escapeHtml(item.video.title) +
      ' <span class="muted">' + formatNumber(tokenTotal(item.whole)) + " token, " + item.whole.runs + " lần chạy, " + Math.round(item.whole.ms / 60000) + " phút</span></summary>";
    html = html + barChart(item.steps) + tokenTable("Bước", item.steps, true) + "</details>";
  }

  // 4. Theo agent
  html = html + "<h2>Theo agent</h2>";
  html = html + barChart(agentRows);
  html = html + '<details class="tbl"><summary>Xem bảng số</summary>' + tokenTable("Agent", agentRows, false) + "</details>";

  // 5. Theo hang va model (tach rieng, khong cong chung)
  const byProvider = await callPaperclip("GET", "/companies/" + companyId + "/costs/by-provider");
  if (byProvider !== null) {
    html = html + '<h2>Theo hãng và model</h2><table><thead><tr><th>Hãng</th><th>Model</th><th class="num">Input</th><th class="num">Input từ cache</th><th class="num">Output</th></tr></thead><tbody>';
    for (let i = 0; i < byProvider.length; i++) {
      const row = byProvider[i];
      html = html + "<tr><td>" + escapeHtml(row.provider) + "</td><td>" + escapeHtml(row.model) + '</td><td class="num">' + formatNumber(row.inputTokens) +
        '</td><td class="num">' + formatNumber(row.cachedInputTokens) + '</td><td class="num">' + formatNumber(row.outputTokens) + "</td></tr>";
    }
    html = html + "</tbody></table>";
  }
  html = html + '<div id="tip" role="tooltip" hidden></div><script>' + tooltipScript + "</script>";
  return html + pageEnd;
}

// Hien so khi re chuot len mot doan cua thanh
const tooltipScript = `
const tip = document.getElementById("tip");
document.addEventListener("mousemove", function (event) {
  const target = event.target.closest("[data-tip]");
  if (target === null) {
    tip.hidden = true;
    return;
  }
  tip.textContent = target.getAttribute("data-tip");
  tip.hidden = false;
  tip.style.left = (event.clientX + 14) + "px";
  tip.style.top = (event.clientY + 14) + "px";
});
`;


// ---------- Tab Tien do ----------
// Moi viec can nguoi dung duyet hoac xu ly nam o day, khong can mo Paperclip.

// Comment cuoi cung cua mot task (thuong la ly do agent chuyen blocked)
async function lastComment(code) {
  const comments = await callPaperclip("GET", "/issues/" + encodeURIComponent(code) + "/comments?order=asc&limit=50");
  if (comments === null || comments.length === 0) {
    return "";
  }
  return String(comments[comments.length - 1].body || "");
}

// O xu ly mot task bi chan hoac dang cho xet
async function taskCard(task, names, byId) {
  let who = "chưa giao";
  if (task.assigneeAgentId && names[task.assigneeAgentId] !== undefined) {
    who = names[task.assigneeAgentId];
  }
  let cls = "task-card";
  if (task.status === "in_review") {
    cls = "task-card review";
  }
  let html = '<section class="' + cls + '"><p><b>' + escapeHtml(task.identifier) + "</b> " + escapeHtml(task.title) + "</p>";
  html = html + '<p class="muted">' + escapeHtml(who) + ", " + statusText(task.status);
  if (task.parentId && byId[task.parentId] !== undefined) {
    const parent = byId[task.parentId];
    html = html + ', thuộc <a href="/clip/' + encodeURIComponent(parent.identifier) + '">' + escapeHtml(parent.identifier) + "</a> " + escapeHtml(parent.title);
  }
  html = html + "</p>";
  const last = await lastComment(task.identifier);
  if (last !== "") {
    html = html + '<div class="reason">' + escapeHtml(last) + "</div>";
  }
  html = html + '<form method="post" action="/task-retry"><input type="hidden" name="task" value="' + escapeHtml(task.identifier) + '">' +
    '<textarea name="text" aria-label="Ghi chú cho agent" placeholder="Ghi chú cho agent"></textarea>' +
    '<button class="quiet">Gửi và chạy lại</button></form>';
  if (task.status === "in_review") {
    html = html + '<form method="post" action="/task-done"><input type="hidden" name="task" value="' + escapeHtml(task.identifier) + '"><button class="approve">Duyệt, đánh dấu xong</button></form>';
  }
  return html + "</section>";
}

async function progressPage() {
  let html = pageHead("Tiến độ", "progress");
  html = html + "<h1>Tiến độ</h1>";
  const issues = await callPaperclip("GET", "/companies/" + companyId + "/issues?status=backlog,todo,in_progress,in_review,blocked,done,cancelled&limit=200");
  if (issues === null) {
    return html + '<p class="notice">Không đọc được Paperclip.</p>' + pageEnd;
  }
  let agents = await callPaperclip("GET", "/companies/" + companyId + "/agents");
  if (agents === null) {
    agents = [];
  }
  const names = {};
  for (let i = 0; i < agents.length; i++) {
    names[agents[i].id] = agents[i].name;
  }
  const byId = {};
  const childCount = {};
  for (let i = 0; i < issues.length; i++) {
    byId[issues[i].id] = issues[i];
    if (issues[i].parentId) {
      if (childCount[issues[i].parentId] === undefined) {
        childCount[issues[i].parentId] = 0;
      }
      childCount[issues[i].parentId] = childCount[issues[i].parentId] + 1;
    }
  }

  // 1. Cong duyet: doc kich ban hoac xem video roi duyet
  html = html + "<h2>Chờ bạn duyệt</h2>";
  const pending = await pendingApprovals();
  let reviewCount = 0;
  if (pending !== null) {
    for (let i = 0; i < pending.length; i++) {
      html = html + approvalCard(pending[i], "/progress");
      reviewCount = reviewCount + 1;
    }
  }
  // Task agent chuyen sang "dang cho xet"
  for (let i = 0; i < issues.length; i++) {
    if (issues[i].status === "in_review") {
      html = html + await taskCard(issues[i], names, byId);
      reviewCount = reviewCount + 1;
    }
  }
  if (reviewCount === 0) {
    html = html + '<p class="empty">Không có gì chờ duyệt.</p>';
  }

  // 2. Task bi chan can xu ly.
  // Task cha cua video (co task con) bi chan la binh thuong: Producer de blocked trong luc chay.
  html = html + "<h2>Task bị chặn</h2>";
  let blockedCount = 0;
  for (let i = 0; i < issues.length; i++) {
    const task = issues[i];
    if (task.status === "blocked" && childCount[task.id] === undefined) {
      html = html + await taskCard(task, names, byId);
      blockedCount = blockedCount + 1;
    }
  }
  if (blockedCount === 0) {
    html = html + '<p class="empty">Không có task nào bị chặn.</p>';
  }

  // 3. Video dang lam: task cha co task con, chua xong
  const parents = [];
  for (let i = 0; i < issues.length; i++) {
    if (childCount[issues[i].id] !== undefined) {
      parents.push(issues[i]);
    }
  }
  parents.sort(function (a, b) {
    return taskNumber(b.identifier) - taskNumber(a.identifier);
  });
  html = html + "<h2>Video đang làm</h2>";
  let activeCount = 0;
  const finished = [];
  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];
    if (parent.status === "done" || parent.status === "cancelled") {
      finished.push(parent);
      continue;
    }
    activeCount = activeCount + 1;
    const children = [];
    for (let k = 0; k < issues.length; k++) {
      if (issues[k].parentId === parent.id) {
        children.push(issues[k]);
      }
    }
    children.sort(function (a, b) {
      return taskNumber(a.identifier) - taskNumber(b.identifier);
    });
    html = html + '<div class="video-block"><h3><a href="/clip/' + encodeURIComponent(parent.identifier) + '">' + escapeHtml(parent.identifier) + "</a> " + escapeHtml(parent.title) + "</h3>";
    html = html + stripSection(parent.identifier, { parent: parent, children: children }, names, "/progress");
    let allDone = true;
    for (let k = 0; k < children.length; k++) {
      if (children[k].status !== "done") {
        allDone = false;
      }
    }
    if (allDone === true) {
      html = html + '<form method="post" action="/close"><input type="hidden" name="clip" value="' + escapeHtml(parent.identifier) + '"><input type="hidden" name="back" value="/progress">' +
        '<button>Đóng video</button></form>';
    }
    html = html + "</div>";
  }
  if (activeCount === 0) {
    html = html + '<p class="empty">Không có video nào đang làm.</p>';
  }

  // 4. Viec khac dang chay (chat, viec rieng): khong co task cha, khong co task con
  html = html + "<h2>Việc khác đang chạy</h2>";
  let otherCount = 0;
  html = html + '<ul class="plain">';
  for (let i = 0; i < issues.length; i++) {
    const task = issues[i];
    if (task.parentId || childCount[task.id] !== undefined) {
      continue;
    }
    if (task.status !== "todo" && task.status !== "in_progress") {
      continue;
    }
    let who = "chưa giao";
    if (task.assigneeAgentId && names[task.assigneeAgentId] !== undefined) {
      who = names[task.assigneeAgentId];
    }
    html = html + "<li><b>" + escapeHtml(task.identifier) + "</b> " + escapeHtml(task.title) + ' <span class="muted">' + escapeHtml(who) + ", " + statusText(task.status) + "</span></li>";
    otherCount = otherCount + 1;
  }
  html = html + "</ul>";
  if (otherCount === 0) {
    html = html + '<p class="empty">Không có.</p>';
  }

  // 5. Video da dong gan day
  if (finished.length > 0) {
    html = html + '<h2>Video đã xong</h2><ul class="plain">';
    for (let i = 0; i < finished.length && i < 10; i++) {
      html = html + '<li><a href="/clip/' + encodeURIComponent(finished[i].identifier) + '">' + escapeHtml(finished[i].identifier) + "</a> " + escapeHtml(finished[i].title) + "</li>";
    }
    html = html + "</ul>";
  }
  return html + pageEnd;
}

// Nut o tab Tien do: duyet task dang cho xet, hoac gui ghi chu va chay lai task bi chan
async function handleTaskAction(url, form) {
  const code = form.get("task") || "";
  if (validTask(code) === false) {
    return "Mã task không hợp lệ.";
  }
  const issue = await callPaperclip("GET", "/issues/" + encodeURIComponent(code));
  if (issue === null) {
    return "Không đọc được task " + code + ". " + lastPaperclipError;
  }
  if (url === "/task-done") {
    if (issue.status !== "in_review") {
      return "Chỉ duyệt được task đang chờ xét.";
    }
    const result = await callPaperclip("PATCH", "/issues/" + encodeURIComponent(code), { status: "done" });
    if (result === null) {
      return "Paperclip không cho đổi trạng thái. " + lastPaperclipError;
    }
    return "";
  }
  if (url === "/task-retry") {
    if (issue.status !== "blocked" && issue.status !== "in_review") {
      return "Chỉ chạy lại được task bị chặn hoặc đang chờ xét.";
    }
    const text = (form.get("text") || "").trim();
    if (text !== "") {
      const comment = await callPaperclip("POST", "/issues/" + encodeURIComponent(code) + "/comments", { body: text });
      if (comment === null) {
        return "Không gửi được ghi chú. " + lastPaperclipError;
      }
    }
    const result = await callPaperclip("PATCH", "/issues/" + encodeURIComponent(code), { status: "todo" });
    if (result === null) {
      return "Paperclip không cho chuyển task về chờ chạy. " + lastPaperclipError;
    }
    return "";
  }
  return "Không rõ thao tác.";
}

// ---------- Van phong 3D ----------
const producerId = process.env.PAPERCLIP_PRODUCER_ID;

// So thu tu trong ma task: VIEA-17 -> 17
function taskNumber(identifier) {
  return parseInt(String(identifier).split("-")[1], 10);
}

// Gom trang thai tung agent cho van phong 3D
async function officeData() {
  const agents = await callPaperclip("GET", "/companies/" + companyId + "/agents");
  if (agents === null) {
    return { ok: false };
  }
  let runs = await callPaperclip("GET", "/companies/" + companyId + "/live-runs");
  if (runs === null) {
    runs = [];
  }
  let issues = await callPaperclip("GET", "/companies/" + companyId + "/issues?status=backlog,todo,in_progress,in_review,blocked,done,cancelled&limit=200");
  if (issues === null) {
    issues = [];
  }
  let costs = await callPaperclip("GET", "/companies/" + companyId + "/costs/by-agent");
  if (costs === null) {
    costs = [];
  }

  // Tra cuu task theo id
  const byId = {};
  for (let i = 0; i < issues.length; i++) {
    byId[issues[i].id] = issues[i];
  }

  const result = [];
  const bugs = [];
  for (let a = 0; a < agents.length; a++) {
    const agent = agents[a];
    if (agent.status === "terminated") {
      continue;
    }
    // Luot chay dang dien ra
    let run = null;
    for (let i = 0; i < runs.length; i++) {
      if (runs[i].agentId === agent.id && (runs[i].status === "running" || runs[i].status === "queued")) {
        run = runs[i];
      }
    }
    const working = run !== null || agent.status === "running";

    // Viec dang lam
    let current = null;
    if (run !== null && run.issueId && byId[run.issueId] !== undefined) {
      current = byId[run.issueId];
    }
    if (current === null) {
      for (let i = 0; i < issues.length; i++) {
        if (issues[i].assigneeAgentId === agent.id && issues[i].status === "in_progress") {
          current = issues[i];
        }
      }
    }

    // Tien do video chua task nay, va agent lam buoc truoc (de ve cuon thu ban giao)
    let pipeline = null;
    let prevAgentId = null;
    if (current !== null && current.parentId && byId[current.parentId] !== undefined) {
      const siblings = [];
      for (let i = 0; i < issues.length; i++) {
        if (issues[i].parentId === current.parentId) {
          siblings.push(issues[i]);
        }
      }
      siblings.sort(function (x, y) {
        return taskNumber(x.identifier) - taskNumber(y.identifier);
      });
      let done = 0;
      let position = -1;
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].status === "done") {
          done = done + 1;
        }
        if (siblings[i].id === current.id) {
          position = i;
        }
      }
      for (let i = position - 1; i >= 0; i--) {
        if (siblings[i].assigneeAgentId && prevAgentId === null) {
          prevAgentId = siblings[i].assigneeAgentId;
        }
      }
      pipeline = { parent: byId[current.parentId].identifier, done: done, total: siblings.length };
    }

    let minutes = null;
    if (run !== null && run.startedAt) {
      minutes = Math.max(0, Math.round((Date.now() - new Date(run.startedAt).getTime()) / 60000));
    }

    // Viec gan day cua agent, moi nhat truoc
    const mine = [];
    for (let i = 0; i < issues.length; i++) {
      if (issues[i].assigneeAgentId === agent.id) {
        mine.push(issues[i]);
      }
    }
    mine.sort(function (x, y) {
      return new Date(y.updatedAt).getTime() - new Date(x.updatedAt).getTime();
    });
    const recent = [];
    for (let i = 0; i < mine.length && i < 30; i++) {
      recent.push({ identifier: mine[i].identifier, title: mine[i].title, status: mine[i].status });
    }

    // Chat qua comment cua task dang lam, neu khong thi task gan nhat
    let chatTask = null;
    if (current !== null) {
      chatTask = { identifier: current.identifier, title: current.title };
    } else {
      // Khong chat vao task con cho chay (todo), tranh danh thuc agent chay som
      for (let i = mine.length - 1; i >= 0; i--) {
        const s = mine[i].status;
        if (s === "done" || s === "blocked" || s === "in_review") {
          chatTask = { identifier: mine[i].identifier, title: mine[i].title };
        }
      }
    }

    const tokens = { input: 0, cached: 0, output: 0, runs: 0 };
    for (let i = 0; i < costs.length; i++) {
      if (costs[i].agentId === agent.id) {
        tokens.input = Number(costs[i].inputTokens || 0);
        tokens.cached = Number(costs[i].cachedInputTokens || 0);
        tokens.output = Number(costs[i].outputTokens || 0);
        tokens.runs = Number(costs[i].apiRunCount || 0) + Number(costs[i].subscriptionRunCount || 0);
      }
    }

    let currentTask = null;
    if (current !== null) {
      currentTask = { identifier: current.identifier, title: current.title, status: current.status };
    }
    result.push({
      id: agent.id, name: agent.name, status: agent.status, working: working,
      currentTask: currentTask, pipeline: pipeline, prevAgentId: prevAgentId, minutes: minutes,
      recent: recent, chatTask: chatTask, tokens: tokens,
    });
    if (agent.status === "error") {
      bugs.push({ identifier: agent.name, text: "agent báo lỗi" });
    }
  }

  // Loi: task giao cho agent con dang bi chan (task cha cua Producer bi chan la binh thuong)
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    if (issue.status === "blocked" && issue.assigneeAgentId && issue.assigneeAgentId !== producerId) {
      let who = "";
      for (let a = 0; a < agents.length; a++) {
        if (agents[a].id === issue.assigneeAgentId) {
          who = agents[a].name;
        }
      }
      bugs.push({ identifier: issue.identifier, text: issue.title + " bị chặn (" + who + ")" });
    }
  }
  // Cho duyet: cong (Approve script, Approve video) chua xong va task ngay truoc da xong
  const waits = [];
  for (let i = 0; i < issues.length; i++) {
    const gate = issues[i];
    if (isGate(gate) === false || gate.status === "done" || gate.status === "cancelled" || !gate.parentId) {
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
      let parentName = "";
      if (byId[gate.parentId] !== undefined) {
        parentName = byId[gate.parentId].identifier;
      }
      waits.push({ identifier: gate.identifier, text: gate.title + " (" + parentName + ") chờ bạn duyệt" });
    }
  }
  return { ok: true, agents: result, bugs: bugs, waits: waits };
}

// Ma task hop le: chu-so, vi du VIEA-22
function validTask(task) {
  return /^[A-Za-z]+-[0-9]+$/.test(task);
}

async function chatMessages(task) {
  if (validTask(task) === false) {
    return { ok: false };
  }
  const comments = await callPaperclip("GET", "/issues/" + encodeURIComponent(task) + "/comments?order=asc&limit=50");
  if (comments === null) {
    return { ok: false };
  }
  let agents = await callPaperclip("GET", "/companies/" + companyId + "/agents");
  if (agents === null) {
    agents = [];
  }
  const messages = [];
  const issue = await callPaperclip("GET", "/issues/" + encodeURIComponent(task));
  if (issue !== null && String(issue.title).indexOf("Chat:") === 0) {
    const description = String(issue.description || "");
    const at = description.indexOf("\n" + chatMarker + "\n");
    if (at >= 0) {
      messages.push({ who: "Bạn", mine: true, body: description.substring(at + chatMarker.length + 2), createdAt: issue.createdAt });
    }
  }
  for (let i = 0; i < comments.length; i++) {
    const c = comments[i];
    let who = "Bạn";
    let mineFlag = true;
    if (c.authorAgentId) {
      mineFlag = false;
      who = "Agent";
      for (let a = 0; a < agents.length; a++) {
        if (agents[a].id === c.authorAgentId) {
          who = agents[a].name;
        }
      }
    }
    messages.push({ who: who, mine: mineFlag, body: c.body, createdAt: c.createdAt });
  }
  return { ok: true, messages: messages };
}

// Trang van phong 3D: canh ben trai, panel thong tin va chat ben phai
function officePage() {
  let html = pageHead("Văn phòng", "office", "office");
  html = html + '<div id="scene"><div id="roster" aria-label="Các agent"></div><div id="banner" hidden></div></div>';
  html = html + '<aside class="side3d"><div id="info"><div id="infoMain"></div><div id="assign"></div></div>';
  html = html + '<div id="chat"><div id="chatHead"></div><div id="chatLog"></div>';
  html = html + '<form id="chatForm"><textarea id="chatText" aria-label="Tin nhắn" placeholder="Nhắn cho agent"></textarea><button id="chatSend">Gửi</button></form></div></aside>';
  html = html + '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>';
  html = html + '<script type="module" src="/public/office.js"></script>';
  return html + pageEnd;
}

// Dong ngan cach trong mo ta task chat: phia sau la tin nhan cua nguoi dung
const chatMarker = "---";

// Giao viec moi tu panel van phong.
// kind = "video": tao task "Video: chu de" cho Producer (giong lenh /video tren Discord).
// kind = "task": tao viec rieng cho agent duoc chon.
async function createTask(form) {
  const agentId = form.get("agentId") || "";
  const kind = form.get("kind") || "";
  const agents = await callPaperclip("GET", "/companies/" + companyId + "/agents");
  if (agents === null) {
    return { ok: false, error: "Không đọc được danh sách agent. " + lastPaperclipError };
  }
  let agent = null;
  for (let i = 0; i < agents.length; i++) {
    if (agents[i].id === agentId) {
      agent = agents[i];
    }
  }
  if (agent === null) {
    return { ok: false, error: "Không tìm thấy agent." };
  }
  let title = "";
  let description = "";
  if (kind === "video") {
    const topic = (form.get("topic") || "").trim();
    let duration = parseInt(form.get("duration") || "30", 10);
    const tone = (form.get("tone") || "").trim();
    if (topic === "") {
      return { ok: false, error: "Chủ đề đang trống." };
    }
    if (isNaN(duration) || duration < 30 || duration > 300) {
      return { ok: false, error: "Thời lượng phải từ 30 đến 300 giây." };
    }
    title = "Video: " + topic;
    if (title.length > 80) {
      title = title.substring(0, 80);
    }
    description = "Topic: " + topic + "\nDuration: " + duration + " seconds";
    if (tone !== "") {
      description = description + "\nTone: " + tone;
    }
    description = description + "\nRequested from Studio web.";
    const notes = (form.get("notes") || "").trim();
    if (notes.length > 20000) {
      return { ok: false, error: "Yêu cầu chi tiết dài quá 20000 ký tự." };
    }
    if (notes !== "") {
      description = description + "\nNotes (user request, verbatim):\n" + notes;
    }
  } else if (kind === "chat") {
    // Doan chat moi: tin dau tien thanh mot task moi cho agent
    const text = (form.get("text") || "").trim();
    if (text === "") {
      return { ok: false, error: "Tin nhắn đang trống." };
    }
    if (text.length > 20000) {
      return { ok: false, error: "Tin nhắn dài quá 20000 ký tự." };
    }
    title = "Chat: " + text.split("\n")[0];
    if (title.length > 80) {
      title = title.substring(0, 77) + "...";
    }
    description = "Chat message from the user via Studio web. Follow the \"Chat tasks\" section of your instructions.\n" + chatMarker + "\n" + text;
  } else {
    title = (form.get("title") || "").trim();
    description = (form.get("description") || "").trim();
    if (title === "") {
      return { ok: false, error: "Tiêu đề đang trống." };
    }
    if (title.length > 120) {
      title = title.substring(0, 120);
    }
  }
  const body = { title: title, description: description, status: "todo", assigneeAgentId: agent.id, projectId: process.env.PAPERCLIP_PROJECT_ID };
  const issue = await callPaperclip("POST", "/companies/" + companyId + "/issues", body);
  if (issue === null) {
    return { ok: false, error: "Paperclip không tạo được task. " + lastPaperclipError };
  }
  return { ok: true, identifier: issue.identifier, title: issue.title };
}

// Tra du lieu JSON cho trinh duyet
function sendJson(response, data) {
  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

// Doc noi dung form gui len (POST)
function readForm(request) {
  return new Promise(function (resolve) {
    let text = "";
    request.on("data", function (chunk) {
      text = text + chunk;
      if (text.length > 400000) {
        request.destroy();
      }
    });
    request.on("end", function () {
      resolve(new URLSearchParams(text));
    });
  });
}

// Xu ly cac nut bam. Tra ve thong bao loi, hoac "" neu thanh cong
async function handleAction(url, form) {
  const name = form.get("clip") || "";
  const tasks = await loadTasks(name);
  if (tasks === null) {
    return "Không đọc được task từ Paperclip.";
  }
  if (url === "/approve") {
    // Chi duyet task cong nam trong video nay
    const code = form.get("task") || "";
    let gate = null;
    for (let i = 0; i < tasks.children.length; i++) {
      if (tasks.children[i].identifier === code && isGate(tasks.children[i])) {
        if (i === 0 || tasks.children[i - 1].status !== "done") {
          return "Task trước cổng " + code + " chưa xong, chưa duyệt được.";
        }
        gate = tasks.children[i];
      }
    }
    if (gate === null) {
      return "Task " + code + " không phải task cổng của video này.";
    }
    const result = await callPaperclip("PATCH", "/issues/" + encodeURIComponent(gate.identifier), { status: "done" });
    if (result === null) {
      return "Paperclip không cho đổi trạng thái. " + lastPaperclipError;
    }
    return "";
  }
  if (url === "/comment") {
    const text = (form.get("text") || "").trim();
    if (text === "") {
      return "Nội dung yêu cầu sửa đang trống.";
    }
    const result = await callPaperclip("POST", "/issues/" + encodeURIComponent(tasks.parent.identifier) + "/comments", { body: text });
    if (result === null) {
      return "Không gửi được comment. " + lastPaperclipError;
    }
    return "";
  }
  if (url === "/close") {
    for (let i = 0; i < tasks.children.length; i++) {
      if (tasks.children[i].status !== "done") {
        return "Còn task con chưa xong, chưa đóng được task cha.";
      }
    }
    const result = await callPaperclip("PATCH", "/issues/" + encodeURIComponent(tasks.parent.identifier), { status: "done" });
    if (result === null) {
      return "Không đóng được task cha.";
    }
    return "";
  }
  return "Không rõ thao tác.";
}

// Loai file theo duoi
function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".html") return "text/html; charset=utf-8";
  return "text/plain; charset=utf-8";
}

// Gui file audio/video, ho tro tua (Range) de trinh duyet tua duoc
function sendFile(request, response, filePath) {
  const size = fs.statSync(filePath).size;
  const range = request.headers.range;
  if (range === undefined) {
    response.writeHead(200, { "Content-Type": contentType(filePath), "Content-Length": size, "Accept-Ranges": "bytes" });
    fs.createReadStream(filePath).pipe(response);
    return;
  }
  // Range co dang "bytes=start-end"
  const parts = range.replace("bytes=", "").split("-");
  const start = parseInt(parts[0], 10);
  let end = size - 1;
  if (parts[1] !== "") {
    end = parseInt(parts[1], 10);
  }
  response.writeHead(206, {
    "Content-Type": contentType(filePath),
    "Content-Length": end - start + 1,
    "Content-Range": "bytes " + start + "-" + end + "/" + size,
    "Accept-Ranges": "bytes",
  });
  fs.createReadStream(filePath, { start: start, end: end }).pipe(response);
}

const server = http.createServer(async function (request, response) {
  const url = decodeURIComponent(request.url.split("?")[0]);
  try {
    if (url === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(await homePage());
      return;
    }
    if (url.startsWith("/clip/")) {
      const name = url.substring("/clip/".length);
      const folder = path.join(clipsDir, name);
      // Chi cho phep thu muc nam ngay trong clips
      if (path.dirname(folder) !== clipsDir || fs.existsSync(folder) === false) {
        response.writeHead(404);
        response.end("Không tìm thấy");
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(await clipPage(name));
      return;
    }
    if (url === "/office") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(officePage());
      return;
    }
    if (url === "/api/office") {
      sendJson(response, await officeData());
      return;
    }
    if (url === "/api/chat" && request.method === "GET") {
      const query = new URLSearchParams(request.url.split("?")[1] || "");
      sendJson(response, await chatMessages(query.get("task") || ""));
      return;
    }
    if (url === "/api/task" && request.method === "POST") {
      const origin = request.headers.origin;
      if (origin !== undefined && origin !== "http://127.0.0.1:" + port && origin !== "http://localhost:" + port) {
        response.writeHead(403);
        response.end("Không cho phép");
        return;
      }
      sendJson(response, await createTask(await readForm(request)));
      return;
    }
    if (url === "/api/chat" && request.method === "POST") {
      const origin = request.headers.origin;
      if (origin !== undefined && origin !== "http://127.0.0.1:" + port && origin !== "http://localhost:" + port) {
        response.writeHead(403);
        response.end("Không cho phép");
        return;
      }
      const form = await readForm(request);
      const task = form.get("task") || "";
      const text = (form.get("text") || "").trim();
      if (validTask(task) === false || text === "") {
        sendJson(response, { ok: false, error: "Thiếu mã task hoặc nội dung tin nhắn." });
        return;
      }
      const result = await callPaperclip("POST", "/issues/" + encodeURIComponent(task) + "/comments", { body: text });
      if (result === null) {
        sendJson(response, { ok: false, error: "Paperclip không nhận tin nhắn (xem cửa sổ chạy web.js)." });
        return;
      }
      sendJson(response, { ok: true });
      return;
    }
    if (url.startsWith("/public/")) {
      const publicDir = path.join(__dirname, "public");
      const filePath = path.join(publicDir, url.substring("/public/".length));
      // Chi phuc vu file nam trong thu muc public
      if (filePath.startsWith(publicDir + path.sep) === false || fs.existsSync(filePath) === false) {
        response.writeHead(404);
        response.end("Không tìm thấy");
        return;
      }
      sendFile(request, response, filePath);
      return;
    }
    if (url === "/progress") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(await progressPage());
      return;
    }
    if (request.method === "POST" && (url === "/task-done" || url === "/task-retry")) {
      const origin = request.headers.origin;
      if (origin !== undefined && origin !== "http://127.0.0.1:" + port && origin !== "http://localhost:" + port) {
        response.writeHead(403);
        response.end("Không cho phép");
        return;
      }
      const form = await readForm(request);
      const error = await handleTaskAction(url, form);
      if (error !== "") {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end(pageStart + '<p class="bad">' + escapeHtml(error) + '</p><p><a href="/progress">Quay lại Tiến độ</a></p>' + pageEnd);
        return;
      }
      response.writeHead(303, { Location: "/progress" });
      response.end();
      return;
    }
    if (url === "/tokens") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(await tokensPage());
      return;
    }
    if (request.method === "POST" && (url === "/approve" || url === "/comment" || url === "/close")) {
      // Chi nhan nut bam tu chinh trang nay (chan trang web khac gui len)
      const origin = request.headers.origin;
      if (origin !== undefined && origin !== "http://127.0.0.1:" + port && origin !== "http://localhost:" + port) {
        response.writeHead(403);
        response.end("Không cho phép");
        return;
      }
      const form = await readForm(request);
      const error = await handleAction(url, form);
      if (error !== "") {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end(pageStart + "<p class=\"bad\">" + escapeHtml(error) + '</p><p><a href="/clip/' + encodeURIComponent(form.get("clip") || "") + '">Quay lại</a></p>' + pageEnd);
        return;
      }
      // Thanh cong: quay lai trang da bam nut
      let back = "/clip/" + encodeURIComponent(form.get("clip") || "");
      if (form.get("back") === "/") {
        back = "/";
      }
      if (form.get("back") === "/progress") {
        back = "/progress";
      }
      response.writeHead(303, { Location: back });
      response.end();
      return;
    }
    if (url.startsWith("/files/")) {
      const filePath = path.join(clipsDir, url.substring("/files/".length));
      // Chan duong dan ra ngoai thu muc clips (vi du ../.env)
      if (filePath.startsWith(clipsDir + path.sep) === false || fs.existsSync(filePath) === false) {
        response.writeHead(404);
        response.end("Không tìm thấy");
        return;
      }
      sendFile(request, response, filePath);
      return;
    }
    response.writeHead(404);
    response.end("Không tìm thấy");
  } catch (error) {
    console.log("Loi: " + error.message);
    response.writeHead(500);
    response.end("Lỗi máy chủ");
  }
});

// Chi nghe tren 127.0.0.1, may khac trong mang khong vao duoc
server.listen(port, "127.0.0.1", function () {
  console.log("Studio web: http://127.0.0.1:" + port);
});
