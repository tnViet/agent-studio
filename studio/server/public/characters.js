// Nhan vat thien dinh cho van phong 3D.
// Moi nhan vat la mot ham build...() tra ve nhom 3D. Muon sua mau, kich thuoc: sua so trong ham do.
// Muon doi nhan vat cho agent: sua bang CHARACTERS o cuoi file.
// Quy uoc: mat nhan vat huong ve truc +z, chan dung o y = 0.
import * as THREE from "three";

// ---------- Vat lieu hoat hinh ----------
let gradientMap = null;

// Vat lieu toon: to mau thanh 3 mang sang toi, giong phim hoat hinh 2D
export function toon(color) {
  if (gradientMap === null) {
    const data = new Uint8Array([120, 195, 255]);
    gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
  }
  return new THREE.MeshToonMaterial({ color: color, gradientMap: gradientMap });
}

const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x2b1e16, side: THREE.BackSide });

// Tao mot khoi co mau, kem vien den (vien = khoi to hon mot chut, ve mat trong).
// outline: do day vien, 0 = khong vien
export function part(geometry, color, x, y, z, outline) {
  const mesh = new THREE.Mesh(geometry, toon(color));
  mesh.position.set(x, y, z);
  if (outline === undefined) {
    outline = 0.06;
  }
  if (outline > 0) {
    const edge = new THREE.Mesh(geometry, outlineMaterial);
    edge.scale.setScalar(1 + outline);
    mesh.add(edge);
  }
  return mesh;
}

// Hai mat to tron kieu hoat hinh. Tra ve mang 2 mat de chop mat.
function googlyEyes(head, y, z, spread, size) {
  const eyes = [];
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const eye = part(new THREE.SphereGeometry(size, 16, 12), 0xffffff, side * spread, y, z, 0.1);
    eye.scale.z = 0.7;
    const pupil = part(new THREE.SphereGeometry(size * 0.42, 12, 8), 0x1a1a1a, 0, 0, size * 0.82, 0);
    eye.add(pupil);
    head.add(eye);
    eyes.push(eye);
  }
  return eyes;
}

// Ong tron cong (rau, toc, cuong lieu...) di qua cac diem
function tube(points, radius, color) {
  const vectors = [];
  for (let i = 0; i < points.length; i++) {
    vectors.push(new THREE.Vector3(points[i][0], points[i][1], points[i][2]));
  }
  const curve = new THREE.CatmullRomCurve3(vectors);
  return part(new THREE.TubeGeometry(curve, 24, radius, 8, false), color, 0, 0, 0, 0);
}

// ---------- Than nguoi dung chung ----------
// o: { robe, trim, skin, pants, top, bottom }  (top/bottom: ban kinh ao o vai va o gau)
function makeBody(o) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Dem ngoi (chi hien khi ngoi)
  const seat = new THREE.Group();
  seat.add(part(new THREE.CylinderGeometry(0.46, 0.5, 0.14, 24), o.trim, 0, 0.07, 0));
  seat.visible = false;
  root.add(seat);

  // Hai chan
  const legs = [];
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.3, 0);
    leg.add(part(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10), o.pants, 0, -0.15, 0));
    leg.add(part(new THREE.BoxGeometry(0.13, 0.07, 0.2), 0x2b2b2b, 0, -0.29, 0.04));
    body.add(leg);
    legs.push(leg);
  }

  // Ao bao
  body.add(part(new THREE.CylinderGeometry(o.top, o.bottom, 0.8, 24), o.robe, 0, 0.52, 0));
  const hem = part(new THREE.TorusGeometry(o.bottom, 0.035, 8, 32), o.trim, 0, 0.13, 0, 0);
  hem.rotation.x = Math.PI / 2;
  body.add(hem);
  const beltRadius = o.bottom - (o.bottom - o.top) * 0.62 + 0.01;
  const belt = part(new THREE.TorusGeometry(beltRadius, 0.04, 8, 32), o.trim, 0, 0.62, 0, 0);
  belt.rotation.x = Math.PI / 2;
  body.add(belt);
  const shoulders = part(new THREE.SphereGeometry(o.top + 0.02, 20, 12), o.robe, 0, 0.92, 0);
  shoulders.scale.y = 0.55;
  body.add(shoulders);
  // Co ao cheo chu V
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const collar = part(new THREE.BoxGeometry(0.05, 0.34, 0.03), o.trim, side * 0.07, 0.83, o.top - 0.02, 0);
    collar.rotation.z = side * 0.45;
    body.add(collar);
  }

  // Hai tay: xoay quanh vai. hand la cho gan do vat cam tay.
  const arms = [];
  const hands = [];
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const arm = new THREE.Group();
    arm.position.set(side * (o.top + 0.02), 0.86, 0);
    arm.rotation.z = side * 0.18;
    arm.add(part(new THREE.CylinderGeometry(0.07, 0.15, 0.42, 12), o.robe, 0, -0.2, 0));
    const cuff = part(new THREE.TorusGeometry(0.15, 0.025, 6, 16), o.trim, 0, -0.41, 0, 0);
    cuff.rotation.x = Math.PI / 2;
    arm.add(cuff);
    const hand = new THREE.Group();
    hand.position.set(0, -0.47, 0);
    hand.add(part(new THREE.SphereGeometry(0.075, 12, 8), o.skin, 0, 0, 0));
    arm.add(hand);
    body.add(arm);
    arms.push(arm);
    hands.push(hand);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.22, 0);
  body.add(head);

  root.userData.rig = {
    body: body, head: head, seat: seat,
    legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1],
    handL: hands[0], handR: hands[1], eyes: [], armSpread: 0.18,
  };
  return root;
}

