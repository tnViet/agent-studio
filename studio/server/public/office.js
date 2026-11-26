// Van phong 3D thien dinh: doc trang thai agent tu /api/office moi 4 giay.
// Dang lam viec: ve van phong, ngoi niem chu. Dang ranh: ra vuon dao di dao.
// Co loi: Ton Ngo Khong xuat hien o Nam Thien Mon.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { characterFor, buildWukong } from "./characters.js";
import { LAYOUT, GARDEN_SPOTS, buildSky, moveSky, buildGarden, movePetals, buildPalace, buildGate, buildOffice, buildBridge, bridgeHeightAt, makeScroll } from "./world.js";

const sceneBox = document.getElementById("scene");
const infoBox = document.getElementById("info");
const banner = document.getElementById("banner");
const chatHead = document.getElementById("chatHead");
const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const chatText = document.getElementById("chatText");
const chatSend = document.getElementById("chatSend");

// ---------- Dung canh ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
sceneBox.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = "labels";
sceneBox.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
camera.position.set(0, 23, 26);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0.5);
controls.enableDamping = true;
controls.maxPolarAngle = 1.25;
controls.minDistance = 10;
controls.maxDistance = 55;

scene.add(new THREE.HemisphereLight(0xe6f4ff, 0xf6dccb, 1.6));
const sun = new THREE.DirectionalLight(0xfff3e0, 1.6);
sun.position.set(8, 16, 10);
scene.add(sun);

const sky = buildSky(scene);
const petals = buildGarden(scene);
const palace = buildPalace(scene);
const gateSpot = buildGate(scene);
// Cau tu vuon dao sang dien Lang Tieu va Nam Thien Mon
const palaceBridge = buildBridge(scene, LAYOUT.garden, LAYOUT.garden.radius, LAYOUT.palace, LAYOUT.palace.radius);
buildBridge(scene, LAYOUT.garden, LAYOUT.garden.radius, LAYOUT.gate, LAYOUT.gate.radius);

function resize() {
  const width = sceneBox.clientWidth;
  const height = sceneBox.clientHeight;
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(sceneBox);
resize();

// ---------- Tien ich nho ----------
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function statusText(agent) {
  if (agent.working) return "Đang làm việc";
  if (agent.status === "error") return "Báo lỗi";
  if (agent.status === "paused") return "Tạm dừng";
  if (agent.status === "pending_approval") return "Chờ duyệt";
  return "Đang rảnh";
}

function taskStatusText(status) {
  if (status === "done") return "xong";
  if (status === "in_progress") return "đang chạy";
  if (status === "todo") return "chờ chạy";
  if (status === "blocked") return "bị chặn";
  if (status === "cancelled") return "đã hủy";
  return status;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

// Diem trong vuon dao: thuong la canh ban tiec, doi khi di dao ngau nhien (tranh ao sen va hang cay)
function randomGardenPoint() {
  if (Math.random() < 0.6 && GARDEN_SPOTS.length > 0) {
    const spot = GARDEN_SPOTS[Math.floor(Math.random() * GARDEN_SPOTS.length)];
    return new THREE.Vector3(spot.x + (Math.random() - 0.5) * 0.4, 0, spot.z + (Math.random() - 0.5) * 0.4);
  }
  const angle = Math.random() * Math.PI * 2;
  const r = 1.5 + Math.random() * 2.2;
  return new THREE.Vector3(LAYOUT.garden.x + Math.cos(angle) * r, 0, LAYOUT.garden.z + Math.sin(angle) * r);
}

function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function insideGarden(position) {
  const dx = position.x - LAYOUT.garden.x;
  const dz = position.z - LAYOUT.garden.z;
  return Math.sqrt(dx * dx + dz * dz) < LAYOUT.garden.radius;
}

// Vong hao quang khi niem chu: vong vang duoi chan va cac chu bay quanh
function makeAura() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.7, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.16;
  group.add(ring);
  const glyphs = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const glyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xffc83d }));
    const angle = (i / 6) * Math.PI * 2;
    glyph.position.set(Math.cos(angle) * 0.8, 0.9 + (i % 2) * 0.25, Math.sin(angle) * 0.8);
    glyphs.add(glyph);
  }
  group.add(glyphs);
  group.userData.glyphs = glyphs;
  group.visible = false;
  return group;
}

function makeShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 24),
    new THREE.MeshBasicMaterial({ color: 0x1b2a3a, transparent: true, opacity: 0.16 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  return shadow;
}

const selectRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.62, 0.04, 8, 40),
  new THREE.MeshBasicMaterial({ color: 0xd97757 })
);
selectRing.rotation.x = Math.PI / 2;
selectRing.position.y = 0.05;

