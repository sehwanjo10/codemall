const BASE_URL = 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/';

const carBrands = [
    // 독일
    { id: 'mercedes-benz', name: '메르세데스-벤츠', axes: { A: 2, B: -2, C: 0, D: 1, E: 0 }, motif: 'shape', colorTag: 'silver' },
    { id: 'bmw', name: 'BMW', axes: { A: 1, B: -1, C: 0, D: 0, E: 0 }, motif: 'shape', colorTag: 'blue' },
    { id: 'audi', name: '아우디', axes: { A: 2, B: 0, C: -1, D: 1, E: 0 }, motif: 'shape', colorTag: 'silver' },
    { id: 'porsche', name: '포르쉐', axes: { A: -1, B: 2, C: 0, D: -1, E: 2 }, motif: 'animal', colorTag: 'gold' },
    { id: 'volkswagen', name: '폭스바겐', axes: { A: 2, B: -2, C: 0, D: 1, E: 0 }, motif: 'letter', colorTag: 'blue' },
    
    // 이탈리아
    { id: 'ferrari', name: '페라리', axes: { A: -2, B: 1, C: 2, D: -2, E: 1 }, motif: 'animal', colorTag: 'yellow' },
    { id: 'lamborghini', name: '람보르기니', axes: { A: -2, B: 1, C: 1, D: -2, E: 1 }, motif: 'animal', colorTag: 'gold' },
    { id: 'maserati', name: '마세라티', axes: { A: -1, B: 1, C: 1, D: -1, E: 1 }, motif: 'shape', colorTag: 'blue' },
    { id: 'alfa-romeo', name: '알파 로메오', axes: { A: -1, B: 2, C: 0, D: -1, E: 2 }, motif: 'animal', colorTag: 'red' },
    { id: 'fiat', name: '피아트', axes: { A: 1, B: -1, C: 0, D: 1, E: 0 }, motif: 'letter', colorTag: 'red' },
    { id: 'bugatti', name: '부가티', axes: { A: 2, B: -1, C: 0, D: 1, E: 1 }, motif: 'letter', colorTag: 'red' },

    // 영국
    { id: 'rolls-royce', name: '롤스로이스', axes: { A: 1, B: 0, C: 0, D: 0, E: 2 }, motif: 'emblem', colorTag: 'black' },
    { id: 'bentley', name: '벤틀리', axes: { A: -1, B: 1, C: 2, D: 0, E: 2 }, motif: 'wing', colorTag: 'black' },
    { id: 'aston-martin', name: '애스턴 마틴', axes: { A: -1, B: 1, C: 2, D: 0, E: 1 }, motif: 'wing', colorTag: 'green' },
    { id: 'mclaren', name: '맥라렌', axes: { A: 2, B: -2, C: 2, D: 1, E: 0 }, motif: 'shape', colorTag: 'orange' },
    { id: 'jaguar', name: '재규어', axes: { A: -2, B: 1, C: 2, D: -2, E: 1 }, motif: 'animal', colorTag: 'silver' },
    { id: 'land-rover', name: '랜드로버', axes: { A: 1, B: 0, C: 0, D: 1, E: 0 }, motif: 'letter', colorTag: 'green' },

    // 미국
    { id: 'ford', name: '포드', axes: { A: 1, B: -1, C: -1, D: 1, E: 0 }, motif: 'letter', colorTag: 'blue' },
    { id: 'chevrolet', name: '쉐보레', axes: { A: 2, B: -2, C: 0, D: 1, E: 1 }, motif: 'shape', colorTag: 'gold' },
    { id: 'jeep', name: '지프', axes: { A: 2, B: -2, C: 0, D: 2, E: 0 }, motif: 'letter', colorTag: 'black' },
    { id: 'tesla', name: '테슬라', axes: { A: 2, B: -1, C: 1, D: 1, E: 0 }, motif: 'letter', colorTag: 'red' },

    // 대한민국
    { id: 'hyundai', name: '현대', axes: { A: 2, B: -2, C: 1, D: 1, E: 0 }, motif: 'letter', colorTag: 'silver' },
    { id: 'kia', name: '기아', axes: { A: 2, B: -2, C: 1, D: 1, E: 0 }, motif: 'letter', colorTag: 'red' },
    { id: 'genesis', name: '제네시스', axes: { A: -1, B: 1, C: 1, D: 0, E: 2 }, motif: 'wing', colorTag: 'silver' },

    // 일본
    { id: 'toyota', name: '토요타', axes: { A: 2, B: -1, C: 0, D: 1, E: 0 }, motif: 'shape', colorTag: 'silver' },
    { id: 'lexus', name: '렉서스', axes: { A: 2, B: -2, C: 0, D: 1, E: 1 }, motif: 'letter', colorTag: 'silver' },
    { id: 'honda', name: '혼다', axes: { A: 2, B: -2, C: 0, D: 1, E: 0 }, motif: 'letter', colorTag: 'silver' },
    { id: 'nissan', name: '닛산', axes: { A: 2, B: -2, C: 0, D: 1, E: 0 }, motif: 'letter', colorTag: 'silver' },
    { id: 'mazda', name: '마쓰다', axes: { A: 1, B: 0, C: 2, D: 1, E: 0 }, motif: 'wing', colorTag: 'silver' },
    { id: 'subaru', name: '스바루', axes: { A: -1, B: 0, C: 1, D: -1, E: 1 }, motif: 'shape', colorTag: 'blue' },

    // 북유럽 & 프랑스
    { id: 'volvo', name: '볼보', axes: { A: 1, B: -1, C: 1, D: 1, E: 0 }, motif: 'shape', colorTag: 'silver' },
    { id: 'peugeot', name: '푸조', axes: { A: -2, B: 1, C: 2, D: -2, E: 1 }, motif: 'animal', colorTag: 'black' },
];

