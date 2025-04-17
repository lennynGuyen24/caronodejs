//const socket = io('http://localhost:3000'); // Địa chỉ IP của server thay đổi tùy theo get /server-info ở dòng 19

let socket;  // 👈 khai báo trước
let hasJoined = false;
let roomId = null;
let playerSymbol = '';
let currentTurn = '';
let selectedSymbol = '';
let mySymbol = '';
let opponentSymbol = '';
let usedSymbols = [];
let currentPlayer = '';
let gameOver = false;
let joined = false;
let playerName = '';
let opponentName = '';
let myRoomID = null;


const board = document.getElementById('board');
const status = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const timerDisplay = document.getElementById('timer');
const joinBtn = document.getElementById('join-btn');
const playerStatus = document.getElementById('player-status');
const nameInput = document.getElementById('player-name');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const historyList = document.getElementById('history');
const roomList = document.getElementById('room-list');
const selectedSymbolEl = document.getElementById('selected-symbol');
const symbolGrid = document.getElementById('symbol-grid');
const playersInfo = document.getElementById('players-info');

const chessman = [
  '❤️', '💙', '💚', '💛', '💜',
  '⭐', '🌟', '🔥', '💧', '🍀',
  '😊', '😎', '😂', '🥰', '🤖',
  '🎯', '👑', '👽', '👻', '🎉',
  '🐱', '🐶', '🐼', '🦊', '🐸'
];

function createSymbolSelection() {
  symbolGrid.innerHTML = '';
  chessman.forEach(symbol => {
    const div = document.createElement('div');
    div.className = 'symbol-option';
    div.textContent = symbol;
    div.dataset.tooltip = `Piece ${symbol}`;
    if (usedSymbols.includes(symbol)) {
      div.classList.add('disabled');
    } else {
      div.onclick = () => {
        document.querySelectorAll('.symbol-option').forEach(opt => opt.classList.remove('selected'));
        div.classList.add('selected');
        selectedSymbol = symbol;
        playerSymbol= symbol;
        selectedSymbolEl.textContent = symbol;
      };
    }
    symbolGrid.appendChild(div);
  });
}

// Hiển thị bảng biểu tượng ngay khi load
document.addEventListener('DOMContentLoaded', () => {
  createSymbolSelection();
});


