// ==========================
// (중요) HTML의 onclick="..."가 오류 안 나려면
// 함수들을 window에 붙여야 함.
// ==========================

// ==========================
// 코드 랜덤 (폼 1회씩)
// ==========================
const roots = ["C","C#/Db","D","D#/Eb","E","F","F#/Gb","G","G#/Ab","A","A#/Bb","B"];
const types = ["M","m","7","M7","m7","sus4","7sus4","dim7","m7(b5)","6","m6","mM7","7(#5)","M7(#5)"];

window.generateCodeSet = function generateCodeSet(){
  let shuffledTypes = [...types];
  for(let i = shuffledTypes.length - 1; i > 0; i--){
    let j = Math.floor(Math.random() * (i + 1));
    [shuffledTypes[i], shuffledTypes[j]] = [shuffledTypes[j], shuffledTypes[i]];
  }

  let result = [];
  for(let t of shuffledTypes){
    let root = roots[Math.floor(Math.random() * roots.length)];
    result.push(root + t);
  }
  document.getElementById("codeDisplay").innerText = result.join(" ");
};

// ==========================
// 스트로크 (쉼표 포함)
// ==========================
const positions = ["1","e","&","a","2","e","&","a","3","e","&","a","4","e","&","a"];

window.generateStroke = function generateStroke(){
  let line1 = "";
  let line2 = "";
  for(let p of positions){
    line1 += p + " ";
    let isRest = Math.random() < 0.35;
    if(isRest) line2 += "- ";
    else line2 += (p === "e" || p === "a") ? "↑ " : "↓ ";
  }
  document.getElementById("strokeDisplay").innerHTML = line1 + "<br>" + line2;
};

// ==========================
// 메트로놈 (부드럽고 짧게)
// ==========================
let ctx;
let metro = null;

const startBtn = document.getElementById("startBtn");
const stopBtn  = document.getElementById("stopBtn");

function ensureAudioContext(){
  if(!ctx){
    const AC = window.AudioContext || window.webkitAudioContext; // Safari 대응
    ctx = new AC();
  }
}

function click(){
  ensureAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = 1200;

  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.02);
}

window.startMetro = function startMetro(){
  if(metro !== null) return;

  let bpm = Number(document.getElementById("bpm").value || 80);
  let interval = 60000 / bpm;

  metro = setInterval(click, interval);

  startBtn.disabled = true;
  stopBtn.disabled = false;
};