const resultTypes = [
    { axis: 'A', pole: 'neg', name: "그림을 보는 아이", emoji: "🦁", line: "글자나 기호보다 그림·동물이 들어간 로고에 끌렸어요. 눈에 보이는 구체적인 걸 좋아하는 시기예요." },
    { axis: 'A', pole: 'pos', name: "기호를 읽는 아이", emoji: "🔷", line: "동그라미·별 같은 추상적인 기호를 척척 골랐어요. 상징을 이해하는 힘이 자라고 있어요." },
    { axis: 'B', pole: 'neg', name: "깔끔함을 좋아하는 아이", emoji: "⚪", line: "복잡한 그림보다 단순하고 또렷한 로고를 좋아했어요. 핵심을 빠르게 잡는 스타일이에요." },
    { axis: 'B', pole: 'pos', name: "구석구석 보는 아이", emoji: "🛡️", line: "디테일이 많고 복잡한 문장(엠블럼) 로고에 끌렸어요. 자세히 뜯어보는 관찰력이 보여요." },
    { axis: 'C', pole: 'neg', name: "차분한 아이", emoji: "🟢", line: "둥글고 안정적인 로고를 많이 골랐어요. 편안하고 익숙한 걸 좋아하는 마음이 보여요." },
    { axis: 'C', pole: 'pos', name: "씩씩한 아이", emoji: "⚡", line: "날카롭고 속도감 있는 로고에 끌렸어요. 빠르고 멋진 걸 좋아하는 에너지가 느껴져요." },
    { axis: 'D', pole: 'neg', name: "아는 걸 고르는 아이", emoji: "🐾", line: "동물처럼 이미 아는 것이 담긴 로고를 골랐어요. 익숙함에서 안정을 느끼는 시기예요." },
    { axis: 'D', pole: 'pos', name: "새로운 걸 찾는 아이", emoji: "🔭", line: "낯설고 처음 보는 형태에도 망설임이 없었어요. 호기심과 탐색을 즐기는 신호예요." }
];

let currentRound = [];
let nextRound = [];
let currentMatchIndex = 0;
let isAnimating = false;
let selectionHistory = []; // { id, weight }

// Audio System (Web Audio API)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    if (type === 'click') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'select') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'roundEnd') {
        osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.setValueAtTime(400, now + 0.1);
        osc.frequency.setValueAtTime(500, now + 0.2); osc.frequency.setValueAtTime(600, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
    } else if (type === 'win') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554, now + 0.2);
        osc.frequency.setValueAtTime(659, now + 0.4); osc.frequency.setValueAtTime(880, now + 0.6);
        gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.start(now); osc.stop(now + 1.5);
    }
}

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const roundInfo = document.getElementById('round-info');
const progressBar = document.getElementById('progress-bar');
const cardLeft = document.getElementById('card-left');
const cardRight = document.getElementById('card-right');
const imgLeft = document.getElementById('img-left');
const imgRight = document.getElementById('img-right');
const nameLeft = document.getElementById('name-left');
const nameRight = document.getElementById('name-right');
const deckCards = document.getElementById('deck-cards');

// Shuffle array
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function initGame() {
    initAudio();
    playSound('click');
    currentRound = shuffle([...carBrands]);
    nextRound = [];
    selectionHistory = [];
    currentMatchIndex = 0;
    deckCards.innerHTML = '';
    
    startScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    updateMatch();
}

function updateRoundInfo() {
    const totalInRound = currentRound.length;
    let roundText = totalInRound === 2 ? '결승전 🏆' : totalInRound === 4 ? '준결승전 (4강)' : `${totalInRound}강`;
    const matchesInRound = totalInRound / 2;
    const progress = (currentMatchIndex / matchesInRound) * 100;
    progressBar.style.width = `${progress}%`;
    roundInfo.innerText = `${roundText} (${currentMatchIndex + 1} / ${matchesInRound})`;
}

function updateMatch() {
    updateRoundInfo();
    const index1 = currentMatchIndex * 2;
    const index2 = currentMatchIndex * 2 + 1;
    
    imgLeft.src = `${BASE_URL}${currentRound[index1].id}.png`;
    nameLeft.innerText = currentRound[index1].name;
    imgRight.src = `${BASE_URL}${currentRound[index2].id}.png`;
    nameRight.innerText = currentRound[index2].name;
    
    cardLeft.style.animation = 'none'; cardRight.style.animation = 'none';
    void cardLeft.offsetWidth; void cardRight.offsetWidth;
    cardLeft.style.animation = 'fadeIn 0.5s ease-out'; cardRight.style.animation = 'fadeIn 0.5s ease-out';
}

function handleChoice(winnerIndex) {
    if (isAnimating) return;
    isAnimating = true;
    
    initAudio();
    playSound('select');
    
    const winner = winnerIndex === 0 ? currentRound[currentMatchIndex * 2] : currentRound[currentMatchIndex * 2 + 1];
    nextRound.push(winner);
    
    const weightMap = { 32: 1, 16: 1.5, 8: 2, 4: 3, 2: 4 };
    selectionHistory.push({ id: winner.id, weight: weightMap[currentRound.length] || 1 });
    
    const selectedCard = winnerIndex === 0 ? cardLeft : cardRight;
    const unselectedCard = winnerIndex === 0 ? cardRight : cardLeft;
    
    selectedCard.classList.add('selected-card');
    unselectedCard.classList.add('unselected-card');
    
    setTimeout(() => {
        const miniCard = document.createElement('div');
        miniCard.className = 'mini-card';
        const img = document.createElement('img');
        img.src = `${BASE_URL}${winner.id}.png`;
        miniCard.appendChild(img);
        deckCards.appendChild(miniCard);
        
        selectedCard.classList.remove('selected-card');
        unselectedCard.classList.remove('unselected-card');
        
        currentMatchIndex++;
        
        if (currentMatchIndex >= currentRound.length / 2) {
            playSound('roundEnd');
            animateNextRoundTransition();
        } else {
            updateMatch();
            isAnimating = false;
        }
    }, 600);
}

function animateNextRoundTransition() {
    const minis = deckCards.querySelectorAll('.mini-card');
    minis.forEach((mini, index) => {
        setTimeout(() => mini.classList.add('flying-out'), index * 100);
    });
    
    setTimeout(() => {
        deckCards.innerHTML = '';
        currentRound = nextRound;
        nextRound = [];
        currentMatchIndex = 0;
        
        if (currentRound.length === 1) {
            showWinner(currentRound[0]);
        } else {
            updateMatch();
        }
        isAnimating = false;
    }, minis.length * 100 + 1000);
}

