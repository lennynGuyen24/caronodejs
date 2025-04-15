const express = require('express');
const app = express();
const http = require('http').createServer(app);
const os = require('os'); // Thư viện để lấy thông tin hệ thống
const PORT = 3000;// Thay đổi cổng nếu cần thiết


const cors = require('cors');
const io = require('socket.io')(http, { cors: { origin: "*" } });


app.use(cors());
app.use(express.static(__dirname + '/../frontend'));

// Take the IP address of the server
// This function will find the IP address of the server in the local network
// If not found, return 'localhost'.
function getServerIp() {
  const interfaces = os.networkInterfaces();
  for (let name in interfaces) {
    for (let iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

//Return IP server to client
app.get('/server-info', (req, res) => {
  const ip = getServerIp();
  res.json({ ip, port: PORT }); // 👈 This is the valid json
});


let boardData = Array(20).fill().map(() => Array(20).fill(''));
let currentPlayer = 'X';
let timer = null;
let turnTime = 20;
let readyPlayers = [];
let gameStarted = false;
let players = {};

/*
(1) Kết nối ban đầu:
Người chơi truy cập web game.
Frontend gửi yêu cầu kết nối đến backend (socket.io).
Server chấp nhận kết nối:
Server tạo dữ liệu bàn cờ mặc định (20x20 ô).
Server gửi thông tin trạng thái ban đầu (trạng thái bàn cờ, lượt người chơi) qua sự kiện init.

Người chơi 1 ──┐
                ├── Kết nối Socket.io ──▶ Server
Người chơi 2 ──┘

*/

io.on('connection', (socket) => {
  socket.emit('init', { boardData, currentPlayer, gameStarted, players });

  socket.on('playerReady', (name) => {
    if (!readyPlayers.includes(socket.id) && Object.keys(players).length < 2) {
      readyPlayers.push(socket.id);
      const symbol = readyPlayers.length === 1 ? 'X' : 'O';
      players[socket.id] = { symbol, name };
    }

    io.emit('updatePlayers', players);

    if (readyPlayers.length === 2) {
      gameStarted = true;
      boardData = Array(20).fill().map(() => Array(20).fill(''));
      currentPlayer = 'X';
      io.emit('gameStart', { currentPlayer, players });
      startTurnTimer();
    }
  });

  // Adding chat events
  socket.on('chatMessage', (msg) => {
    const player = players[socket.id];
    if (player) {
      io.emit('chatMessage', { name: player.name, symbol: player.symbol, msg });
    }
  });
  

  /*
   (2) Quá trình chơi
  Người chơi click vào ô cờ, Frontend gửi tọa độ (x, y) lên Server qua sự kiện playerMove.
  Server nhận tọa độ, kiểm tra ô hợp lệ hay không (đã đánh chưa, đúng lượt hay chưa):
  Nếu hợp lệ: cập nhật trạng thái bàn cờ, kiểm tra thắng/thua/hòa.
  Server gửi lại kết quả lượt đánh (moveMade) cho tất cả người chơi.
  Frontend hiển thị quân cờ vừa đánh.
      Frontend          Server           Frontend
     (Player 1)         │               (Player 2)
        │               │                  │
    Click ô (x,y) ───▶  │                  │
                        │ kiểm tra hợp lệ  │
                        │ kiểm tra thắng?  │
                        │ cập nhật bàn cờ  │
                        │─────────────────▶│
                        │ gửi moveMade     │
                        │─────────────────▶│
    Hiển thị kết quả ◀──│                  │
                        │◀─────────────────│ Hiển thị kết quả

  */
  socket.on('playerMove', ({ x, y }) => {
    if (!gameStarted || boardData[y][x] !== '') return;

    boardData[y][x] = currentPlayer;
    io.emit('moveMade', { x, y, symbol: currentPlayer });

    if (checkWin(x, y)) {
      io.emit('gameOver', { winner: currentPlayer });
      clearInterval(timer);
      gameStarted = false;
      readyPlayers = [];
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      startTurnTimer();
    }
  });

/*
Reset game
Người chơi click nút “Chơi lại”.
Frontend gửi sự kiện resetGame tới server.
Server reset bàn cờ, trạng thái về ban đầu.
Server gửi trạng thái mới về cho tất cả người chơi.
  Frontend ──▶ gửi resetGame ──▶ Server reset bàn cờ
                                  └───▶ Frontend reset giao diện

  */
  socket.on('resetGame', () => {
    clearInterval(timer);
    gameStarted = false;
    readyPlayers = [];
    players = {};
    currentPlayer = 'X';
    boardData = Array(20).fill().map(() => Array(20).fill(''));
    io.emit('resetGame', { boardData, players });
  });

  socket.on('disconnect', () => {
    clearInterval(timer);
    readyPlayers = readyPlayers.filter(p => p !== socket.id);
    delete players[socket.id];
    io.emit('updatePlayers', players);
    gameStarted = false;
  });
}); //End of io.on('connection', (socket)

/* 
Workflow của tính năng Timer:
Mỗi lượt người chơi có 20 giây.
Server quản lý timer và gửi thông báo về thời gian còn lại mỗi giây.
Nếu hết 20 giây mà người chơi chưa đi, server tự động chuyển lượt và thông báo cho cả hai người chơi.
Frontend hiển thị rõ ràng thời gian còn lại mỗi lượt chơi.
*/

function startTurnTimer() {
  clearInterval(timer);
  let timeLeft = turnTime;
  io.emit('timerUpdate', { currentPlayer, timeLeft });

  timer = setInterval(() => {
    timeLeft--;
    if (timeLeft >= 0) {
      io.emit('timerUpdate', { currentPlayer, timeLeft });
    }
    if (timeLeft === 0) {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      io.emit('changeTurn', { currentPlayer });
      timeLeft = turnTime;
    }
  }, 1000);
}
/*
Kiểm tra điều kiện thắng
Server sau mỗi lượt đánh sẽ kiểm tra thắng/thua bằng cách:
Kiểm tra theo 4 hướng (ngang, dọc, chéo chính, chéo phụ).
Nếu đủ 5 quân liên tiếp => có người chiến thắng.
Khi thắng/thua xảy ra:
Server gửi sự kiện gameOver kèm người chiến thắng cho cả 2 người.
Frontend hiển thị thông báo người thắng.

  Player 1 đánh ô ──▶ Server kiểm tra thắng
                      ├─── Thắng ──▶ Gửi “gameOver”
                      └─── Chưa thắng ──▶ Tiếp tục chơi

*/
function checkWin(x, y) {
  const symbol = boardData[y][x];
  return (
    checkDirection(x, y, symbol, 1, 0) ||
    checkDirection(x, y, symbol, 0, 1) ||
    checkDirection(x, y, symbol, 1, 1) ||
    checkDirection(x, y, symbol, 1, -1)
  );
}

function checkDirection(x, y, symbol, dx, dy) {
  let count = 1;

  // kiểm tra chiều thuận
  for (let i = 1; i < 5; i++) {
    if (valid(x + i * dx, y + i * dy) && boardData[y + i * dy][x + i * dx] === symbol)
      count++;
    else
      break;
  }

  // kiểm tra chiều ngược
  for (let i = 1; i < 5; i++) {
    if (valid(x - i * dx, y - i * dy) && boardData[y - i * dy][x - i * dx] === symbol)
      count++;
    else
      break;
  }

  return count >= 5;
}

function valid(x, y) {
  return x >= 0 && y >= 0 && x < 20 && y < 20;
}


http.listen(PORT, () => {
  const ip = getServerIp();
  console.log(`🌐 Server running at: http://${ip}:${PORT}`);
}); /* Get server IP*/
