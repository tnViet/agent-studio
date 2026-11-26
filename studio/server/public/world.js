// Canh thien dinh: may nhieu lop, vuon dao co tiec, cau noi, dien Lang Tieu, Nam Thien Mon, van phong.
// Toa do: x sang phai, z ve phia nguoi xem (duoi man hinh). Mat cac dam may o y = 0.
// Muon sap xep lai: sua LAYOUT. Muon doi cau doi: sua COUPLETS.
import * as THREE from "three";
import { part, toon } from "./characters.js";

// ---------- Vi tri ----------
// Van phong xep vong quanh vuon dao. angle tinh bang do: 0 = ben phai, 90 = phia duoi, 180 = ben trai, -90 = phia tren.
const OFFICE_RING = 10;
const OFFICE_ANGLES = [180, 132, 90, 48, 0, -90, 155, 25, 205, -25];
const officeSpots = [];
for (let i = 0; i < OFFICE_ANGLES.length; i++) {
  let ring = OFFICE_RING;
  if (i >= 6) {
    ring = 15.5;
  }
  const rad = (OFFICE_ANGLES[i] * Math.PI) / 180;
  officeSpots.push({ x: Math.cos(rad) * ring, z: Math.sin(rad) * ring });
}

export const LAYOUT = {
  palace: { x: -11.5, z: -8.5, radius: 3.6 },   // Producer, goc tren ben trai
  gate: { x: 11.5, z: -8.5, radius: 3.0 },      // Nam Thien Mon, goc tren ben phai
  garden: { x: 0, z: 0, radius: 5.8 },
  officeRadius: 2.4,
  offices: officeSpots,
};

// Cau doi tung van phong: moi ve toi da 5 chu. Khoa la ten agent viet thuong.
export const COUPLETS = {
  scriptwriter: ["Ý tại ngôn ngoại", "Văn hay chữ tốt"],
  director: ["Cảnh đẹp như tranh", "Khung hình chuẩn mực"],
  asset: ["Luyện đan thành bảo", "Vẽ cảnh nên hình"],
  editor: ["Cắt ghép tinh tường", "Khớp tiếng khớp hình"],
  reviewer: ["Soi kỹ từng khung", "Lỗi nào cũng thấy"],
  publisher: ["Đóng gói chu toàn", "Sẵn sàng xuất bản"],
  other: ["Chăm chỉ tu luyện", "Việc thành công tròn"],
};

// Bang mau co trang, ngai vang
const GOLD = 0xc9a24a;
const OLD_GOLD = 0xb08a3a;
const BRONZE = 0x9b6e2f;
const LACQUER = 0x8e2f25;
const RED = 0xa8322d;
const PAPER = 0xead9a8;
const WOOD = 0x6b4423;
const DARK_WOOD = 0x4a2f1c;
const JADE = 0x9cc5a3;
const STONE = 0xa8ad9a;

// ---------- Tien ich ve chu len canvas ----------
function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Mat phang co hinh ve (khong do bong)
function picture(texture, width, height) {
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
}

// Bien ngang chu vang nen xanh
function signBoard(text, width, height) {
  const texture = canvasTexture(512, 128, function (ctx) {
    ctx.fillStyle = "#1f3b5c";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#c9a24a";
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = "#f0cf7a";
    ctx.font = "bold 58px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 68);
  });
  return picture(texture, width, height);
}

// Ve cau doi doc: moi chu mot dong, nen do vien vang
function coupletBanner(text, width) {
  const words = text.split(" ");
  const cell = 120;
  const canvasHeight = cell * words.length + 40;
  const texture = canvasTexture(140, canvasHeight, function (ctx, w, h) {
    ctx.fillStyle = "#a8261f";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#d8b25a";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = "#f3d27a";
    ctx.font = "bold 54px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < words.length; i++) {
      ctx.fillText(words[i], w / 2, 20 + cell * i + cell / 2);
    }
  });
  return picture(texture, width, (width * canvasHeight) / 140);
}

// Giay viet thu phap: nen giay ngai vang, mot chu lon va con dau do
const BIG_WORDS = ["Tâm", "Nhẫn", "Đức", "Phúc", "Thọ", "Đạo", "Tĩnh", "Lộc"];
function calligraphyTexture(word) {
  return canvasTexture(256, 160, function (ctx, w, h) {
    ctx.fillStyle = "#ead9a8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(150,110,50,0.25)";
    ctx.fillRect(0, 0, w, 10);
    ctx.fillRect(0, h - 10, w, 10);
    ctx.fillStyle = "#231a12";
    ctx.font = "italic bold 84px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(word, w / 2 - 10, h / 2 + 4);
    ctx.fillStyle = "#b3261e";
    ctx.fillRect(w - 48, h - 52, 30, 30);
  });
}

// Bia sach co: nen cham, nhan giay ghi ten sach
function bookCoverTexture(title) {
  return canvasTexture(128, 160, function (ctx, w, h) {
    ctx.fillStyle = "#2c3a5a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ead9a8";
    ctx.fillRect(80, 14, 34, 132);
    ctx.fillStyle = "#231a12";
    ctx.font = "bold 22px serif";
    ctx.textAlign = "center";
    const words = title.split(" ");
    for (let i = 0; i < words.length; i++) {
      ctx.save();
      ctx.translate(97, 36 + i * 50);
      ctx.fillText(words[i], 0, 6);
      ctx.restore();
    }
  });
}

// ---------- May ----------
const cloudOutline = new THREE.MeshBasicMaterial({ color: 0x9fb5cc, side: THREE.BackSide });

// Mot cum may co vien (dung cho nen may duoi cac khu)
function cloudPuff(radius, color) {
  const group = new THREE.Group();
  const material = toon(color);
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const r = radius * (0.42 + Math.random() * 0.22);
    const geometry = new THREE.SphereGeometry(r, 16, 12);
    const ball = new THREE.Mesh(geometry, material);
    ball.position.set(Math.cos(angle) * radius * 0.68, Math.random() * radius * 0.1, Math.sin(angle) * radius * 0.68);
    ball.scale.y = 0.55;
    const edge = new THREE.Mesh(geometry, cloudOutline);
    edge.scale.setScalar(1.035);
    ball.add(edge);
    group.add(ball);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.78, 20, 14), material);
  center.scale.y = 0.5;
  group.add(center);
  return group;
}

// Nen may de dung: mat tren o y = 0
export function cloudPlatform(radius) {
  const group = new THREE.Group();
  const puff = cloudPuff(radius, 0xffffff);
  puff.position.y = -radius * 0.5;
  group.add(puff);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.84, radius * 0.72, 0.1, 36), toon(0xffffff));
  top.position.y = -0.05;
  group.add(top);
  // Vai cum may nho bam quanh mep cho bong benh
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const fluff = cloudPuff(radius * 0.32, 0xfbfdff);
    fluff.position.set(Math.cos(angle) * radius * 0.95, -radius * 0.25 - Math.random() * 0.3, Math.sin(angle) * radius * 0.95);
    group.add(fluff);
  }
  return group;
}