function calculateResult(winner) {
    let axisScore = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    let colorCount = {};
    let motifCount = {};
    let animalCount = 0;
    
    selectionHistory.forEach(sel => {
        const logo = carBrands.find(b => b.id === sel.id);
        if (!logo) return;
        
        for (let ax in axisScore) {
            axisScore[ax] += (logo.axes[ax] * sel.weight);
        }
        
        colorCount[logo.colorTag] = (colorCount[logo.colorTag] || 0) + 1;
        motifCount[logo.motif] = (motifCount[logo.motif] || 0) + 1;
        
        if (logo.motif === 'animal') animalCount++;
    });

    let sortedAxes = ['A', 'B', 'C', 'D'].map(ax => ({ ax, score: axisScore[ax], absScore: Math.abs(axisScore[ax]) }))
                                         .sort((a, b) => b.absScore - a.absScore);
    
    let primary = sortedAxes[0];
    let secondary = sortedAxes[1];
    
    let mainType = resultTypes.find(t => t.axis === primary.ax && t.pole === (primary.score < 0 ? 'neg' : 'pos')) || resultTypes[0];
    let subType = resultTypes.find(t => t.axis === secondary.ax && t.pole === (secondary.score < 0 ? 'neg' : 'pos')) || resultTypes[1];
    
    let badges = [];
    if (animalCount >= 3) badges.push({ emoji: "🐾", name: "동물 직관파", text: "동물 그림만 보면 손이 가나 봐요!" });
    
    let maxColor = Object.keys(colorCount).reduce((a, b) => colorCount[a] > colorCount[b] ? a : b);
    let colorNames = { silver: "실버", blue: "파랑", gold: "골드", yellow: "노랑", red: "빨강", black: "검정", green: "초록", orange: "주황" };
    if (colorCount[maxColor] > selectionHistory.length * 0.3 && colorNames[maxColor]) {
        badges.push({ emoji: "🎨", name: `${colorNames[maxColor]} 매니아`, text: `이번엔 유독 ${colorNames[maxColor]}색 로고를 많이 골랐어요.` });
    }

    let maxMotif = Object.keys(motifCount).reduce((a, b) => motifCount[a] > motifCount[b] ? a : b);
    if (maxMotif === 'letter') badges.push({ emoji: "🔤", name: "글자 탐험가", text: "글자에 관심이 생기는 신호일 수 있어요." });

    if (axisScore['E'] > 5) badges.push({ emoji: "✨", name: "반짝이 수집가", text: "화려하고 멋진 엠블럼을 알아봤어요." });
    else if (axisScore['E'] < -5) badges.push({ emoji: "🤍", name: "심플 미학", text: "꾸밈없이 담백한 걸 좋아해요." });

    return {
        winner,
        mainType,
        subComment: `그리고 이런 면도 보였어요. ${subType.line}`,
        badges
    };
}

function showWinner(winner) {
    playSound('win');
    gameScreen.classList.remove('active');
    resultScreen.classList.add('active');
    
    const result = calculateResult(winner);
    
    // Render Result Card
    document.getElementById('res-winner-img').src = `${BASE_URL}${winner.id}.png`;
    document.getElementById('res-main-emoji').innerText = result.mainType.emoji;
    document.getElementById('res-main-title').innerText = result.mainType.name;
    document.getElementById('res-main-desc').innerText = result.mainType.line;
    
    const badgesHtml = result.badges.map(b => `<div class="badge-item"><span class="badge-emoji">${b.emoji}</span> <span class="badge-name">${b.name}</span></div>`).join('');
    document.getElementById('res-badges').innerHTML = badgesHtml;
    
    document.getElementById('res-sub-comment').innerText = result.subComment;
    
    fireConfetti();
}

function fireConfetti() {
    var duration = 3000;
    var end = Date.now() + duration;
    (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

// Download Card
document.getElementById('download-btn').addEventListener('click', () => {
    const card = document.getElementById('share-card-content');
    html2canvas(card, { scale: 2, backgroundColor: '#fdfdfd', useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'logo_worldcup_result.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

// Event Listeners
if(startBtn) startBtn.addEventListener('click', initGame);
if(restartBtn) restartBtn.addEventListener('click', initGame);
if(cardLeft) cardLeft.addEventListener('click', () => handleChoice(0));
if(cardRight) cardRight.addEventListener('click', () => handleChoice(1));

window.addEventListener('load', () => {
    carBrands.slice(0, 4).forEach(brand => {
        const img = new Image();
        img.src = `${BASE_URL}${brand.id}.png`;
    });
});