// ---------- Nhan vat ----------
const CHARACTER_SCALE = 1.7;   // do lon nhan vat so voi canh
const actors = {};        // agent id -> actor
let officeCount = 0;
let selectedId = null;    // agent id, "wukong", hoac null
let latest = null;        // du lieu /api/office moi nhat
let firstLoad = true;
const flyingScrolls = [];

function createActor(agent) {
  const info = characterFor(agent.name);
  const root = info.build();
  root.scale.setScalar(CHARACTER_SCALE);
  root.userData.agentId = agent.id;
  scene.add(root);

  // home: cho ngoi; entry: cac diem di qua tu dau cau toi cho ngoi; gardenEnd: dau cau phia vuon dao
  let home;
  let entry = [];
  let gardenEnd;
  let homeRadius = LAYOUT.officeRadius + 0.3;
  let extra = { glow: null };
  const key = String(agent.name).toLowerCase();
  if (key === "producer") {
    home = new THREE.Vector3(palace.home.x, palace.home.y, palace.home.z);
    entry.push(new THREE.Vector3(palaceBridge.o.x, 0, palaceBridge.o.z));
    entry.push(new THREE.Vector3(palace.front.x, 0, palace.front.z));
    gardenEnd = new THREE.Vector3(palaceBridge.g.x, 0, palaceBridge.g.z);
    homeRadius = LAYOUT.palace.radius + 0.3;
  } else {
    let spot = LAYOUT.offices[officeCount];
    if (spot === undefined) {
      const angle = officeCount * 0.9;
      spot = { x: Math.cos(angle) * 20, z: Math.sin(angle) * 15 };
    }
    officeCount = officeCount + 1;
    extra = buildOffice(scene, spot, key);
    const bridge = buildBridge(scene, LAYOUT.garden, LAYOUT.garden.radius, spot, LAYOUT.officeRadius);
    entry.push(new THREE.Vector3(bridge.o.x, 0, bridge.o.z));
    gardenEnd = new THREE.Vector3(bridge.g.x, 0, bridge.g.z);
    home = new THREE.Vector3(spot.x, 0, spot.z);
  }

  const labelDiv = document.createElement("div");
  labelDiv.className = "lbl";
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, 2.15, 0);
  root.add(label);

  root.add(makeShadow());
  const aura = makeAura();
  root.add(aura);

  const actor = {
    id: agent.id, info: info, root: root, rig: root.userData.rig, home: home, extra: extra,
    entry: entry, gardenEnd: gardenEnd, homeRadius: homeRadius, useSeat: key !== "producer",
    labelDiv: labelDiv, aura: aura, data: agent,
    goal: "garden", path: [], waiting: Math.random() * 3, phase: Math.random() * 10, blink: 2 + Math.random() * 3,
    lastTask: null,
  };

  // Luc moi mo trang: dang lam thi ngoi san o van phong, dang ranh thi dung san trong vuon
  if (wantsHome(agent)) {
    root.position.copy(home);
    actor.goal = "home";
  } else {
    root.position.copy(randomGardenPoint());
    root.rotation.y = Math.random() * Math.PI * 2;
  }
  actors[agent.id] = actor;
  return actor;
}

// Dua dan gia tri hien tai toi gia tri dich (de chuyen dong mem)
function approach(current, target, k) {
  return current + (target - current) * k;
}

// Dat tu the: "stand", "walk", "sit"
function setPose(actor, pose, dt, time) {
  const rig = actor.rig;
  const k = Math.min(1, dt * 8);
  let bodyY = 0;
  let legX = 0;
  let legZ = 0;
  let armLX = 0;
  let armRX = 0;
  let armLZ = -rig.armSpread;
  let armRZ = rig.armSpread;
  let headY = Math.sin(time * 0.6 + actor.phase) * 0.35;
  let headX = 0;

  if (pose === "walk") {
    const swing = Math.sin(time * 9 + actor.phase);
    legX = swing * 0.6;
    armLX = -swing * 0.5;
    armRX = swing * 0.5;
    bodyY = Math.abs(swing) * 0.04;
    headY = 0;
  }
  if (pose === "sit") {
    bodyY = -0.2;
    legX = -1.45;
    legZ = 0.4;
    armLX = -1.0;
    armRX = -1.0;
    armLZ = 0.69;
    armRZ = -0.69;
    headY = 0;
    headX = 0.15 + Math.sin(time * 2 + actor.phase) * 0.05;
  }

  rig.body.position.y = approach(rig.body.position.y, bodyY, k);
  if (pose === "walk") {
    rig.legL.rotation.x = legX;
    rig.legR.rotation.x = -legX;
  } else {
    rig.legL.rotation.x = approach(rig.legL.rotation.x, legX, k);
    rig.legR.rotation.x = approach(rig.legR.rotation.x, legX, k);
  }
  rig.legL.rotation.z = approach(rig.legL.rotation.z, legZ, k);
  rig.legR.rotation.z = approach(rig.legR.rotation.z, -legZ, k);
  rig.armL.rotation.x = approach(rig.armL.rotation.x, armLX, k);
  rig.armR.rotation.x = approach(rig.armR.rotation.x, armRX, k);
  rig.armL.rotation.z = approach(rig.armL.rotation.z, armLZ, k);
  rig.armR.rotation.z = approach(rig.armR.rotation.z, armRZ, k);
  rig.head.rotation.y = approach(rig.head.rotation.y, headY, k * 0.5);
  rig.head.rotation.x = approach(rig.head.rotation.x, headX, k);
  rig.seat.visible = pose === "sit" && actor.useSeat;
}

