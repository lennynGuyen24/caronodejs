const express = require('express');
const app = express();
const http = require('http').createServer(app);
const os = require('os'); // Thư viện để lấy thông tin hệ thống
const PORT = 3000;// Thay đổi cổng nếu cần thiết
const rooms = {}; // { roomId: { players: [], board, currentTurn, started, timer, history } }
let winHistory = []; // Global win history list


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
  socket.emit('winHistory', winHistory);

  socket.on('createRoom', ({ playerName }) => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      players: [{ id: socket.id, name: playerName, symbol: 'X' }],
      board: Array(20).fill().map(() => Array(20).fill('')),
      currentTurn: 'X',
      started: false,
      timer: null,
      history: []
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    updateRoomList();// Gửi danh sách phòng đang chờ tới tất cả client
  }); 
  
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
  /*
  Tạo phòng chơi mới
  Người chơi gửi yêu cầu tạo phòng mới với tên người chơi.
  Server tạo một phòng mới với ID ngẫu nhiên và thêm người chơi vào phòng.
  Server gửi ID phòng mới cho người chơi và cập nhật danh sách phòng đang chờ.
  Người chơi có thể tham gia phòng đã tạo bằng cách gửi yêu cầu tham gia với ID phòng.
  Server kiểm tra ID phòng có hợp lệ không, nếu hợp lệ thì thêm người chơi vào phòng.
  Server gửi thông báo cho tất cả người chơi trong phòng về người chơi mới tham gia.
  Người chơi có thể bắt đầu trò chơi khi có đủ 2 người chơi trong phòng.
  Server gửi thông báo bắt đầu trò chơi cho tất cả người chơi trong phòng.
  */
  socket.on('createRoom', ({ playerName }) => {
    const roomId = generateRoomId(); // eg: 'abc123'
    rooms[roomId] = {
      players: [{ id: socket.id, name: playerName, symbol: 'X' }],
      board: Array(20).fill().map(() => Array(20).fill('')),
      currentTurn: 'X',
      started: false
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    updateRoomList(); // Gửi danh sách phòng đang chờ tới tất cả client
  });
 
  // Cập nhật danh sách phòng đang chờ
  function updateRoomList() {
    const availableRooms = Object.entries(rooms)
      .filter(([id, r]) => r.players.length === 1 && !r.started)
      .map(([id, r]) => ({ roomId: id, hostName: r.players[0].name }));
      
    io.emit('roomList', availableRooms);
  }

  /*
  Tham gia phòng đã tạo
  Người chơi gửi yêu cầu tham gia phòng với ID phòng và tên người chơi.
  Server kiểm tra ID phòng có hợp lệ không, nếu hợp lệ thì thêm người chơi vào phòng.
  Server gửi thông báo cho tất cả người chơi trong phòng về người chơi mới tham gia.
  */
  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (room && room.players.length === 1) {
      room.players.push({ id: socket.id, name: playerName, symbol: 'O' });
      room.started = true;
      socket.join(roomId);
  
      // Gửi dữ liệu khởi tạo cho cả 2 người
      io.to(roomId).emit('startGame', {
        board: room.board,
        players: room.players,
        currentTurn: room.currentTurn
      });
  
      updateRoomList();
    } else {
      socket.emit('joinFailed', 'Phòng không tồn tại hoặc đã đủ người.');
    }
  });
  
  // Adding chat events
  /*
  socket.on('chatMessage', (msg) => {
    const player = players[socket.id];
    if (player) {
      io.emit('chatMessage', { name: player.name, symbol: player.symbol, msg });
    }
  });
  */

  socket.on('chatMessage', ({ roomId, name, message, symbol }) => {
    io.to(roomId).emit('chatMessage', { name, message, symbol });
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
  /*
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
*/
  socket.on('playerMove', ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room || room.board[y][x] !== '') return;

    const symbol = room.currentTurn;
    room.board[y][x] = symbol;

    io.to(roomId).emit('moveMade', { x, y, symbol });

    if (checkWin(room.board, x, y, symbol)) {
      const winner = room.players.find(p => p.symbol === symbol);
      winHistory.unshift({ name: winner.name, symbol });
      if (winHistory.length > 10) winHistory.pop();
      io.emit('winHistory', winHistory);

      io.to(roomId).emit('gameOver', { winner: symbol });
      clearInterval(room.timer);
      delete rooms[roomId];
      updateRoomList();
    } else {
      room.currentTurn = symbol === 'X' ? 'O' : 'X';
      startTurnTimer(roomId);
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
  /*
  socket.on('resetGame', () => {
    clearInterval(timer);
    gameStarted = false;
    readyPlayers = [];
    players = {};
    currentPlayer = 'X';
    boardData = Array(20).fill().map(() => Array(20).fill(''));
    io.emit('resetGame', { boardData, players });
  });
*/
socket.on('resetGame', ({ roomId }) => {
  const room = rooms[roomId];
  if (!room || !room.players || room.players.length !== 2) return;

  room.board = Array(20).fill().map(() => Array(20).fill(''));
  room.currentTurn = 'X';
  room.started = true;

  io.to(roomId).emit('startGame', {
    board: room.board,
    players: room.players,
    currentTurn: room.currentTurn
  });
  startTurnTimer(roomId);
});

  /*
  socket.on('disconnect', () => {
    clearInterval(timer);
    readyPlayers = readyPlayers.filter(p => p !== socket.id);
    delete players[socket.id];
    io.emit('updatePlayers', players);
    gameStarted = false;
  });
}); //End of io.on('connection', (socket)
*/
socket.on('disconnect', () => {
  for (const [roomId, room] of Object.entries(rooms)) {
    const index = room.players.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      io.to(roomId).emit('playerLeft');
      clearInterval(room.timer);
      delete rooms[roomId];
      updateRoomList();
      break;
    }
  }
});
});
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
/*
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

*/
function checkWin(board, x, y, symbol) {
  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];

  for (let [dx, dy] of directions) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      if (board[y + i * dy]?.[x + i * dx] === symbol) count++;
      else break;
    }
    for (let i = 1; i < 5; i++) {
      if (board[y - i * dy]?.[x - i * dx] === symbol) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}


http.listen(PORT, () => {
  const ip = getServerIp();
  console.log(`🌐 Server running at: http://${ip}:${PORT}`);
}); // Get server IP
