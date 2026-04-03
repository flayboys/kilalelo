let scene, camera, renderer, particles;
let positions, target;
let count = window.innerWidth < 600 ? 1500 : 4000;

let handX = 0, handY = 0;
let isOpen = false;

let currentMode = "";
let time = 0;

// TEXT MAP
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

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  let mat = new THREE.PointsMaterial({
    size: 0.03,
    color: 0xff00ff,
    transparent: true,
    opacity: 0.9
  });

  particles = new THREE.Points(geo, mat);
  scene.add(particles);

  createTextShape("FLAYBOY");
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
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });

  hands.setOptions({
    maxNumHands: 1,
    minDetectionConfidence: 0.6
  });

  hands.onResults(res => {
    if (res.multiHandLandmarks.length > 0) {
      let lm = res.multiHandLandmarks[0];

      handX = (lm[9].x - 0.5) * 6;
      handY = -(lm[9].y - 0.5) * 6;

      let finger = countFingers(lm);

      if (finger === 3 && currentMode !== "love") {
        currentMode = "love";
        createHeartShape();
      }
      else if (textMap[finger] && currentMode !== textMap[finger]) {
        currentMode = textMap[finger];
        createTextShape(textMap[finger]);
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

// TEXT SHAPE
function createTextShape(text) {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  canvas.width = 512;
  canvas.height = 256;

  ctx.fillStyle = "black";
  ctx.fillRect(0,0,512,256);

  ctx.fillStyle = "white";
  ctx.font = "bold 100px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text,256,130);

  let data = ctx.getImageData(0,0,512,256).data;

  let i = 0;
  for (let y=0;y<256;y+=4){
    for (let x=0;x<512;x+=4){
      let index = (y*512+x)*4;

      if (data[index]>150 && i<count){
        let i3 = i*3;
        target[i3] = (x-256)/50;
        target[i3+1] = -(y-128)/50;
        target[i3+2] = 0;
        i++;
      }
    }
  }
}

// ❤️ HEART SHAPE
function createHeartShape() {
  let i = 0;

  for (let t=0; t<Math.PI*2; t+=0.02){
    if (i>=count) break;

    let x = 16*Math.pow(Math.sin(t),3);
    let y = 13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);

    let i3 = i*3;
    target[i3] = x/10;
    target[i3+1] = y/10;
    target[i3+2] = 0;

    i++;
  }
}

// TOUCH
window.addEventListener("touchmove", e=>{
  let t=e.touches[0];
  handX=(t.clientX/innerWidth-0.5)*6;
  handY=-(t.clientY/innerHeight-0.5)*6;
});

// ANIMATE
function animate() {
  requestAnimationFrame(animate);
  time += 0.05;

  let pos = particles.geometry.attributes.position.array;

  for (let i=0;i<count;i++){
    let i3=i*3;

    // HEART BEAT (pulse)
    let pulse = currentMode==="love" ? 1 + Math.sin(time)*0.2 : 1;

    pos[i3] += ((target[i3]*pulse) - pos[i3]) * 0.04;
    pos[i3+1] += ((target[i3+1]*pulse) - pos[i3+1]) * 0.04;

    // INTERACTION
    let dx=handX-pos[i3];
    let dy=handY-pos[i3+1];
    let d=Math.sqrt(dx*dx+dy*dy);

    if(d<1){
      if(isOpen){
        pos[i3]-=dx*0.05;
        pos[i3+1]-=dy*0.05;
      } else {
        pos[i3]+=dx*0.05;
        pos[i3+1]+=dy*0.05;
      }
    }
  }

  // NEON COLOR SHIFT
  let hue = (Math.sin(time)*0.5+0.5)*360;
  particles.material.color.setHSL(hue/360, 1, 0.6);

  particles.geometry.attributes.position.needsUpdate = true;

  renderer.render(scene,camera);
}

// START
document.getElementById("startBtn").onclick = async ()=>{
  const video=document.getElementById("video");

  const stream = await navigator.mediaDevices.getUserMedia({video:true});
  video.srcObject = stream;

  init3D();
  initHand(video);
  animate();

  document.getElementById("startBtn").style.display="none";
};

// RESIZE
window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});