// Quay mat dan ve huong goc (radian)
function turnTo(actor, angle, dt) {
  let diff = angle - actor.root.rotation.y;
  while (diff > Math.PI) diff = diff - Math.PI * 2;
  while (diff < -Math.PI) diff = diff + Math.PI * 2;
  actor.root.rotation.y = actor.root.rotation.y + diff * Math.min(1, dt * 6);
}

// Agent can o van phong khi dang lam, bao loi, tam dung hoac cho duyet
function wantsHome(agent) {
  return agent.working || agent.status === "error" || agent.status === "paused" || agent.status === "pending_approval";
}

// Di ve phia diem dich. Tra ve true khi da toi.
function walkTo(actor, target, dt, time) {
  const position = actor.root.position;
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const step = 2.8 * dt;
  if (distance <= step) {
    position.x = target.x;
    position.z = target.z;
    return true;
  }
  position.x = position.x + (dx / distance) * step;
  position.z = position.z + (dz / distance) * step;
  // Len xuong theo mat cau cong, len bac ngai khi gan cho ngoi
  let groundY = 0;
  const bridgeY = bridgeHeightAt(position.x, position.z);
  if (bridgeY !== null) {
    groundY = bridgeY;
  } else if (distanceXZ(position, actor.home) < 1.2) {
    groundY = actor.home.y;
  }
  position.y = approach(position.y, groundY, Math.min(1, dt * 10));
  turnTo(actor, Math.atan2(dx, dz), dt);
  setPose(actor, "walk", dt, time);
  return false;
}

// Lap duong di: tu vuon dao qua cau ve van phong, hoac nguoc lai
function planPath(actor, goal) {
  const position = actor.root.position;
  const path = [];
  const inGarden = insideGarden(position);
  const nearHome = distanceXZ(position, actor.home) < actor.homeRadius;
  if (goal === "home") {
    if (nearHome === false) {
      if (inGarden) {
        path.push(actor.gardenEnd.clone());
      }
      for (let i = 0; i < actor.entry.length; i++) {
        path.push(actor.entry[i].clone());
      }
    }
    path.push(actor.home.clone());
  } else {
    if (nearHome) {
      for (let i = actor.entry.length - 1; i >= 0; i--) {
        path.push(actor.entry[i].clone());
      }
      path.push(actor.gardenEnd.clone());
    } else if (inGarden === false) {
      path.push(actor.gardenEnd.clone());
    }
    path.push(randomGardenPoint());
  }
  return path;
}

function updateActor(actor, dt, time) {
  const agent = actor.data;
  let goal = "garden";
  if (wantsHome(agent)) {
    goal = "home";
  }
  if (actor.goal !== goal) {
    actor.goal = goal;
    actor.path = planPath(actor, goal);
    actor.waiting = 0;
  }

  if (actor.path.length > 0) {
    const arrived = walkTo(actor, actor.path[0], dt, time);
    if (arrived) {
      actor.path.shift();
      if (goal === "garden" && actor.path.length === 0) {
        actor.waiting = 1.5 + Math.random() * 4;
      }
    }
  } else if (goal === "home") {
    actor.root.position.x = actor.home.x;
    actor.root.position.z = actor.home.z;
    actor.root.position.y = approach(actor.root.position.y, actor.home.y, Math.min(1, dt * 8));
    turnTo(actor, 0, dt);
    if (agent.working) {
      setPose(actor, "sit", dt, time);
    } else {
      setPose(actor, "stand", dt, time);
    }
  } else {
    actor.root.position.y = approach(actor.root.position.y, 0, Math.min(1, dt * 8));
    setPose(actor, "stand", dt, time);
    actor.waiting = actor.waiting - dt;
    if (actor.waiting <= 0) {
      actor.path = [randomGardenPoint()];
    }
  }

  // Niem chu: hao quang quay quanh khi ngoi lam viec
  const sitting = agent.working && actor.path.length === 0 && distanceXZ(actor.root.position, actor.home) < 0.05;
  actor.aura.visible = sitting;
  if (sitting) {
    actor.aura.userData.glyphs.rotation.y = time * 0.8;
  }
  if (actor.extra.glow !== null) {
    let glowSize = 0.7;
    if (sitting) {
      glowSize = 1 + Math.sin(time * 6) * 0.25;
    }
    actor.extra.glow.scale.setScalar(glowSize);
  }

  // Chop mat
  actor.blink = actor.blink - dt;
  let eyeScale = 1;
  if (actor.blink < 0.12) {
    eyeScale = 0.1;
  }
  if (actor.blink < 0) {
    actor.blink = 2 + Math.random() * 4;
  }
  for (let i = 0; i < actor.rig.eyes.length; i++) {
    actor.rig.eyes[i].scale.y = eyeScale;
  }
}

