//const socket = io('http://localhost:3000'); // Địa chỉ IP của server thay đổi tùy theo get /server-info ở dòng 19
let socket;  // khai báo global biến socket để sử dụng trong các hàm khác

const board = document.getElementById('board');
const status = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const timerDisplay = document.getElementById('timer');
const joinBtn = document.getElementById('join-btn');
const playerStatus = document.getElementById('player-status');
const playerNameInput = document.getElementById('player-name');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');

let playerSymbol = '';
let currentPlayer = '';
let gameOver = false;
let joined = false;

fetch('/server-info')
  .then(res => res.json())
  .then(({ ip, port }) => {
    socket = io(`http://${ip}:${port}`); // 👈 gán giá trị

    socket.on('connect', () => {
      console.log('Đã kết nối tới server');
    });

    // Gọi các hàm socket.on(...) ở đây hoặc gọi hàm khởi tạo riêng
    //setupSocketEvents();
 

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

    function updatePlayerStatus(players) {
      const playerInfo = Object.values(players).map(p => `${p.name} (${p.symbol})`);
      playerStatus.textContent = playerInfo.length
        ? `Người chơi đã tham gia: ${playerInfo.join(', ')}`
        : 'Chưa có người chơi nào tham gia.';
    }

    /*
    Khi một người chơi chiến thắng, hiệu ứng pháo hoa sẽ xuất hiện trên màn hình người thắng, kéo dài trong 5 giây.
    Người thua sẽ không thấy hiệu ứng này.
    */
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


    function handleClick(e) {
      if (gameOver || playerSymbol !== currentPlayer) return;

      const x = parseInt(e.target.dataset.x);
      const y = parseInt(e.target.dataset.y);
      socket.emit('playerMove', { x, y });
    }

    joinBtn.onclick = () => {
      const playerName = playerNameInput.value.trim();
      if (!playerName) {
        alert("Vui lòng nhập tên trước khi tham gia!");
        return;
      }
      socket.emit('playerReady', playerName);
      joinBtn.disabled = true;
      playerNameInput.disabled = true;
    };

    socket.on('init', (data) => {
      createBoard(data.boardData);
      currentPlayer = data.currentPlayer;
      playerSymbol = data.players[socket.id]?.symbol || '';
      const playerName = data.players[socket.id]?.name || '?';
      status.textContent = `Bạn (${playerName}) là: ${playerSymbol || '?'}`;
      updatePlayerStatus(data.players);
    });

    socket.on('updatePlayers', (players) => {
      const player = players[socket.id];
      if (player) {
        playerSymbol = player.symbol;
        status.textContent = `Bạn (${player.name}) là: ${playerSymbol}`;
      }
      updatePlayerStatus(players);
    });

    socket.on('gameStart', ({ currentPlayer: turnPlayer, players }) => {
      currentPlayer = turnPlayer;
      const player = players[socket.id];
      playerSymbol = player.symbol;
      status.textContent = `Bạn (${player.name}) là: ${playerSymbol}. Lượt chơi: ${currentPlayer}`;
      gameOver = false;
    });

    // Xử lý chat
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && chatInput.value.trim() !== '') {
        socket.emit('chatMessage', chatInput.value.trim());
        chatInput.value = '';
      }
    });

    socket.on('chatMessage', ({ name, symbol, msg }) => {
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

      chatWindow.scrollTop = chatBox.scrollHeight;
    });

    /*
    socket.on('newMessage', ({ name, msg }) => {
    const newMsg = document.createElement('div');
    newMsg.textContent = `${name}: ${msg}`;
    chatWindow.appendChild(newMsg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    });
    */

    socket.on('moveMade', ({ x, y, symbol }) => {
      const cell = document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
      
      // Thêm màu sắc theo symbol (X hoặc O)
      cell.textContent = symbol;
      cell.style.color = symbol === 'X' ? 'green' : 'red';

      currentPlayer = symbol === 'X' ? 'O' : 'X';
      status.textContent = `Bạn là: ${playerSymbol}. Lượt chơi: ${currentPlayer}`;
    });

    socket.on('gameOver', ({ winner }) => {
        status.textContent = winner === playerSymbol ? 'Bạn thắng 🎉!' : 'Bạn thua 😢!';
        gameOver = true;
        joinBtn.disabled = false;
        playerStatus.textContent = 'Lượt chơi đã kết thúc.';
      
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

    socket.on('resetGame', ({ boardData }) => {
      createBoard(boardData);
      playerSymbol = '';
      currentPlayer = 'X';
      gameOver = false;
      joinBtn.disabled = false;
      playerNameInput.disabled = false;
      playerNameInput.value = '';
      status.textContent = `Bạn là: ?`;
      playerStatus.textContent = 'Chưa có người chơi nào tham gia.';
      timerDisplay.textContent = 'Thời gian: 20 giây'
      chatWindow.innerHTML = '';
    });

    resetBtn.onclick = () => {
        socket.emit('resetGame');
    };

})
.catch((err) => {
  // Xử lý lỗi nếu không thể lấy IP server
 console.error('Lỗi lấy IP server:', err);
});