window.stopMetro = function stopMetro(){
  clearInterval(metro);
  metro = null;

  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// ==========================
// 지판 (Fretboard)
// ==========================
const chromaticSharp = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const enharmonicToSharp = { "Db":"C#","Eb":"D#","Gb":"F#","Ab":"G#","Bb":"A#" };
const sharpToPair = {
  "C":"C", "C#":"C#/Db", "D":"D", "D#":"D#/Eb", "E":"E", "F":"F",
  "F#":"F#/Gb", "G":"G", "G#":"G#/Ab", "A":"A", "A#":"A#/Bb", "B":"B"
};

function normalizeNoteInput(raw){
  if(!raw) return null;
  let s = raw.trim().toUpperCase();
  s = s.replace("♯","#").replace("♭","B");

  const m = s.match(/^([A-G])([#B])?$/);
  if(!m) return null;

  let note = m[1] + (m[2] ? m[2] : "");
  if(note.endsWith("B")) note = note[0] + "b";

  if(note.length === 2 && note[1] === "b"){
    const canonical = note[0] + "b";
    return enharmonicToSharp[canonical] || null;
  }
  if(note.length === 2 && note[1] === "#") return note;
  if(note.length === 1) return note;
  return null;
}

function noteAt(openNoteSharp, fret){
  const idx = chromaticSharp.indexOf(openNoteSharp);
  return chromaticSharp[(idx + fret) % 12];
}

const tuning = [
  { string: "1(E)", open: "E" }, // high E
  { string: "2(B)", open: "B" },
  { string: "3(G)", open: "G" },
  { string: "4(D)", open: "D" },
  { string: "5(A)", open: "A" },
  { string: "6(E)", open: "E" }  // low E
];

const maxFret = 12;

const scaleFormulas = {
  "Major": [0,2,4,5,7,9,11],
  "Natural Minor": [0,2,3,5,7,8,10],
  "Major Pentatonic": [0,2,4,7,9],
  "Minor Pentatonic": [0,3,5,7,10],
  "Blues": [0,3,5,6,7,10],
  "Dorian": [0,2,3,5,7,9,10],
  "Phrygian": [0,1,3,5,7,8,10],
  "Lydian": [0,2,4,6,7,9,11],
  "Mixolydian": [0,2,4,5,7,9,10],
  "Locrian": [0,1,3,5,6,8,10]
};

function buildScaleSet(rootSharp, scaleName){
  const rootIdx = chromaticSharp.indexOf(rootSharp);
  const formula = scaleFormulas[scaleName];
  const set = new Set();
  formula.forEach(semi => set.add(chromaticSharp[(rootIdx + semi) % 12]));
  return set;
}

(function initScaleRoots(){
  const sel = document.getElementById("scaleRoot");
  chromaticSharp.forEach(n=>{
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = sharpToPair[n];
    sel.appendChild(opt);
  });
})();

let activeFilterMode = "all"; // all | note | scale
let activeNote = null;
let activeScaleSet = null;

function makeCell(text, className){
  const d = document.createElement("div");
  d.className = className;
  d.textContent = text;
  return d;
}

function renderFretboard(){
  const grid = document.getElementById("fretboardGrid");
  grid.innerHTML = "";

  grid.appendChild(makeCell("String/Fret", "fb-cell fb-head fb-corner"));

  for(let f=0; f<=maxFret; f++){
    const cls = "fb-cell fb-head " + (f < maxFret ? "fb-fret" : "");
    grid.appendChild(makeCell(String(f), cls));
  }

  tuning.forEach((sObj, rowIndex)=>{
    grid.appendChild(makeCell(sObj.string, "fb-cell fb-label"));

    for(let f=0; f<=maxFret; f++){
      const noteSharp = noteAt(sObj.open, f);
      const disp = sharpToPair[noteSharp];

      let cellCls = "fb-cell " + (f < maxFret ? "fb-fret" : "");
      if(f === 0) cellCls += " fb-nut";

      const dotFrets = new Set([3,5,7,9,12,15,17,19,21,24]);
      if(dotFrets.has(f)){
        cellCls += " fb-posdot";
        if(f === 12) cellCls += " double";
      }

      const cell = document.createElement("div");
      cell.className = cellCls;

      const span = document.createElement("span");
      span.className = "note";
      span.textContent = disp;

      if(activeFilterMode === "note"){
        if(noteSharp === activeNote) span.classList.add("hl");
        else span.classList.add("dim");
      } else if(activeFilterMode === "scale"){
        if(activeScaleSet && activeScaleSet.has(noteSharp)) span.classList.add("hl");
        else span.classList.add("dim");
      }

      cell.appendChild(span);
      grid.appendChild(cell);
    }
  });

  requestAnimationFrame(()=>{
    grid.querySelectorAll(".fb-rowline").forEach(el=>el.remove());

    const cellsPerRow = 1 + (maxFret + 1);

    for(let r=0; r<tuning.length; r++){
      const firstNoteCellIndex = (1 + r + 1) * cellsPerRow + 1;
      const cell = grid.children[firstNoteCellIndex];
      if(!cell) continue;

      const rect = cell.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      const y = (rect.top - gridRect.top) + (rect.height / 2);

      const line = document.createElement("div");
     line.className = "fb-rowline s" + (r + 1);
      line.style.top = `${y}px`;
      grid.appendChild(line);
    }
  });
}

window.showAllFretboard = function showAllFretboard(){
  activeFilterMode = "all";
  activeNote = null;
  activeScaleSet = null;
  renderFretboard();
};

window.resetFretboardFilter = function resetFretboardFilter(){
  document.getElementById("noteFilter").value = "";
  window.showAllFretboard();
};

window.applySingleNoteFilter = function applySingleNoteFilter(){
  const raw = document.getElementById("noteFilter").value;
  const n = normalizeNoteInput(raw);

  if(!n || chromaticSharp.indexOf(n) === -1){
    alert("음 입력이 올바르지 않아. 예: C, F#, Gb, Bb");
    return;
  }

  activeFilterMode = "note";
  activeNote = n;
  activeScaleSet = null;
  renderFretboard();
};

window.applyScaleFilter = function applyScaleFilter(){
  const rootSharp = document.getElementById("scaleRoot").value;
  const scaleName = document.getElementById("scaleType").value;

  activeFilterMode = "scale";
  activeNote = null;
  activeScaleSet = buildScaleSet(rootSharp, scaleName);
  renderFretboard();
};

// 초기 렌더
renderFretboard();