// ---------- Ngoc Hoang Dai De: rua gia, ao vang, mu mien ----------
function buildJadeEmperor() {
  const skin = 0x8dae5c;
  const root = makeBody({ robe: 0xe9b824, trim: 0xb5302a, skin: skin, pants: 0x7a2a20, top: 0.3, bottom: 0.54 });
  const rig = root.userData.rig;
  const head = rig.head;

  const face = part(new THREE.SphereGeometry(0.3, 24, 16), skin, 0, 0, 0);
  face.scale.set(1.12, 0.92, 1);
  head.add(face);
  rig.eyes = googlyEyes(head, 0.12, 0.2, 0.13, 0.1);
  const mouth = part(new THREE.TorusGeometry(0.09, 0.012, 6, 16, Math.PI), 0x3b2a1a, 0, -0.07, 0.27, 0);
  mouth.rotation.z = Math.PI;
  head.add(mouth);
  // Rau dai mong
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    head.add(tube([[side * 0.04, -0.03, 0.29], [side * 0.18, -0.05, 0.3], [side * 0.27, -0.25, 0.22], [side * 0.22, -0.48, 0.18]], 0.014, 0x222222));
  }
  // Mu mien: tam phang + chuoi hat truoc sau
  head.add(part(new THREE.CylinderGeometry(0.16, 0.19, 0.16, 16), 0xe9b824, 0, 0.25, 0));
  head.add(part(new THREE.BoxGeometry(0.62, 0.04, 0.44), 0x1f1f1f, 0, 0.34, 0));
  for (let row = 0; row < 2; row++) {
    let zPos = 0.21;
    if (row === 1) {
      zPos = -0.21;
    }
    for (let k = 0; k < 7; k++) {
      const xPos = -0.27 + k * 0.09;
      for (let b = 0; b < 4; b++) {
        let beadColor = 0xf2d46b;
        if (b % 2 === 1) {
          beadColor = 0xc0392b;
        }
        head.add(part(new THREE.SphereGeometry(0.022, 6, 6), beadColor, xPos, 0.3 - b * 0.055, zPos, 0));
      }
    }
  }
  // Mai rua sau lung
  const shell = part(new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0x4f6b34, 0, 0.62, -0.26);
  shell.rotation.x = -Math.PI / 2;
  shell.scale.set(1, 1, 0.75);
  rig.body.add(shell);
  // Hot ngoc tren tay phai
  rig.handR.add(part(new THREE.BoxGeometry(0.06, 0.32, 0.025), 0xdcefe0, 0, 0.12, 0.06));
  return root;
}

// ---------- Quan The Am Bo Tat: dang hien hoa, ao trang, binh tinh thuy ----------
function buildGuanyin() {
  const skin = 0xf7e4d2;
  const root = makeBody({ robe: 0xf7f5ee, trim: 0x8fbfd2, skin: skin, pants: 0xf7f5ee, top: 0.27, bottom: 0.52 });
  const rig = root.userData.rig;
  const head = rig.head;

  const face = part(new THREE.SphereGeometry(0.26, 24, 16), skin, 0, 0, 0);
  face.scale.set(0.95, 1.05, 0.95);
  head.add(face);
  // Toc den
  const hair = part(new THREE.SphereGeometry(0.27, 20, 12), 0x2a2220, 0, 0.05, -0.04, 0.03);
  head.add(hair);
  // Mat nham hien tu
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const eye = part(new THREE.TorusGeometry(0.045, 0.011, 6, 12, Math.PI), 0x3a2a20, side * 0.09, 0.04, 0.245, 0);
    eye.rotation.z = Math.PI;
    head.add(eye);
  }
  head.add(part(new THREE.SphereGeometry(0.02, 8, 8), 0xc9534b, 0, -0.1, 0.245, 0));
  head.add(part(new THREE.SphereGeometry(0.016, 8, 8), 0xc0392b, 0, 0.13, 0.25, 0));
  // Khan trum dau, ho phia truoc
  const hood = part(new THREE.SphereGeometry(0.33, 24, 16, Math.PI * 5 / 6, Math.PI * 4 / 3, 0, Math.PI * 0.75), 0xfaf8f2, 0, 0.05, 0);
  hood.scale.set(1.05, 1.18, 1.05);
  hood.material.side = THREE.DoubleSide;
  head.add(hood);
  // Binh tinh thuy va canh duong lieu tren tay trai
  const vasePoints = [];
  const profile = [[0, 0], [0.06, 0], [0.09, 0.06], [0.08, 0.14], [0.035, 0.2], [0.03, 0.26], [0.05, 0.29]];
  for (let i = 0; i < profile.length; i++) {
    vasePoints.push(new THREE.Vector2(profile[i][0], profile[i][1]));
  }
  const vase = part(new THREE.LatheGeometry(vasePoints, 16), 0xf5f7fa, 0, -0.05, 0.08, 0.05);
  rig.handL.add(vase);
  rig.handL.add(tube([[0, 0.24, 0.08], [0.03, 0.4, 0.1], [0.1, 0.5, 0.14], [0.16, 0.45, 0.16]], 0.008, 0x5b8c3a));
  rig.handL.add(tube([[0, 0.24, 0.08], [-0.03, 0.38, 0.06], [-0.08, 0.46, 0.05]], 0.008, 0x5b8c3a));
  // Dai sen thay cho dem ngoi
  rig.seat.clear();
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const petal = part(new THREE.SphereGeometry(0.2, 12, 8), 0xf4a6c0, Math.cos(angle) * 0.45, 0.1, Math.sin(angle) * 0.45, 0.05);
    petal.scale.set(0.55, 0.5, 1);
    petal.rotation.y = -angle + Math.PI / 2;
    rig.seat.add(petal);
  }
  rig.seat.add(part(new THREE.CylinderGeometry(0.4, 0.35, 0.12, 20), 0xf9d9e5, 0, 0.08, 0));
  return root;
}

// ---------- Thien Bong Nguyen Soai (Bat Gioi): heo, giap do, mu tuong, cao chin rang ----------
function buildMarshal() {
  const skin = 0xf3a9b6;
  const root = makeBody({ robe: 0xa8322d, trim: 0xe0b03c, skin: skin, pants: 0x3b2a22, top: 0.33, bottom: 0.6 });
  const rig = root.userData.rig;
  const head = rig.head;
  rig.head.position.y = 1.26;

  const face = part(new THREE.SphereGeometry(0.34, 24, 16), skin, 0, 0, 0);
  face.scale.set(1.12, 0.95, 1);
  head.add(face);
  const snout = part(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 18), 0xee8fa0, 0, -0.07, 0.33);
  snout.rotation.x = Math.PI / 2;
  head.add(snout);
  head.add(part(new THREE.SphereGeometry(0.025, 8, 8), 0x5a2a30, -0.045, -0.07, 0.395, 0));
  head.add(part(new THREE.SphereGeometry(0.025, 8, 8), 0x5a2a30, 0.045, -0.07, 0.395, 0));
  rig.eyes = googlyEyes(head, 0.11, 0.26, 0.14, 0.08);
  // Tai cup
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const ear = part(new THREE.SphereGeometry(0.15, 12, 8), skin, side * 0.3, 0.12, 0.05);
    ear.scale.set(0.6, 1, 0.25);
    ear.rotation.z = side * 0.9;
    ear.rotation.x = 0.6;
    head.add(ear);
  }
  // Mu tuong vang co chom long do
  const helmet = part(new THREE.SphereGeometry(0.36, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), 0xd9a933, 0, 0.04, -0.02);
  helmet.scale.set(1.1, 0.95, 1.05);
  head.add(helmet);
  head.add(part(new THREE.ConeGeometry(0.06, 0.28, 10), 0xc0392b, 0, 0.46, -0.02));
  // Ho tam kinh tren nguc
  const mirror = part(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), 0xe0b03c, 0, 0.74, 0.34);
  mirror.rotation.x = Math.PI / 2;
  rig.body.add(mirror);
  // Cao chin rang tren tay phai
  const rake = new THREE.Group();
  rake.add(part(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), 0x6b4423, 0, 0.35, 0, 0.1));
  rake.add(part(new THREE.BoxGeometry(0.44, 0.08, 0.07), 0xb8c2cc, 0, 1.2, 0));
  for (let k = 0; k < 9; k++) {
    rake.add(part(new THREE.BoxGeometry(0.025, 0.15, 0.025), 0xb8c2cc, -0.2 + k * 0.05, 1.1, 0.02, 0));
  }
  rake.position.set(0, 0, 0.05);
  rig.handR.add(rake);
  rig.rake = rake;
  return root;
}

// ---------- Thai Thuong Lao Quan: de gia rau trang, phat tran, ho lo ----------
function buildLaoJun() {
  const skin = 0xf1ebdd;
  const root = makeBody({ robe: 0xdcd6c8, trim: 0x56657a, skin: skin, pants: 0x56657a, top: 0.28, bottom: 0.5 });
  const rig = root.userData.rig;
  const head = rig.head;

  const face = part(new THREE.SphereGeometry(0.27, 24, 16), skin, 0, 0, 0);
  face.scale.set(0.9, 1.05, 1);
  head.add(face);
  const muzzle = part(new THREE.SphereGeometry(0.15, 16, 12), 0xe7dfce, 0, -0.1, 0.18);
  muzzle.scale.set(1, 0.8, 1.15);
  head.add(muzzle);
  head.add(part(new THREE.SphereGeometry(0.03, 8, 8), 0x4a3a30, 0, -0.07, 0.34, 0));
  rig.eyes = googlyEyes(head, 0.08, 0.19, 0.12, 0.085);
  // Long may trang ram
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const brow = part(new THREE.BoxGeometry(0.16, 0.05, 0.05), 0xffffff, side * 0.12, 0.2, 0.22, 0.1);
    brow.rotation.z = side * -0.3;
    head.add(brow);
    // Sung cong
    const horn = part(new THREE.TorusGeometry(0.11, 0.035, 8, 16, Math.PI * 1.1), 0xbfb6a3, side * 0.15, 0.22, -0.04);
    horn.rotation.y = Math.PI / 2;
    horn.rotation.z = side * 0.4;
    head.add(horn);
    // Tai ngang
    const ear = part(new THREE.ConeGeometry(0.05, 0.2, 8), skin, side * 0.3, 0.04, 0);
    ear.rotation.z = side * -Math.PI / 2;
    head.add(ear);
  }
  // Rau de dai
  const beard = part(new THREE.ConeGeometry(0.14, 0.6, 14), 0xffffff, 0, -0.42, 0.3);
  beard.rotation.x = Math.PI - 0.25;
  head.add(beard);
  // Mu dao si va tram
  head.add(part(new THREE.CylinderGeometry(0.08, 0.1, 0.1, 12), 0x2a2a2a, 0, 0.29, -0.02));
  head.add(part(new THREE.BoxGeometry(0.3, 0.02, 0.02), 0xe0b03c, 0, 0.3, -0.02, 0));
  // Ho lo ben hong
  rig.body.add(part(new THREE.SphereGeometry(0.09, 12, 10), 0xd98e2b, -0.42, 0.5, 0.15));
  rig.body.add(part(new THREE.SphereGeometry(0.065, 12, 10), 0xd98e2b, -0.42, 0.63, 0.15));
  // Phat tran tay phai
  rig.handR.add(part(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), 0x7a4b2a, 0, 0.12, 0.05, 0.1));
  const whisk = part(new THREE.ConeGeometry(0.07, 0.32, 10), 0xffffff, 0, -0.18, 0.05);
  rig.handR.add(whisk);
  return root;
}

// ---------- Nam Tao / Bac Dau: chuot quan van, mu o sa, so va but ----------
// Hai nhan vat dung chung mot dang, chi khac mau ao.
function buildStarOfficial(robeColor, trimColor) {
  const skin = 0xb4aea6;
  const root = makeBody({ robe: robeColor, trim: trimColor, skin: skin, pants: 0x2b2b2b, top: 0.27, bottom: 0.5 });
  const rig = root.userData.rig;
  const head = rig.head;

  const face = part(new THREE.SphereGeometry(0.27, 24, 16), skin, 0, 0, 0);
  head.add(face);
  const snout = part(new THREE.ConeGeometry(0.11, 0.26, 16), skin, 0, -0.06, 0.29);
  snout.rotation.x = Math.PI / 2;
  head.add(snout);
  head.add(part(new THREE.SphereGeometry(0.042, 10, 8), 0xe58fa0, 0, -0.06, 0.42, 0));
  rig.eyes = googlyEyes(head, 0.07, 0.2, 0.11, 0.08);
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    // Tai tron to
    const ear = part(new THREE.SphereGeometry(0.15, 16, 12), skin, side * 0.23, 0.25, -0.02);
    ear.scale.set(1, 1, 0.3);
    head.add(ear);
    const inner = part(new THREE.SphereGeometry(0.1, 12, 8), 0xf2b8c2, side * 0.23, 0.25, 0.025, 0);
    inner.scale.set(1, 1, 0.2);
    head.add(inner);
    // Ria
    for (let k = 0; k < 3; k++) {
      head.add(tube([[side * 0.06, -0.06, 0.36], [side * 0.22, -0.02 - k * 0.04, 0.34], [side * 0.34, 0.0 - k * 0.07, 0.3]], 0.005, 0x333333));
    }
  }
  // Mu o sa co hai canh chuon
  head.add(part(new THREE.CylinderGeometry(0.17, 0.2, 0.16, 18), 0x1e1e1e, 0, 0.23, -0.03));
  head.add(part(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x1e1e1e, 0, 0.3, -0.06));
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const wing = part(new THREE.BoxGeometry(0.3, 0.025, 0.07), 0x1e1e1e, side * 0.33, 0.3, -0.1, 0.1);
    wing.rotation.z = side * 0.12;
    head.add(wing);
  }
  // So sach tay trai, but long tay phai
  rig.handL.add(part(new THREE.BoxGeometry(0.2, 0.26, 0.05), 0xeadbb8, 0, 0.05, 0.08));
  rig.handR.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), 0x7a4b2a, 0, 0.1, 0.06, 0.15));
  rig.handR.add(part(new THREE.ConeGeometry(0.022, 0.07, 8), 0x111111, 0, -0.08, 0.06, 0));
  return root;
}

// ---------- Thien Loi: chim mo vang, canh xanh, bua set ----------
function buildThunder() {
  const skin = 0x3b6fb0;
  const root = makeBody({ robe: 0x2b3f66, trim: 0xe7b93a, skin: skin, pants: 0x1e2a44, top: 0.3, bottom: 0.52 });
  const rig = root.userData.rig;
  const head = rig.head;

  const face = part(new THREE.SphereGeometry(0.28, 24, 16), skin, 0, 0, 0);
  head.add(face);
  const beak = part(new THREE.ConeGeometry(0.1, 0.34, 14), 0xf2c230, 0, -0.06, 0.36);
  beak.rotation.x = Math.PI / 2 + 0.35;
  head.add(beak);
  rig.eyes = googlyEyes(head, 0.1, 0.2, 0.12, 0.085);
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    // Long may cau co
    const brow = part(new THREE.BoxGeometry(0.15, 0.035, 0.04), 0x111111, side * 0.12, 0.21, 0.24, 0);
    brow.rotation.z = side * 0.35;
    head.add(brow);
    // Canh sau lung
    const wing = part(new THREE.SphereGeometry(0.35, 16, 12), 0x2d558c, side * 0.25, 0.85, -0.33);
    wing.scale.set(0.28, 0.75, 0.12);
    wing.rotation.z = side * -0.5;
    rig.body.add(wing);
  }
  // Mao do
  for (let k = 0; k < 3; k++) {
    const crest = part(new THREE.ConeGeometry(0.05, 0.28, 8), 0xd8432e, 0, 0.3, -0.04 - k * 0.09);
    crest.rotation.x = -0.4 - k * 0.3;
    head.add(crest);
  }
  // Bua tay phai, duc tay trai
  rig.handR.add(part(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), 0x6b4423, 0, 0.15, 0.05, 0.1));
  rig.handR.add(part(new THREE.BoxGeometry(0.22, 0.13, 0.13), 0xe7b93a, 0, 0.38, 0.05));
  const chisel = part(new THREE.ConeGeometry(0.035, 0.28, 8), 0xc9d2da, 0, 0.1, 0.05);
  rig.handL.add(chisel);
  return root;
}