// Mot lop may dung InstancedMesh (nhe cho may yeu). Moi cum gom 5 qua cau.
// bob = true thi tung cum nhap nho len xuong.
function cloudLayer(scene, puffCount, area, yMin, yMax, sizeMin, sizeMax, color, bob) {
  const ballsPerPuff = 5;
  const total = puffCount * ballsPerPuff;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), toon(color), total);
  const items = [];
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let p = 0; p < puffCount; p++) {
    const cx = area.xMin + Math.random() * (area.xMax - area.xMin);
    const cz = area.zMin + Math.random() * (area.zMax - area.zMin);
    const cy = yMin + Math.random() * (yMax - yMin);
    const size = sizeMin + Math.random() * (sizeMax - sizeMin);
    const phase = Math.random() * 10;
    for (let b = 0; b < ballsPerPuff; b++) {
      const angle = (b / ballsPerPuff) * Math.PI * 2;
      let r = size * 0.55;
      let ox = Math.cos(angle) * size * 0.7;
      let oz = Math.sin(angle) * size * 0.5;
      if (b === 0) {
        r = size * 0.8;
        ox = 0;
        oz = 0;
      }
      const item = { x: cx + ox, y: cy, z: cz + oz, r: r, phase: phase };
      items.push(item);
      dummy.position.set(item.x, item.y, item.z);
      dummy.scale.set(r, r * 0.55, r);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      index = index + 1;
    }
  }
  scene.add(mesh);
  return { mesh: mesh, items: items, bob: bob, dummy: dummy };
}

function moveCloudLayer(layer, time) {
  if (layer.bob === false) {
    layer.mesh.position.x = Math.sin(time * 0.05) * 3;
    return;
  }
  for (let i = 0; i < layer.items.length; i++) {
    const item = layer.items[i];
    layer.dummy.position.set(item.x + Math.sin(time * 0.2 + item.phase) * 0.6, item.y + Math.sin(time * 0.8 + item.phase) * 0.18, item.z);
    layer.dummy.scale.set(item.r, item.r * 0.55, item.r);
    layer.dummy.updateMatrix();
    layer.mesh.setMatrixAt(i, layer.dummy.matrix);
  }
  layer.mesh.instanceMatrix.needsUpdate = true;
}

// ---------- Bau troi va cac lop may ----------
export function buildSky(scene) {
  scene.background = canvasTexture(4, 256, function (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#86c4ea");
    gradient.addColorStop(0.55, "#cfe8f6");
    gradient.addColorStop(1, "#fbe7d6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 256);
  });
  scene.fog = new THREE.Fog(0xe2eef6, 34, 80);

  const layers = [];
  // Bien may sau nhat
  layers.push(cloudLayer(scene, 60, { xMin: -60, xMax: 60, zMin: -45, zMax: 35 }, -9, -7, 4, 7, 0xeef4fa, false));
  // Bien may giua
  layers.push(cloudLayer(scene, 70, { xMin: -45, xMax: 45, zMin: -35, zMax: 30 }, -5, -3.2, 2.5, 4.5, 0xf6f9fc, false));
  // May nho bong benh lap cho trong giua cac khu
  layers.push(cloudLayer(scene, 55, { xMin: -22, xMax: 22, zMin: -17, zMax: 17 }, -1.6, -0.4, 0.7, 1.6, 0xffffff, true));
  // Day may lon phia sau lam chan troi
  layers.push(cloudLayer(scene, 30, { xMin: -50, xMax: 50, zMin: -40, zMax: -26 }, -1, 6, 4, 8, 0xffffff, false));
  return layers;
}

export function moveSky(layers, time) {
  for (let i = 0; i < layers.length; i++) {
    moveCloudLayer(layers[i], time);
  }
}

// ---------- Do vat co trang dung chung ----------

// Sach co nam: bia, ruot giay vang, co the co ten sach tren bia
function book(color, title) {
  const group = new THREE.Group();
  group.add(part(new THREE.BoxGeometry(0.3, 0.05, 0.22), color, 0, 0.025, 0, 0.04));
  group.add(part(new THREE.BoxGeometry(0.28, 0.035, 0.205), PAPER, 0.008, 0.025, 0, 0));
  if (title !== undefined) {
    const cover = picture(bookCoverTexture(title), 0.22, 0.28);
    cover.rotation.x = -Math.PI / 2;
    cover.rotation.z = Math.PI / 2;
    cover.position.y = 0.052;
    group.add(cover);
  }
  return group;
}

// Sach mo ra
function openBook() {
  const group = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const page = part(new THREE.BoxGeometry(0.2, 0.02, 0.26), PAPER, side * 0.1, 0.02, 0, 0.04);
    page.rotation.z = side * -0.12;
    group.add(page);
  }
  group.add(part(new THREE.BoxGeometry(0.42, 0.01, 0.28), 0x7a2a20, 0, 0.004, 0, 0));
  return group;
}

// Giay lon cong cong co chu thu phap, hai dau cuon tron
function curvedPaper(width, depth, bend, word) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(width, depth, 16, 1);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setY(i, Math.sin((x / width + 0.5) * Math.PI) * bend + 0.012);
  }
  geometry.computeVertexNormals();
  const sheet = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: calligraphyTexture(word), side: THREE.DoubleSide }));
  group.add(sheet);
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const roll = part(new THREE.CylinderGeometry(0.035, 0.035, depth + 0.04, 10), OLD_GOLD, side * width / 2, 0.035, 0, 0.06);
    roll.rotation.x = Math.PI / 2;
    group.add(roll);
  }
  return group;
}

// Cuon thu buoc day do
function scrollRoll(length) {
  const group = new THREE.Group();
  const body = part(new THREE.CylinderGeometry(0.045, 0.045, length, 10), PAPER, 0, 0.045, 0, 0.05);
  body.rotation.z = Math.PI / 2;
  group.add(body);
  const tie = part(new THREE.TorusGeometry(0.047, 0.012, 6, 12), RED, 0, 0.045, 0, 0);
  tie.rotation.y = Math.PI / 2;
  group.add(tie);
  return group;
}

// Binh phap tren the tre (truc gian): cac thanh tre xep canh nhau, mot dau cuon lai
function bambooSlips() {
  const group = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    group.add(part(new THREE.BoxGeometry(0.035, 0.012, 0.34), 0xc8a865, i * 0.04, 0.006, 0, 0.03));
  }
  const rolled = part(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 12), 0xb8964f, 0.4, 0.07, 0, 0.05);
  rolled.rotation.x = Math.PI / 2;
  group.add(rolled);
  return group;
}

// Ong cam but long va nghien muc
function brushSet() {
  const group = new THREE.Group();
  group.add(part(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 12), BRONZE, 0, 0.08, 0, 0.05));
  for (let i = 0; i < 4; i++) {
    const brush = new THREE.Group();
    brush.add(part(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), 0x8a5a2b, 0, 0.15, 0, 0));
    brush.add(part(new THREE.ConeGeometry(0.018, 0.06, 8), 0x1d1a16, 0, 0.31, 0, 0));
    brush.position.set(-0.025 + (i % 2) * 0.05, 0.05, -0.02 + Math.floor(i / 2) * 0.04);
    brush.rotation.z = -0.15 + i * 0.1;
    group.add(brush);
  }
  const inkstone = part(new THREE.BoxGeometry(0.2, 0.04, 0.13), 0x2a2724, 0.22, 0.02, 0.02, 0.04);
  group.add(inkstone);
  group.add(part(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 10), 0x111111, 0.27, 0.045, 0.02, 0));
  return group;
}

// Lu huong dong ba chan, khoi bay nhe
function incenseBurner(size) {
  const group = new THREE.Group();
  group.add(part(new THREE.SphereGeometry(0.12 * size, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), BRONZE, 0, 0.14 * size, 0, 0.05));
  const rim = part(new THREE.TorusGeometry(0.12 * size, 0.015 * size, 6, 16), GOLD, 0, 0.14 * size, 0, 0);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    group.add(part(new THREE.CylinderGeometry(0.015 * size, 0.015 * size, 0.06 * size, 6), BRONZE, Math.cos(angle) * 0.07 * size, 0.03 * size, Math.sin(angle) * 0.07 * size, 0));
  }
  for (let i = 0; i < 3; i++) {
    group.add(part(new THREE.CylinderGeometry(0.004, 0.004, 0.18 * size, 4), 0x7a2a20, -0.02 + i * 0.02, 0.22 * size, 0, 0));
  }
  return group;
}

// Den long dung: cot go, long den do sang
function standingLantern(height) {
  const group = new THREE.Group();
  group.add(part(new THREE.CylinderGeometry(0.12, 0.16, 0.08, 10), DARK_WOOD, 0, 0.04, 0, 0.05));
  group.add(part(new THREE.CylinderGeometry(0.025, 0.025, height, 8), DARK_WOOD, 0, height / 2, 0, 0.1));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe8603c }));
  lamp.scale.y = 1.25;
  lamp.position.y = height + 0.1;
  group.add(lamp);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.25 }));
  glow.position.y = height + 0.1;
  group.add(glow);
  group.add(part(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 10), GOLD, 0, height + 0.29, 0, 0.05));
  group.add(part(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 10), GOLD, 0, height - 0.08, 0, 0.05));
  group.add(part(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 4), 0xd8b25a, 0, height - 0.2, 0, 0));
  return group;
}

// Thao do vien vang
function redCarpet(width, depth) {
  const group = new THREE.Group();
  group.add(part(new THREE.BoxGeometry(width, 0.02, depth), 0x9e2a22, 0, 0.012, 0, 0.01));
  group.add(part(new THREE.BoxGeometry(width - 0.16, 0.022, depth - 0.16), 0xb5352a, 0, 0.014, 0, 0));
  const border = [[0, depth / 2 - 0.05, width - 0.1, 0.03], [0, -depth / 2 + 0.05, width - 0.1, 0.03]];
  for (let i = 0; i < border.length; i++) {
    group.add(part(new THREE.BoxGeometry(border[i][2], 0.024, border[i][3]), GOLD, border[i][0], 0.015, border[i][1], 0));
  }
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    group.add(part(new THREE.BoxGeometry(0.03, 0.024, depth - 0.1), GOLD, side * (width / 2 - 0.05), 0.015, 0, 0));
  }
  return group;
}

// Cau doi dung tren gia go
function coupletStand(text) {
  const group = new THREE.Group();
  const banner = coupletBanner(text, 0.26);
  const bannerHeight = banner.geometry.parameters.height;
  banner.position.set(0, 0.12 + bannerHeight / 2, 0.02);
  group.add(banner);
  group.add(part(new THREE.CylinderGeometry(0.02, 0.02, bannerHeight + 0.3, 6), DARK_WOOD, -0.15, (bannerHeight + 0.3) / 2, 0, 0.1));
  group.add(part(new THREE.CylinderGeometry(0.02, 0.02, bannerHeight + 0.3, 6), DARK_WOOD, 0.15, (bannerHeight + 0.3) / 2, 0, 0.1));
  group.add(part(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), GOLD, 0, bannerHeight + 0.18, 0.02, 0.1));
  group.children[group.children.length - 1].rotation.z = Math.PI / 2;
  group.add(part(new THREE.BoxGeometry(0.36, 0.05, 0.12), DARK_WOOD, 0, 0.025, 0, 0.05));
  return group;
}

// Gia sach go hai tang co sach va cuon thu
function bookShelf() {
  const group = new THREE.Group();
  const width = 0.9;
  group.add(part(new THREE.BoxGeometry(0.05, 0.95, 0.3), DARK_WOOD, -width / 2, 0.475, 0, 0.04));
  group.add(part(new THREE.BoxGeometry(0.05, 0.95, 0.3), DARK_WOOD, width / 2, 0.475, 0, 0.04));
  for (let level = 0; level < 3; level++) {
    group.add(part(new THREE.BoxGeometry(width, 0.04, 0.3), DARK_WOOD, 0, 0.05 + level * 0.42, 0, 0.04));
  }
  const colors = [0x2c3a5a, 0x7a2a20, 0x5a4a2a, 0x3b5a3a, 0x8a6a2a];
  for (let i = 0; i < 5; i++) {
    const standing = part(new THREE.BoxGeometry(0.06, 0.26, 0.2), colors[i], -0.36 + i * 0.075, 0.2, 0, 0.05);
    standing.rotation.z = (i - 2) * 0.04;
    group.add(standing);
  }
  for (let i = 0; i < 3; i++) {
    const roll = scrollRoll(0.26);
    roll.position.set(0.15 + (i % 2) * 0.12, 0.07 + Math.floor(i / 2) * 0.08, 0);
    roll.rotation.y = Math.PI / 2;
    group.add(roll);
  }
  for (let i = 0; i < 3; i++) {
    const stacked = book(colors[(i + 2) % 5]);
    stacked.position.set(-0.2, 0.49 + i * 0.05, 0);
    stacked.rotation.y = i * 0.3;
    group.add(stacked);
  }
  const vase = part(new THREE.CylinderGeometry(0.05, 0.08, 0.22, 12), JADE, 0.22, 0.58, 0, 0.06);
  group.add(vase);
  return group;
}

// ---------- Cau cong noi hai khu ----------
const BRIDGES = [];

