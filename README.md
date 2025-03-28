# Game Cờ Caro Online (Node.js + Socket.io)

Dự án xây dựng trò chơi Cờ Caro online sử dụng Node.js, Express.js, và Socket.io.

---

## 🛠️ Công nghệ sử dụng:
- Node.js
- Express.js
- Socket.io
- HTML/CSS/JavaScript (Frontend)

---

## 🚀 Hướng dẫn cài đặt

### 1. Clone project từ GitHub
```bash
git clone https://github.com/klakamas/caronodejs.git
cd backend
npm init -y
npm install express socket.io
node index.js

#### 2. Error fix
Error: npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. 
Lỗi này xảy ra vì PowerShell đang được cài đặt chính sách bảo mật ngăn chặn chạy script từ bên ngoài (Execution Policy).
powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser