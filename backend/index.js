const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static(__dirname + '/../frontend'));

let boardData = Array(20).fill().map(() => Array(20).fill(''));
let currentPlayer = 'X';
let timer = null;
let turnTime = 20;
let readyPlayers = [];
let gameStarted = false;
let players = {};



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

  // Thêm sự kiện chat
  socket.on('sendMessage', (msg) => {
    const player = players[socket.id];
    if (player) {
      io.emit('newMessage', { name: player.name, msg });
    }
  });
  
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


http.listen(3000, () => {
  console.log('Server đang chạy tại http://localhost:3000');
});