// from, to: tam hai khu {x, z}; fromRadius, toRadius: ban kinh nen may hai dau.
// Tra ve dau cau phia from (g) va phia to (o).
export function buildBridge(scene, from, fromRadius, to, toRadius) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const ux = dx / distance;
  const uz = dz / distance;
  const g = { x: from.x + ux * (fromRadius - 0.5), z: from.z + uz * (fromRadius - 0.5) };
  const o = { x: to.x - ux * (toRadius - 0.5), z: to.z - uz * (toRadius - 0.5) };
  const length = distance - (fromRadius - 0.5) - (toRadius - 0.5);
  const height = 0.35 + length * 0.09;

  const group = new THREE.Group();
  group.position.set(g.x, 0, g.z);
  group.rotation.y = Math.atan2(ux, uz);

  // Van cau go theo hinh vong cung
  const planks = Math.max(6, Math.round(length / 0.22));
  for (let i = 0; i < planks; i++) {
    const t = (i + 0.5) / planks;
    const y = height * Math.sin(Math.PI * t);
    const slope = ((height * Math.PI) / length) * Math.cos(Math.PI * t);
    const plank = part(new THREE.BoxGeometry(1.15, 0.07, (length / planks) * 0.92), 0x8a5a2e, 0, y - 0.035, t * length, 0.03);
    plank.rotation.x = -Math.atan(slope);
    group.add(plank);
  }
  // Lan can do, coc co nut vang
  for (let s = 0; s < 2; s++) {
    let side = -1;
    if (s === 1) {
      side = 1;
    }
    const posts = 6;
    for (let k = 0; k <= posts; k++) {
      const t = k / posts;
      const y = height * Math.sin(Math.PI * t);
      group.add(part(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), RED, side * 0.56, y + 0.25, t * length, 0.08));
      group.add(part(new THREE.SphereGeometry(0.055, 8, 6), GOLD, side * 0.56, y + 0.52, t * length, 0.08));
    }
    const railPoints = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      railPoints.push(new THREE.Vector3(side * 0.56, height * Math.sin(Math.PI * t) + 0.45, t * length));
    }
    const rail = part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPoints), 32, 0.028, 6, false), RED, 0, 0, 0, 0);
    group.add(rail);
  }
  // Den long hai dau cau
  const lanternA = standingLantern(0.8);
  lanternA.position.set(0.75, 0, 0.1);
  group.add(lanternA);
  const lanternB = standingLantern(0.8);
  lanternB.position.set(-0.75, 0, length - 0.1);
  group.add(lanternB);
  scene.add(group);

  const bridge = { gx: g.x, gz: g.z, ux: ux, uz: uz, length: length, height: height, g: g, o: o };
  BRIDGES.push(bridge);
  return bridge;
}

// Do cao mat cau tai diem (x, z), hoac null neu khong dung tren cau
export function bridgeHeightAt(x, z) {
  for (let i = 0; i < BRIDGES.length; i++) {
    const b = BRIDGES[i];
    const rx = x - b.gx;
    const rz = z - b.gz;
    const along = rx * b.ux + rz * b.uz;
    const across = Math.abs(rx * b.uz - rz * b.ux);
    if (along >= 0 && along <= b.length && across < 0.7) {
      return b.height * Math.sin((Math.PI * along) / b.length);
    }
  }
  return null;
}

// ---------- Vuon dao va tiec ----------
function peachTree() {
  const tree = new THREE.Group();
  const trunk = part(new THREE.CylinderGeometry(0.12, 0.2, 1.2, 10), 0x7a4b2a, 0, 0.6, 0);
  trunk.rotation.z = 0.12;
  tree.add(trunk);
  const branch = part(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 8), 0x7a4b2a, 0.25, 1.1, 0);
  branch.rotation.z = -0.8;
  tree.add(branch);
  const crowns = [[0, 1.55, 0, 0.62], [0.5, 1.4, 0.15, 0.45], [-0.45, 1.35, -0.1, 0.45], [0.1, 1.45, 0.45, 0.42], [0, 1.95, -0.1, 0.4]];
  for (let i = 0; i < crowns.length; i++) {
    let color = 0xf7b6c8;
    if (i % 2 === 1) {
      color = 0x8cc46a;
    }
    tree.add(part(new THREE.SphereGeometry(crowns[i][3], 16, 12), color, crowns[i][0], crowns[i][1], crowns[i][2], 0.04));
  }
  for (let i = 0; i < 7; i++) {
    const angle = Math.random() * Math.PI * 2;
    const height = 1.2 + Math.random() * 0.6;
    tree.add(peach(Math.cos(angle) * 0.62, height, Math.sin(angle) * 0.62, 0.11));
  }
  // Den long treo canh
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xe8603c }));
  lamp.scale.y = 1.3;
  lamp.position.set(0.55, 0.95, 0.2);
  tree.add(lamp);
  tree.add(part(new THREE.CylinderGeometry(0.005, 0.005, 0.25, 4), 0x333333, 0.55, 1.15, 0.2, 0));
  return tree;
}

function peach(x, y, z, size) {
  const fruit = part(new THREE.SphereGeometry(size, 12, 10), 0xffa27f, x, y, z, 0.08);
  fruit.add(part(new THREE.SphereGeometry(size * 0.45, 8, 6), 0x6fae4a, size * 0.35, size * 0.8, 0, 0));
  return fruit;
}

// Mam dao xep thap
function peachPlate() {
  const group = new THREE.Group();
  group.add(part(new THREE.CylinderGeometry(0.24, 0.18, 0.04, 20), GOLD, 0, 0.02, 0, 0.05));
  const layers = [[0, 0.09, 0.12, 5], [0, 0.2, 0.06, 3], [0, 0.3, 0, 1]];
  for (let l = 0; l < layers.length; l++) {
    for (let i = 0; i < layers[l][3]; i++) {
      const angle = (i / layers[l][3]) * Math.PI * 2;
      group.add(peach(Math.cos(angle) * layers[l][2], layers[l][1], Math.sin(angle) * layers[l][2], 0.075));
    }
  }
  return group;
}

// Dia hoa qua: nho, quyt, chuoi
function fruitPlate() {
  const group = new THREE.Group();
  group.add(part(new THREE.CylinderGeometry(0.24, 0.18, 0.04, 20), JADE, 0, 0.02, 0, 0.05));
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    group.add(part(new THREE.SphereGeometry(0.035, 8, 6), 0x6b3a8a, -0.1 + (i % 3) * 0.05 + row * 0.02, 0.07 + row * 0.04, -0.05 + row * 0.02, 0.1));
  }
  for (let i = 0; i < 3; i++) {
    group.add(part(new THREE.SphereGeometry(0.055, 10, 8), 0xf39a2b, 0.08 + i * 0.03, 0.07, 0.05 - i * 0.07, 0.06));
  }
  for (let i = 0; i < 3; i++) {
    const banana = part(new THREE.TorusGeometry(0.1, 0.022, 6, 12, Math.PI * 0.7), 0xf2d046, -0.05, 0.06, 0.1 - i * 0.025, 0.08);
    banana.rotation.x = -Math.PI / 2;
    banana.rotation.z = 0.5;
    group.add(banana);
  }
  return group;
}

// Dia banh deo vang
function cakePlate() {
  const group = new THREE.Group();
  group.add(part(new THREE.CylinderGeometry(0.2, 0.16, 0.03, 20), 0xf0ead8, 0, 0.015, 0, 0.05));
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const cake = part(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 14), 0xc98a3a, Math.cos(angle) * 0.09, 0.05, Math.sin(angle) * 0.09, 0.06);
    group.add(cake);
  }
  return group;
}

// Am tra men ngoc va chen
function teaSet() {
  const group = new THREE.Group();
  const pot = part(new THREE.SphereGeometry(0.1, 14, 10), 0x8fb9a6, 0, 0.09, 0, 0.06);
  pot.scale.y = 0.8;
  group.add(pot);
  const spout = part(new THREE.ConeGeometry(0.025, 0.12, 8), 0x8fb9a6, 0.11, 0.11, 0, 0.06);
  spout.rotation.z = -1.0;
  group.add(spout);
  const handle = part(new THREE.TorusGeometry(0.05, 0.012, 6, 12), 0x8fb9a6, -0.11, 0.1, 0, 0);
  group.add(handle);
  group.add(part(new THREE.SphereGeometry(0.02, 8, 6), GOLD, 0, 0.18, 0, 0));
  for (let i = 0; i < 3; i++) {
    group.add(part(new THREE.CylinderGeometry(0.03, 0.022, 0.035, 10), 0xf4f1e6, 0.05 + i * 0.08, 0.018, 0.14, 0.08));
  }
  return group;
}

// Vo ruou nut vai do
function wineJar() {
  const group = new THREE.Group();
  const points = [];
  const profile = [[0, 0], [0.1, 0], [0.17, 0.1], [0.18, 0.2], [0.12, 0.32], [0.07, 0.36], [0.08, 0.4]];
  for (let i = 0; i < profile.length; i++) {
    points.push(new THREE.Vector2(profile[i][0], profile[i][1]));
  }
  group.add(part(new THREE.LatheGeometry(points, 18), 0x7a4a26, 0, 0, 0, 0.04));
  const cloth = part(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), RED, 0, 0.39, 0, 0.06);
  group.add(cloth);
  const label = part(new THREE.BoxGeometry(0.12, 0.12, 0.01), 0xd94a3a, 0, 0.2, 0.175, 0);
  label.rotation.z = Math.PI / 4;
  group.add(label);
  return group;
}

// Gio dao dat duoi dat
function peachBasket() {
  const group = new THREE.Group();
  group.add(part(new THREE.CylinderGeometry(0.28, 0.2, 0.22, 16, 1, true), 0xb8864a, 0, 0.11, 0, 0.05));
  group.add(part(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), 0x9a6e3a, 0, 0.01, 0, 0));
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    group.add(peach(Math.cos(angle) * 0.14, 0.24, Math.sin(angle) * 0.14, 0.08));
  }
  group.add(peach(0, 0.3, 0, 0.08));
  return group;
}

// Ban da tron co bon ghe don
function stoneTable(items) {
  const group = new THREE.Group();
  group.add(part(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 14), STONE, 0, 0.25, 0, 0.04));
  group.add(part(new THREE.CylinderGeometry(0.62, 0.6, 0.08, 28), 0xb6bba8, 0, 0.54, 0, 0.03));
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    group.add(part(new THREE.CylinderGeometry(0.17, 0.2, 0.34, 12), STONE, Math.cos(angle) * 1.0, 0.17, Math.sin(angle) * 1.0, 0.05));
  }
  for (let i = 0; i < items.length; i++) {
    items[i].position.y = items[i].position.y + 0.58;
    group.add(items[i]);
  }
  return group;
}

// Cho dung quanh ban tiec de nhan vat ra choi (tra ve trong buildGarden)
export const GARDEN_SPOTS = [];

export function buildGarden(scene) {
  const g = LAYOUT.garden;
  const group = new THREE.Group();
  group.position.set(g.x, 0, g.z);
  group.add(cloudPlatform(g.radius + 0.8));
  group.add(part(new THREE.CylinderGeometry(g.radius - 0.2, g.radius, 0.16, 48), 0x9fcb6e, 0, -0.06, 0, 0.01));
  // Ao sen
  group.add(part(new THREE.CylinderGeometry(1.0, 1.0, 0.04, 32), 0x7cc3e0, 0, 0.03, 0, 0.03));
  for (let i = 0; i < 4; i++) {
    const angle = i * 1.7;
    group.add(part(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), 0x6fae4a, Math.cos(angle) * 0.55, 0.06, Math.sin(angle) * 0.55, 0));
  }
  group.add(part(new THREE.SphereGeometry(0.1, 10, 8), 0xf4a6c0, 0.3, 0.12, 0.2, 0.05));
  // Cay dao vong ngoai
  const treeCount = 8;
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + 0.2;
    const tree = peachTree();
    tree.position.set(Math.cos(angle) * 4.5, 0, Math.sin(angle) * 4.5);
    tree.rotation.y = Math.random() * Math.PI;
    group.add(tree);
  }

  // Hai ban tiec dao
  const tables = [
    { x: 2.5, z: 1.0, items: [[peachPlate(), -0.2, -0.1], [teaSet(), 0.22, 0.12], [cakePlate(), 0.1, -0.32]] },
    { x: -2.4, z: -1.2, items: [[fruitPlate(), 0.15, 0.05], [peachPlate(), -0.2, 0.1], [teaSet(), 0, -0.3]] },
  ];
  for (let t = 0; t < tables.length; t++) {
    const list = [];
    for (let i = 0; i < tables[t].items.length; i++) {
      const item = tables[t].items[i][0];
      item.position.set(tables[t].items[i][1], 0, tables[t].items[i][2]);
      list.push(item);
    }
    const table = stoneTable(list);
    table.position.set(tables[t].x, 0, tables[t].z);
    group.add(table);
    // Cho dung choi quanh ban
    for (let k = 0; k < 4; k++) {
      const angle = (k / 4) * Math.PI * 2;
      GARDEN_SPOTS.push({ x: g.x + tables[t].x + Math.cos(angle) * 1.35, z: g.z + tables[t].z + Math.sin(angle) * 1.35 });
    }
  }
  // Tham do cho tiec, vo ruou, gio dao
  const mat = redCarpet(1.6, 1.0);
  mat.position.set(0.4, 0, 2.7);
  mat.rotation.y = 0.3;
  group.add(mat);
  const jar1 = wineJar();
  jar1.position.set(0.0, 0.02, 2.75);
  group.add(jar1);
  const jar2 = wineJar();
  jar2.position.set(0.45, 0.02, 2.55);
  jar2.scale.setScalar(0.8);
  group.add(jar2);
  const plate = fruitPlate();
  plate.position.set(0.9, 0.03, 2.9);
  group.add(plate);
  const basket1 = peachBasket();
  basket1.position.set(-3.3, 0, 1.6);
  group.add(basket1);
  const basket2 = peachBasket();
  basket2.position.set(3.0, 0, -2.2);
  group.add(basket2);
  // Den long quanh vuon
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const lantern = standingLantern(1.0);
    lantern.position.set(Math.cos(angle) * 3.5, 0, Math.sin(angle) * 3.5);
    group.add(lantern);
  }
  scene.add(group);

  // Canh hoa dao roi
  const petalGeometry = new THREE.PlaneGeometry(0.09, 0.06);
  const petalMaterial = new THREE.MeshBasicMaterial({ color: 0xf8b7cb, side: THREE.DoubleSide });
  const petals = [];
  for (let i = 0; i < 50; i++) {
    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    petal.position.set(g.x - 5 + Math.random() * 10, Math.random() * 3, g.z - 5 + Math.random() * 10);
    petal.userData.fall = 0.25 + Math.random() * 0.3;
    scene.add(petal);
    petals.push(petal);
  }
  return petals;
}

export function movePetals(petals, dt, time) {
  for (let i = 0; i < petals.length; i++) {
    const p = petals[i];
    p.position.y = p.position.y - p.userData.fall * dt;
    p.position.x = p.position.x + Math.sin(time + i) * 0.2 * dt;
    p.rotation.x = p.rotation.x + dt * 2;
    p.rotation.y = p.rotation.y + dt;
    if (p.position.y < 0.02) {
      p.position.y = 2.5 + Math.random();
    }
  }
}

// ---------- Dien Lang Tieu cua Ngoc Hoang ----------
// Tra ve { home: cho ngoi tren ngai, front: dau tham do phia truoc }
export function buildPalace(scene) {
  const p = LAYOUT.palace;
  const group = new THREE.Group();
  group.position.set(p.x, 0, p.z);
  group.add(cloudPlatform(p.radius + 0.6));
  // Nen ngoc hai bac
  group.add(part(new THREE.CylinderGeometry(p.radius - 0.2, p.radius, 0.16, 48), 0xeef3ec, 0, -0.06, 0, 0.01));
  group.add(part(new THREE.CylinderGeometry(2.0, 2.15, 0.16, 40), 0xe4d9b4, 0, 0.02, -0.6, 0.01));

  // Tham do tu mep truoc vao ngai
  const carpet = redCarpet(1.4, 3.0);
  carpet.position.set(0, 0.09, 1.2);
  group.add(carpet);

  // Be ngai ba bac
  for (let s = 0; s < 3; s++) {
    group.add(part(new THREE.BoxGeometry(2.6 - s * 0.3, 0.12, 1.8 - s * 0.25), s % 2 === 0 ? GOLD : LACQUER, 0, 0.16 + s * 0.12, -0.75 - s * 0.05, 0.02));
  }
  // Ngai rong: mat ngoi, tua lung cao, tay vin cuon
  const throne = new THREE.Group();
  throne.position.set(0, 0.5, -0.85);
  throne.add(part(new THREE.BoxGeometry(2.1, 0.36, 1.1), GOLD, 0, 0.18, 0, 0.03));
  throne.add(part(new THREE.BoxGeometry(1.9, 0.08, 0.95), 0xb5302a, 0, 0.4, 0.02, 0.03));
  throne.add(part(new THREE.BoxGeometry(2.1, 1.7, 0.16), GOLD, 0, 1.1, -0.5, 0.03));
  throne.add(part(new THREE.BoxGeometry(1.7, 1.3, 0.05), 0xb5302a, 0, 1.05, -0.41, 0));
  const arch = part(new THREE.TorusGeometry(1.05, 0.08, 8, 24, Math.PI), GOLD, 0, 1.92, -0.5, 0.05);
  arch.scale.y = 0.45;
  throne.add(arch);
  throne.add(part(new THREE.SphereGeometry(0.16, 12, 10), 0xf2d46b, 0, 2.42, -0.5, 0.05));
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    throne.add(part(new THREE.BoxGeometry(0.16, 0.42, 1.0), GOLD, side * 1.0, 0.58, 0, 0.03));
    const curl = part(new THREE.TorusGeometry(0.16, 0.05, 8, 16, Math.PI * 1.5), GOLD, side * 1.0, 0.82, 0.42, 0.05);
    curl.rotation.y = Math.PI / 2;
    throne.add(curl);
    // Dau rong nho tren goc lung ngai
    const dragon = part(new THREE.SphereGeometry(0.13, 12, 10), 0xe2b850, side * 1.05, 2.05, -0.45, 0.05);
    dragon.add(part(new THREE.ConeGeometry(0.06, 0.2, 8), 0xe2b850, side * 0.05, 0.02, 0.15, 0.05));
    dragon.children[dragon.children.length - 1].rotation.x = Math.PI / 2;
    throne.add(dragon);
  }
  group.add(throne);

  // Binh phong vang ve may sau ngai
  const screenTexture = canvasTexture(512, 192, function (ctx, w, h) {
    ctx.fillStyle = "#c9a24a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(120,80,20,0.6)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 9; i++) {
      const cx = 40 + i * 55;
      const cy = 60 + (i % 3) * 40;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 18, cy + 8, 12, Math.PI, Math.PI * 2.6);
      ctx.stroke();
    }
    ctx.fillStyle = "#7a2a20";
    for (let i = 1; i < 5; i++) {
      ctx.fillRect((w / 5) * i - 3, 0, 6, h);
    }
  });
  const screen = picture(screenTexture, 3.6, 1.6);
  screen.position.set(0, 1.4, -1.85);
  group.add(screen);
  group.add(part(new THREE.BoxGeometry(3.8, 0.1, 0.12), LACQUER, 0, 2.25, -1.86, 0.03));
  group.add(part(new THREE.BoxGeometry(3.8, 0.1, 0.12), LACQUER, 0, 0.55, -1.86, 0.03));

  // Quat long cong hai ben ngai
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    group.add(part(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), DARK_WOOD, side * 1.55, 1.2, -1.4, 0.1));
    const fan = part(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 28), 0xe9b824, side * 1.55, 2.5, -1.4, 0.03);
    fan.rotation.x = Math.PI / 2;
    group.add(fan);
    const inner = part(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 28), 0xb5302a, side * 1.55, 2.5, -1.37, 0);
    inner.rotation.x = Math.PI / 2;
    group.add(inner);
  }

  // Cot do cuon rong vang
  const pillars = [[-2.2, -1.3], [2.2, -1.3], [-2.2, 1.0], [2.2, 1.0], [-1.3, 2.1], [1.3, 2.1]];
  for (let i = 0; i < pillars.length; i++) {
    const px = pillars[i][0];
    const pz = pillars[i][1];
    group.add(part(new THREE.CylinderGeometry(0.16, 0.16, 5.4, 14), 0xb5302a, px, 2.7, pz, 0.04));
    const helix = [];
    for (let k = 0; k <= 60; k++) {
      const angle = k * 0.45;
      helix.push(new THREE.Vector3(px + Math.cos(angle) * 0.18, 0.2 + k * 0.08, pz + Math.sin(angle) * 0.18));
    }
    group.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 120, 0.035, 6, false), 0xe2b850, 0, 0, 0, 0));
    group.add(part(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14), GOLD, px, 0.06, pz, 0.04));
  }
  // Mai hai tang dat cao de tu tren van nhin thay ngai
  group.add(part(new THREE.BoxGeometry(5.0, 0.2, 4.0), 0xb5302a, 0, 5.45, 0.2, 0.02));
  const roofLow = part(new THREE.ConeGeometry(3.8, 0.9, 4), 0x2f7a66, 0, 6.0, 0.2, 0.02);
  roofLow.rotation.y = Math.PI / 4;
  roofLow.scale.z = 0.8;
  group.add(roofLow);
  group.add(part(new THREE.BoxGeometry(2.2, 0.5, 1.6), 0xb5302a, 0, 6.55, 0.2, 0.02));
  const roofHigh = part(new THREE.ConeGeometry(2.3, 0.9, 4), 0x2f7a66, 0, 7.2, 0.2, 0.02);
  roofHigh.rotation.y = Math.PI / 4;
  roofHigh.scale.z = 0.8;
  group.add(roofHigh);
  group.add(part(new THREE.SphereGeometry(0.2, 12, 10), 0xe9b824, 0, 7.7, 0.2, 0.05));
  // Xa ngang giua hai cot truoc treo bien
  group.add(part(new THREE.BoxGeometry(2.8, 0.22, 0.2), 0xb5302a, 0, 4.95, 2.1, 0.03));
  const sign = signBoard("Lăng Tiêu Bảo Điện", 2.0, 0.5);
  sign.position.set(0, 4.55, 2.23);
  group.add(sign);
  // Cau doi tren hai cot truoc
  const pairs = ["Thiên đình vạn sự như ý", "Video ngắn vạn lượt xem"];
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const banner = coupletBanner(pairs[i], 0.3);
    banner.position.set(side * 1.3, 1.55, 2.27);
    group.add(banner);
  }
  // Den cung dang va dinh huong truoc ngai
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const lamp = standingLantern(1.5);
    lamp.position.set(side * 1.7, 0, 0.2);
    lamp.scale.setScalar(1.3);
    group.add(lamp);
  }
  const cauldron = incenseBurner(3);
  cauldron.position.set(0, 0.08, 2.6);
  group.add(cauldron);
  // Ban ngu an voi sach va giay
  const desk = part(new THREE.BoxGeometry(1.4, 0.08, 0.6), LACQUER, 0, 0.75, 0.25, 0.03);
  group.add(desk);
  group.add(part(new THREE.BoxGeometry(0.1, 0.7, 0.5), LACQUER, -0.6, 0.38, 0.25, 0.03));
  group.add(part(new THREE.BoxGeometry(0.1, 0.7, 0.5), LACQUER, 0.6, 0.38, 0.25, 0.03));
  const deskPaper = curvedPaper(0.6, 0.35, 0.05, "Chỉ");
  deskPaper.position.set(-0.2, 0.8, 0.25);
  group.add(deskPaper);
  const seal = part(new THREE.BoxGeometry(0.14, 0.14, 0.14), JADE, 0.4, 0.86, 0.25, 0.05);
  group.add(seal);
  const deskBrush = brushSet();
  deskBrush.position.set(0.3, 0.79, 0.05);
  deskBrush.scale.setScalar(0.8);
  group.add(deskBrush);

  scene.add(group);
  return {
    home: { x: p.x, y: 0.97, z: p.z - 0.85 },
    front: { x: p.x, z: p.z + 2.9 },
  };
}