// Nhan tren dau: ten, viec dang lam, thanh tien do
function updateLabel(actor) {
  const agent = actor.data;
  let html = '<div class="nm">' + escapeHtml(actor.info.title) + "</div>";
  let cls = "lbl";
  if (agent.working && agent.currentTask !== null) {
    html = html + '<div class="tk">' + escapeHtml(agent.currentTask.identifier + " " + agent.currentTask.title) + "</div>";
    if (agent.pipeline !== null) {
      const percent = Math.round((agent.pipeline.done / agent.pipeline.total) * 100);
      html = html + '<div class="bar"><i style="width:' + percent + '%"></i></div>';
      html = html + '<div class="tm">' + agent.pipeline.done + "/" + agent.pipeline.total + " bước";
      if (agent.minutes !== null) {
        html = html + ", " + agent.minutes + " phút";
      }
      html = html + "</div>";
    }
    cls = "lbl work";
  } else if (agent.working) {
    html = html + '<div class="tk">Đang niệm chú</div>';
    cls = "lbl work";
  } else if (agent.status === "error") {
    html = html + '<div class="tk">Báo lỗi</div>';
    cls = "lbl err";
  } else if (agent.status === "paused") {
    html = html + '<div class="tk">Tạm dừng</div>';
    cls = "lbl idle";
  } else {
    cls = "lbl idle";
  }
  if (selectedId === actor.id) {
    cls = cls + " sel";
  }
  actor.labelDiv.className = cls;
  actor.labelDiv.innerHTML = html;
}

// ---------- Ton Ngo Khong ----------
const wukong = buildWukong();
wukong.scale.setScalar(CHARACTER_SCALE);
wukong.userData.agentId = "wukong";
wukong.position.set(gateSpot.x, 0, gateSpot.z);
wukong.visible = false;
scene.add(wukong);
const wukongDiv = document.createElement("div");
wukongDiv.className = "lbl err";
const wukongLabel = new CSS2DObject(wukongDiv);
wukongLabel.position.set(0, 2.3, 0);
wukong.add(wukongLabel);

function updateWukong(dt, time) {
  if (wukong.visible === false) {
    return;
  }
  const rig = wukong.userData.rig;
  wukong.position.y = Math.abs(Math.sin(time * 4)) * 0.5;
  wukong.rotation.y = Math.sin(time * 1.5) * 0.6;
  rig.armR.rotation.x = -2.7;
  rig.armR.rotation.z = 0.1;
  rig.armL.rotation.z = -0.9;
  rig.staff.rotation.x = time * 10;
  rig.legL.rotation.x = Math.sin(time * 8) * 0.5;
  rig.legR.rotation.x = -Math.sin(time * 8) * 0.5;
}

// ---------- Cuon thu ban giao ----------
function sendScroll(fromActor, toActor) {
  const scroll = makeScroll();
  scene.add(scroll);
  const start = fromActor.root.position.clone();
  start.y = 1.4;
  const end = toActor.home.clone();
  end.y = 1.4;
  flyingScrolls.push({ mesh: scroll, start: start, end: end, t: 0 });
}

function updateScrolls(dt) {
  for (let i = flyingScrolls.length - 1; i >= 0; i--) {
    const fly = flyingScrolls[i];
    fly.t = fly.t + dt / 2.2;
    const t = Math.min(1, fly.t);
    fly.mesh.position.lerpVectors(fly.start, fly.end, t);
    fly.mesh.position.y = fly.start.y + Math.sin(t * Math.PI) * 4;
    fly.mesh.rotation.y = fly.mesh.rotation.y + dt * 4;
    if (fly.t >= 1) {
      scene.remove(fly.mesh);
      flyingScrolls.splice(i, 1);
    }
  }
}

// ---------- Panel thong tin ----------
// infoMain: ve lai moi lan co du lieu. assignBox: form giao viec, chi ve lai khi doi agent (de khong mat chu dang go).
const infoMain = document.getElementById("infoMain");
const rosterBar = document.getElementById("roster");
let lastRosterHtml = "";
const assignBox = document.getElementById("assign");

function producerId() {
  const ids = Object.keys(actors);
  for (let i = 0; i < ids.length; i++) {
    if (String(actors[ids[i]].data.name).toLowerCase() === "producer") {
      return ids[i];
    }
  }
  return null;
}

function renderInfo() {
  if (latest === null || latest.ok === false) {
    setInfo('<h2>Thiên đình</h2><p class="muted">Đang chờ dữ liệu từ Paperclip.</p>');
    return;
  }

  renderRoster();
  renderInfoBody("");
}

// Hang chon nhanh cac vi than, nam tren canh 3D
function renderRoster() {
  let html = "";
  const ids = Object.keys(actors);
  for (let i = 0; i < ids.length; i++) {
    const a = actors[ids[i]];
    let dot = "idle";
    if (a.data.working) dot = "work";
    if (a.data.status === "error") dot = "err";
    let cls = "chip";
    if (a.id === selectedId) cls = "chip on";
    html = html + '<button class="' + cls + '" data-id="' + a.id + '" title="' + escapeHtml(a.data.name) + '"><span class="dot ' + dot + '"></span><span class="chip-text">' + escapeHtml(a.info.title) + '<small>' + escapeHtml(a.data.name) + "</small></span></button>";
  }
  if (latest.bugs.length > 0 || latest.waits.length > 0) {
    let cls = "chip bug";
    if (selectedId === "wukong") cls = "chip bug on";
    let text = "";
    if (latest.bugs.length > 0) text = "Lỗi (" + latest.bugs.length + ")";
    if (latest.waits.length > 0) {
      if (text !== "") text = text + ", ";
      text = text + "Chờ duyệt (" + latest.waits.length + ")";
    }
    html = html + '<button class="' + cls + '" data-id="wukong">' + text + "</button>";
  }
  if (html !== lastRosterHtml) {
    lastRosterHtml = html;
    const left = rosterBar.scrollLeft;
    rosterBar.innerHTML = html;
    rosterBar.scrollLeft = left;
  }
}

// Noi dung panel ben phai
function renderInfoBody(html) {
  if (selectedId === "wukong") {
    html = html + "<h2>Tôn Ngộ Không báo động</h2>";
    if (latest.waits.length > 0) {
      html = html + '<p class="muted">Chờ bạn duyệt (duyệt ở tab <a href="/progress">Tiến độ</a>):</p><ul class="tasks">';
      for (let i = 0; i < latest.waits.length; i++) {
        const w = latest.waits[i];
        html = html + '<li data-task="' + escapeHtml(w.identifier) + '"><b>' + escapeHtml(w.identifier) + "</b> " + escapeHtml(w.text) + "</li>";
      }
      html = html + "</ul>";
    }
    if (latest.bugs.length > 0) {
      html = html + '<p class="muted">Đang bị chặn hoặc agent báo lỗi:</p><ul class="tasks">';
      for (let i = 0; i < latest.bugs.length; i++) {
        const bug = latest.bugs[i];
        html = html + '<li data-task="' + escapeHtml(bug.identifier) + '"><b>' + escapeHtml(bug.identifier) + "</b> " + escapeHtml(bug.text) + "</li>";
      }
      html = html + "</ul>";
    }
    setInfo(html);
    return;
  }

  const actor = actors[selectedId];
  if (actor === undefined) {
    setInfo(html);
    return;
  }
  const agent = actor.data;
  html = html + "<h2>" + escapeHtml(actor.info.title) + "</h2>";
  html = html + '<p class="muted">' + escapeHtml(agent.name) + ", " + statusText(agent).toLowerCase() + "</p>";

  if (agent.currentTask !== null) {
    html = html + "<h3>Đang làm</h3>";
    html = html + "<p><b>" + escapeHtml(agent.currentTask.identifier) + "</b> " + escapeHtml(agent.currentTask.title) + "</p>";
    if (agent.pipeline !== null) {
      const percent = Math.round((agent.pipeline.done / agent.pipeline.total) * 100);
      html = html + '<div class="bigbar"><i style="width:' + percent + '%"></i></div>';
      html = html + '<p class="muted">Video ' + escapeHtml(agent.pipeline.parent) + ": xong " + agent.pipeline.done + "/" + agent.pipeline.total + " bước";
      if (agent.minutes !== null) {
        html = html + ", chạy được " + agent.minutes + " phút";
      }
      html = html + '. <a href="/clip/' + encodeURIComponent(agent.pipeline.parent) + '">Mở trang video</a></p>';
    }
  }

  html = html + "<h3>Lịch sử task</h3>";
  if (agent.recent.length === 0) {
    html = html + '<p class="muted">Chưa nhận việc nào.</p>';
  } else {
    // Mac dinh chi hien 5 task moi nhat
    let limit = 5;
    if (showAllTasks === true || agent.recent.length < limit) {
      limit = agent.recent.length;
    }
    html = html + '<ul class="tasks pick small">';
    for (let i = 0; i < limit; i++) {
      const task = agent.recent[i];
      let cls = "";
      if (chatTask !== null && chatTask.identifier === task.identifier) {
        cls = ' class="on"';
      }
      html = html + "<li" + cls + ' data-task="' + escapeHtml(task.identifier) + '" data-title="' + escapeHtml(task.title) + '"><b>' + escapeHtml(task.identifier) + "</b> " +
        escapeHtml(task.title) + ' <span class="st ' + task.status + '">' + taskStatusText(task.status) + "</span></li>";
    }
    html = html + "</ul>";
    if (agent.recent.length > 5) {
      if (showAllTasks === true) {
        html = html + '<button type="button" class="more" data-toggle="tasks">Thu gọn</button>';
      } else {
        html = html + '<button type="button" class="more" data-toggle="tasks">Xem tất cả (' + agent.recent.length + ")</button>";
      }
    }
  }
  setInfo(html);
}

