let scene, camera, renderer, particles;
let positions, target;

let count = window.innerWidth < 600 ? 1500 : 3500;

let handX = 0, handY = 0;
let isOpen = false;

let currentMode = null;
let lastFinger = -1;
let time = 0;

// TEXT MAP FINAL
const textMap = {
  1: "I LOVE YOU",
  2: "BINTANG SRI MAKAILA"
};

// INIT 3D
function init3D() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  let geo = new THREE.BufferGeometry();
  positions = new Float32Array(count * 3);
  target = new Float32Array(count * 3);

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  let mat = new THREE.PointsMaterial({
    size: 0.03,
    color: 0xff00ff,
    transparent: true,
    opacity: 0.9
  });

  particles = new THREE.Points(geo, mat);
  scene.add(particles);

  createTextShape("I LOVE YOU");
}

// TEXT SHAPE
function createTextShape(text) {
  if (!text) return;

  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  canvas.width = 512;
  canvas.height = 256;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = "white";
  ctx.font = "bold 60px Arial"; // kecil biar muat panjang
  ctx.textAlign = "center";
  ctx.fillText(text, 256, 130);

  let data = ctx.getImageData(0, 0, 512, 256).data;

  let i = 0;
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 512; x += 4) {
      let index = (y * 512 + x) * 4;

      if (data[index] > 150 && i < count) {
        let i3 = i * 3;
        target[i3] = (x - 256) / 50;
        target[i3 + 1] = -(y - 128) / 50;
        target[i3 + 2] = 0;
        i++;
      }
    }
  }
}

// ❤️ HEART SHAPE
function createHeartShape() {
  let i = 0;

  for (let t = 0; t < Math.PI * 2; t += 0.02) {
    if (i >= count) break;

    let x = 16 * Math.pow(Math.sin(t), 3);
    let y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);

    let i3 = i * 3;
    target[i3] = x / 10;
    target[i3 + 1] = y / 10;
    target[i3 + 2] = 0;

    i++;
  }
}

// DETEKSI JARI
function countFingers(lm) {
  let fingers = 0;

  if (lm[8].y < lm[6].y) fingers++;
  if (lm[12].y < lm[10].y) fingers++;
  if (lm[16].y < lm[14].y) fingers++;
  if (lm[20].y < lm[18].y) fingers++;
  if (lm[4].x > lm[3].x) fingers++;

  return fingers;
}

// HAND TRACK
function initHand(video) {
  const hands = new Hands({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  hands.onResults(res => {
    if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
      let lm = res.multiHandLandmarks[0];

      handX = (lm[9].x - 0.5) * 6;
      handY = -(lm[9].y - 0.5) * 6;

      let finger = countFingers(lm);

      if (finger !== lastFinger) {
        lastFinger = finger;

        if (finger === 3) {
          currentMode = "love";
          createHeartShape();
        }
        else if (textMap[finger]) {
          currentMode = textMap[finger];
          createTextShape(currentMode);
        }
      }

      isOpen = finger >= 4;
    }
  });

  const cam = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });

  cam.start();
}

// MOUSE / TOUCH
window.addEventListener("mousemove", e => {
  handX = (e.clientX / innerWidth - 0.5) * 6;
  handY = -(e.clientY / innerHeight - 0.5) * 6;
});

window.addEventListener("touchmove", e => {
  let t = e.touches[0];
  handX = (t.clientX / innerWidth - 0.5) * 6;
  handY = -(t.clientY / innerHeight - 0.5) * 6;
});

// ANIMATION
function animate() {
  requestAnimationFrame(animate);
  time += 0.05;

  let pos = particles.geometry.attributes.position.array;

  for (let i = 0; i < count; i++) {
    let i3 = i * 3;

    let pulse = currentMode === "love" ? 1 + Math.sin(time) * 0.2 : 1;

    pos[i3] += ((target[i3] * pulse) - pos[i3]) * 0.04;
    pos[i3 + 1] += ((target[i3 + 1] * pulse) - pos[i3 + 1]) * 0.04;

    let dx = handX - pos[i3];
    let dy = handY - pos[i3 + 1];
    let d = Math.sqrt(dx*dx + dy*dy);

    if (d < 1) {
      if (isOpen) {
        pos[i3] -= dx * 0.05;
        pos[i3 + 1] -= dy * 0.05;
      } else {
        pos[i3] += dx * 0.05;
        pos[i3 + 1] += dy * 0.05;
      }
    }
  }

  let hue = (Math.sin(time) * 0.5 + 0.5);
  particles.material.color.setHSL(hue, 1, 0.6);

  particles.geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

// START CAMERA
document.getElementById("startBtn").onclick = async () => {
  const video = document.getElementById("video");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    init3D();
    initHand(video);
    animate();

    document.getElementById("startBtn").style.display = "none";

  } catch (err) {
    alert("Kamera gagal: " + err.message);
  }
};

// RESIZE
window.addEventListener("resize", () => {
  if (!camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});