// ---------- Nam Thien Mon ----------
// Tra ve vi tri Ngo Khong dung khi co loi
export function buildGate(scene) {
  const p = LAYOUT.gate;
  const group = new THREE.Group();
  group.position.set(p.x, 0, p.z);
  group.add(cloudPlatform(p.radius + 0.4));
  const carpet = redCarpet(1.3, 2.4);
  carpet.position.set(0, 0, 0.6);
  group.add(carpet);
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    group.add(part(new THREE.CylinderGeometry(0.24, 0.26, 3.2, 14), 0xb5302a, side * 1.4, 1.6, -0.3, 0.03));
    for (let k = 0; k < 3; k++) {
      const ring = part(new THREE.TorusGeometry(0.26, 0.04, 6, 20), GOLD, side * 1.4, 0.5 + k * 1.1, -0.3, 0);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }
    // Su tu da canh cong
    const lion = new THREE.Group();
    lion.add(part(new THREE.BoxGeometry(0.5, 0.3, 0.5), STONE, 0, 0.15, 0, 0.04));
    lion.add(part(new THREE.SphereGeometry(0.22, 12, 10), 0xb8bca8, 0, 0.5, 0.05, 0.05));
    lion.add(part(new THREE.SphereGeometry(0.2, 12, 10), 0xc4c8b4, 0, 0.82, 0.12, 0.05));
    lion.add(part(new THREE.SphereGeometry(0.05, 8, 6), 0x2a2a2a, -0.07, 0.86, 0.29, 0));
    lion.add(part(new THREE.SphereGeometry(0.05, 8, 6), 0x2a2a2a, 0.07, 0.86, 0.29, 0));
    lion.position.set(side * 2.1, 0, 0.6);
    group.add(lion);
    const lamp = standingLantern(1.2);
    lamp.position.set(side * 1.0, 0, 1.4);
    group.add(lamp);
    const banner = coupletBanner(i === 0 ? "Gặp lỗi chớ lo" : "Đại Thánh trấn giữ", 0.3);
    banner.position.set(side * 1.4, 1.6, -0.04);
    group.add(banner);
  }
  group.add(part(new THREE.BoxGeometry(3.6, 0.3, 0.5), 0xb5302a, 0, 3.15, -0.3, 0.03));
  group.add(part(new THREE.BoxGeometry(4.2, 0.16, 1.1), 0x2f7a66, 0, 3.4, -0.3, 0.03));
  const top = part(new THREE.ConeGeometry(2.3, 0.8, 4), 0x2f7a66, 0, 3.85, -0.3, 0.03);
  top.rotation.y = Math.PI / 4;
  top.scale.z = 0.75;
  group.add(top);
  group.add(part(new THREE.SphereGeometry(0.14, 10, 8), 0xe9b824, 0, 4.3, -0.3, 0.05));
  const sign = signBoard("Nam Thiên Môn", 1.6, 0.4);
  sign.position.set(0, 2.75, -0.03);
  group.add(sign);
  scene.add(group);
  return { x: p.x, y: 0, z: p.z + 1.3 };
}