// Chi thay noi dung panel khi co gi khac, de nut khong bi ve lai giua luc bam
let lastInfoHtml = "";
function setInfo(html) {
  if (html !== lastInfoHtml) {
    lastInfoHtml = html;
    infoMain.innerHTML = html;
  }
}

// Form giao viec moi: Producer nhan video moi, agent khac nhan viec rieng
function renderAssign() {
  const actor = actors[selectedId];
  if (actor === undefined) {
    assignBox.innerHTML = "";
    return;
  }
  let html = "";
  if (String(actor.data.name).toLowerCase() === "producer") {
    html = '<details open><summary>Giao video mới cho Ngọc Hoàng</summary><form id="assignForm">' +
      '<input type="hidden" name="kind" value="video"><input type="hidden" name="agentId" value="' + actor.id + '">' +
      '<label>Chủ đề<input name="topic" maxlength="200" required></label>' +
      '<div class="row2"><label>Thời lượng (giây)<input name="duration" type="number" min="30" max="300" value="30"></label>' +
      '<label>Giọng điệu<input name="tone" maxlength="100"></label></div>' +
      '<label>Yêu cầu chi tiết (không bắt buộc)<textarea name="notes" rows="6" maxlength="20000" placeholder="Mạch nội dung, cảnh tự vẽ, lưu ý cho từng vai..."></textarea></label>' +
      '<button>Giao video</button><span class="assign-msg"></span></form></details>';
  } else {
    html = "<details><summary>Giao việc riêng cho " + escapeHtml(actor.info.title) + "</summary>" +
      '<form id="assignForm">' +
      '<input type="hidden" name="kind" value="task"><input type="hidden" name="agentId" value="' + actor.id + '">' +
      '<label>Tiêu đề<input name="title" maxlength="120" required></label>' +
      '<label>Mô tả<textarea name="description" rows="3"></textarea></label>' +
      '<button>Giao việc</button><span class="assign-msg"></span></form></details>';
  }
  assignBox.innerHTML = html;
}

assignBox.addEventListener("submit", async function (event) {
  event.preventDefault();
  const form = event.target;
  const message = form.querySelector(".assign-msg");
  const button = form.querySelector("button");
  button.disabled = true;
  message.textContent = "Đang giao...";
  try {
    const response = await fetch("/api/task", { method: "POST", body: new URLSearchParams(new FormData(form)) });
    const data = await response.json();
    if (data.ok) {
      message.textContent = "Đã giao " + data.identifier + ".";
      form.reset();
      chatTask = { identifier: data.identifier, title: data.title };
      chatPinned = true;
      renderChatHead();
      loadChat();
      refreshNow();
    } else {
      message.textContent = data.error || "Không giao được.";
    }
  } catch (error) {
    message.textContent = "Không kết nối được Studio web.";
  }
  button.disabled = false;
});

// Lan chuot tren hang agent thi cuon ngang
rosterBar.addEventListener("wheel", function (event) {
  if (event.deltaY !== 0) {
    rosterBar.scrollLeft = rosterBar.scrollLeft + event.deltaY;
    event.preventDefault();
  }
}, { passive: false });

rosterBar.addEventListener("click", function (event) {
  const chip = event.target.closest("[data-id]");
  if (chip !== null) {
    select(chip.getAttribute("data-id"));
  }
});

