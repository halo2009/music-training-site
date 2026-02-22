// ===== 원래 퀴즈 기능(6모드 + 입력/선택 + 10문제 + 진행바) =====

// 기본 데이터
const chromatic = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const roots = ["C","C#","Db","D","Eb","E","F","F#","Gb","G","Ab","A","Bb","B"];

const enharmonicMap = { "Db":"C#","Eb":"D#","Gb":"F#","Ab":"G#","Bb":"A#" };
function normalize(note){ return enharmonicMap[note] || note; }

// 코드
const chordTypes = {
  "M":[0,4,7],
  "m":[0,3,7],
  "7":[0,4,7,10],
  "M7":[0,4,7,11],
  "m7":[0,3,7,10]
};

// 스케일
const scales = {
  "Ionian":[0,2,4,5,7,9,11],
  "Dorian":[0,2,3,5,7,9,10],
  "Phrygian":[0,1,3,5,7,8,10],
  "Lydian":[0,2,4,6,7,9,11],
  "Mixolydian":[0,2,4,5,7,9,10],
  "Aeolian":[0,2,3,5,7,8,10],
  "Locrian":[0,1,3,5,6,8,10]
};

// 조표
const keySignatures = {
  "C":[],
  "G":["F#"],
  "D":["F#","C#"],
  "A":["F#","C#","G#"],
  "E":["F#","C#","G#","D#"],
  "B":["F#","C#","G#","D#","A#"],
  "F":["Bb"],
  "Bb":["Bb","Eb"],
  "Eb":["Bb","Eb","Ab"],
  "Ab":["Bb","Eb","Ab","Db"]
};

// 상태
let currentQuestion = 0;
let score = 0;
let correctAnswer = null;
let quizMode = "";

// UI refs
const answerInput = document.getElementById("answerInput");
const submitBtn = document.getElementById("submitBtn");
const choicesDiv = document.getElementById("choices");

// 입력/선택 UI 전환
function setInputMode(isInput){
  answerInput.style.display = isInput ? "inline-block" : "none";
  submitBtn.style.display = isInput ? "inline-block" : "none";
}

// Enter 제출(입력형만)
answerInput.addEventListener("keydown", (e)=>{
  if(e.key === "Enter" && answerInput.style.display !== "none"){
    submitAnswer();
  }
});

// 시작
window.startQuiz = function startQuiz(){
  currentQuestion = 0;
  score = 0;

  quizMode = document.getElementById("quizType").value;

  document.getElementById("score").innerText = "";
  document.getElementById("progressBar").style.width = "0%";
  document.getElementById("result").innerText = "";

  const isInput =
    (quizMode === "chordInput") ||
    (quizMode === "scaleNotes") ||
    (quizMode === "keyToKeySig");

  setInputMode(isInput);
  nextQuestion();
};

// 다음 문제
function nextQuestion(){
  if(currentQuestion >= 10){
    document.getElementById("question").innerText = "퀴즈 종료";
    choicesDiv.innerHTML = "";
    document.getElementById("score").innerText = "점수: " + score + "/10";
    return;
  }

  currentQuestion++;

  document.getElementById("progressBar").style.width =
    (currentQuestion/10*100) + "%";

  document.getElementById("result").innerText =
    "문제 " + currentQuestion + "/10";

  answerInput.value = "";
  choicesDiv.innerHTML = "";

  generateQuestion();
}

// 문제 생성
function generateQuestion(){
  if(quizMode==="chordInput" || quizMode==="chordChoice") generateChord();
  else if(quizMode==="scaleName") generateScaleName();
  else if(quizMode==="scaleNotes") generateScaleNotes();
  else if(quizMode==="keySigToKey") generateKeySigToKey();
  else if(quizMode==="keyToKeySig") generateKeyToKeySig();
}

