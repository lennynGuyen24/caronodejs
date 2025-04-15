//const socket = io('http://localhost:3000'); // Địa chỉ IP của server thay đổi tùy theo get /server-info ở dòng 19

let socket;  // 👈 khai báo trước
let roomId = null;
let currentTurn = '';
let hasJoined = false;

const board = document.getElementById('board');
const status = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const timerDisplay = document.getElementById('timer');
const joinBtn = document.getElementById('join-btn');
const playerStatus = document.getElementById('player-status');
const playerNameInput = document.getElementById('player-name');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const historyList = document.getElementById('history');
const roomList = document.getElementById('room-list');

let playerSymbol = '';
let currentPlayer = '';
let gameOver = false;
let joined = false;

fetch('/server-info')
  .then(res => res.json())
  .then(({ ip, port }) => {
    socket = io(`http://${ip}:${port}`); // 👈 give a value

    socket.on('connect', () => {
      console.log('Server connected successfully!');
    });

  
    // Call the socekt.on(...) functions here or call the init function separately
    //setupSocketEvents();
  
    
    function renderBoard(data) {
      board.innerHTML = '';
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.x = x;
          cell.dataset.y = y;
          cell.textContent = data[y][x];
          cell.style.color = data[y][x] === 'X' ? 'green' : 'red';
          cell.onclick = () => {
            if (playerSymbol === currentTurn && cell.textContent === '') {
              socket.emit('playerMove', { roomId, x, y });
            }
          };
          board.appendChild(cell);
        }
      }
    }

    function updatePlayerStatus(players) {
      const playerInfo = Object.values(players).map(p => `${p.name} (${p.symbol})`);
      playerStatus.textContent = playerInfo.length
        ? `Player has joined: ${playerInfo.join(', ')}`
        : 'Waiting for players to join...';
    }

    /*
    When player wins, the fireworks effect will appear on the winner's screen for 5 seconds.
    Loser will not see this effect.
    */
    function showFireworks() {
      var duration = 5 * 1000; // 5 seconds
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


    function handleClick(e) {
      if (gameOver || playerSymbol !== currentPlayer) return;

      const x = parseInt(e.target.dataset.x);
      const y = parseInt(e.target.dataset.y);
      socket.emit('playerMove', { roomId, x, y });
    }

    joinBtn.onclick = () => {
      const playerName = playerNameInput.value.trim();
      if (!playerName|| hasJoined) {
        alert("Please enter your name before joining!");
        return;
      }
      socket.emit('joinGame', { playerName });
      joinBtn.disabled = true;
      hasJoined = true;
      playerNameInput.disabled = true;
    };

    socket.on('init', (data) => {
      renderBoard(data.boardData);
      currentPlayer = data.currentPlayer;
      playerSymbol = data.players[socket.id]?.symbol || '';
      const playerName = data.players[socket.id]?.name || '?';
      status.textContent = `(${playerName}) is: ${playerSymbol || '?'}`;
      updatePlayerStatus(data.players);
    });

    socket.on('updatePlayers', (players) => {
      const player = players[socket.id];
      if (player) {
        playerSymbol = player.symbol;
        status.textContent = `(${player.name}) is: ${playerSymbol}`;
      }
      updatePlayerStatus(players);
    });

    

    // Xử lý chat
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && chatInput.value.trim() !== '' && roomId) {
        socket.emit('chatMessage', { roomId, name: playerNameInput.value, message, symbol: playerSymbol });
        chatInput.value = '';
      }
    });

    socket.on('chatMessage', ({ name, message, symbol }) => {
      const msgEl = document.createElement('div');
      msgEl.classList.add('chat-message');

    const userSpan = document.createElement('span');
    userSpan.textContent = `${name}[${symbol}] `;
    userSpan.classList.add(`username-${symbol}`);

      const contentSpan = document.createElement('span');
      contentSpan.textContent = msg;

    msgEl.appendChild(userSpan);
    msgEl.appendChild(contentSpan);
    chatWindow.appendChild(msgEl);

    chatWindow.scrollTop = chatWindow.scrollHeight;
    });

    socket.on('startGame', ({ board: boardData, players, currentTurn: turn }) => {
      playerSymbol = players.find(p => p.id === socket.id)?.symbol;
      currentTurn = turn;
      status.textContent = `Bạn là ${playerSymbol}. Lượt chơi: ${currentTurn}`;
      renderBoard(boardData);
    });

    socket.on('moveMade', ({ x, y, symbol }) => {
      const cell = document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
      if (cell) {
        cell.textContent = symbol;
        cell.style.color = symbol === 'X' ? 'green' : 'red';
      }
      currentTurn = symbol === 'X' ? 'O' : 'X';
      status.textContent = `Lượt chơi: ${currentTurn}`;
    });

    socket.on('gameOver', ({ winner }) => {
        status.textContent = winner === playerSymbol ? 'Congratulation! You win 🎉!' : 'You lose 😢!';
        gameOver = true;
        joinBtn.disabled = false;
        playerStatus.textContent = 'Your turn is done.';
      
        if (winner === playerSymbol) {
          showFireworks(); // Call the fireworks function when the game is over.
        }
    });
    
    socket.on('playerLeft', () => {
      alert('Người chơi kia đã thoát. Ván chơi kết thúc.');
      board.innerHTML = '';
      status.textContent = '';
    });
    
    socket.on('winHistory', (history) => {
      historyList.innerHTML = '<h4>Người thắng gần đây:</h4>' +
        history.map(h => `<div>[${h.symbol}] ${h.name}</div>`).join('');
    });
    

    socket.on('timerUpdate', ({ currentPlayer: turnPlayer, timeLeft }) => {
      timerDisplay.textContent = `Time (${turnPlayer}): ${timeLeft} seconds`;
    });

    socket.on('turnTimeout', ({ currentTurn: turn }) => {
      currentTurn = turn;
      status.textContent = `Lượt chơi: ${currentTurn}`;
    });
    
    socket.on('changeTurn', ({ currentPlayer: nextPlayer }) => {
      currentPlayer = nextPlayer;
      status.textContent = `You are: ${playerSymbol}. Turn: ${currentPlayer}`;
    });

    socket.on('resetGame', ({ boardData }) => {
      renderBoard(boardData);
      playerSymbol = '';
      currentPlayer = 'X';
      gameOver = false;
      joinBtn.disabled = false;
      playerNameInput.disabled = false;
      playerNameInput.value = '';
      status.textContent = `You are: ?`;
      playerStatus.textContent = 'Waiting for players to join....';
      timerDisplay.textContent = 'Time: 20 seconds';
      chatWindow.innerHTML = '';
    });

    socket.on('roomCreated', (data) => {
      roomId = data.roomId;
      playerSymbol = 'X';
      status.textContent = 'Đang chờ người khác tham gia...';
    });

    socket.on('roomList', (rooms) => {
      roomList.innerHTML = '';
      rooms.forEach(room => {
        const li = document.createElement('li');
        li.textContent = `Phòng của ${room.hostName}`;
        li.onclick = () => {
          const name = playerNameInput.value.trim();
          if (!name || roomId === room.roomId) return;
          socket.emit('joinRoom', { roomId: room.roomId, playerName: name });
        };
        roomList.appendChild(li);
      });
    });
    
    
       resetBtn.onclick = () => {
      if (roomId) {
        socket.emit('resetGame', { roomId });
      }
    };

})
.catch((err) => {
  // Xử lý lỗi nếu không thể lấy IP server
 console.error('Error when identifying IP server:', err);
});