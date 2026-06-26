const BASE_URL = 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/';

const carBrands = [
    { id: 'audi', name: '아우디' },
    { id: 'bmw', name: 'BMW' },
    { id: 'mercedes-benz', name: '메르세데스-벤츠' },
    { id: 'porsche', name: '포르쉐' },
    { id: 'volkswagen', name: '폭스바겐' },
    { id: 'ferrari', name: '페라리' },
    { id: 'lamborghini', name: '람보르기니' },
    { id: 'maserati', name: '마세라티' },
    { id: 'alfa-romeo', name: '알파 로메오' },
    { id: 'fiat', name: '피아트' },
    { id: 'aston-martin', name: '애스턴 마틴' },
    { id: 'bentley', name: '벤틀리' },
    { id: 'rolls-royce', name: '롤스로이스' },
    { id: 'jaguar', name: '재규어' },
    { id: 'land-rover', name: '랜드로버' },
    { id: 'mclaren', name: '맥라렌' },
    { id: 'ford', name: '포드' },
    { id: 'chevrolet', name: '쉐보레' },
    { id: 'jeep', name: '지프' },
    { id: 'tesla', name: '테슬라' },
    { id: 'toyota', name: '토요타' },
    { id: 'honda', name: '혼다' },
    { id: 'nissan', name: '닛산' },
    { id: 'mazda', name: '마쓰다' },
    { id: 'subaru', name: '스바루' },
    { id: 'lexus', name: '렉서스' },
    { id: 'hyundai', name: '현대' },
    { id: 'kia', name: '기아' },
    { id: 'genesis', name: '제네시스' },
    { id: 'volvo', name: '볼보' },
    { id: 'peugeot', name: '푸조' },
    { id: 'bugatti', name: '부가티' }
];

let currentRound = [];
let nextRound = [];
let currentMatchIndex = 0;
let isAnimating = false;

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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'select') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'roundEnd') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(400, now + 0.1);
        osc.frequency.setValueAtTime(500, now + 0.2);
        osc.frequency.setValueAtTime(600, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
    } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.2);
        osc.frequency.setValueAtTime(659, now + 0.4);
        osc.frequency.setValueAtTime(880, now + 0.6);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.start(now);
        osc.stop(now + 1.5);
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
const winnerImg = document.getElementById('winner-img');
const winnerName = document.getElementById('winner-name');
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
    currentMatchIndex = 0;
    deckCards.innerHTML = '';
    
    startScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    updateMatch();
}

function updateRoundInfo() {
    const totalInRound = currentRound.length;
    let roundText = '';
    
    if (totalInRound === 2) {
        roundText = '결승전 🏆';
    } else if (totalInRound === 4) {
        roundText = '준결승전 (4강)';
    } else {
        roundText = `${totalInRound}강`;
    }
    
    const matchesInRound = totalInRound / 2;
    const progress = (currentMatchIndex / matchesInRound) * 100;
    progressBar.style.width = `${progress}%`;
    roundInfo.innerText = `${roundText} (${currentMatchIndex + 1} / ${matchesInRound})`;
}

function updateMatch() {
    updateRoundInfo();
    
    const index1 = currentMatchIndex * 2;
    const index2 = currentMatchIndex * 2 + 1;
    
    const logo1 = currentRound[index1];
    const logo2 = currentRound[index2];
    
    imgLeft.src = `${BASE_URL}${logo1.id}.png`;
    nameLeft.innerText = logo1.name;
    
    imgRight.src = `${BASE_URL}${logo2.id}.png`;
    nameRight.innerText = logo2.name;
    
    cardLeft.style.animation = 'none';
    cardRight.style.animation = 'none';
    void cardLeft.offsetWidth; 
    void cardRight.offsetWidth;
    cardLeft.style.animation = 'fadeIn 0.5s ease-out';
    cardRight.style.animation = 'fadeIn 0.5s ease-out';
}

function handleChoice(winnerIndex) {
    if (isAnimating) return;
    isAnimating = true;
    
    initAudio();
    playSound('select');
    
    const index1 = currentMatchIndex * 2;
    const index2 = currentMatchIndex * 2 + 1;
    
    const winner = winnerIndex === 0 ? currentRound[index1] : currentRound[index2];
    nextRound.push(winner);
    
    const selectedCard = winnerIndex === 0 ? cardLeft : cardRight;
    const unselectedCard = winnerIndex === 0 ? cardRight : cardLeft;
    
    selectedCard.classList.add('selected-card');
    unselectedCard.classList.add('unselected-card');
    
    setTimeout(() => {
        // Add to deck area
        const miniCard = document.createElement('div');
        miniCard.className = 'mini-card';
        const img = document.createElement('img');
        img.src = `${BASE_URL}${winner.id}.png`;
        miniCard.appendChild(img);
        deckCards.appendChild(miniCard);
        
        // Reset classes
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
        setTimeout(() => {
            mini.classList.add('flying-out');
        }, index * 100);
    });
    
    const transitionTime = minis.length * 100 + 1000;
    
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
    }, transitionTime);
}

function showWinner(winner) {
    playSound('win');
    gameScreen.classList.remove('active');
    resultScreen.classList.add('active');
    
    winnerImg.src = `${BASE_URL}${winner.id}.png`;
    winnerName.innerText = winner.name;
    
    fireConfetti();
}

function fireConfetti() {
    var duration = 3000;
    var end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

// Event Listeners
startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

cardLeft.addEventListener('click', () => handleChoice(0));
cardRight.addEventListener('click', () => handleChoice(1));

// Preload some images to prevent flickering on first load
window.addEventListener('load', () => {
    carBrands.slice(0, 4).forEach(brand => {
        const img = new Image();
        img.src = `${BASE_URL}${brand.id}.png`;
    });
});