// ---------- Van phong tren may ----------
// name: ten agent viet thuong (de chon cau doi va do rieng). Agent ngoi thien tren dem o giua.
export function buildOffice(scene, spot, name) {
  const group = new THREE.Group();
  group.position.set(spot.x, 0, spot.z);
  group.add(cloudPlatform(LAYOUT.officeRadius));
  const room = new THREE.Group();
  room.scale.setScalar(1.5);
  group.add(room);

  // Tham do duoi cho ngoi thien
  const rug = redCarpet(1.5, 1.25);
  rug.position.set(0, 0, 0);
  room.add(rug);

  // Ban thap son mai phia truoc, day do
  room.add(part(new THREE.BoxGeometry(1.0, 0.06, 0.42), LACQUER, 0, 0.3, 0.62, 0.03));
  const legs = [[-0.44, 0.45], [0.44, 0.45], [-0.44, 0.79], [0.44, 0.79]];
  for (let i = 0; i < legs.length; i++) {
    room.add(part(new THREE.BoxGeometry(0.06, 0.28, 0.06), DARK_WOOD, legs[i][0], 0.14, legs[i][1], 0.03));
  }
  const deskTop = new THREE.Group();
  deskTop.position.set(0, 0.33, 0.62);
  room.add(deskTop);
  const word = BIG_WORDS[Math.floor(Math.random() * BIG_WORDS.length)];
  const paper = curvedPaper(0.46, 0.28, 0.035, word);
  paper.position.set(-0.12, 0, 0);
  deskTop.add(paper);
  const brushes = brushSet();
  brushes.position.set(0.25, 0, -0.06);
  brushes.scale.setScalar(0.75);
  deskTop.add(brushes);
  const burner = incenseBurner(0.7);
  burner.position.set(0.4, 0, 0.1);
  deskTop.add(burner);

  // Cau doi hai ben
  let pair = COUPLETS[name];
  if (pair === undefined) {
    pair = COUPLETS.other;
  }
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const stand = coupletStand(pair[i]);
    stand.position.set(side * 0.86, 0, -0.35);
    stand.rotation.y = -side * 0.35;
    room.add(stand);
  }

  // Gia sach sau lung ben trai
  const shelf = bookShelf();
  shelf.position.set(-0.45, 0, -0.95);
  room.add(shelf);

  // Den long hai goc truoc
  const lampA = standingLantern(0.85);
  lampA.position.set(-1.05, 0, 0.55);
  room.add(lampA);
  const lampB = standingLantern(0.85);
  lampB.position.set(1.05, 0, 0.55);
  room.add(lampB);

  // Sach va giay vut ngon ngang tren san
  const colors = [0x2c3a5a, 0x7a2a20, 0x5a4a2a, 0x3b5a3a];
  const floorBooks = [[-0.78, 0.15, 0.6], [-0.7, 0.24, -0.4], [0.82, 0.05, 1.2], [0.7, 0.95, 0.2]];
  for (let i = 0; i < floorBooks.length; i++) {
    let item;
    if (i === 0) {
      item = book(0x2c3a5a, "Binh Pháp");
    } else {
      item = book(colors[i]);
    }
    item.position.set(floorBooks[i][0], 0.02, floorBooks[i][1]);
    item.rotation.y = floorBooks[i][2];
    room.add(item);
  }
  const stackPos = [-0.95, 0.02, 0.1];
  for (let i = 0; i < 3; i++) {
    const stacked = book(colors[(i + 1) % 4]);
    stacked.position.set(stackPos[0], stackPos[1] + i * 0.05, stackPos[2]);
    stacked.rotation.y = i * 0.4;
    room.add(stacked);
  }
  const open = openBook();
  open.position.set(0.55, 0.02, 0.15);
  open.rotation.y = -0.4;
  room.add(open);
  const looseWord = BIG_WORDS[(BIG_WORDS.indexOf(word) + 3) % BIG_WORDS.length];
  const loose = curvedPaper(0.5, 0.3, 0.06, looseWord);
  loose.position.set(0.15, 0.02, 1.05);
  loose.rotation.y = 0.5;
  room.add(loose);
  const roll1 = scrollRoll(0.4);
  roll1.position.set(-0.4, 0.02, 1.0);
  roll1.rotation.y = 0.8;
  room.add(roll1);
  const slips = bambooSlips();
  slips.position.set(0.72, 0.02, -0.6);
  slips.rotation.y = -0.5;
  room.add(slips);

  const extra = { glow: null };
  // Do rieng: lo bat quai cua Lao Quan, trong set cua Thien Loi
  if (name === "asset") {
    const furnace = new THREE.Group();
    furnace.add(part(new THREE.CylinderGeometry(0.3, 0.26, 0.48, 8), BRONZE, 0, 0.4, 0));
    furnace.add(part(new THREE.ConeGeometry(0.32, 0.26, 8), 0x7a5222, 0, 0.77, 0));
    furnace.add(part(new THREE.SphereGeometry(0.05, 8, 6), GOLD, 0, 0.92, 0));
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      furnace.add(part(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6), 0x7a5222, Math.cos(angle) * 0.2, 0.1, Math.sin(angle) * 0.2, 0.05));
    }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff7a2f }));
    glow.position.set(0, 0.42, 0.25);
    furnace.add(glow);
    furnace.position.set(0.5, 0, -0.9);
    room.add(furnace);
    extra.glow = glow;
  } else if (name === "publisher") {
    for (let i = 0; i < 3; i++) {
      const drum = part(new THREE.CylinderGeometry(0.17, 0.17, 0.18, 16), 0xb5302a, 0.45 + i * 0.12, 0.25 + i * 0.25, -0.95);
      drum.rotation.x = Math.PI / 2;
      room.add(drum);
    }
  } else {
    const vase = part(new THREE.CylinderGeometry(0.1, 0.14, 0.4, 14), JADE, 0.5, 0.2, -0.95, 0.05);
    room.add(vase);
    room.add(part(new THREE.SphereGeometry(0.1, 10, 8), 0xf4a6c0, 0.5, 0.45, -0.95, 0.05));
  }
  scene.add(group);
  return extra;
}

// Mot cuon thu bay giua hai van phong khi ban giao viec
export function makeScroll() {
  const group = new THREE.Group();
  const body = part(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), PAPER, 0, 0, 0);
  body.rotation.z = Math.PI / 2;
  group.add(body);
  group.add(part(new THREE.SphereGeometry(0.1, 10, 8), 0xb5302a, -0.27, 0, 0, 0.05));
  group.add(part(new THREE.SphereGeometry(0.1, 10, 8), 0xb5302a, 0.27, 0, 0, 0.05));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.35 }));
  group.add(halo);
  return group;
}