// 코드 문제
function generateChord(){
  const root = roots[Math.floor(Math.random()*roots.length)];
  const typeKeys = Object.keys(chordTypes);
  const type = typeKeys[Math.floor(Math.random()*typeKeys.length)];

  const rootIndex = chromatic.indexOf(normalize(root));
  correctAnswer = chordTypes[type].map(i => chromatic[(rootIndex+i)%12]);

  document.getElementById("question").innerText = root + " " + type;

  if(quizMode==="chordChoice"){
    generateChoices(correctAnswer.join(" "), "chordTones");
  }
}

// 스케일 이름
function generateScaleName(){
  const root = roots[Math.floor(Math.random()*roots.length)];
  const scaleKeys = Object.keys(scales);
  const scaleName = scaleKeys[Math.floor(Math.random()*scaleKeys.length)];

  const rootIndex = chromatic.indexOf(normalize(root));
  const scaleNotes = scales[scaleName].map(i => chromatic[(rootIndex+i)%12]);

  correctAnswer = scaleName;
  document.getElementById("question").innerText = scaleNotes.join(" ");
  generateChoices(scaleName, "scaleNames");
}

// 스케일 구성음
function generateScaleNotes(){
  const root = roots[Math.floor(Math.random()*roots.length)];
  const scaleKeys = Object.keys(scales);
  const scaleName = scaleKeys[Math.floor(Math.random()*scaleKeys.length)];

  const rootIndex = chromatic.indexOf(normalize(root));
  correctAnswer = scales[scaleName].map(i => chromatic[(rootIndex+i)%12]);

  document.getElementById("question").innerText = root + " " + scaleName;
}

// 조표 → Key
function generateKeySigToKey(){
  const keys = Object.keys(keySignatures);
  const key = keys[Math.floor(Math.random()*keys.length)];

  correctAnswer = key;
  const sig = keySignatures[key].length ? keySignatures[key].join(" ") : "(없음)";
  document.getElementById("question").innerText = sig;

  generateChoices(key, "keys");
}

// Key → 조표
function generateKeyToKeySig(){
  const keys = Object.keys(keySignatures);
  const key = keys[Math.floor(Math.random()*keys.length)];

  correctAnswer = keySignatures[key]; // array
  document.getElementById("question").innerText = key;
}

// 선택지 생성
function generateChoices(correct, mode){
  const container = choicesDiv;
  let choices = [correct];

  while(choices.length < 4){
    let candidate = "";

    if(mode === "scaleNames"){
      const scaleKeys = Object.keys(scales);
      candidate = scaleKeys[Math.floor(Math.random()*scaleKeys.length)];
    } else if(mode === "keys"){
      const keys = Object.keys(keySignatures);
      candidate = keys[Math.floor(Math.random()*keys.length)];
    } else {
      // chordTones: fake tones
      candidate = chromatic
        .slice()
        .sort(()=>Math.random()-0.5)
        .slice(0,3)
        .join(" ");
    }

    if(!choices.includes(candidate)) choices.push(candidate);
  }

  choices.sort(()=>Math.random()-0.5);

  choices.forEach(choice=>{
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.type = "button";
    btn.innerText = choice;
    btn.onclick = ()=>checkAnswer(choice);
    container.appendChild(btn);
  });
}

// 제출
window.submitAnswer = function submitAnswer(){
  const input = answerInput.value.toUpperCase().trim().split(/\s+/);
  checkAnswer(input);
};

// 채점
function checkAnswer(user){
  if(Array.isArray(correctAnswer)){
    const correct = correctAnswer.map(normalize).sort();
    const u = (Array.isArray(user) ? user : String(user).split(/\s+/))
      .map(normalize)
      .filter(x=>x.length)
      .sort();

    if(JSON.stringify(correct) === JSON.stringify(u)) correctResult();
    else wrongResult(correctAnswer);
  } else {
    const u = Array.isArray(user) ? user.join(" ").trim() : String(user).trim();
    if(u === correctAnswer) correctResult();
    else wrongResult(correctAnswer);
  }

  setTimeout(nextQuestion, 800);
}

function correctResult(){
  score++;
  document.getElementById("result").innerText = "정답";
}

function wrongResult(ans){
  const a = Array.isArray(ans) ? ans.join(" ") : ans;
  document.getElementById("result").innerText = "오답 정답: " + a;
}