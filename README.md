# Game Cờ Caro Online (Node.js + Socket.io)

Dự án xây dựng trò chơi Cờ Caro online sử dụng Node.js, Express.js, và Socket.io.

---

## 🛠️ Công nghệ sử dụng:
- Node.js
- Express.js
- Socket.io
- HTML/CSS/JavaScript (Frontend)

## 🚀 Hướng dẫn cài đặt

Bước 1: Tải và cài đặt Node.js
🔗 Truy cập vào trang chính thức:
Truy cập https://nodejs.org
Bạn sẽ thấy hai phiên bản:
LTS (khuyến nghị): phiên bản ổn định.
Current: phiên bản mới nhất, nhưng chưa ổn định.
Cài đặt:
Chạy file cài đặt vừa tải (.msi cho Windows)
Sau khi cài đặt xong, mở Terminal hoặc CMD, gõ:
    node -v
    npm -v

---
Tao cấu trúc thư mục:
caro-game/
├── backend/
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
└── frontend/
    ├── index.html
    ├── script.js
    └── style.css
Vai trò của file package.json:
    Quản lý thông tin cơ bản của dự án. 
    File này mô tả dự án một cách ngắn gọn và cung cấp các thông tin như:
    Tên dự án (name)
    Phiên bản dự án (version)
    Mô tả ngắn (description)
    Tác giả (author)
    Giấy phép (license)
Quản lý các thư viện (dependencies)
    File này chứa thông tin về các thư viện JavaScript được cài đặt bằng npm. Các thư viện này sẽ tự động cài đặt lại dễ dàng khi chuyển dự án sang môi trường khác.
    "dependencies": {
        "express": "^4.17.1",
        "socket.io": "^4.7.5",
        "cors": "^2.8.5"
    }

Quản lý các script (lệnh chạy nhanh)
    File này giúp định nghĩa các câu lệnh thường dùng trong dự án:
    "scripts": {
        "start": "node index.js",
        "dev": "nodemon index.js"
    }

Quản lý các phiên bản thư viện chính xác (package-lock.json)
File package.json làm việc song song với package-lock.json, quản lý chính xác phiên bản từng thư viện giúp tránh lỗi khi di chuyển dự án giữa các môi trường khác nhau.

Lệnh thông dụng với package.json:
Lệnh	                        Ý nghĩa
npm init -y	                    Khởi tạo file package.json mặc định.
npm install <tên thư viện>	    Cài thư viện và lưu vào dependencies.
npm install	                    Cài đặt tất cả các thư viện từ dependencies
npm uninstall <tên thư viện>	Xóa thư viện khỏi dependencies.

Mở Terminal ngay trong VS Code (Ctrl + ~ hoặc Terminal → New Terminal).
    cd backend
    node index.js

Truy cập bằng URL:    
    http://localhost:3000/index.html

### 1.  Error fix
Error: npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. 
Lỗi này xảy ra vì PowerShell đang được cài đặt chính sách bảo mật ngăn chặn chạy script từ bên ngoài (Execution Policy).
powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

### 2. Clone project từ GitHub
```bash
git clone https://github.com/klakamas/caronodejs.git
cd backend
npm init -y
npm install express socket.io
node index.js

### 3. Deploy project Google App Engine 