// ---------- Ton Ngo Khong: chi xuat hien o Nam Thien Mon khi co loi ----------
export function buildWukong() {
  const skin = 0xf2c9a0;
  const root = makeBody({ robe: 0xc9382b, trim: 0xe9b824, skin: skin, pants: 0x8a5a2b, top: 0.26, bottom: 0.42 });
  const rig = root.userData.rig;
  const head = rig.head;

  head.add(part(new THREE.SphereGeometry(0.27, 24, 16), 0x9a6332, 0, 0, 0));
  const face = part(new THREE.SphereGeometry(0.2, 20, 14), skin, 0, -0.03, 0.15);
  face.scale.set(1.1, 1, 0.6);
  head.add(face);
  rig.eyes = googlyEyes(head, 0.04, 0.25, 0.09, 0.08);
  const mouth = part(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI), 0x3b2a1a, 0, -0.1, 0.27, 0);
  mouth.rotation.z = Math.PI;
  head.add(mouth);
  for (let i = 0; i < 2; i++) {
    let side = -1;
    if (i === 1) {
      side = 1;
    }
    const ear = part(new THREE.SphereGeometry(0.08, 12, 8), skin, side * 0.28, 0.02, 0);
    ear.scale.z = 0.4;
    head.add(ear);
  }
  // Vong kim co
  const band = part(new THREE.TorusGeometry(0.275, 0.026, 8, 32), 0xf2c230, 0, 0.1, 0, 0);
  band.rotation.x = Math.PI / 2 - 0.15;
  head.add(band);
  // Duoi
  rig.body.add(tube([[0, 0.3, -0.38], [0, 0.2, -0.6], [0.1, 0.45, -0.75], [0.05, 0.7, -0.7]], 0.03, 0x9a6332));
  // Gay nhu y: than vang, hai dau do
  const staff = new THREE.Group();
  staff.add(part(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 10), 0xe9b824, 0, 0, 0, 0.1));
  staff.add(part(new THREE.CylinderGeometry(0.036, 0.036, 0.12, 10), 0xb5302a, 0, 0.82, 0, 0));
  staff.add(part(new THREE.CylinderGeometry(0.036, 0.036, 0.12, 10), 0xb5302a, 0, -0.82, 0, 0));
  staff.position.set(0, 0, 0.08);
  rig.handR.add(staff);
  rig.staff = staff;
  return root;
}

// ---------- Thien binh: dung cho agent moi them, chua co nhan vat rieng ----------
function buildSoldier() {
  return buildStarOfficial(0x4e7d5b, 0xd9c27a);
}

// ---------- Bang gan agent voi nhan vat ----------
// Khoa la ten agent trong Paperclip (khong phan biet hoa thuong).
export const CHARACTERS = {
  producer: { title: "Ngọc Hoàng Đại Đế", build: buildJadeEmperor },
  scriptwriter: { title: "Quan Thế Âm Bồ Tát", build: buildGuanyin },
  director: { title: "Thiên Bồng Nguyên Soái", build: buildMarshal },
  asset: { title: "Thái Thượng Lão Quân", build: buildLaoJun },
  editor: { title: "Nam Tào", build: function () { return buildStarOfficial(0xc23b2e, 0xf0c94a); } },
  reviewer: { title: "Bắc Đẩu", build: function () { return buildStarOfficial(0x2c3e73, 0xbfd2f0); } },
  publisher: { title: "Thiên Lôi", build: buildThunder },
};

export function characterFor(agentName) {
  const key = String(agentName).toLowerCase();
  if (CHARACTERS[key] !== undefined) {
    return CHARACTERS[key];
  }
  return { title: "Thiên binh " + agentName, build: buildSoldier };
}
