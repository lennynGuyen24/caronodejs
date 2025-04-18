let boardData = Array(20).fill().map(() => Array(20).fill(''));
let currentPlayer = 'X';
let timer = null;
let turnTime = 20;
let readyPlayers = [];
let gameStarted = false;
let players = {};
let winHistory = []; // Global win history list

const rooms = {}; // { roomId: { players: [], board, currentTurn, started, timer, history } }
const playerRoomMap = {}; // socket.id -> roomId


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
        //return '127.0.0.1'; // For testing on localhost
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



function generateRoomId() {
  return Math.random().toString(36).substring(2, 8);
}

function updateRoomList() {
  const availableRooms = Object.entries(rooms)
    .filter(([_, room]) => room.players.length === 1 && !room.started)
    .map(([id, room]) => ({ roomId: id, hostName: room.players[0].name }));
  io.emit('roomList', availableRooms);
}

/* 
Workflow của tính năng Timer:
Mỗi lượt người chơi có 20 giây.
Server quản lý timer và gửi thông báo về thời gian còn lại mỗi giây.
Nếu hết 20 giây mà người chơi chưa đi, server tự động chuyển lượt và thông báo cho cả hai người chơi.
Frontend hiển thị rõ ràng thời gian còn lại mỗi lượt chơi.
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
*/

function startTurnTimer(roomId) {
  const room = rooms[roomId]; 
  if (!room) return;

  clearInterval(room.timer);
  let timeLeft = 20;

  room.timer = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timerUpdate', { currentTurn: room.currentTurn, timeLeft });
    if (timeLeft <= 0) {
      room.currentTurn = room.players.find(p => p.symbol !== room.currentTurn).symbol;
      io.to(roomId).emit('turnTimeout', { currentTurn: room.currentTurn });
      startTurnTimer(roomId);
    }
  }, 1000);
}

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
// connect all socket.on

  socket.emit('init', { boardData});
  socket.emit('winHistory', winHistory);



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
  
  socket.on('createRoom', ({ playerName, symbol }) => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      players: [{ id: socket.id, name: playerName, symbol }],
      board: Array(20).fill().map(() => Array(20).fill('')),
      currentTurn: symbol,
      started: false,
      timer: null,
      history: []
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    console.log('[',rooms[roomId].players[0].symbol,']', playerName, ' has connected socket.id: ', socket.id, ' has created room: ', roomId);
    updateRoomList();
  });

  /*
  Tham gia phòng đã tạo
  Người chơi gửi yêu cầu tham gia phòng với ID phòng và tên người chơi.
  Server kiểm tra ID phòng có hợp lệ không, nếu hợp lệ thì thêm người chơi vào phòng.
  Server gửi thông báo cho tất cả người chơi trong phòng về người chơi mới tham gia.
  */
  socket.on('joinRoom', ({ roomId, playerName, symbol }) => {
    const room = rooms[roomId];
    if (room && room.players.length === 1) {
      if (room.players[0].symbol === symbol) {
        socket.emit('joinFailed');
        return;
      }
      room.players.push({ id: socket.id, name: playerName, symbol});
      room.started = true;
      socket.join(roomId);
      playerRoomMap[socket.id] = roomId;

      io.to(roomId).emit('startGame', {
        board: room.board,
        players: room.players,
        currentTurn: room.currentTurn
      });
      updateRoomList();
      startTurnTimer(roomId);
      console.log('[',rooms[roomId].players[1].symbol,']',playerName, ' has joined room socket.id: ', socket.id, ' has joined room: ', roomId);
    } else {
      socket.emit('joinFailed');
    }
  });
  
    
 
  // Cập nhật danh sách phòng đang chờ
  function updateRoomList() {
    const availableRooms = Object.entries(rooms)
      .filter(([id, r]) => r.players.length === 1 && !r.started)
      .map(([id, r]) => ({ roomId: id, hostName: r.players[0].name }));
      
    io.emit('roomList', availableRooms);
  }

  socket.on('leaveRoom', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
  
    // Xoá người chơi khỏi danh sách
    room.players = room.players.filter(p => p.id !== socket.id);
  
    // Nếu không còn ai trong phòng thì xoá phòng
    if (room.players.length === 0) {
      clearInterval(room.timer);
      delete rooms[roomId];
    } else {
      room.started = false;
      clearInterval(room.timer);
    }
  
    socket.leave(roomId);
    updateRoomList();
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
  
    socket.on('playerMove', ({ roomId, x, y }) => {
      const room = rooms[roomId];
      if (!room || room.board[y][x] !== '') return;
  
      const symbol = room.currentTurn;
      const currentPlayer = room.players.find(p => p.symbol === symbol);
      if (!currentPlayer) return;
  
      room.board[y][x] = symbol;
  
      io.to(roomId).emit('moveMade', { x, y, symbol, nextTurn: null });
  
      if (checkWin(room.board, x, y, symbol)) {
        const winner = room.players.find(p => p.symbol === symbol);
        winHistory.unshift({ name: winner.name, symbol });
        if (winHistory.length > 10) winHistory.pop();
        io.emit('winHistory', winHistory);
  
        io.to(roomId).emit('gameOver', { winner: symbol });
        clearInterval(room.timer);
      } else {
        const nextPlayer = room.players.find(p => p.symbol !== symbol);
        if (nextPlayer) {
          room.currentTurn = nextPlayer.symbol;
          io.to(roomId).emit('moveMade', { x, y, symbol, nextTurn: room.currentTurn });
        }
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
 
  socket.on('resetGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.players || room.players.length !== 2) return;

    room.board = Array(20).fill().map(() => Array(20).fill(''));
    room.currentTurn = room.players[0].symbol;
    room.started = true;

    io.to(roomId).emit('startGame', {
      board: room.board,
      players: room.players,
      currentTurn: room.currentTurn
    });
    startTurnTimer(roomId);
  });
                                

socket.on('chatMessage', ({ roomId, name, message, symbol }) => {
  io.to(roomId).emit('chatMessage', { name, message, symbol });
});

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
