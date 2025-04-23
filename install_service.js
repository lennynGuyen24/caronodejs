/* 
Chạy một chương trình Node.js như một Windows Service (dịch vụ chạy nền tự động khi khởi động máy).
1. Chạy trong thư mục project, cài đặt  Chạy trong thư mục dự án::
npm install node-windows --save 
2. Chạy script để cài dịch vụ
node install_service.js

Quản lý bằng services.msc
Mở Start → gõ services.msc
Tìm đến dịch vụ "CaroNodeJSService" và quản lý như một dịch vụ Windows bình thường (Start/Stop/Restart...).
*/

const Service = require('node-windows').Service;

// Đường dẫn đến file Node.js của bạn (đã đầy đủ đường dẫn tuyệt đối)
const svc = new Service({
  name: 'CaroNodeJSService', // Tên dịch vụ
  description: 'Chạy ứng dụng Node.js như một Windows Service',
  script: 'D:\\caronodejs_git\\server.js', // Thay bằng đường dẫn thực tế
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096' // nếu muốn tăng giới hạn RAM
  ]
});

// Lắng nghe sự kiện khi service được cài đặt
svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.install();
