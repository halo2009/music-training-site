/* =========================
   기존 로직 (5도권/코드/스케일 + 피아노)
   - HTML의 onclick(...) 때문에 window에 함수 노출 필요
========================= */

/* ===== 5도권/코드/스케일 ===== */
const notes = [
  "C","C# / Db","D","D# / Eb","E","F","F# / Gb","G","G# / Ab","A","A# / Bb","B"
];

const rootSelect = document.getElementById("root");
const scaleRootSelect = document.getElementById("scaleRoot");

notes.forEach(note => {
  const opt1 = document.createElement("option");
  opt1.text = note;
  rootSelect.add(opt1);

  const opt2 = document.createElement("option");
  opt2.text = note;
  scaleRootSelect.add(opt2);
});

const circleUp = ["C","G","D","A","E","B","F# / Gb","Db","Ab","Eb","Bb","F"];
const circleDown = ["C","F","Bb","Eb","Ab","Db","F# / Gb","B","E","A","D","G"];

window.showCircle = function showCircle(dir){
  const el = document.getElementById("circleResult");
  if(dir === "up") el.innerText = "상행: " + circleUp.join(" → ");
  else el.innerText = "하행: " + circleDown.join(" → ");
};

const chordFormulas = {
  "M":[0,4,7],
  "m":[0,3,7],
  "dim":[0,3,6],
  "aug":[0,4,8],

  "7":[0,4,7,10],
  "M7":[0,4,7,11],
  "m7":[0,3,7,10],
  "dim7":[0,3,6,9],
  "m7(b5)":[0,3,6,10],

  "sus2":[0,2,7],
  "sus4":[0,5,7],
  "7sus4":[0,5,7,10],

  "6":[0,4,7,9],
  "m6":[0,3,7,9],

  "mM7":[0,3,7,11],

  "7(#5)":[0,4,8,10],
  "M7(#5)":[0,4,8,11],

  "add9":[0,4,7,14],
  "madd9":[0,3,7,14]
};

window.buildChord = function buildChord(){
  const root = document.getElementById("root").value;
  const type = document.getElementById("chordType").value;

  const rootIndex = notes.indexOf(root);
  const formula = chordFormulas[type];
  const result = formula.map(i => notes[(rootIndex + i) % 12]);

  document.getElementById("chordResult").innerText =
    root + " " + type + " : " + result.join(" - ");
};

const scaleFormulas = {
  "Major (Ionian)" : [0,2,4,5,7,9,11],
  "Natural Minor (Aeolian)" : [0,2,3,5,7,8,10],
  "Harmonic Minor" : [0,2,3,5,7,8,11],
  "Melodic Minor" : [0,2,3,5,7,9,11],
  "Dorian" : [0,2,3,5,7,9,10],
  "Phrygian" : [0,1,3,5,7,8,10],
  "Lydian" : [0,2,4,6,7,9,11],
  "Mixolydian" : [0,2,4,5,7,9,10],
  "Locrian" : [0,1,3,5,6,8,10]
};

window.showScale = function showScale(){
  const root = document.getElementById("scaleRoot").value;
  const type = document.getElementById("scaleType").value;

  const rootIndex = notes.indexOf(root);
  const formula = scaleFormulas[type];
  const result = formula.map(i => notes[(rootIndex + i) % 12]);

  document.getElementById("scaleResult").innerText =
    root + " " + type + " : " + result.join(" - ");
};

/* ===== 다옥타브 피아노 + 글자 없음 ===== */
const pianoEl = document.getElementById("piano");
const octLabel = document.getElementById("octLabel");
const octDown = document.getElementById("octDown");
const octUp = document.getElementById("octUp");
const waveBtn = document.getElementById("waveBtn");
const waveLabel = document.getElementById("waveLabel");

const WHITE_SEMIS = [0,2,4,5,7,9,11];
const BLACK_LAYOUT = [
  { semi:1,  leftWhite:0 },
  { semi:3,  leftWhite:1 },
  { semi:6,  leftWhite:3 },
  { semi:8,  leftWhite:4 },
  { semi:10, leftWhite:5 }
];

let audioCtx = null;
const active = new Map();
let currentWave = "triangle";

function ensureAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(audioCtx.state === "suspended") audioCtx.resume();
}

function midiToFreq(midi){
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function noteOn(midi){
  ensureAudio();
  if(active.has(midi)) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = currentWave;
  osc.frequency.value = midiToFreq(midi);

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);

  active.set(midi, {osc, gain});
}

function noteOff(midi){
  const node = active.get(midi);
  if(!node || !audioCtx) return;

  const now = audioCtx.currentTime;
  node.gain.gain.cancelScheduledValues(now);
  node.gain.gain.setValueAtTime(Math.max(0.0001, node.gain.gain.value), now);
  node.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  node.osc.stop(now + 0.09);
  active.delete(midi);
}

function stopAll(){
  for(const midi of Array.from(active.keys())) noteOff(midi);
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

// 시작 옥타브 + 총 옥타브
let startOctave = 3;      // 표시: C3부터 시작
const totalOctaves = 3;   // ✅ 범위 확장하려면 4~5로 바꾸면 됨

function buildPiano(){
  pianoEl.innerHTML = "";

  const cs = getComputedStyle(document.documentElement);
  const whiteW = parseFloat(cs.getPropertyValue("--white-w")) || 54;
  const blackW = parseFloat(cs.getPropertyValue("--black-w")) || 34;

  let globalWhiteIndex = 0;

  for(let o=0; o<totalOctaves; o++){
    const octave = startOctave + o;
    const baseC = 12 * (octave + 1); // MIDI C(octave)

    // 흰건반 7개
    for(let i=0; i<WHITE_SEMIS.length; i++){
      const midi = baseC + WHITE_SEMIS[i];

      const k = document.createElement("div");
      k.className = "key white";
      k.dataset.midi = String(midi);
      k.style.left = `${globalWhiteIndex * whiteW}px`;

      pianoEl.appendChild(k);
      globalWhiteIndex++;
    }

    // 검은건반 5개
    for(const b of BLACK_LAYOUT){
      const midi = baseC + b.semi;

      const k = document.createElement("div");
      k.className = "key black";
      k.dataset.midi = String(midi);

      const octaveStartWhite = globalWhiteIndex - 7;
      const left = (octaveStartWhite + b.leftWhite + 1) * whiteW - (blackW / 2);

      k.style.left = `${left}px`;
      pianoEl.appendChild(k);
    }
  }

  pianoEl.style.width = `${globalWhiteIndex * whiteW}px`;

  attachHandlers();
}

function attachHandlers(){
  const keys = pianoEl.querySelectorAll(".key");

  keys.forEach(key => {
    key.addEventListener("contextmenu", (e)=> e.preventDefault());
    key.addEventListener("dragstart", (e)=> e.preventDefault());

    key.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      ensureAudio();

      const midi = Number(key.dataset.midi);
      noteOn(midi);
      key.classList.add("pressed");
      key.setPointerCapture(e.pointerId);
    }, {passive:false});

    key.addEventListener("pointerup", (e) => {
      e.preventDefault();
      const midi = Number(key.dataset.midi);
      noteOff(midi);
      key.classList.remove("pressed");
    }, {passive:false});

    key.addEventListener("pointercancel", (e) => {
      const midi = Number(key.dataset.midi);
      noteOff(midi);
      key.classList.remove("pressed");
    });

    key.addEventListener("pointerleave", (e) => {
      if(e.pressure === 0) return;
      const midi = Number(key.dataset.midi);
      noteOff(midi);
      key.classList.remove("pressed");
    });
  });
}

function setStartOctave(next){
  startOctave = clamp(next, 0, 6);
  octLabel.textContent = String(startOctave);
  stopAll();
  buildPiano();
}

octDown.addEventListener("click", () => setStartOctave(startOctave - 1));
octUp.addEventListener("click", () => setStartOctave(startOctave + 1));

waveBtn.addEventListener("click", () => {
  const order = ["sine","triangle","square","sawtooth"];
  const idx = order.indexOf(currentWave);
  currentWave = order[(idx + 1) % order.length];
  waveLabel.textContent = currentWave;
});

// 초기 렌더
octLabel.textContent = String(startOctave);
buildPiano();