fetch('/server-info')
  .then(res => res.json())
  .then(({ ip, port }) => {
    socket = io(`http://${ip}:${port}`); // 👈 give a value

    socket.on('connect', () => {
      console.log('Server connected successfully!');
    });

  // Call the socekt.on(...) functions here or call the init function separately
   
  socket.on('yourId', (id) => {
    mySocketId = id;
  });
   
    
    function renderBoard(data) {
      board.innerHTML = '';
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.x = x;
          cell.dataset.y = y;
          cell.textContent = data[y][x];
          cell.onclick = () => {
            if (mySymbol === currentTurn && cell.textContent === '') {
              socket.emit('playerMove', { roomId, x, y });
              console.log(' Move:', roomId , x, y);
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

    

    joinBtn.onclick = () => {
      const name = nameInput.value.trim();
      if (!nameInput|| hasJoined) return alert('Please enter your name before joining!!');
      if (!selectedSymbol) return alert('Choose the piece before joining!');
      if (usedSymbols.includes(selectedSymbol)) return alert('The piece has already been chosen!');
      playerName = name;
      //socket.emit('joinGame', { nameInput });
      socket.emit('createRoom', { playerName: name, symbol: selectedSymbol });
      joinBtn.disabled = true;
      hasJoined = true;
      nameInput.disabled = true;
    };

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
      const message = chatInput.value.trim();
      if (e.key === 'Enter' && message && roomId) {
        socket.emit('chatMessage', { roomId, name: nameInput.value, message, symbol: mySymbol });
        chatInput.value = '';
      }
    });

    socket.on('chatMessage', ({ name, message, symbol }) => {
      const div = document.createElement('div');
      div.innerHTML = `<b style="color: ${symbol === mySymbol ? 'green' : 'red'}">[${symbol}] ${name}</b>: ${message}`;
      chatWindow.appendChild(div);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    });
    

    socket.on('startGame', ({ board: boardData, players, currentTurn: turn }) => {
      const me = players.find(p => p.id === socket.id);
      const opponent = players.find(p => p.id !== socket.id);
      mySymbol = me.symbol;
      opponentSymbol = opponent.symbol;
      currentTurn = turn;
      status.textContent = `You are ${mySymbol}. Turn: ${currentTurn}`;
      playerStatus.textContent = `Current room: ${roomId}`;
      renderBoard(boardData);
    });
    
    socket.on('moveMade', ({ x, y, symbol }) => {
      const cell = document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
      if (cell) {
        cell.textContent = symbol;
      }
      // Update currentTurn with placeholder (actual symbol change may come from server)
      currentTurn = symbol === playerSymbol ? opponentSymbol : playerSymbol;
      status.textContent = `You are: ${playerSymbol}. Turn: ${currentTurn}`;
    });

    socket.on('gameOver', ({ winner }) => {
        status.textContent = winner === mySymbol ? 'Congratulation! You win 🎉!' : 'You lose 😢!';
        gameOver = true;
        joinBtn.disabled = false;
        playerStatus.textContent = 'Your turn is done.';
      
        if (winner === mySymbol) {
          showFireworks(); // Call the fireworks function when the game is over.
        }
    });
    
    socket.on('playerLeft', () => {
      alert('Your op has left. Game over.');
      board.innerHTML = '';
      status.textContent = '';
    });
    
    socket.on('winHistory', (history) => {
      historyList.innerHTML = '<h4>Recent Winner:</h4>' +
        history.map(h => `<div>[${h.symbol}] ${h.name}</div>`).join('');
    });
    

    socket.on('timerUpdate', ({ currentPlayer: currentTurn, timeLeft }) => {
      timerDisplay.textContent = `⏱ Time (${currentTurn}): ${timeLeft} seconds`;
    });

    socket.on('turnTimeout', ({ currentTurn: turn }) => {
      currentTurn = turn;
      status.textContent = `You are: ${mySymbol}. Current turn: ${currentTurn}`;
    });
    
    socket.on('changeTurn', ({ currentPlayer: nextPlayer }) => {
      currentPlayer = nextPlayer;
      status.textContent = `You are: ${mySymbol}. Current turn: ${currentPlayer}`;
    });

    socket.on('resetGame', ({ boardData }) => {
      renderBoard(boardData);
      playerSymbol = '';
      currentPlayer = '';
      gameOver = false;
      joinBtn.disabled = false;
      nameInput.disabled = false;
      nameInput.value = '';
      status.textContent = `You are: ?`;
      playerStatus.textContent = 'Waiting for players to join....';
      timerDisplay.textContent = 'Time: 20 seconds';
      chatWindow.innerHTML = '';
    });

    function createBoard(boardData) {
      board.innerHTML = '';
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          const cell = document.createElement('div');
          cell.classList.add('cell');
          cell.dataset.x = x;
          cell.dataset.y = y;
          cell.textContent = boardData[y][x];
          board.appendChild(cell);
        }
      }
    }
    
    socket.on('init', (data) => {
      createBoard(data.boardData);
    });

    socket.on('roomCreated', (data) => {
      roomId = data.roomId;
      playerSymbol = data.symbol;;
      status.textContent = 'Waiting for players to join...';
      playerStatus.textContent = `Current room: ${roomId}`;
      myRoomId= roomId;
    });

    socket.on('roomList', (rooms) => {
      roomList.innerHTML = '';
      usedSymbols = rooms.map(r => r.symbol).filter(Boolean); // track in-use symbols
      createSymbolSelection();
      rooms.forEach(room => {
        
        const li = document.createElement('li');
        li.textContent = `${room.hostName}'s rooom`;
        li.onclick = () => {
          const name = nameInput.value.trim();
          if (!name) return alert('Type your name first!');
          if (!selectedSymbol) return alert('Choose the piece before joining!');
          if (usedSymbols.includes(selectedSymbol)) return alert('The piece has already been chosen!');
          // Xóa phòng của người chơi hiện tại nếu có
          if (roomId) {
            socket.emit('leaveRoom', { roomId });
            roomId = null;
          }
          // Gửi yêu cầu tham gia phòng mới
          socket.emit('joinRoom', { roomId: room.roomId, playerName: name, symbol: selectedSymbol });
          roomId = room.roomId;
          playerStatus.textContent = `Player is playing in room: ${room.roomId}`;
        };
        // Không hiển thị phòng do chính mình tạo ra
        if (room.roomId !== myRoomId) {
          roomList.appendChild(li);
        }
        
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