infoMain.addEventListener("click", function (event) {
  const toggle = event.target.closest("[data-toggle]");
  if (toggle !== null) {
    showAllTasks = !showAllTasks;
    renderInfo();
    return;
  }
  const chip = event.target.closest("[data-id]");
  if (chip !== null) {
    select(chip.getAttribute("data-id"));
    return;
  }
  const row = event.target.closest("[data-task]");
  if (row !== null) {
    chatTask = { identifier: row.getAttribute("data-task"), title: row.getAttribute("data-title") || "" };
    chatPinned = true;
    renderChatHead();
    chatLog.innerHTML = "";
    loadChat();
    renderInfo();
  }
});

// ---------- Chat ----------
// chatTask = null nghia la "doan chat moi": tin dau tien se tao mot task moi cho agent
let chatTask = null;
let chatPinned = false;   // true khi nguoi dung tu chon task
let showAllTasks = false; // true khi bam "Xem tat ca" o lich su task

function chatTaskOf(id) {
  const actor = actors[id];
  if (actor === undefined || actor.data.chatTask === null) {
    return null;
  }
  return actor.data.chatTask;
}

function renderChatHead() {
  const actor = actors[selectedId];
  if (actor === undefined && chatTask !== null) {
    chatHead.innerHTML = "Tin nhắn trên task " + escapeHtml(chatTask.identifier + " " + chatTask.title) + "";
    chatSend.disabled = false;
    chatText.disabled = false;
    return;
  }
  if (actor === undefined) {
    chatHead.textContent = "Chọn một vị thần để trò chuyện";
    chatSend.disabled = true;
    chatText.disabled = true;
    chatLog.innerHTML = "";
    return;
  }
  chatSend.disabled = false;
  chatText.disabled = false;
  if (chatTask === null) {
    chatHead.innerHTML = '<div class="chat-title">Đoạn chat mới với ' + escapeHtml(actor.info.title) + "</div>";
    chatText.placeholder = "Nhắn cho " + actor.info.title;
    return;
  }
  chatHead.innerHTML = '<div class="chat-title"><span class="chat-name">' + escapeHtml(chatTask.identifier + " " + chatTask.title) + "</span>" +
    '<button type="button" id="newChat" class="small">+ Đoạn chat mới</button></div>';
  chatText.placeholder = "Nhắn trên " + chatTask.identifier;
}

// Khung chat trong khi chua gui tin nao
function showEmptyChat() {
  const actor = actors[selectedId];
  if (actor === undefined) {
    chatLog.innerHTML = "";
    return;
  }
  chatLog.innerHTML = "";
}

chatHead.addEventListener("click", function (event) {
  if (event.target.id === "newChat") {
    chatTask = null;
    chatPinned = false;
    renderChatHead();
    showEmptyChat();
    renderInfo();
    chatText.focus();
  }
});

async function loadChat() {
  if (chatTask === null) {
    return;
  }
  const askedTask = chatTask.identifier;
  try {
    const response = await fetch("/api/chat?task=" + encodeURIComponent(askedTask));
    const data = await response.json();
    if (chatTask === null || chatTask.identifier !== askedTask) {
      return;
    }
    if (data.ok === false) {
      chatLog.innerHTML = '<p class="muted">Không đọc được tin nhắn từ Paperclip.</p>';
      return;
    }
    const nearBottom = chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 40;
    let html = "";
    if (data.messages.length === 0) {
      html = "";
    }
    for (let i = 0; i < data.messages.length; i++) {
      const m = data.messages[i];
      let cls = "msg";
      if (m.mine) {
        cls = "msg mine";
      }
      html = html + '<div class="' + cls + '"><small>' + escapeHtml(m.who) + "</small>" + escapeHtml(m.body) + "</div>";
    }
    chatLog.innerHTML = html;
    if (nearBottom) {
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  } catch (error) {
    chatLog.innerHTML = '<p class="muted">Không kết nối được Studio web.</p>';
  }
}

chatForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  const text = chatText.value.trim();
  if (text === "") {
    return;
  }
  if (chatTask === null) {
    // Doan chat moi: tao task moi giao cho agent dang chon
    const actor = actors[selectedId];
    if (actor === undefined) {
      return;
    }
    chatSend.disabled = true;
    const newBody = new URLSearchParams();
    newBody.set("kind", "chat");
    newBody.set("agentId", actor.id);
    newBody.set("text", text);
    try {
      const response = await fetch("/api/task", { method: "POST", body: newBody });
      const data = await response.json();
      if (data.ok) {
        chatText.value = "";
        chatTask = { identifier: data.identifier, title: data.title };
        chatPinned = true;
        renderChatHead();
        await loadChat();
        refreshNow();
      } else {
        alert(data.error || "Không tạo được đoạn chat.");
      }
    } catch (error) {
      alert("Không kết nối được Studio web.");
    }
    chatSend.disabled = false;
    return;
  }
  chatSend.disabled = true;
  const body = new URLSearchParams();
  body.set("task", chatTask.identifier);
  body.set("text", text);
  try {
    const response = await fetch("/api/chat", { method: "POST", body: body });
    const data = await response.json();
    if (data.ok) {
      chatText.value = "";
      await loadChat();
      chatLog.scrollTop = chatLog.scrollHeight;
    } else {
      alert(data.error || "Không gửi được tin nhắn.");
    }
  } catch (error) {
    alert("Không kết nối được Studio web.");
  }
  chatSend.disabled = false;
});

