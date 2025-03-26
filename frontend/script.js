const socket = io('http://localhost:3000');

const board = document.getElementById('board');
const status = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const timerDisplay = document.getElementById('timer');
const joinBtn = document.getElementById('join-btn');
const playerStatus = document.getElementById('player-status');


let playerSymbol = '';
let currentPlayer = '';
let gameOver = false;
let joined = false;

function createBoard(boardData) {
  board.innerHTML = '';
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.textContent = boardData[y][x];
      cell.addEventListener('click', handleClick);
      board.appendChild(cell);
    }
  }
}

function handleClick(e) {
  if (gameOver || playerSymbol !== currentPlayer) return;

  const x = parseInt(e.target.dataset.x);
  const y = parseInt(e.target.dataset.y);
  socket.emit('playerMove', { x, y });
}

function updatePlayerStatus(players) {
    let statuses = [];
    for (const [id, symbol] of Object.entries(players)) {
      statuses.push(symbol);
    }
    playerStatus.textContent = statuses.length
      ? `Người chơi đã tham gia: ${statuses.join(', ')}`
      : 'Chưa có người chơi nào tham gia.';
}

function showFireworks() {
  var duration = 5 * 1000; // 5 giây
  var animationEnd = Date.now() + duration;
  var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  var interval = setInterval(function() {
    var timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    var particleCount = 50 * (timeLeft / duration);
    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.1, 0.9), y: randomInRange(0.1, 0.9) }
    }));
  }, 250);
}



joinBtn.onclick = () => {
    socket.emit('playerReady');
    joinBtn.disabled = true;
};


socket.on('init', (data) => {
    createBoard(data.boardData);
    currentPlayer = data.currentPlayer;
    playerSymbol = data.players[socket.id] || '';
    status.textContent = `Bạn là: ${playerSymbol || '?'}`;
    joinBtn.disabled = data.gameStarted || playerSymbol;
    updatePlayerStatus(data.players);
});


socket.on('updatePlayers', (players) => {
    playerSymbol = players[socket.id] || playerSymbol;
    updatePlayerStatus(players);
});
  

socket.on('gameStart', ({ currentPlayer: turnPlayer, players }) => {
currentPlayer = turnPlayer;
playerSymbol = players[socket.id];
status.textContent = `Bạn là: ${playerSymbol}. Lượt chơi: ${currentPlayer}`;
gameOver = false;
});

socket.on('moveMade', ({ x, y, symbol }) => {
  const cell = document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
  cell.textContent = symbol;
  currentPlayer = symbol === 'X' ? 'O' : 'X';
  status.textContent = `Bạn là: ${playerSymbol}. Lượt chơi: ${currentPlayer}`;
});

socket.on('gameOver', ({ winner }) => {
    status.textContent = winner === playerSymbol ? 'Bạn thắng 🎉!' : 'Bạn thua 😢!';
    gameOver = true;
    joinBtn.disabled = false;
    playerStatus.textContent = 'Chưa có người chơi nào tham gia.';
  
    if (winner === playerSymbol) {
      showFireworks(); // Gọi hàm pháo hoa nếu thắng
    }
});

socket.on('timerUpdate', ({ currentPlayer: turnPlayer, timeLeft }) => {
  timerDisplay.textContent = `Thời gian (${turnPlayer}): ${timeLeft} giây`;
});

socket.on('changeTurn', ({ currentPlayer: nextPlayer }) => {
  currentPlayer = nextPlayer;
  status.textContent = `Bạn là: ${playerSymbol}. Lượt chơi: ${currentPlayer}`;
});

socket.on('resetGame', ({ boardData, players }) => {
    createBoard(boardData);
    playerSymbol = '';
    currentPlayer = 'X';
    gameOver = false;
    joinBtn.disabled = false;
    status.textContent = `Bạn là: ?`;
    playerStatus.textContent = 'Chưa có người chơi nào tham gia.';
    timerDisplay.textContent = 'Thời gian: 20 giây';
});

resetBtn.onclick = () => {
    socket.emit('resetGame');
};