chatText.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && event.shiftKey === false) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

setInterval(loadChat, 5000);

// ---------- Chon nhan vat ----------
function select(id) {
  selectedId = id;
  if (selectRing.parent !== null) {
    selectRing.parent.remove(selectRing);
  }
  if (id !== null && actors[id] !== undefined) {
    actors[id].root.add(selectRing);
  }
  chatTask = null;
  chatPinned = false;
  showAllTasks = false;
  renderChatHead();
  showEmptyChat();
  const ids = Object.keys(actors);
  for (let i = 0; i < ids.length; i++) {
    updateLabel(actors[ids[i]]);
  }
  renderInfo();
  renderAssign();
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downX = 0;
let downY = 0;
renderer.domElement.addEventListener("pointerdown", function (event) {
  downX = event.clientX;
  downY = event.clientY;
});
renderer.domElement.addEventListener("pointerup", function (event) {
  // Keo chuot de xoay thi khong tinh la bam
  if (Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > 6) {
    return;
  }
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const targets = [wukong];
  const ids = Object.keys(actors);
  for (let i = 0; i < ids.length; i++) {
    targets.push(actors[ids[i]].root);
  }
  const hits = raycaster.intersectObjects(targets, true);
  for (let i = 0; i < hits.length; i++) {
    let object = hits[i].object;
    while (object !== null) {
      if (object.userData.agentId !== undefined) {
        if (object.visible) {
          select(object.userData.agentId);
          return;
        }
        break;
      }
      object = object.parent;
    }
  }
});

// ---------- Lay du lieu tu Studio web ----------
function applyData(data) {
  if (data.waits === undefined) data.waits = [];
  latest = data;
  if (data.ok === false) {
    banner.textContent = "Không đọc được Paperclip.";
    banner.hidden = false;
    renderInfo();
    return;
  }
  banner.hidden = true;

  for (let i = 0; i < data.agents.length; i++) {
    const agent = data.agents[i];
    let actor = actors[agent.id];
    if (actor === undefined) {
      actor = createActor(agent);
    }
    // Phat hien ban giao: agent vua nhan task moi va co agent lam buoc truoc
    let newTask = null;
    if (agent.currentTask !== null) {
      newTask = agent.currentTask.identifier;
    }
    if (firstLoad === false && newTask !== null && newTask !== actor.lastTask && agent.prevAgentId !== null) {
      const from = actors[agent.prevAgentId];
      if (from !== undefined) {
        sendScroll(from, actor);
      }
    }
    actor.lastTask = newTask;
    actor.data = agent;
    updateLabel(actor);
  }

  wukong.visible = data.bugs.length > 0 || data.waits.length > 0;
  let wukongText = "";
  if (data.bugs.length > 0) wukongText = data.bugs.length + " việc lỗi";
  if (data.waits.length > 0) {
    if (wukongText !== "") wukongText = wukongText + ", ";
    wukongText = wukongText + data.waits.length + " việc chờ duyệt";
  }
  wukongDiv.innerHTML = '<div class="nm">Tôn Ngộ Không</div><div class="tk">' + wukongText + "</div>";

  // Mac dinh chon Ngoc Hoang (Producer)
  if (firstLoad && selectedId === null && producerId() !== null) {
    firstLoad = false;
    select(producerId());
  }
  firstLoad = false;
  if (selectedId === "wukong" && data.bugs.length === 0 && data.waits.length === 0) {
    select(producerId());
    return;
  }
  renderInfo();
}

async function refreshNow() {
  let data = { ok: false };
  try {
    const response = await fetch("/api/office");
    data = await response.json();
  } catch (error) {
    data = { ok: false };
  }
  applyData(data);
}

async function poll() {
  await refreshNow();
  setTimeout(poll, 4000);
}

// ---------- Vong ve ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop(function () {
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;
  const ids = Object.keys(actors);
  for (let i = 0; i < ids.length; i++) {
    updateActor(actors[ids[i]], dt, time);
  }
  updateWukong(dt, time);
  updateScrolls(dt);
  moveSky(sky, time);
  movePetals(petals, dt, time);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

renderChatHead();
renderInfo();
poll();
